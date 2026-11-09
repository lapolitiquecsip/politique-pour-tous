/**
 * Réunions sans vrai compte rendu écrit : on transcrit leur vidéo, orateur par orateur.
 *
 * L'Assemblée ne rédige plus de compte rendu pour une bonne part de ses réunions de commission :
 * le document publié se borne à la liste des présents et à un renvoi « L'enregistrement
 * audiovisuel de cette réunion est disponible sur le site de l'Assemblée nationale ». Du 1er
 * octobre au 9 novembre 2026, 117 réunions sur 343 avaient moins de 1 500 mots. L'analyse Pro
 * de ces réunions disait seulement… qu'il n'y avait pas de compte rendu.
 *
 * Le chemin (v2, 09/11/2026) :
 *   compte rendu court → lien vers la vidéo (direct, ou lien court assnat.fr)
 *   → index de la vidéo : qui parle, à quel instant (scripts/lib/video-an.ts)
 *   → piste audio, de la première prise de parole à la fin → Whisper, avec horodatage
 *   → chaque phrase rangée sous l'orateur indexé par l'Assemblée, son groupe et sa fiche
 *   → analyse Pro (même consigne que les comptes rendus écrits) + sommaire chapitré.
 *
 * Format du texte gardé dans commission_transcripts.texte (lu par CompteRendu.tsx) :
 *   @@§ 3530 | Questions des représentants des groupes          ← intertitre
 *   @@ 1483 | M. Nicolas Dufourcq | directeur général | | | 19678370   ← prise de parole
 *   @@ 3530 | M. Robert Le Bourgeois | | RN | robert-le-bourgeois | 19678380
 *   Texte de l'intervention, un paragraphe par ligne.
 * Le nombre est l'instant dans la vidéo, en secondes ; le dernier champ, le repère du lecteur de
 * l'Assemblée (`?timecode=<repère>` ouvre la vidéo à cette prise de parole).
 *
 * ffmpeg est requis : préinstallé sur les exécuteurs GitHub. La transcription coûte environ
 * 0,11 $ l'heure (Groq, whisper-large-v3), dans les limites gratuites de Groq (8 h d'audio par
 * jour) tant qu'on reste sous MAX_HEURES.
 *
 * Usage :
 *   npx tsx scripts/transcribe-auditions.ts --limit=5
 *   npx tsx scripts/transcribe-auditions.ts --ref=CRCANR5L17S2027PO59048N035
 *   npx tsx scripts/transcribe-auditions.ts --depuis=2026-10-01 --heures=6
 *   npx tsx scripts/transcribe-auditions.ts --dry-run
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *             ASR_API_KEY (ou GROQ_API_KEY), LLM_FREE_API_KEY (analyse).
 */
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request as requeteHttps } from "node:https";
import { rootCertificates } from "node:tls";
import { SYSTEM, SHAPE, dropInventedQuotes, VERSION_ANALYSE, type Analysis } from "./lib/commission-prompt";
import { demanderJSON, llmDisponible, llmVoie } from "./lib/llm";
import { indexVideo, restreindre, transcriptionSenat, type IndexVideo } from "./lib/video-an";

const execFileP = promisify(execFile);

const args = process.argv.slice(2);
const option = (nom: string) => args.find(x => x.startsWith(`--${nom}=`))?.split("=")[1];
const DRY = args.includes("--dry-run");
const LIMITE = Number(option("limit")) || 6;
const REF = option("ref") ?? null;
/** Plafond d'audio transcrit par passage : la limite gratuite de Groq est de 8 h par jour. */
const MAX_HEURES = Number(option("heures") || process.env.TRANSCRIPTION_MAX_HEURES) || 6;
/** On ne remonte pas au-delà : le rattrapage commence à la rentrée parlementaire d'octobre. */
const DEPUIS = option("depuis") || "2026-10-01";
/** En deçà, le compte rendu écrit n'est qu'un renvoi à la vidéo (ou une simple désignation). */
const MOTS_COMPTE_RENDU = 1500;
/** Une réunion filmée de moins de dix minutes de parole n'a rien qu'un compte rendu court ne dise déjà. */
const PAROLE_MINIMUM = 10 * 60;

const UA = "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)";

const ASR_URL = process.env.ASR_BASE_URL || "https://api.groq.com/openai/v1/audio/transcriptions";
// large-v3 plutôt que turbo : nettement meilleur sur les noms propres, pour 0,11 $ l'heure.
const ASR_MODEL = process.env.ASR_MODEL || "whisper-large-v3";
const ASR_KEY = process.env.ASR_API_KEY || process.env.GROQ_API_KEY || "";

/* ───────────────────────── Trouver la vidéo ───────────────────────── */

function texteBrut(html: string): string {
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
async function pageVideo(crUrl: string): Promise<string | null> {
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

/* ───────────────────────── Transcrire ───────────────────────── */

type Segment = { start: number; end: number; text: string };

/** Ce que Whisper « entend » dans un silence : génériques de sous-titrage, formules de fin de vidéo. */
const HALLUCINATION = /sous-titr|amara\.org|merci d'avoir regard|abonnez-vous|radio-canada|n'oubliez pas de (liker|vous abonner)/i;

async function attendre(ms: number) { await new Promise(x => setTimeout(x, ms)); }

/** Une tranche d'audio → segments horodatés. Sur quota, attend ce que Groq demande (jusqu'à 12 min). */
async function transcrireTranche(fichier: string, nom: string, consigne: string): Promise<Segment[]> {
  for (let essai = 1; essai <= 4; essai++) {
    const form = new FormData();
    form.append("file", new Blob([await readFile(fichier)], { type: "audio/ogg" }), nom);
    form.append("model", ASR_MODEL);
    form.append("language", "fr");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    if (consigne) form.append("prompt", consigne);
    let statut = 0, corps = "";
    try {
      const r = await fetch(ASR_URL, { method: "POST", headers: { Authorization: `Bearer ${ASR_KEY}` }, body: form, signal: AbortSignal.timeout(10 * 60_000) });
      statut = r.status;
      corps = await r.text();
    } catch (e) {
      corps = String(e);
    }
    if (statut === 200) {
      const j = JSON.parse(corps);
      return (j.segments ?? [])
        .filter((s: any) => !(s.no_speech_prob > 0.6 && s.avg_logprob < -0.8) && !HALLUCINATION.test(s.text))
        .map((s: any) => ({ start: Number(s.start), end: Number(s.end), text: String(s.text).trim() }))
        .filter((s: Segment) => s.text);
    }
    if (statut === 429) {
      const m = corps.match(/try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i);
      const ms = m ? ((Number(m[1] || 0) * 60 + Number(m[2] || 0)) * 60 + Number(m[3])) * 1000 : 60_000;
      if (ms > 12 * 60_000) throw new Error(`quota de transcription atteint (429) : reprise dans ${Math.round(ms / 60_000)} min`);
      console.log(`    … quota Groq, attente ${Math.round(ms / 1000)} s`);
      await attendre(ms + 2000);
      continue;
    }
    if (statut >= 500 || statut === 0) { await attendre(15_000 * essai); continue; }
    throw new Error(`transcription : HTTP ${statut} — ${corps.slice(0, 200)}`);
  }
  throw new Error("transcription : quatre échecs de suite");
}

/**
 * Extrait la piste audio entre deux instants et la transcrit. ffmpeg lit le MP4 à distance et
 * n'écrit que le son, en Opus 16 kb/s mono : une heure tient en sept mégaoctets, là où la vidéo
 * en pèse plusieurs centaines. Tranches de vingt minutes, bien sous les 25 Mo admis par Groq.
 */
async function transcrire(mp4: string, debut: number, fin: number, etiquette: string, consigne: string): Promise<Segment[]> {
  const dossier = await mkdtemp(join(tmpdir(), "audition-"));
  const TRANCHE = 1200;
  try {
    await execFileP("ffmpeg", [
      "-nostdin", "-loglevel", "error", "-y",
      "-ss", String(Math.max(0, debut)),
      ...(fin > debut ? ["-to", String(fin)] : []),
      "-i", mp4,
      "-vn", "-ac", "1", "-ar", "16000",
      "-c:a", "libopus", "-b:a", "16k",
      "-f", "segment", "-segment_time", String(TRANCHE),
      join(dossier, "tranche-%03d.ogg"),
    ], { maxBuffer: 1 << 24, timeout: 60 * 60 * 1000 });

    const tranches = (await readdir(dossier)).filter(f => f.endsWith(".ogg")).sort();
    const tous: Segment[] = [];
    for (const [i, nom] of tranches.entries()) {
      const decalage = debut + i * TRANCHE;
      const segs = await transcrireTranche(join(dossier, nom), `${etiquette}-${i + 1}.ogg`, consigne);
      for (const s of segs) tous.push({ start: s.start + decalage, end: s.end + decalage, text: s.text });
    }
    // Une phrase répétée en boucle est une autre hallucination classique : on n'en garde qu'une.
    return tous.filter((s, i) => i < 2 || !(s.text === tous[i - 1].text && s.text === tous[i - 2].text));
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

/* ───────────────────────── Mettre en forme ───────────────────────── */

type Elu = { slug: string; party: string | null };

function hms(t: number): string {
  const s = Math.max(0, Math.round(t));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Paragraphes d'environ 120 mots, coupés en fin de phrase. */
function paragraphes(texte: string): string[] {
  const phrases = texte.match(/[^.!?…]+[.!?…]+["»]?\s*|[^.!?…]+$/g) ?? [texte];
  const out: string[] = [];
  let cur = "";
  for (const p of phrases) {
    cur += p;
    if (cur.split(/\s+/).length >= 120) { out.push(cur.trim()); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

type Mise = { texte: string; pourAnalyse: string; mots: number };

/** Range chaque segment sous la prise de parole en cours à son milieu. */
function mettreEnForme(idx: IndexVideo, segs: Segment[], elus: Map<string, Elu>): Mise {
  const prises = idx.interventions;
  const blocs: { t: number; entete: string; lisible: string; textes: string[] }[] = [];
  let k = -2;
  for (const s of segs) {
    const milieu = (s.start + s.end) / 2;
    // Les secondes qui précèdent la première prise de parole vont au premier orateur.
    let j = Math.max(k, prises.length ? 0 : -1);
    while (j + 1 < prises.length && prises[j + 1].t <= milieu + 0.5) j++;
    if (j !== k) {
      k = j;
      const p = j >= 0 ? prises[j] : undefined;
      const d = p?.ident ? elus.get(p.ident) : undefined;
      const nom = (p?.nom ?? "").replace(/\|/g, "/");
      const fonction = (p?.fonction ?? "").replace(/\|/g, "/");
      const t = p?.t ?? s.start;
      blocs.push({
        t,
        entete: `@@ ${Math.round(t)} | ${nom} | ${fonction} | ${d?.party ?? ""} | ${d?.slug ?? ""} | ${p?.id ?? ""}`,
        lisible: nom ? `${nom}${fonction || d?.party ? ` (${[fonction, d?.party].filter(Boolean).join(", ")})` : ""}` : "Orateur non indexé",
        textes: [],
      });
    }
    blocs[blocs.length - 1].textes.push(s.text);
  }

  const lignes: string[] = [];
  const pourAnalyse: string[] = [];
  let mots = 0;
  let si = 0;
  for (const b of blocs) {
    while (si < idx.sections.length && idx.sections[si].t <= b.t + 1) {
      lignes.push(`@@§ ${Math.round(idx.sections[si].t)} | ${idx.sections[si].titre.replace(/\|/g, "/")}`);
      pourAnalyse.push(`\n### ${idx.sections[si].titre}`);
      si++;
    }
    const corps = b.textes.join(" ").replace(/\s+/g, " ").trim();
    if (!corps) continue;
    mots += corps.split(/\s+/).length;
    lignes.push(b.entete, ...paragraphes(corps));
    pourAnalyse.push(`[${hms(b.t)}] ${b.lisible} :\n${corps}`);
  }
  return { texte: lignes.join("\n"), pourAnalyse: pourAnalyse.join("\n\n"), mots };
}

/* ───────────────────────── Analyser ───────────────────────── */

const AVERTISSEMENT = `
ATTENTION : le texte ci-dessous est une TRANSCRIPTION AUTOMATIQUE de l'enregistrement vidéo, faute de compte rendu écrit publié.
Les ORATEURS sont fiables : chaque intervention est rangée sous le nom indexé par les services de l'assemblée, avec l'instant [h:mm:ss] où elle commence.
Les MOTS peuvent comporter des erreurs de transcription, surtout sur les noms propres cités et les chiffres : ne reprends un chiffre que s'il est énoncé sans ambiguïté, et recopie les citations telles qu'elles figurent dans le texte.
Une audition transcrite est longue et riche : sois exhaustif — au moins 10 points clés, une position par orateur qui s'exprime sur le fond, et chaque question substantielle dans "echanges".`;

const SOMMAIRE = `
Ajoute à l'objet JSON un champ "sommaire" : le déroulé de la réunion en 5 à 15 chapitres thématiques, dans l'ordre chronologique :
"sommaire": [{"debut": "h:mm:ss (recopie l'instant [h:mm:ss] de l'intervention où le chapitre commence)", "titre": "titre court et précis du chapitre", "resume": "2 à 4 phrases : qui dit quoi, avec les faits et chiffres précis"}]`;

type Sommaire = { t: number; titre: string; resume: string }[];

const enSecondes = (s: string) => {
  const p = String(s || "").split(":").map(Number);
  if (!p.length || p.some(n => !Number.isFinite(n))) return NaN;
  return p.reduce((acc, n) => acc * 60 + n, 0);
};

async function analyser(texte: string, titre: string, date: string): Promise<{ analysis: Analysis & { sommaire?: Sommaire }; dropped: number }> {
  const brut = await demanderJSON<Analysis & { sommaire?: any[] }>(
    `${SYSTEM}\n\n${SHAPE}\n${SOMMAIRE}\n${AVERTISSEMENT}`,
    `Réunion du ${date}.\nObjet : ${titre}\n\n--- TRANSCRIPTION AUTOMATIQUE, PAR ORATEUR ---\n${texte}`,
    { maxJetons: 24000 },
  );
  const lireSommaire = (liste: any[] | undefined): Sommaire => (liste ?? [])
    .map((c: any) => ({ t: enSecondes(c.debut), titre: String(c.titre ?? "").trim(), resume: String(c.resume ?? "").trim() }))
    .filter(c => Number.isFinite(c.t) && c.titre);
  let sommaire = lireSommaire(brut.sommaire);
  // Les modèles « lite » (repli quand le quota du modèle principal est atteint) laissent souvent
  // tomber le champ supplémentaire : on le demande alors seul.
  if (sommaire.length < 3) {
    const seul = await demanderJSON<{ sommaire?: any[] }>(
      `Tu découpes la transcription d'une réunion parlementaire en chapitres, sans rien ajouter qui n'y figure.\nRéponds UNIQUEMENT par un objet JSON {"sommaire": [...]}.${SOMMAIRE}`,
      `Réunion du ${date}.\nObjet : ${titre}\n\n${texte}`,
      { maxJetons: 8000 },
    ).catch(() => ({ sommaire: [] }));
    sommaire = lireSommaire(seul.sommaire);
  }
  const { analysis, dropped } = dropInventedQuotes({ ...brut, sommaire: undefined } as Analysis, texte);
  return { analysis: { ...analysis, sommaire }, dropped };
}

/* ───────────────────────── Traitement ───────────────────────── */

type Cible = { ref: string; title: string; meeting_date: string; page: string; ligne: boolean; organe_ref?: string | null; commission?: string };

/** Le Sénat met en ligne sa transcription quelques heures après la réunion ; l'Assemblée jamais. */
const sourceAudio = (idx: IndexVideo) => idx.chambre === "SENAT" ? "transcription du Sénat si publiée" : ASR_MODEL;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  if (!ASR_KEY) {
    console.log("::warning title=Transcription des auditions désactivée::Ni ASR_API_KEY ni GROQ_API_KEY : "
      + "aucune audition n'est transcrite. Clé sur console.groq.com → API Keys, puis secret GitHub GROQ_API_KEY.");
    return;
  }
  if (!llmDisponible()) {
    console.log("::warning title=Analyse des auditions indisponible::Aucune clé LLM (LLM_FREE_API_KEY).");
    return;
  }
  console.log(`   Transcription ${ASR_MODEL} · analyse via ${llmVoie()} · plafond ${MAX_HEURES} h d'audio`);
  const supabase = createClient(url, key);

  // Les élus, pour donner à chaque orateur son groupe et le lien vers sa fiche : un député par
  // son identifiant (PA607395), un sénateur par son matricule (20070A).
  const elus = new Map<string, Elu>();
  for (let de = 0; ; de += 1000) {
    const { data } = await supabase.from("deputies").select("an_id, slug, party").range(de, de + 999);
    for (const d of data ?? []) if (d.an_id) elus.set(d.an_id, { slug: d.slug, party: d.party });
    if (!data || data.length < 1000) break;
  }
  for (let de = 0; ; de += 1000) {
    const { data } = await supabase.from("senators").select("senate_matricule, slug, senate_group, party").range(de, de + 999);
    for (const d of data ?? []) if (d.senate_matricule) elus.set(String(d.senate_matricule).toUpperCase(), { slug: d.slug, party: d.senate_group || d.party });
    if (!data || data.length < 1000) break;
  }

  // 1. Réunions dont le compte rendu écrit est court : à l'Assemblée, un renvoi à la vidéo ;
  //    au Sénat, « sera publié ultérieurement » (le compte rendu arrive une à deux semaines
  //    plus tard et remplace alors la transcription — scripts/update-commissions.ts).
  let q = supabase.from("commission_reports")
    .select("ref, chamber, title, meeting_date, cr_url, video_url, word_count, analysis")
    .not("cr_url", "is", null)
    .order("meeting_date", { ascending: false }).limit(600);
  q = REF ? q.eq("ref", REF) : q.gte("meeting_date", DEPUIS).or(`word_count.lt.${MOTS_COMPTE_RENDU},word_count.is.null,analysis->>a_transcrire.eq.true,analysis->>attente.eq.true`);
  const { data, error } = await q;
  if (error) { console.error(`❌ lecture : ${error.message}`); process.exit(1); }
  const aFaire = (data ?? []).filter((r: any) => REF || (
    !(r.analysis?.source === "transcription" && r.analysis?.orateurs)
    // Au Sénat, seulement une réunion dont la vidéo est déjà repérée (auditions-videos, backend).
    && (r.chamber !== "SENAT" || /videos\.senat\.fr\/video\./.test(r.video_url ?? ""))
  ));
  console.log(`=== ${aFaire.length} réunion(s) à compte rendu court depuis le ${DEPUIS} ===`);

  let secondes = 0, faites = 0, sansVideo = 0, courtes = 0;
  const parVideo = new Map<string, { texte: string; mots: number; analysis: any; summary: string }>();

  const traiter = async (c: Cible): Promise<boolean> => {
    const entier = await indexVideo(c.page);
    // Une vidéo qui couvre plusieurs points de l'ordre du jour : seulement celui de la réunion.
    // À l'Assemblée, le compte rendu couvre la séance entière : à défaut, on garde tout.
    const idx = restreindre(entier, c.title) ?? (entier.chambre === "AN" ? entier : null);
    if (!idx) { console.log("    point de l'ordre du jour introuvable dans la vidéo"); return false; }
    const debut = Math.max(0, (idx.interventions[0]?.t ?? idx.debutLecture) - 3);
    const fin = idx.fin || 0;
    const duree = (fin || debut + 3 * 3600) - debut;
    if (idx.interventions.length && duree < PAROLE_MINIMUM) { courtes++; console.log("    réunion trop courte pour une transcription"); return false; }
    if (!idx.interventions.length) console.warn("    ⚠ vidéo sans index des orateurs : transcription sans attribution");

    const cle = `${idx.uid}:${Math.round(debut)}`;
    let fait = parVideo.get(cle);
    if (!fait) {
      console.log(`    ${idx.chambre} · ${hms(debut)} → ${hms(fin)} (${Math.round(duree / 60)} min), ${idx.interventions.length} prises de parole · ${sourceAudio(idx)}`);
      // Le Sénat publie sa transcription : gratuite, et calée sur ses propres sous-titres.
      let segs: Segment[] = (await transcriptionSenat(idx)).filter(s => s.start >= debut - 1 && (!fin || s.start < fin));
      if (segs.length) console.log(`    transcription du Sénat : ${segs.length} segments`);
      else {
        if (!idx.mp4) throw new Error("aucun fichier vidéo sur la page");
        if (secondes > 0 && secondes + duree > MAX_HEURES * 3600) throw Object.assign(new Error("plafond d'audio du passage atteint"), { arret: true });
        // Les noms des orateurs, donnés à Whisper : ils sont alors bien orthographiés.
        const noms = [...new Set(idx.interventions.map(p => p.nom.replace(/^(M\.|Mme)\s/, "")))];
        const assemblee = idx.chambre === "SENAT" ? "du Sénat" : "de l'Assemblée nationale";
        const consigne = `Réunion de commission ${assemblee}. ${c.title.slice(0, 200)} Intervenants : ${noms.join(", ")}.`.slice(0, 850);
        segs = await transcrire(idx.mp4, debut, fin, c.ref, consigne);
        secondes += duree;
      }
      const mise = mettreEnForme(idx, segs, elus);
      console.log(`    transcription : ${mise.mots.toLocaleString("fr-FR")} mots`);
      if (mise.mots < 200) throw new Error("transcription trop courte");
      const { analysis, dropped } = await analyser(mise.pourAnalyse, c.title, c.meeting_date);
      const points = analysis.points_cles ?? [];
      console.log(`    analyse : ${points.length} points, ${analysis.sommaire?.length ?? 0} chapitres${dropped ? `, ${dropped} citation(s) écartée(s)` : ""}`);
      const summary = [analysis.contexte, ...points.slice(0, 4).map(p => `- ${p}`)].filter(Boolean).join("\n\n");
      fait = {
        texte: mise.texte, mots: mise.mots, summary,
        analysis: { ...analysis, v: VERSION_ANALYSE, source: "transcription", orateurs: idx.interventions.length > 0, video: idx.page },
      };
      parVideo.set(cle, fait);
    } else {
      console.log("    même vidéo qu'une réunion déjà transcrite (réunion conjointe) : reprise");
    }

    if (DRY) {
      if (args.includes("--montrer")) {
        console.log(fait.texte.slice(0, 2500));
        console.log(JSON.stringify({ a_retenir: fait.analysis.a_retenir, sommaire: fait.analysis.sommaire, positions: fait.analysis.positions?.slice(0, 4) }, null, 1));
      }
      console.log("    (--dry-run : rien n'est écrit)");
      return true;
    }
    const maintenant = new Date().toISOString();
    const ligne = { analysis: fait.analysis, summary: fait.summary, word_count: fait.mots, analyzed_at: maintenant, video_url: idx.page };
    const { error: err } = c.ligne
      ? await supabase.from("commission_reports").update(ligne).eq("ref", c.ref)
      : await supabase.from("commission_reports").upsert({
          ...ligne, ref: c.ref, chamber: "AN", organe_ref: c.organe_ref ?? null,
          commission: c.commission ?? "Réunion de commission", title: c.title, meeting_date: c.meeting_date,
          cr_url: idx.page, updated_at: maintenant,
        }, { onConflict: "ref" });
    if (err) throw new Error(err.message);
    const { error: e2 } = await supabase.from("commission_transcripts").upsert(
      { ref: c.ref, texte: fait.texte, mots: fait.mots, source: "transcription", maj_le: maintenant }, { onConflict: "ref" });
    if (e2) throw new Error(e2.message);
    console.log("    ✓ en ligne");
    return true;
  };

  for (const r of aFaire as any[]) {
    if (faites >= LIMITE) break;
    console.log(`\n  ${r.meeting_date} — ${String(r.title).slice(0, 80)}`);
    try {
      const page = r.video_url && /\/video\.\d+_/.test(r.video_url) ? r.video_url : r.chamber === "AN" ? await pageVideo(r.cr_url) : null;
      if (!page) { sansVideo++; console.log("    pas de vidéo liée au compte rendu"); continue; }
      if (await traiter({ ref: r.ref, title: r.title ?? "", meeting_date: r.meeting_date, page, ligne: true })) faites++;
    } catch (e) {
      const err = e as any;
      console.warn(`    ⚠ ${err.message}${err.cause ? ` (${err.cause.code ?? ""} ${err.cause.message ?? ""})` : ""}`);
      if (err.arret || /quota|429|ENOENT/i.test(err.message)) break;
    }
  }

  if (!REF && faites < LIMITE) faites += await depuisLeJournal(supabase, LIMITE - faites, traiter);

  console.log(`\n=== ${faites} réunion(s) transcrite(s) · ${Math.round(secondes / 60)} min d'audio · ${sansVideo} sans vidéo · ${courtes} trop courte(s) ===`);
}

/* ───────────── Réunions filmées dont aucun compte rendu n'a jamais paru ───────────── */

/**
 * Le veilleur des auditions marque « a_transcrire » les réunions filmées pour lesquelles
 * l'Assemblée n'a publié aucun compte rendu — typiquement les commissions d'enquête, dont le
 * compte rendu ne sort qu'avec le rapport. On retrouve leur vidéo sur le portail, qui liste les
 * réunions par ordre chronologique : même date ET un nom ou un sigle de l'intitulé en commun,
 * sans second candidat. Dans le doute, on ne transcrit pas.
 */
const PORTAIL = "https://videos.assemblee-nationale.fr";
const MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const NAVIGATEUR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const BANALS = new Set(["commission", "commissions", "audition", "auditions", "representants", "representantes", "nationale",
  "national", "presse", "ouverte", "madame", "monsieur", "president", "presidente", "directeur", "directrice", "general",
  "generale", "mission", "information", "enquete", "table", "ronde", "ministre", "conjointe", "membres", "france", "francaise"]);

type Video = { url: string; date: string; mots: Set<string> };

async function indexPortail(jusqua: string): Promise<Video[]> {
  const videos = new Map<string, Video>();
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
      videos.set(m[1], { url: `${PORTAIL}/${m[1]}`, date, mots: new Set(m[2].split("-").filter(x => x.length >= 3)) });
    }
    if (plusAncienne < jusqua) break;
    await attendre(350);
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

function trouverVideo(videos: Video[], date: string, intitule: string): Video | null {
  const noms = reperes(intitule);
  if (!noms.size) return null;
  const candidates = videos.filter(v => v.date === date && [...noms].some(n => v.mots.has(n)));
  return candidates.length === 1 ? candidates[0] : null;
}

async function depuisLeJournal(supabase: any, reste: number, traiter: (c: Cible) => Promise<boolean>): Promise<number> {
  const { data: file, error } = await supabase.from("cycle_items")
    .select("cle, titre, sujet, date_objet, donnees, tentatives")
    .eq("cycle", "auditions").eq("etape", "a_transcrire").lt("tentatives", 3)
    .order("date_objet", { ascending: false }).limit(40);
  if (error) { console.warn(`  ⚠ journal des auditions illisible : ${error.message}`); return 0; }
  if (!file?.length) return 0;

  console.log(`\n  ${file.length} réunion(s) filmée(s) sans compte rendu, au journal`);
  const videos = await indexPortail(file[file.length - 1].date_objet);
  const paires = (file as any[]).map(it => ({ it, video: trouverVideo(videos, it.date_objet, String(it.titre ?? "")) }));
  const usage = new Map<string, number>();
  for (const p of paires) if (p.video) usage.set(p.video.url, (usage.get(p.video.url) ?? 0) + 1);
  const sures = paires.filter(p => p.video && usage.get(p.video.url) === 1);
  console.log(`  ${sures.length} réunion(s) rapprochée(s) d'une vidéo sans équivoque`);

  let faites = 0;
  for (const { it, video } of sures) {
    if (faites >= reste) break;
    console.log(`\n  ${it.date_objet} — ${String(it.titre).slice(0, 70)}`);
    try {
      const ok = await traiter({
        ref: it.cle, title: it.titre ?? "", meeting_date: it.date_objet, page: video!.url, ligne: false,
        organe_ref: it.donnees?.organe_ref ?? null,
        commission: /^PO\d+$/.test(it.sujet ?? "") ? "Réunion de commission" : (it.sujet ?? "Réunion de commission"),
      });
      if (!ok || DRY) continue;
      await supabase.from("cycle_items").update({
        etape: "en_ligne", erreur: null, agent: "transcripteur", en_ligne_le: new Date().toISOString(), maj_le: new Date().toISOString(),
        donnees: { ...it.donnees, video: video!.url, transcrit: true },
      }).eq("cycle", "auditions").eq("cle", it.cle);
      faites++;
    } catch (e) {
      const err = e as any;
      console.warn(`    ⚠ ${err.message}`);
      if (err.arret || /quota|429|ENOENT/i.test(err.message)) break;
      if (!DRY) await supabase.from("cycle_items").update({ tentatives: (it.tentatives ?? 0) + 1, erreur: String(err.message).slice(0, 300), agent: "transcripteur", maj_le: new Date().toISOString() })
        .eq("cycle", "auditions").eq("cle", it.cle);
    }
  }
  return faites;
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
