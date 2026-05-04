import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import https from 'https';

const AGGREGATED_API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/plf-2026-budget-vert/records?group_by=mission,programme&select=sum(plf_2026_cp_ou_prevision_2026_si_depense_fiscale)%20as%20val2026,sum(lfi_2025_cp_ou_prevision_2025_si_depense_fiscale)%20as%20val2025,sum(execution_2024_cp)%20as%20val2024&limit=500';

function fetchGovData(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Invalid JSON response from Gov API"));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  try {
    // Utilisation de https natif pour bypasser les limitations de fetch sur Vercel
    const data = await fetchGovData(AGGREGATED_API_URL);
    const results = data.results as any[];

    if (!results || results.length === 0) {
       return NextResponse.json({ success: false, error: "No data received from Gov API" });
    }

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
      
      if (record.programme && aggregation[missionName].programs.length < 8 && v2026 > 0) {
         aggregation[missionName].programs.push({
            name: record.programme,
            amount: `${Math.round((v2026 / 1000000000) * 100) / 100} Md€`
         });
      }
    });

    const formattedData = Object.entries(aggregation).map(([name, data]) => ({
      mission: name,
      val2024: Math.round((data.val2024 / 1000000000) * 100) / 100,
      val2025: Math.round((data.val2025 / 1000000000) * 100) / 100,
      val2026: Math.round((data.val2026 / 1000000000) * 100) / 100,
      trend: data.val2026 >= data.val2025 ? 'up' : 'down',
      programs: data.programs
    }));

    const { error: dbError } = await supabase
      .from('budget_sync')
      .insert({
        aggregated_data: formattedData,
        source_url: AGGREGATED_API_URL
      });

    if (dbError) throw dbError;

    return NextResponse.json({ 
      success: true, 
      mission_count: formattedData.length,
      updated_at: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
