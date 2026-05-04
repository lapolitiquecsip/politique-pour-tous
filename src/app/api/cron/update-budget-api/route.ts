import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const AGGREGATED_API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/plf-2026-budget-vert/records?group_by=mission,programme&select=sum(plf_2026_cp_ou_prevision_2026_si_depense_fiscale)%20as%20val2026,sum(lfi_2025_cp_ou_prevision_2025_si_depense_fiscale)%20as%20val2025,sum(execution_2024_cp)%20as%20val2024&limit=1000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  try {
    const response = await fetch(AGGREGATED_API_URL);
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    
    const data = await response.json();
    const results = data.results as any[];

    const aggregation: Record<string, { val2024: number; val2025: number; val2026: number; programs: any[] }> = {};

    results.forEach(record => {
      const missionName = record.mission;
      if (!missionName) return;

      if (!aggregation[missionName]) {
        aggregation[missionName] = { val2024: 0, val2025: 0, val2026: 0, programs: [] };
      }

      const v2024 = record.val2024 || 0;
      const v2025 = record.val2025 || 0;
      const v2026 = record.val2026 || 0;

      aggregation[missionName].val2024 += v2024;
      aggregation[missionName].val2025 += v2025;
      aggregation[missionName].val2026 += v2026;
      
      if (record.programme && aggregation[missionName].programs.length < 8) {
         aggregation[missionName].programs.push({
            name: record.programme,
            val2026: Math.round((v2026 / 1000000) * 10) / 10 // Md€ with 1 decimal
         });
      }
    });

    const formattedData = Object.entries(aggregation).map(([name, data]) => ({
      mission: name,
      val2024: Math.round((data.val2024 / 1000000000) * 100) / 100,
      val2025: Math.round((data.val2025 / 1000000000) * 100) / 100,
      val2026: Math.round((data.val2026 / 1000000000) * 100) / 100,
      trend: data.val2026 >= data.val2025 ? 'up' : 'down',
      programs: data.programs.map(p => ({
         name: p.name,
         amount: `${p.val2026 / 1000} Md€` // Conversion millions -> milliards
      }))
    }));

    const { error } = await supabase
      .from('budget_sync')
      .insert({
        aggregated_data: formattedData,
        source_url: AGGREGATED_API_URL
      });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      mission_count: formattedData.length,
      updated_at: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
