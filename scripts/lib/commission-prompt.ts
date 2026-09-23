/**
 * Consigne d'analyse d'une réunion de commission, et garde-fou sur les citations.
 *
 * Partagés entre l'analyse des comptes rendus écrits et celle des auditions transcrites
 * depuis la vidéo : les deux doivent se lire pareil, et une consigne recopiée finirait
 * par diverger de l'autre.
 */

export const SYSTEM = `Tu analyses des comptes rendus de commissions parlementaires françaises pour des professionnels de la politique : collaborateurs parlementaires, directions des affaires publiques, journalistes.

Règles absolues :
- Tu ne rapportes QUE ce qui figure dans le compte rendu. Aucune connaissance extérieure, aucune extrapolation, aucun commentaire de ta part.
- Tu restes strictement neutre : tu rapportes les positions, tu ne les évalues pas.
- Les citations sont recopiées MOT POUR MOT depuis le compte rendu. Si tu n'es pas certain d'un extrait, tu ne le cites pas.
- Chaque chiffre est rattaché à l'exercice dont le compte rendu le date.
- Un champ sans matière dans le compte rendu reste un tableau vide. Ne jamais combler un vide.
- Tes lecteurs connaissent le vocabulaire parlementaire : sois précis et dense, pas pédagogique.`;

export const SHAPE = `Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "contexte": "2 à 3 phrases : de quoi traite la réunion, qui est auditionné, pourquoi maintenant",
  "points_cles": ["5 à 9 points sur ce qui a RÉELLEMENT été dit, du plus important au moins important"],
  "chiffres": [{"valeur": "le chiffre tel qu'énoncé", "quoi": "ce qu'il mesure, avec l'exercice concerné"}],
  "positions": [{"orateur": "M./Mme Nom", "groupe": "groupe ou fonction, sinon chaîne vide", "position": "ce qu'il ou elle défend"}],
  "citations": [{"orateur": "M./Mme Nom", "texte": "citation exacte, 30 mots maximum"}],
  "suites": ["suites annoncées : rapport, vote, saisine, nouvelle audition"]
}`;

export type Analysis = {
  contexte?: string;
  points_cles?: string[];
  chiffres?: { valeur: string; quoi: string }[];
  positions?: { orateur: string; groupe?: string; position: string }[];
  citations?: { orateur: string; texte: string }[];
  suites?: string[];
};

/** Normalisation tolérante : accents, ponctuation et espaces ne doivent pas faire échouer une comparaison. */
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * GARDE-FOU : une citation absente du compte rendu est SUPPRIMÉE.
 *
 * C'est la protection la plus importante du produit. Un abonné professionnel qui
 * repère un verbatim inventé ne revient pas. On tolère une correspondance partielle
 * (le modèle coupe parfois une incise), mais rien qui ne se retrouve pas dans le texte.
 */
export function dropInventedQuotes(analysis: Analysis, transcript: string): { analysis: Analysis; dropped: number } {
  const hay = normalize(transcript);
  const kept: { orateur: string; texte: string }[] = [];
  let dropped = 0;

  for (const c of analysis.citations ?? []) {
    const needle = normalize(c.texte ?? "");
    if (!needle) { dropped++; continue; }
    const words = needle.split(" ");
    // Les 60 % premiers mots suffisent : ils ancrent la citation dans le texte réel.
    const anchor = words.slice(0, Math.max(4, Math.floor(words.length * 0.6))).join(" ");
    if (hay.includes(needle) || hay.includes(anchor)) kept.push(c);
    else dropped++;
  }

  return { analysis: { ...analysis, citations: kept }, dropped };
}
