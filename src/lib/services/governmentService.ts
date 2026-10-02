import { XMLParser } from 'fast-xml-parser';

export type Minister = {
  missionId: string;
  ministerName: string;
  role: string;
  ministryName: string;
};

// Mapping dictionnaire : Mots clés dans le nom du ministère XML -> ID de la mission dans notre Dashboard
const MINISTRY_TO_MISSION_MAP: Record<string, string> = {
  'intérieur': 'interieur-securites-&-admin',
  'armées': 'defense-armees',
  'justice': 'justice',
  'éducation nationale': 'education-nationale',
  'économie': 'economie',
  'finances': 'gestion-des-finances-publiques',
  'travail': 'travail-et-emploi',
  'solidarités': 'solidarite-insertion-et-egalite-des-chances',
  'écologie': 'ecologie-developpement-et-mobilite-durables',
  'transition écologique': 'ecologie-developpement-et-mobilite-durables',
  'agriculture': 'agriculture-alimentation-foret-et-affaires-rurales',
  'culture': 'culture',
  'enseignement supérieur': 'enseignement-superieur-et-recherche',
  'outre-mer': 'outre-mer',
  'sports': 'sport-jeunesse-et-vie-associative',
  'jeunesse': 'sport-jeunesse-et-vie-associative',
  'affaires étrangères': 'action-exterieure-de-l-etat',
  'premier ministre': 'direction-de-l-action-du-gouvernement',
};

function matchMinistryToMissionId(ministryName: string): string | null {
  const normalized = ministryName.toLowerCase();
  for (const [keyword, missionId] of Object.entries(MINISTRY_TO_MISSION_MAP)) {
    if (normalized.includes(keyword)) {
      return missionId;
    }
  }
  return null;
}

export async function fetchGovernmentComposition(): Promise<Minister[]> {
  try {
    console.log('[Gov API] Recherche du dernier fichier de composition gouvernementale...');
    
    // 1. Chercher le dataset Protocole du Gouvernement sur data.gouv.fr
    const catalogRes = await fetch('https://www.data.gouv.fr/api/1/datasets/?q=protocole+du+gouvernement', {
      next: { revalidate: 86400 }, // Cache 24h
      signal: AbortSignal.timeout(20000),
    });
    
    if (!catalogRes.ok) throw new Error('Impossible de contacter data.gouv.fr');
    const catalogData = await catalogRes.json();
    
    // 2. Trouver l'URL du fichier XML
    const dataset = catalogData.data[0];
    if (!dataset) throw new Error('Dataset Protocole non trouvé');
    
    const xmlResource = dataset.resources.find((r: any) => r.format === 'xml');
    if (!xmlResource) throw new Error('Fichier XML non trouvé dans le dataset');
    
    console.log(`[Gov API] Téléchargement du fichier XML : ${xmlResource.url}`);
    
    // 3. Télécharger le XML
    const xmlRes = await fetch(xmlResource.url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(30000),
    });
    if (!xmlRes.ok) throw new Error('Impossible de télécharger le fichier XML');
    
    const xmlText = await xmlRes.text();
    
    // 4. Parser le XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix : "@_"
    });
    const parsed = parser.parse(xmlText);
    
    const gouvernements = parsed.Gouvernements?.Gouvernement;
    if (!gouvernements) throw new Error('Structure XML inattendue');
    
    // Si c'est un tableau, prendre le dernier. Si c'est un seul objet, le prendre directement.
    const latestGov = Array.isArray(gouvernements) ? gouvernements[gouvernements.length - 1] : gouvernements;
    
    console.log(`[Gov API] Données extraites pour : ${latestGov.description}`);
    
    const ministeres = latestGov.Ministere;
    const ministerList: Minister[] = [];
    
    // 5. Parcourir les ministères et extraire les ministres
    const processMinistere = (min: any) => {
      if (!min) return;
      
      const extractText = (val: any) => {
        if (!val) return "";
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && val['#text']) return val['#text'];
        return String(val);
      };

      const nomMinistere = extractText(min.Nom);
      
      // Le signataire peut être directement sous le ministère ou sous "Ministre"
      const details = min.Ministre || min;
      const nomMinistre = extractText(details.Signataire);
      const fonction = extractText(details.Fonction);
      
      if (nomMinistere && nomMinistre && fonction) {
        const missionId = matchMinistryToMissionId(nomMinistere);
        ministerList.push({
          missionId: missionId || 'unassigned',
          ministryName: nomMinistere,
          ministerName: nomMinistre,
          role: fonction
        });
      }
    };

    if (Array.isArray(ministeres)) {
      ministeres.forEach(processMinistere);
    } else {
      processMinistere(ministeres);
    }
    
    console.log(`[Gov API] ✅ ${ministerList.length} ministres associés aux missions.`);
    if (ministerList.length) return ministerList;
    return await compositionDepuisLaBase();

  } catch (error) {
    console.error('[Gov API] Fichier de la DILA indisponible — composition lue dans la base du site.', (error as Error)?.message);
    return await compositionDepuisLaBase();
  }
}

/**
 * Secours : la composition du gouvernement telle qu'enregistrée dans la base du site
 * (fonction publique `public_government`, clé publique).
 *
 * Les pages des ministères sont générées à la compilation à partir du fichier de la
 * DILA. Le 2 octobre 2026, son serveur (echanges.dila.gouv.fr) coupait toutes les
 * connexions : la liste revenait vide, et l'export statique refusait de compiler —
 * deux déploiements perdus. La base, elle, porte les mêmes noms de ministères que
 * ceux dont la page Exécutif tire ses liens : les adresses restent donc les bonnes.
 */
async function compositionDepuisLaBase(): Promise<Minister[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) return [];
  try {
    const r = await fetch(`${url}/rest/v1/rpc/public_government`, {
      method: 'POST',
      headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_date: new Date().toISOString().slice(0, 10) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return [];
    const gouvernement = await r.json();
    const membres: any[] = gouvernement?.members ?? [];
    const liste = membres
      .filter(m => m.ministry_name)
      .map(m => ({
        missionId: matchMinistryToMissionId(m.ministry_name) ?? '',
        ministerName: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(),
        role: m.title ?? '',
        ministryName: m.ministry_name,
      }));
    console.log(`[Gov API] ✅ ${liste.length} ministres lus dans la base (secours).`);
    return liste;
  } catch (e) {
    console.error('[Gov API] Secours indisponible :', (e as Error)?.message);
    return [];
  }
}
