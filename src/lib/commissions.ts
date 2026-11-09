/**
 * Helpers partagés autour des comptes rendus de commission.
 *
 * Utilisés par le fil d'auditions (aperçu tout public) et par le suivi Pro
 * (analyse détaillée). Les données officielles arrivent avec des entités HTML
 * brutes et des titres noyés de formules juridiques : tout se nettoie ici.
 */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»",
  eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", rsquo: "’", hellip: "…",
  ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û", euml: "ë", iuml: "ï", uuml: "ü",
  acirc: "â", ugrave: "ù", Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç", Ecirc: "Ê",
  deg: "°", euro: "€", oelig: "œ", ndash: "–", mdash: "—", lsquo: "‘", ldquo: "“", rdquo: "”",
};

/** Décode les entités HTML restées brutes dans les données officielles (ex. « &#XA0; »). */
export function decode(s: string): string {
  return String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => NAMED[n] ?? NAMED[n.toLowerCase()] ?? m)
    .replace(/ /g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Extrait les personnes auditionnées/citées (« M./Mme Prénom Nom »), hors titres génériques. */
export function extractPeople(title: string, max = 3): string[] {
  const out: string[] = [];
  const re = /\b(M\.|Mme|Mlle|MM\.)\s+([A-ZÉÈÀÂÎÔ][\p{L}'’-]+(?:[-\s]+[A-ZÉÈÀÂÎÔ][\p{L}'’-]+)*)/gu;
  for (const m of title.matchAll(re)) {
    const name = m[2].trim();
    if (/^(le|la|les|Président|Rapporteur|Ministre)\b/i.test(name)) continue;
    const full = `${m[1]} ${name}`;
    if (!out.includes(full)) out.push(full);
  }
  return out.slice(0, max);
}

/** Titre court et explicite : décode, retire le charabia juridique et les clauses accessoires. */
export function cleanTitle(raw: string): string {
  let t = decode(raw).replace(/\s*;\s*/g, ", ");
  t = t.replace(/,?\s*en application de l['’]article[^,]*(?:du code[^,]*)?,?/gi, " ");
  t = t.replace(/,?\s*dont la nomination[^.]*/gi, "");
  t = t.replace(/,\s*(de|du|des|d['’])\s+(M\.|Mme|MM\.|Mlle)/g, " $1 $2");
  t = t.replace(/\s{2,}/g, " ").replace(/^[\s,]+/, "").replace(/[\s,]+$/, "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Réunion de commission";
}

/**
 * Nom de commission raccourci pour l'affichage en pastille.
 * « Commission des finances, de l'économie générale et du contrôle budgétaire »
 * devient « Finances ».
 */
export function shortCommission(raw: string | null): string {
  const full = decode(raw || "");
  if (!full) return "Commission";
  const m = full.match(/commission\s+(?:d[eu]s?\s+|de\s+la\s+|d['’])?(.+)/i);
  const rest = (m ? m[1] : full).trim();
  const head = rest.split(/,| et | de l| du | des /i)[0].trim();
  const label = head || rest;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Forme attendue de commission_reports.analysis (produit par le script d'ingestion). */
export type CommissionAnalysis = {
  /** Version de la forme : 2 ajoute « à retenir », annonces, échanges, désaccords, votes. */
  v?: number;
  a_retenir?: string;
  annonces?: string[];
  echanges?: { question_de: string; groupe?: string; question: string; reponse_de?: string; reponse?: string }[];
  desaccords?: string[];
  votes?: { objet: string; resultat: string; detail?: string }[];
  /** Compte rendu de quelques lignes : montré tel quel, sans analyse. */
  court?: boolean;
  /** Le compte rendu intégral n'est pas encore publié par l'assemblée. */
  attente?: boolean;
  /** Pas de compte rendu écrit : la vidéo de la réunion va être transcrite. */
  a_transcrire?: boolean;
  source?: string;
  contexte?: string;
  points_cles?: string[];
  chiffres?: { valeur: string; quoi: string }[];
  positions?: { orateur: string; groupe?: string; position: string }[];
  suites?: string[];
  citations?: { orateur: string; texte: string }[];
  /** Réunion transcrite depuis sa vidéo : chaque propos est rangé sous l'orateur indexé par l'Assemblée. */
  orateurs?: boolean;
  /** Page de la vidéo transcrite. */
  video?: string;
  /** Déroulé en chapitres (réunions transcrites) : instant de début en secondes dans la vidéo. */
  sommaire?: { t: number; titre: string; resume: string }[];
};

/**
 * Lien vers la vidéo d'une réunion de l'Assemblée, ouverte à un instant précis.
 *
 * Le lecteur de l'Assemblée n'accepte pas un nombre de secondes mais l'identifiant d'un de ses
 * repères (`?timecode=<repère>`) : chaque prise de parole en a un, et il en existe un par minute,
 * formé du numéro de la vidéo suivi des secondes sur cinq chiffres (19678322 + 01500).
 */
export function lienInstant(page: string, t: number, repere?: string | null): string {
  const base = page.split(/[?#]/)[0];
  if (repere) return `${base}?timecode=${repere}`;
  const numero = base.match(/\/video\.(\d+)_/)?.[1];
  if (!numero) return base;
  return `${base}?timecode=${numero}${String(Math.max(0, Math.floor(t / 60) * 60)).padStart(5, "0")}`;
}

/** 4 523 s → « 1:15:23 » ; 523 s → « 8:43 ». */
export function fmtInstant(t: number): string {
  const s = Math.max(0, Math.round(t));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export type CommissionMeeting = {
  ref: string;
  chamber?: "AN" | "SENAT";
  commission: string | null;
  title: string | null;
  meeting_date: string | null;
  cr_url: string | null;
  video_url: string | null;
  summary: string | null;
  analysis?: CommissionAnalysis | null;
  speakers?: { name: string; role?: string; turns?: number }[] | null;
  topics?: string[] | null;
};

export const fmtMeetingDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
