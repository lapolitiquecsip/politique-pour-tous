/**
 * L'index d'une vidéo du portail de l'Assemblée nationale : qui parle, et à quel instant.
 *
 * Le lecteur vidéo de l'Assemblée (Vodalys) découpe chaque réunion en prises de parole, saisies
 * par ses services : « M. Stéphane Travert, président cio aff. éco. » à 22 min 08, « M. Nicolas
 * Dufourcq » à 24 min 43… avec, pour chaque député, son identifiant (PA607395). Deux fichiers
 * publics le portent, à côté de la vidéo :
 *
 *   Datas/an/{uid}/content/data.nvs         les chapitres, emboîtés, et la liste des orateurs
 *   Datas/an/{uid}/content/finalplayer.nvs  l'instant (en millisecondes) de chaque chapitre
 *
 * C'est ce qui permet de rendre une transcription automatique lisible comme un compte rendu :
 * chaque phrase est rangée sous l'orateur que l'Assemblée elle-même a indexé, sans rien deviner.
 */

const PORTAIL = "https://videos.assemblee-nationale.fr";
const NAVIGATEUR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export type Intervention = {
  /** Identifiant du repère : `?timecode=<id>` ouvre la vidéo à cet instant. */
  id: string;
  /** Instant de début, en secondes depuis le début de la vidéo. */
  t: number;
  nom: string;
  /** Fonction telle que l'index la donne (« président de la commission des finances »), sinon "". */
  fonction: string;
  /** Identifiant Assemblée du député (« PA607395 »), absent pour une personne auditionnée. */
  an_id: string | null;
};
export type Section = { t: number; titre: string };
export type IndexVideo = {
  uid: string;
  page: string;
  mp4: string | null;
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

export async function indexVideo(page: string): Promise<IndexVideo> {
  const uid = uidDeLaPage(page);
  if (!uid) throw new Error(`adresse de vidéo inattendue : ${page.slice(0, 100)}`);
  const base = `${PORTAIL}/Datas/an/${uid}/content`;
  const [html, data, player] = await Promise.all([
    lire(page),
    lire(`${base}/data.nvs`).catch(() => ""),
    lire(`${base}/finalplayer.nvs`).catch(() => ""),
  ]);
  const mp4 = html.match(/https?:\/\/[^"'\s&]+\.mp4/)?.[0]?.replace(/^http:/, "https:") ?? null;

  const instants = new Map<string, number>();
  for (const m of player.matchAll(/<synchro id="(\d+)" timecode="(\d+)"/g)) instants.set(m[1], Number(m[2]) / 1000);
  const fin = Number(player.match(/endtime="(\d+)"/)?.[1] ?? 0) / 1000;

  const orateurs = new Map<string, { nom: string; an_id: string | null }>();
  for (const m of data.matchAll(/<speaker id="(\d+)">\s*<name>([^<]*)<\/name>[\s\S]*?(?:<url>(\d+)<\/url>[\s\S]*?)?<\/speaker>/g)) {
    orateurs.set(m[1], { nom: decoder(m[2]), an_id: m[3] ? `PA${m[3]}` : null });
  }

  // Les chapitres sont emboîtés : un point de l'ordre du jour contient ses prises de parole.
  // Un chapitre qui porte un orateur est une intervention ; les autres sont des intertitres.
  const interventions: Intervention[] = [];
  const sections: Section[] = [];
  const pile: { id: string; label: string; orateur: string | null }[] = [];
  const fermer = () => {
    const c = pile.pop();
    if (!c) return;
    const t = instants.get(c.id);
    if (t === undefined) return;
    if (c.orateur) {
      const o = orateurs.get(c.orateur);
      const virgule = c.label.indexOf(",");
      const fonction = virgule > 0 ? deplier(c.label.slice(virgule + 1).replace(/\.$/, "")) : "";
      interventions.push({ id: c.id, t, nom: o?.nom || (virgule > 0 ? c.label.slice(0, virgule) : c.label), fonction, an_id: o?.an_id ?? null });
    } else if (c.label) {
      sections.push({ t, titre: c.label });
    }
  };
  const chapitres = data.split(/<chapters>/)[1]?.split(/<\/chapters>/)[0] ?? "";
  for (const m of chapitres.matchAll(/<chapter id="(\d+)" label="([^"]*)"\s*(\/?)>|<\/chapter>|<speaker id="(\d+)"\/>/g)) {
    if (m[1]) {
      pile.push({ id: m[1], label: decoder(m[2]), orateur: null });
      if (m[3] === "/") fermer();
    } else if (m[4]) {
      if (pile.length) pile[pile.length - 1].orateur = m[4];
    } else {
      fermer();
    }
  }
  interventions.sort((a, b) => a.t - b.t);
  sections.sort((a, b) => a.t - b.t);
  return { uid, page, mp4, fin, interventions, sections };
}
