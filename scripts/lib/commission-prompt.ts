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

/** Version de la forme d'analyse. Une analyse d'une version antérieure est refaite. */
export const VERSION_ANALYSE = 2;

export const SHAPE = `Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "a_retenir": "UNE phrase : l'essentiel de la réunion, pour qui ne lira rien d'autre",
  "contexte": "2 à 3 phrases : de quoi traite la réunion, qui est entendu, pourquoi maintenant",
  "points_cles": ["6 à 12 points sur ce qui a RÉELLEMENT été dit, du plus important au moins important. Chaque point est une phrase complète qui nomme celui qui parle et donne le fait, le chiffre ou l'argument précis — jamais une généralité"],
  "annonces": ["annonces, engagements et calendriers donnés pendant la réunion, avec leur auteur : « M. X annonce… », « le Gouvernement s'engage à… d'ici… »"],
  "echanges": [{"question_de": "M./Mme Nom", "groupe": "groupe ou fonction, sinon chaîne vide", "question": "ce qui est demandé, précisément", "reponse_de": "M./Mme Nom", "reponse": "ce qui est répondu ; « pas de réponse » si la question est restée sans réponse"}],
  "desaccords": ["points de désaccord exprimés : qui s'oppose à qui, sur quoi"],
  "votes": [{"objet": "amendement, article ou texte mis aux voix", "resultat": "adopté, rejeté, retiré…", "detail": "précision utile, sinon chaîne vide"}],
  "chiffres": [{"valeur": "le chiffre tel qu'énoncé", "quoi": "ce qu'il mesure, avec l'exercice concerné"}],
  "positions": [{"orateur": "M./Mme Nom", "groupe": "groupe ou fonction, sinon chaîne vide", "position": "ce qu'il ou elle défend, en une ou deux phrases précises"}],
  "citations": [{"orateur": "M./Mme Nom", "texte": "citation exacte, 35 mots maximum"}],
  "suites": ["suites annoncées : rapport, vote, saisine, nouvelle audition, date"]
}
Volume attendu pour une audition d'une heure ou plus : au moins 8 points, 4 échanges, 4 positions et 4 citations quand le compte rendu les contient. "echanges" reprend les questions des parlementaires les plus substantielles et la réponse qui leur est faite. "votes" ne concerne que les réunions où l'on vote.`;

export type Analysis = {
  /** Version de la forme (VERSION_ANALYSE). */
  v?: number;
  a_retenir?: string;
  contexte?: string;
  points_cles?: string[];
  annonces?: string[];
  echanges?: { question_de: string; groupe?: string; question: string; reponse_de?: string; reponse?: string }[];
  desaccords?: string[];
  votes?: { objet: string; resultat: string; detail?: string }[];
  chiffres?: { valeur: string; quoi: string }[];
  positions?: { orateur: string; groupe?: string; position: string }[];
  citations?: { orateur: string; texte: string }[];
  suites?: string[];
  /** Le compte rendu tient en quelques lignes : il est montré tel quel, sans analyse. */
  court?: boolean;
  /** Le compte rendu intégral n'est pas encore publié par l'assemblée concernée. */
  attente?: boolean;
  source?: string;
};

/** En deçà de ce nombre de mots, il n'y a rien à analyser : on montre le texte. */
export const MOTS_MINIMUM = 220;

/** Le document dit lui-même que le compte rendu viendra plus tard. */
export const ANNONCE_ATTENTE = /sera publi[ée]e? ult[ée]rieurement|n'est pas (encore )?(retranscrit|disponible)|compte rendu (int[ée]gral )?(sera|est) (publi[ée]|mis en ligne) ult[ée]rieurement/i;

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
