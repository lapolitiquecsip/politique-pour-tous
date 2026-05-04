import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/plf-2026-budget-vert/records';

export async function GET(request: Request) {
  // Optionnel : Protection par secret pour les CRONs
  const authHeader = request.headers.get('authorization');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  // On autorise aussi via un paramètre query pour les tests manuels (si besoin)
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  if (!isCron && !force) {
    // return new Response('Unauthorized', { status: 401 });
  }

  try {
    let allRecords: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    // 1. Fetch ALL records (pagination)
    while (hasMore) {
      const response = await fetch(`${API_URL}?limit=${limit}&offset=${offset}`);
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      
      const data = await response.json();
      allRecords = [...allRecords, ...data.results];
      
      offset += limit;
      hasMore = allRecords.length < data.total_count && offset < 2000; // Sécurité à 2000
    }

    // 2. Aggregate data by mission
    const aggregation: Record<string, { val2025: number; val2026: number; programs: any[] }> = {};

    allRecords.forEach(record => {
      const missionName = record.mission;
      if (!missionName) return;

      if (!aggregation[missionName]) {
        aggregation[missionName] = { val2025: 0, val2026: 0, programs: [] };
      }

      const val2025 = record.lfi_2025_cp_ou_prevision_2025_si_depense_fiscale || 0;
      const val2026 = record.plf_2026_cp_ou_prevision_2026_si_depense_fiscale || 0;

      aggregation[missionName].val2025 += val2025;
      aggregation[missionName].val2026 += val2026;
      
      // Store a few programs for breakdown
      if (aggregation[missionName].programs.length < 5) {
         aggregation[missionName].programs.push({
            name: record.programme || record.libelle,
            val2026: val2026
         });
      }
    });

    // 3. Format for dashboard
    const formattedData = Object.entries(aggregation).map(([name, data]) => ({
      mission: name,
      val2025: Math.round((data.val2025 / 1000000000) * 100) / 100, // Convert to Md€
      val2026: Math.round((data.val2026 / 1000000000) * 100) / 100,
      trend: data.val2026 >= data.val2025 ? 'up' : 'down',
      programs: data.programs.map(p => ({
         name: p.name,
         amount: `${Math.round((p.val2026 / 1000000000) * 100) / 100} Md€`
      }))
    }));

    // 4. Save to Supabase
    const { error } = await supabase
      .from('budget_sync')
      .insert({
        aggregated_data: formattedData,
        source_url: API_URL
      });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      count: allRecords.length,
      updated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
