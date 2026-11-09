/**
 * L'index d'une vidéo de commission : qui parle, et à quel instant (Assemblée nationale et Sénat).
 *
 * Les deux assemblées utilisent le même lecteur (Vodalys). Il découpe chaque réunion en prises
 * de parole, saisies par leurs services : « M. Stéphane Travert, président cio aff. éco. » à
 * 22 min 08, « Thierry COZIC » à 23 min 21… avec l'identifiant de chaque parlementaire (PA607395
 * pour un député, le matricule 20070A pour un sénateur). Deux fichiers publics le portent :
 *
 *   Datas/{an|senat}/{uid}/content/data.nvs         chapitres emboîtés et liste des orateurs
 *   Datas/{an|senat}/{uid}/content/finalplayer.nvs  instant (ms) de chaque chapitre
 *
 * Le Sénat publie en plus sa propre transcription horodatée (files/transcript.srt), décalée de
 * l'attribut `starttime` du lecteur. L'Assemblée n'en publie pas : il faut transcrire l'audio.
 *
 * C'est ce qui permet de rendre une transcription automatique lisible comme un compte rendu :
 * chaque phrase est rangée sous l'orateur que l'assemblée elle-même a indexé, sans rien deviner.
 */

const NAVIGATEUR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export type Intervention = {
  /** Identifiant du repère : `?timecode=<id>` ouvre la vidéo à cet instant. */
  id: string;
  /** Instant de début, en secondes depuis le début de la vidéo. */
  t: number;
  nom: string;
  /** Fonction telle que l'index la donne (« président de la commission des finances »), sinon "". */
  fonction: string;
  /** Identifiant du parlementaire : « PA607395 » (député) ou matricule « 20070A » (sénateur). */
  ident: string | null;
};
/** Intertitre : un point de l'ordre du jour, ou un temps de la réunion. `niveau` 0 = point de l'ordre du jour. */
export type Section = { t: number; titre: string; niveau: number };
export type Chambre = "AN" | "SENAT";
export type IndexVideo = {
  chambre: Chambre;
  uid: string;
  page: string;
  mp4: string | null;
  /** Début de la lecture (le Sénat filme avant l'ouverture), en secondes. */
  debutLecture: number;
  /** Fin de la vidéo, en secondes. */
  fin: number;
  interventions: Intervention[];
  sections: Section[];
};

function decoder(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

/** « Thierry COZIC » → « Thierry Cozic » ; « Anne LE HÉNANFF » → « Anne Le Hénanff ». */
function casse(nom: string): string {
  return nom.replace(/\p{Lu}[\p{Lu}'’-]+/gu, mot => mot.toLowerCase().replace(/(^|[\s'’-])(\p{Ll})/gu, (_, sep, l) => sep + l.toUpperCase()));
}

/** « président cio aff. éco. » → « président de la commission des affaires économiques ». */
function deplier(fonction: string): string {
  // Les abréviations d'affaires d'abord : « éco. » contient « co. », que la règle de « cio »
  // prendrait sinon pour « commission ».
  return fonction
    .replace(/\baff\.\s*[ée]co\.?/gi, "des affaires économiques")
    .replace(/\baff\.\s*cult\.?/gi, "des affaires culturelles")
    .replace(/\baff\.\s*soc\.?/gi, "des affaires sociales")
    .replace(/\baff\.\s*[ée]trang\.?/gi, "des affaires étrangères")
    .replace(/\baff\.\s*europ\.?/gi, "des affaires européennes")
    .replace(/(^|\s)(pr[ée]sidente?)\s+ci?on?\.?(?=\s|$)/gi, "$1$2 de la commission")
    .replace(/(^|\s)ci?on?\.?(?=\s|$)/gi, "$1commission")
    .replace(/\bcommission\s+finances\b/gi, "commission des finances")
    .replace(/\bcommission\s+(lois|défense)\b/gi, "commission des $1")
    .replace(/\s+/g, " ").trim();
}

async function lire(url: string): Promise<string> {
  let derniere: unknown;
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": NAVIGATEUR }, signal: AbortSignal.timeout(90_000) });
      if (r.status === 404) throw Object.assign(new Error(`HTTP 404 ${url.slice(0, 120)}`), { definitif: true });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url.slice(0, 120)}`);
      return await r.text();
    } catch (e) {
      derniere = e;
      if ((e as any).definitif) break;
      await new Promise(x => setTimeout(x, 4000 * essai));
    }
  }
  throw derniere;
}

/** « …/video.19678322_6aeae3b625476.commission-des-… » → « 19678322_6aeae3b625476 ». */
export function uidDeLaPage(page: string): string | null {
  return page.match(/\/video\.(\d+_[0-9a-f]+)/i)?.[1] ?? null;
}

function racine(page: string): { chambre: Chambre; datas: string } {
  const senat = /videos\.senat\.fr/i.test(page);
  return senat
    ? { chambre: "SENAT", datas: "https://videos.senat.fr/Datas/senat" }
    : { chambre: "AN", datas: "https://videos.assemblee-nationale.fr/Datas/an" };
}

export async function indexVideo(page: string): Promise<IndexVideo> {
  const uid = uidDeLaPage(page);
  if (!uid) throw new Error(`adresse de vidéo inattendue : ${page.slice(0, 100)}`);
  const { chambre, datas } = racine(page);
  const base = `${datas}/${uid}/content`;
  const [html, data, player] = await Promise.all([
    lire(page),
    lire(`${base}/data.nvs`).catch(() => ""),
    lire(`${base}/finalplayer.nvs`).catch(() => ""),
  ]);
  const mp4 = html.match(/https?:\/\/[^"'\s&]+\.mp4/)?.[0]?.replace(/^http:/, "https:") ?? null;

  const instants = new Map<string, number>();
  for (const m of player.matchAll(/<synchro id="(\d+)" timecode="(\d+)"/g)) instants.set(m[1], Number(m[2]) / 1000);
  const fin = Number(player.match(/endtime="(\d+)"/)?.[1] ?? 0) / 1000;
  const debutLecture = Number(player.match(/starttime="(\d+)"/)?.[1] ?? 0) / 1000;

  const orateurs = new Map<string, { nom: string; role: string; ident: string | null }>();
  for (const m of data.matchAll(/<speaker id="(\d+)">([\s\S]*?)<\/speaker>/g)) {
    const corps = m[2];
    const nom = decoder(corps.match(/<name>([^<]*)<\/name>/)?.[1] ?? "");
    const role = decoder(corps.match(/<role>([^<]*)<\/role>/)?.[1] ?? "");
    const url = corps.match(/<url>([^<]+)<\/url>/)?.[1]?.trim() ?? null;
    orateurs.set(m[1], { nom, role, ident: url ? (chambre === "AN" ? `PA${url}` : url) : null });
  }

  // Les chapitres sont emboîtés : un point de l'ordre du jour contient ses prises de parole.
  // Un chapitre qui contient d'autres chapitres est un intertitre (au Sénat, il porte aussi la
  // liste de TOUS ses orateurs) ; un chapitre feuille qui porte un orateur est une intervention.
  const interventions: Intervention[] = [];
  const sections: Section[] = [];
  const pile: { id: string; label: string; orateur: string | null; enfants: boolean }[] = [];
  const fermer = () => {
    const c = pile.pop();
    if (!c) return;
    const t = instants.get(c.id);
    if (t === undefined) return;
    if (c.orateur && !c.enfants) {
      const o = orateurs.get(c.orateur);
      const virgule = c.label.indexOf(",");
      const brute = virgule > 0 ? deplier(c.label.slice(virgule + 1).replace(/\.$/, "")) : (o?.role ?? "");
      // « Sénateur » ou « Député » n'apprend rien : le groupe s'affiche à côté du nom.
      const fonction = /^(s[ée]nat(eur|rice)|d[ée]put[ée]e?)$/i.test(brute) ? "" : brute;
      const nom = chambre === "SENAT" ? casse(virgule > 0 ? c.label.slice(0, virgule) : c.label) : (o?.nom || (virgule > 0 ? c.label.slice(0, virgule) : c.label));
      interventions.push({ id: c.id, t, nom, fonction, ident: o?.ident ?? null });
    } else if (c.label) {
      sections.push({ t, titre: c.label, niveau: pile.length });
    }
  };
  const chapitres = data.split(/<chapters>/)[1]?.split(/<\/chapters>/)[0] ?? "";
  for (const m of chapitres.matchAll(/<chapter id="(\d+)" label="([^"]*)"\s*(\/?)>|<\/chapter>|<speaker id="(\d+)"\/>/g)) {
    if (m[1]) {
      if (pile.length) pile[pile.length - 1].enfants = true;
      pile.push({ id: m[1], label: decoder(m[2]), orateur: null, enfants: false });
      if (m[3] === "/") fermer();
    } else if (m[4]) {
      if (pile.length && !pile[pile.length - 1].orateur) pile[pile.length - 1].orateur = m[4];
    } else {
      fermer();
    }
  }
  interventions.sort((a, b) => a.t - b.t);
  sections.sort((a, b) => a.t - b.t);
  return { chambre, uid, page, mp4, debutLecture, fin, interventions, sections };
}

/** Transcription publiée par le Sénat (SRT), recalée sur l'horloge de la vidéo. Vide si absente. */
export async function transcriptionSenat(idx: IndexVideo): Promise<{ start: number; end: number; text: string }[]> {
  if (idx.chambre !== "SENAT") return [];
  const srt = await lire(`${racine(idx.page).datas}/${idx.uid}/files/transcript.srt`).catch(() => "");
  const enS = (h: string, m: string, s: string, ms: string) => Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  const out: { start: number; end: number; text: string }[] = [];
  for (const bloc of srt.replace(/\r/g, "").split(/\n{2,}/)) {
    const m = bloc.match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)\s*\n([\s\S]+)/);
    if (!m) continue;
    const text = m[9].replace(/\n/g, " ").replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    out.push({ start: enS(m[1], m[2], m[3], m[4]) + idx.debutLecture, end: enS(m[5], m[6], m[7], m[8]) + idx.debutLecture, text });
  }
  return out;
}

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MOTS_VIDES = new Set(["audition", "auditions", "projet", "proposition", "mission", "examen", "rapport", "commission",
  "ministre", "ministere", "president", "presidente", "general", "generale", "delegue", "deleguee", "chargee", "charge",
  "nationale", "republique", "candidat", "candidate", "fonctions", "nomination", "conjointe", "ouverte", "presse"]);
const reperes = (s: string) => new Set(sansAccent(s).split(/[^a-z0-9]+/).filter(w => w.length >= 5 && !MOTS_VIDES.has(w)));

/**
 * Quand une vidéo couvre plusieurs points de l'ordre du jour, ne garder que celui de la réunion.
 * Rend null si aucun point ne correspond sans ambiguïté à l'intitulé.
 */
export function restreindre(idx: IndexVideo, titre: string): IndexVideo | null {
  const points = idx.sections.filter(s => s.niveau === 0);
  if (points.length < 2) return idx;
  const cherche = reperes(titre);
  const scores = points.map(p => {
    const r = reperes(p.titre);
    let n = 0;
    for (const w of cherche) if (r.has(w)) n++;
    return n / Math.max(1, Math.min(cherche.size, r.size));
  });
  const meilleur = Math.max(...scores);
  const rang = scores.indexOf(meilleur);
  if (meilleur < 0.5 || scores.filter(s => s === meilleur).length > 1) return null;
  const debut = points[rang].t;
  const fin = points[rang + 1]?.t ?? (idx.fin || Infinity);
  return {
    ...idx,
    fin: Number.isFinite(fin) ? fin : idx.fin,
    interventions: idx.interventions.filter(p => p.t >= debut - 1 && p.t < fin),
    sections: idx.sections.filter(s => s.t >= debut - 1 && s.t < fin),
  };
}
