import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key_to_prevent_build_error'; // ✅ Service role
const supabase = createClient(supabaseUrl, supabaseKey);

const GOV_API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/plf-2026-budget-vert/records?limit=-1'; // ✅ Tous les records
const CACHE_TTL_HOURS = 24;

/**
 * Récupère les données brutes depuis l'API officielle
 */
export async function fetchBudgetFromGov() {
  try {
    console.log('[Budget API] Fetching from data.economie.gouv.fr...');
    let allRecords: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const url = `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/plf-2026-budget-vert/records?limit=${limit}&offset=${offset}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const records = data.results || [];
      
      if (records.length > 0) {
        allRecords = allRecords.concat(records);
        offset += limit;
      } else {
        hasMore = false; // Plus de résultats
      }
      
      // Sécurité anti-boucle infinie (au cas où l'API est bloquée)
      if (offset > 15000) hasMore = false;
    }
    
    console.log(`[Budget API] ✅ Fetched ${allRecords.length} total records`);
    return allRecords;
  } catch (error) {
    console.error('[Budget API] ❌ Error fetching from gov API:', error);
    throw error;
  }
}

/**
 * Transforme les données brutes en format exploitable
 */
export function transformBudgetData(records: any[]) {
  console.log(`[Budget Transform] Processing ${records.length} records...`);
  const missionsMap = new Map();

  records.forEach((record) => {
    // Récupère le nom de la mission
    const missionName = record.mission || record.libelle_mission || record.mission_libelle;
    if (!missionName) return;

    // Génère un slug unique
    const slug = missionName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Enlève accents
      .replace(/[^a-z0-9]+/g, '-')      // Remplace espaces par -
      .replace(/^-+|-+$/g, '');          // Enlève - au début/fin

    // ✅ Récupère les VRAIES valeurs pour chaque année avec les noms exacts de l'API
    const amount2024 = parseFloat(record.execution_2024_cp || record.execution_2024 || record.cp_2024 || '0');
    const amount2025 = parseFloat(record.lfi_2025_cp_ou_prevision_2025_si_depense_fiscale || record.lfi_2025 || record.cp_2025 || '0');
    const amount2026 = parseFloat(record.plf_2026_cp_ou_prevision_2026_si_depense_fiscale || record.plf_2026 || record.cp_2026 || '0');

    // Agrège par mission
    if (missionsMap.has(slug)) {
      const existing = missionsMap.get(slug);
      existing.val2024 += (amount2024 / 1000000000); // Conversion en Md€
      existing.val2025 += (amount2025 / 1000000000);
      existing.val2026 += (amount2026 / 1000000000);
    } else {
      missionsMap.set(slug, {
        id: slug,
        mission: missionName,
        val2024: amount2024 / 1000000000,
        val2025: amount2025 / 1000000000,
        val2026: amount2026 / 1000000000,
      });
    }
  });

  // Calcule les tendances
  const missions = Array.from(missionsMap.values()).map(mission => ({
    ...mission,
    trend: mission.val2026 > mission.val2025 ? 'up' : 'down',
    updated_at: new Date().toISOString()
  }));

  console.log(`[Budget Transform] ✅ Transformed into ${missions.length} missions`);
  
  // LOGS DE VÉRIFICATION DEMANDÉS
  console.log('[Budget Transform] Échantillon des premières missions :');
  missions.slice(0, 5).forEach(m => {
    console.log(`${m.mission}: ${m.val2026.toFixed(2)} Md€ (2026)`);
  });

  return missions;
}

/**
 * Récupère les données (cache ou API)
 */
export async function getOrUpdateBudgetData() {
  try {
    // 1. Vérifie le cache Supabase
    console.log('[Budget Cache] Checking Supabase cache...');
    const { data: cachedSample, error: fetchError } = await supabase
      .from('budget_sync')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!fetchError && cachedSample && cachedSample.length > 0) {
      const lastUpdate = new Date(cachedSample[0].updated_at);
      const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

      // ✅ Cache encore frais (< 24h)
      if (hoursSinceUpdate < CACHE_TTL_HOURS) {
        console.log(`[Budget Cache] ✅ Using cache (${hoursSinceUpdate.toFixed(1)}h old)`);
        const { data: allCached } = await supabase
          .from('budget_sync')
          .select('*');
        return allCached || [];
      }

      console.log(`[Budget Cache] ⚠️ Cache expired (${hoursSinceUpdate.toFixed(1)}h old), refreshing...`);
    } else {
      console.log('[Budget Cache] ℹ️ No cache found, fetching fresh data...');
    }

    // 2. Récupère les données fraîches de l'API
    const rawData = await fetchBudgetFromGov();
    const transformedData = transformBudgetData(rawData);

    if (transformedData.length === 0) {
      console.warn('[Budget Cache] ⚠️ No data to cache, returning empty array');
      return [];
    }

    // 3. Supprime l'ancien cache
    console.log('[Budget Cache] Clearing old cache...');
    await supabase
      .from('budget_sync')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Sauvegarde les nouvelles données
    console.log('[Budget Cache] Saving fresh data to Supabase...');
    const { error: insertError } = await supabase
      .from('budget_sync')
      .insert(transformedData);

    if (insertError) {
      console.error('[Budget Cache] ❌ Error saving to cache:', insertError);
      // Continue quand même avec les données fraîches
    } else {
      console.log(`[Budget Cache] ✅ Cached ${transformedData.length} missions`);
    }

    return transformedData;

  } catch (error) {
    console.error('[Budget Cache] ❌ Critical error in getOrUpdateBudgetData:', error);
    
    // Fallback : retourne le cache même expiré plutôt qu'une erreur
    console.log('[Budget Cache] 🆘 Attempting fallback to old cache...');
    const { data: fallbackCache } = await supabase
      .from('budget_sync')
      .select('*');
    
    if (fallbackCache && fallbackCache.length > 0) {
      console.log(`[Budget Cache] ⚠️ Returning old cache (${fallbackCache.length} missions)`);
      return fallbackCache;
    }
    
    console.error('[Budget Cache] ❌ No fallback available, returning empty array');
    return [];
  }
}
