import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const AGGREGATED_API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/plf-2026-budget-vert/records?group_by=mission,programme&select=sum(plf_2026_cp_ou_prevision_2026_si_depense_fiscale)%20as%20val2026,sum(lfi_2025_cp_ou_prevision_2025_si_depense_fiscale)%20as%20val2025&limit=1000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';
  const authHeader = request.headers.get('authorization');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron && !force) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch aggregated data (1 single call)
    const response = await fetch(AGGREGATED_API_URL, {
       headers: {
          'User-Agent': 'AntigravityBudgetSync/1.0'
       }
    });
    
    if (!response.ok) {
       const errorBody = await response.text();
       throw new Error(`API Error ${response.status}: ${errorBody}`);
    }
    
    const data = await response.json();
    const results = data.results as any[];

    // 2. Process and aggregate by mission
    const aggregation: Record<string, { val2025: number; val2026: number; programs: any[] }> = {};

    results.forEach(record => {
      const missionName = record.mission;
      if (!missionName) return;

      if (!aggregation[missionName]) {
        aggregation[missionName] = { val2025: 0, val2026: 0, programs: [] };
      }

      const val2025 = record.val2025 || 0;
      const val2026 = record.val2026 || 0;

      aggregation[missionName].val2025 += val2025;
      aggregation[missionName].val2026 += val2026;
      
      if (record.programme && aggregation[missionName].programs.length < 8) {
         aggregation[missionName].programs.push({
            name: record.programme,
            amount: `${Math.round((val2026 / 1000000000) * 100) / 100} Md€`
         });
      }
    });

    // 3. Format for dashboard
    const formattedData = Object.entries(aggregation).map(([name, data]) => ({
      mission: name,
      val2025: Math.round((data.val2025 / 1000000000) * 100) / 100,
      val2026: Math.round((data.val2026 / 1000000000) * 100) / 100,
      trend: data.val2026 >= data.val2025 ? 'up' : 'down',
      programs: data.programs
    }));

    // 4. Save to Supabase
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
      program_count: results.length,
      updated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
