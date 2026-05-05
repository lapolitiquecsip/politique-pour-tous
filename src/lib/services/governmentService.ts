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
      next: { revalidate: 86400 } // Cache 24h
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
      next: { revalidate: 86400 }
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
      const nomMinistere = min.Nom;
      // Le signataire peut être directement sous le ministère ou sous "Ministre"
      const details = min.Ministre || min;
      const nomMinistre = details.Signataire;
      const fonction = details.Fonction;
      
      if (nomMinistere && nomMinistre && fonction) {
        const missionId = matchMinistryToMissionId(nomMinistere);
        if (missionId) {
          // On ne garde que s'il y a un match avec nos missions (pour ne pas polluer)
          ministerList.push({
            missionId,
            ministryName: nomMinistere,
            ministerName: nomMinistre,
            role: fonction
          });
        }
      }
    };

    if (Array.isArray(ministeres)) {
      ministeres.forEach(processMinistere);
    } else {
      processMinistere(ministeres);
    }
    
    console.log(`[Gov API] ✅ ${ministerList.length} ministres associés aux missions.`);
    return ministerList;
    
  } catch (error) {
    console.error('[Gov API] Erreur lors de la récupération du gouvernement:', error);
    return [];
  }
}
