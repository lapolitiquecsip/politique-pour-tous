/**
 * Retrouver la page vidéo d'une réunion de l'Assemblée à partir de son compte rendu (lien direct,
 * ou lien court assnat.fr). Partagé par la transcription (transcribe-auditions.ts) et par la
 * collecte des fichiers vidéo lus sur le site (videos-commissions.ts).
 */
import { request as requeteHttps } from "node:https";
import { rootCertificates } from "node:tls";

const UA = "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)";

export function texteBrut(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#xa0;|&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * assnat.fr ne présente que son certificat final, sans l'intermédiaire « GandiCert » : les
 * navigateurs vont chercher le maillon manquant à l'adresse indiquée dans le certificat ; Node
 * ne le fait pas et refuse la connexion (« unable to verify the leaf signature »).
 * On fait comme le navigateur : on télécharge cet intermédiaire chez DigiCert et on l'ajoute
 * aux autorités racines. La chaîne est alors vérifiée jusqu'au bout — un intermédiaire falsifié
 * ne se rattacherait à aucune racine reconnue.
 */
let autorites: string[] | null = null;
async function autoritesAssnat(): Promise<string[]> {
  if (autorites) return autorites;
  const r = await fetch("http://cacerts.digicert.com/GandiCert.crt", { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`certificat intermédiaire : HTTP ${r.status}`);
  const der = Buffer.from(await r.arrayBuffer());
  const pem = `-----BEGIN CERTIFICATE-----\n${der.toString("base64").match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----\n`;
  return (autorites = [...rootCertificates, pem]);
}

async function suivreLienCourt(url: string): Promise<string | null> {
  const ca = await autoritesAssnat();
  return new Promise(resolve => {
    const r = requeteHttps(url, { method: "HEAD", ca, headers: { "User-Agent": UA } }, res => {
      res.resume();
      resolve(typeof res.headers.location === "string" ? res.headers.location : null);
    });
    r.on("error", () => resolve(null));
    r.end();
  });
}

/** La page de la vidéo d'une réunion, lue dans son compte rendu (lien direct ou lien court). */
export async function pageVideo(crUrl: string): Promise<string | null> {
  const r = await fetch(crUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`compte rendu : HTTP ${r.status}`);
  const html = await r.text();
  const directe = html.match(/https?:\/\/videos\.assemblee-nationale\.fr\/video\.\d+_[0-9a-f]+[^"'\s<]*/i)?.[0];
  if (directe) return directe.replace(/^http:/, "https:");
  const court = texteBrut(html).match(/(?:https?:\/\/)?assnat\.fr\/\w+/)?.[0];
  if (!court) return null;
  const page = await suivreLienCourt(court.startsWith("http") ? court.replace(/^http:/, "https:") : `https://${court}`);
  // Garde-fou : on n'ira lire que chez l'Assemblée nationale.
  if (!page || !/^https?:\/\/videos\.assemblee-nationale\.fr\/video\.\d+_/.test(page)) return null;
  return page.replace(/^http:/, "https:");
}

/* ───── Retrouver la vidéo sur le portail quand le compte rendu ne la cite pas ───── */

/**
 * Le portail de l'Assemblée liste les réunions filmées par ordre chronologique. On apparie une
 * réunion à sa vidéo par la même date ET un nom ou un sigle de l'intitulé en commun, sans second
 * candidat. Dans le doute, rien.
 */
const PORTAIL = "https://videos.assemblee-nationale.fr";
const MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const NAVIGATEUR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const BANALS = new Set(["commission", "commissions", "audition", "auditions", "representants", "representantes", "nationale",
  "national", "presse", "ouverte", "madame", "monsieur", "president", "presidente", "directeur", "directrice", "general",
  "generale", "mission", "information", "enquete", "table", "ronde", "ministre", "conjointe", "membres", "france", "francaise"]);

export type VideoPortail = { url: string; date: string; slug: string; mots: Set<string> };

export async function indexPortail(jusqua: string): Promise<VideoPortail[]> {
  const videos = new Map<string, VideoPortail>();
  for (let page = 1; page <= 80; page++) {
    let html: string;
    try {
      const r = await fetch(`${PORTAIL}/commissions.p${page}`, { headers: { "User-Agent": NAVIGATEUR }, signal: AbortSignal.timeout(90_000) });
      if (!r.ok) break;
      html = await r.text();
    } catch { break; }
    let plusAncienne = "9999";
    for (const m of html.matchAll(/href="(video\.[\w.]+?\.([a-z0-9-]+?)-(\d{1,2})(?:er)?-([a-z]+)-(\d{4}))"/g)) {
      const mois = MOIS_FR.indexOf(m[4]);
      if (mois < 0) continue;
      const date = `${m[5]}-${String(mois + 1).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      if (date < plusAncienne) plusAncienne = date;
      videos.set(m[1], { url: `${PORTAIL}/${m[1]}`, date, slug: m[2], mots: new Set(m[2].split("-").filter(x => x.length >= 3)) });
    }
    if (plusAncienne < jusqua) break;
    await new Promise(x => setTimeout(x, 350));
  }
  return [...videos.values()];
}

function reperes(intitule: string): Set<string> {
  const out = new Set<string>();
  for (const m of intitule.matchAll(/(?:\bMM?\.|\bMmes?|\bDr|\bMe)\s+((?:[A-ZÀ-Ý][\wÀ-ÿ'’-]*\s+){0,3}[A-ZÀ-Ý][\wÀ-ÿ'’-]*)/g)) {
    const dernier = m[1].trim().split(/\s+/).pop() ?? "";
    for (const part of sansAccent(dernier).split(/[^a-z]+/)) if (part.length >= 4 && !BANALS.has(part)) out.add(part);
  }
  for (const m of intitule.matchAll(/\(([A-Z]{3,8})\)/g)) out.add(m[1].toLowerCase());
  return out;
}

export function trouverVideo(videos: VideoPortail[], date: string, intitule: string): VideoPortail | null {
  const noms = reperes(intitule);
  if (!noms.size) return null;
  const candidates = videos.filter(v => v.date === date && [...noms].some(n => v.mots.has(n)));
  return candidates.length === 1 ? candidates[0] : null;
}

const MOTS_OUTILS = new Set(["dans", "pour", "avec", "sans", "sous", "entre", "cadre", "suite", "visant", "relative", "relatif",
  "portant", "projet", "proposition", "examen", "article", "amendements", "rapporteur", "rapporteure", "nomination",
  "travaux", "application", "reglement", "adoptee", "adopte", "senat", "assemblee", "procedure", "acceleree", "lecture"]);
const motsDe = (s: string) => new Set(sansAccent(s).split(/[^a-z0-9]+/).filter(w => w.length >= 5 && !BANALS.has(w) && !MOTS_OUTILS.has(w)));

/**
 * Quand l'intitulé ne cite personne (examen d'un texte, table ronde…), on apparie par le SUJET :
 * même date, même organe (« commission-des-lois--… » doit correspondre à la commission de la
 * réunion), et des mots du sujet de la vidéo présents dans l'intitulé. Il faut au moins deux mots
 * communs et un meilleur candidat net ; sinon, rien.
 */
export function trouverVideoParSujet(videos: VideoPortail[], date: string, commission: string, intitule: string): VideoPortail | null {
  const organe = motsDe(commission);
  const titre = motsDe(intitule);
  const notes = videos
    .filter(v => v.date === date)
    .map(v => {
      const [tete, ...reste] = v.slug.split("--");
      const sujet = reste.join("-") || tete;
      // L'organe de la vidéo (« commission-des-lois ») doit se retrouver dans le nom de la commission.
      const motsOrgane = [...motsDe(tete.replace(/-/g, " "))];
      const memeOrgane = reste.length === 0 || motsOrgane.every(w => organe.has(w) || titre.has(w));
      const communs = [...motsDe(sujet.replace(/-/g, " "))].filter(w => titre.has(w)).length;
      return { v, note: memeOrgane ? communs : 0 };
    })
    .filter(x => x.note >= 2)
    .sort((a, b) => b.note - a.note);
  if (!notes.length || (notes[1] && notes[1].note === notes[0].note)) return null;
  return notes[0].v;
}
