import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function syncTerritoryPresidents() {
  console.log('[Territory Sync] Démarrage de la synchronisation RNE...');

  try {
    // 1. Récupérer les URLs des CSV depuis l'API data.gouv.fr
    const datasetRes = await fetch('https://www.data.gouv.fr/api/1/datasets/repertoire-national-des-elus-1/', {
      next: { revalidate: 3600 }
    });
    if (!datasetRes.ok) throw new Error('Impossible de contacter data.gouv.fr');
    const dataset = await datasetRes.json();

    const resources = dataset.resources;
    const depResource = resources.find((r: any) => /d.partementaux/i.test(r.title) && r.format === 'csv');
    const regResource = resources.find((r: any) => /r.gionaux/i.test(r.title) && r.format === 'csv');

    if (!depResource || !regResource) throw new Error('Ressources RNE non trouvées');

    console.log(`[Territory Sync] URLs trouvées - DEP: ${depResource.url}, REG: ${regResource.url}`);

    // 2. Traiter les départements
    await processRNEFile(depResource.url, 'department');

    // 3. Traiter les régions
    await processRNEFile(regResource.url, 'region');

    console.log('[Territory Sync] ✅ Synchronisation terminée avec succès.');
    return { success: true };

  } catch (error) {
    console.error('[Territory Sync] ❌ Erreur lors de la synchronisation:', error);
    return { success: false, error };
  }
}

async function processRNEFile(url: string, type: 'region' | 'department') {
  console.log(`[Territory Sync] Traitement du fichier ${type}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossible de télécharger le fichier ${type}`);

  const text = await res.text();
  const lines = text.split('\n');
  const header = lines[0].split(';').map(h => h.replace(/"/g, '').trim());

  // Trouver les index des colonnes de manière robuste
  const codeIdx = header.findIndex(h => h.startsWith('Code d') && (h.includes('région') || h.includes('département')));
  const nameIdx = header.findIndex(h => h.startsWith('Libellé d') && (h.includes('région') || h.includes('département')));
  const nomIdx = header.findIndex(h => h === "Nom de l'élu");
  const prenomIdx = header.findIndex(h => h === "Prénom de l'élu");
  const fonctionIdx = header.findIndex(h => h.toLowerCase().includes('fonction'));
  const nuanceIdx = header.findIndex(h => h.toLowerCase().includes('nuance'));

  const presidents: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = lines[i].split(';').map(c => c.replace(/"/g, '').trim());

    const fonction = cells[fonctionIdx];
    // Pour les départements: "Président du conseil départemental"
    // Pour les régions: "Président du conseil régional"
    if (fonction && (fonction.includes('Président du conseil') || fonction.includes('Présidente du conseil'))) {
      const code = cells[codeIdx]?.replace(/"/g, '').padStart(2, '0');
      const name = cells[nameIdx]?.replace(/"/g, '');
      const president = `${cells[prenomIdx]?.replace(/"/g, '')} ${cells[nomIdx]?.replace(/"/g, '')}`;
      const party = cells[nuanceIdx]?.replace(/"/g, '');

      presidents.push({
        id: code,
        name,
        type,
        president,
        party,
        updated_at: new Date().toISOString()
      });
    }
  }

  console.log(`[Territory Sync] ${presidents.length} présidents trouvés pour ${type}.`);

  // 4. Upsert dans Supabase
  for (const p of presidents) {
    const { error } = await supabase
      .from('territories')
      .upsert(p, { onConflict: 'id' });
    
    if (error) {
      console.warn(`[Territory Sync] Erreur upsert pour ${p.name}:`, error.message);
    }
  }
}
