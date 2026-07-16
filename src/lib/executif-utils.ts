// Nettoie les noms de ministères issus de l'open data (espaces manquants, virgules collées,
// apostrophes typographiques) et met une majuscule initiale.
export function cleanMinistryName(name: string | null | undefined): string {
  if (!name) return "";
  const s = name
    .replace(/’/g, "'")
    .replace(/,(?=\S)/g, ", ")             // virgule collée → ", "
    // mots collés observés dans la source (espace manquant avant la conjonction)
    .replace(/biodiversité *et\b/gi, "biodiversité et")
    .replace(/finances *et\b/gi, "finances et")
    .replace(/alimentaire *et\b/gi, "alimentaire et")
    .replace(/territoire *et\b/gi, "territoire et")
    .replace(/jeunesse *et\b/gi, "jeunesse et")
    .replace(/supérieur *de\b/gi, "supérieur, de")
    .replace(/\s+/g, " ")
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Mappe un ministère vers sa mission budgétaire principale (PLF).
const MINISTRY_MISSION: Array<[RegExp, RegExp]> = [
  [/int[ée]rieur/i, /^Sécurités$/],
  [/arm[ée]es|défense/i, /^Défense$/],
  [/travail|solidarit/i, /^Travail, emploi/],
  [/écologi|transition|transport/i, /^Écologie/],
  [/justice/i, /^Justice$/],
  [/enseignement sup|recherche/i, /^Recherche et enseignement supérieur$/],
  [/éducation nationale/i, /^Enseignement scolaire$/],
  [/europe|affaires étrangères/i, /^Action extérieure/],
  [/agriculture/i, /^Agriculture/],
  [/sant[ée]/i, /^Santé$/],
  [/culture/i, /^Culture$/],
  [/outre-mer/i, /^Outre-mer$/],
  [/am[ée]nagement|ville|logement|territoire|décentralisation/i, /^Cohésion des territoires$/],
  [/comptes publics|action et/i, /^Gestion des finances publiques$/],
  [/sport|jeunesse/i, /^Sport, jeunesse/],
  [/[ée]conomie|finance/i, /^Économie$/],
];

export function findMinistryBudget(ministryName: string, missions: any[]): any | null {
  if (!ministryName || !missions?.length) return null;
  for (const [minRe, misRe] of MINISTRY_MISSION) {
    if (minRe.test(ministryName)) {
      const m = missions.find((x: any) => misRe.test(x.name || ""));
      if (m) return m;
    }
  }
  return null;
}
