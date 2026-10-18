/**
 * Auditions sans compte rendu écrit : on les transcrit, puis on les analyse.
 *
 * L'Assemblée ne rédige pas toujours de compte rendu. Le document publié se borne alors
 * à dire « Cette audition n'a pas fait l'objet d'un compte rendu écrit : elle est
 * accessible sur le site de l'Assemblée nationale à l'adresse suivante : … », suivi d'un
 * lien court assnat.fr. Sur un échantillon de vingt-cinq réunions non analysées, trois
 * étaient dans ce cas — une sur huit. Un abonné Pro se retrouvait devant une page qui
 * lui disait d'aller voir ailleurs.
 *
 * Le chemin est donc : compte rendu vide → lien court → page vidéo → fichier MP4 →
 * piste audio seule → transcription → analyse, avec la MÊME consigne que les comptes
 * rendus écrits, pour que les deux se lisent pareil.
 *
 * ffmpeg est requis. Il est préinstallé sur les exécuteurs GitHub ; en local, il faut
 * l'installer. Seule la piste audio est extraite, en Opus 16 kb/s mono : une heure
 * d'audition tient en six mégaoctets, là où la vidéo en pèse cinq cents.
 *
 * Usage :
 *   npx tsx scripts/transcribe-auditions.ts --limit=5
 *   npx tsx scripts/transcribe-auditions.ts --ref=CRCANR5L17S2026PO419604N096
 *   npx tsx scripts/transcribe-auditions.ts --dry-run
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *             ASR_API_KEY (transcription), DEEPSEEK_API_KEY (analyse).
 */
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request as requeteHttps } from "node:https";
import { SYSTEM, SHAPE, dropInventedQuotes, VERSION_ANALYSE, type Analysis } from "./lib/commission-prompt";
import { demanderJSON, llmDisponible, llmVoie } from "./lib/llm";

const execFileP = promisify(execFile);

const args = process.argv.slice(2);
const nombre = (nom: string, defaut: number) => {
  const a = args.find(x => x.startsWith(`--${nom}=`));
  return a ? Number(a.split("=")[1]) || defaut : defaut;
};
const DRY = args.includes("--dry-run");
const LIMITE = nombre("limit", 3);
const REF = args.find(x => x.startsWith("--ref="))?.split("=")[1] ?? null;

const UA = "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)";

/**
 * Transcription : Groq par défaut.
 *
 * C'est le modèle Whisper large d'OpenAI, servi à un prix sans commune mesure —
 * de l'ordre de quatre centimes l'heure d'audio, contre trente-six chez OpenAI.
 * Une heure d'audition par jour revient à environ un euro par an. L'adresse et le
 * modèle restent réglables : l'interface est celle d'OpenAI, tout fournisseur qui
 * la respecte convient.
 */
const ASR_URL = process.env.ASR_BASE_URL || "https://api.groq.com/openai/v1/audio/transcriptions";
const ASR_MODEL = process.env.ASR_MODEL || "whisper-large-v3-turbo";
const ASR_KEY = process.env.ASR_API_KEY || "";

const LLM_URL = process.env.COMMISSION_BASE_URL || "https://api.deepseek.com/";
const LLM_MODEL = process.env.COMMISSION_MODEL || "deepseek-v4-flash";   // inutilisé : l'appel passe par scripts/lib/llm.ts
const LLM_KEY = process.env.DEEPSEEK_API_KEY || "";

/* ───────────────────────── Trouver la vidéo ───────────────────────── */

/** Texte brut d'une page, balises et feuilles de style ôtées. */
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
 * Cherche, dans le compte rendu, l'aveu qu'il n'y en a pas — et le lien qui le remplace.
 * Renvoie null si le compte rendu est bien rédigé : il n'y a alors rien à transcrire.
 */
async function lienVideo(crUrl: string): Promise<string | null> {
  const r = await fetch(crUrl, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`compte rendu : HTTP ${r.status}`);
  const t = texteBrut(await r.text());
  if (!/n.a pas fait l.objet d.un compte rendu/i.test(t)) return null;
  return t.match(/https:\/\/assnat\.fr\/\w+/)?.[0] ?? null;
}

/**
 * Lit l'adresse vers laquelle pointe le lien court, sans vérifier son certificat.
 *
 * assnat.fr ne présente que son certificat final, sans l'intermédiaire qui permettrait
 * de remonter à une autorité de confiance. Les navigateurs réparent la chaîne toute
 * seule en allant chercher le maillon manquant ; ni Node ni OpenSSL ne le font, et la
 * lecture échouait sur « unable to verify the first certificate » pour chaque audition.
 *
 * On relâche donc la vérification POUR CETTE SEULE REQUÊTE, qui ne transporte aucun
 * secret et dont on ne lit qu'un en-tête Location — et l'adresse obtenue est ensuite
 * contrôlée : elle doit mener à l'Assemblée nationale. Tout ce qu'on consomme
 * réellement, page vidéo et fichier, passe par des connexions vérifiées.
 */
function suivreLienCourt(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const r = requeteHttps(url, { method: "HEAD", rejectUnauthorized: false, headers: { "User-Agent": UA } }, res => {
      res.resume();
      resolve(typeof res.headers.location === "string" ? res.headers.location : null);
    });
    r.on("error", () => resolve(null));
    r.end();
  });
}

/** Suit le lien court, puis lit la page vidéo pour en extraire le fichier MP4. */
async function fichierMp4(lienCourt: string): Promise<string | null> {
  const page = await suivreLienCourt(lienCourt);
  if (!page) throw new Error("le lien court ne mène nulle part");
  // Garde-fou : on n'ira lire que chez l'Assemblée nationale.
  if (!/^https:\/\/[\w.-]*\.?assemblee-nationale\.fr\//.test(page)) {
    throw new Error(`redirection inattendue vers ${page.slice(0, 60)}`);
  }

  const redirection = await fetch(page, { headers: { "User-Agent": UA } });
  if (!redirection.ok) throw new Error(`page vidéo : HTTP ${redirection.status}`);
  const html = await redirection.text();
  const mp4 = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/)?.[0];
  if (!mp4) return null;
  // Le lecteur sert encore certaines adresses en clair ; on force le chiffrement.
  return mp4.replace(/^http:/, "https:");
}

/* ───────────────────────── Transcrire ───────────────────────── */

/**
 * Extrait la piste audio et la transcrit.
 *
 * ffmpeg lit le MP4 à distance et n'écrit que le son : inutile de poser cinq cents
 * mégaoctets de vidéo sur le disque pour n'en garder que la parole.
 */
async function transcrire(mp4: string, etiquette: string): Promise<string> {
  if (!ASR_KEY) throw new Error("ASR_API_KEY absente");

  const dossier = await mkdtemp(join(tmpdir(), "audition-"));
  try {
    // Le son est découpé en tranches de quarante minutes. Une audition de plus de trois
    // heures et demie dépassait les 25 Mo admis par l'interface de transcription et était
    // refusée en bloc (« audio trop lourd ») ; par tranches, aucune durée n'est trop longue.
    await execFileP("ffmpeg", [
      "-nostdin", "-loglevel", "error", "-y",
      "-i", mp4,
      "-vn",                        // pas d'image
      "-ac", "1", "-ar", "16000",   // mono 16 kHz : ce que le modèle attend
      "-c:a", "libopus", "-b:a", "16k",
      "-f", "segment", "-segment_time", "2400",
      join(dossier, "tranche-%03d.ogg"),
    ], { maxBuffer: 1 << 24, timeout: 60 * 60 * 1000 });

    const tranches = (await readdir(dossier)).filter(f => f.endsWith(".ogg")).sort();
    let total = 0;
    const textes: string[] = [];
    for (const [i, nom] of tranches.entries()) {
      const fichier = join(dossier, nom);
      total += (await stat(fichier)).size;
      const form = new FormData();
      form.append("file", new Blob([await readFile(fichier)], { type: "audio/ogg" }), `${etiquette}-${i + 1}.ogg`);
      form.append("model", ASR_MODEL);
      form.append("language", "fr");
      form.append("response_format", "text");
      const r = await fetch(ASR_URL, { method: "POST", headers: { Authorization: `Bearer ${ASR_KEY}` }, body: form });
      const corps = await r.text();
      if (!r.ok) throw new Error(`transcription (tranche ${i + 1}/${tranches.length}) : HTTP ${r.status} — ${corps.slice(0, 160)}`);
      textes.push(corps.trim());
    }
    console.log(`    audio extrait : ${(total / 1e6).toFixed(1)} Mo en ${tranches.length} tranche(s)`);
    return textes.join(" ");
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

/* ───────────────────────── Analyser ───────────────────────── */

/**
 * Même consigne que pour les comptes rendus écrits, avec un avertissement en plus :
 * une transcription automatique se trompe sur les noms propres. Mieux vaut que le
 * modèle passe une citation douteuse que d'attribuer des propos à la mauvaise personne.
 */
const AVERTISSEMENT = `
ATTENTION : le texte ci-dessous est une TRANSCRIPTION AUTOMATIQUE de l'enregistrement vidéo, l'Assemblée n'ayant pas rédigé de compte rendu.
Elle comporte des erreurs, en particulier sur les noms propres et les chiffres.
N'attribue une position ou une citation que si le nom de l'orateur est clairement identifiable ; dans le doute, écris « un député » plutôt que d'inventer un nom.
Ne reprends un chiffre que s'il est énoncé sans ambiguïté.`;

async function analyser(texte: string, titre: string, date: string): Promise<{ analysis: Analysis; dropped: number }> {
  // Même voie que les comptes rendus écrits : Google AI Studio d'abord, DeepSeek
  // en secours seulement. Le compte DeepSeek est à découvert, et cette étape
  // échouait donc à chaque passage.
  const parsed = await demanderJSON<Analysis>(
    `${SYSTEM}\n\n${SHAPE}\n${AVERTISSEMENT}`,
    `Audition du ${date}.\nObjet : ${titre}\n\n--- TRANSCRIPTION AUTOMATIQUE ---\n${texte}`,
    { maxJetons: 16000 },
  );
  return dropInventedQuotes(parsed, texte);
}

/* ───────────────────────── Traitement ───────────────────────── */

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  if (!ASR_KEY) {
    // La transcription est une option qui n'a jamais été activée : aucune clé ASR
    // n'existe. Échouer chaque jour pour cela noyait les vraies pannes sous des
    // courriels d'alerte identiques — on sort donc en succès, avec un
    // avertissement que GitHub affiche en clair sur le passage.
    console.log("::warning title=Transcription des auditions désactivée::ASR_API_KEY absente : "
      + "aucune audition n'est transcrite. Clé gratuite sur console.groq.com → API Keys, "
      + "puis secret GitHub ASR_API_KEY.");
    console.log("⏭  Rien à faire sans clé de transcription.");
    return;
  }
  if (!llmDisponible()) {
    console.log("::warning title=Analyse des auditions indisponible::Aucune clé LLM "
      + "(LLM_FREE_API_KEY). Clé gratuite sur https://aistudio.google.com/apikey.");
    return;
  }
  console.log(`   Analyse via ${llmVoie()}`);
  const supabase = createClient(url, key);

  console.log("=== Auditions sans compte rendu écrit ===");
  let q = supabase
    .from("commission_reports")
    .select("ref, commission, chamber, title, meeting_date, cr_url")
    // Sans analyse, ou marquée « à transcrire » par la tâche des comptes rendus écrits.
    .or("analysis.is.null,analysis->>a_transcrire.eq.true")
    .not("cr_url", "is", null)
    .order("meeting_date", { ascending: false })
    .limit(REF ? 1 : LIMITE * 8);   // on élargit : la plupart ont un compte rendu écrit
  if (REF) q = q.eq("ref", REF);

  const { data, error } = await q;
  if (error) { console.error(`❌ lecture : ${error.message}`); process.exit(1); }
  if (!data?.length) console.log("  Aucun compte rendu en attente d'analyse.");

  let traitees = 0, ignorees = 0;
  for (const r of (data ?? []) as any[]) {
    if (traitees >= LIMITE) break;
    try {
      const lien = await lienVideo(r.cr_url);
      if (!lien) { ignorees++; continue; }   // compte rendu écrit : ce script n'a rien à y faire

      console.log(`\n  ${r.meeting_date} — ${String(r.title).slice(0, 70)}`);
      const mp4 = await fichierMp4(lien);
      if (!mp4) { console.warn("    ⚠ aucun fichier vidéo sur la page"); continue; }

      const texte = await transcrire(mp4, r.ref);
      const mots = texte.split(/\s+/).length;
      console.log(`    transcription : ${mots.toLocaleString("fr-FR")} mots`);
      if (mots < 200) { console.warn("    ⚠ transcription trop courte, on n'analyse pas"); continue; }

      const { analysis, dropped } = await analyser(texte, r.title ?? "", r.meeting_date);
      const points = analysis.points_cles ?? [];
      const summary = [analysis.contexte, ...points.slice(0, 4).map(p => `- ${p}`)].filter(Boolean).join("\n\n");
      console.log(`    analyse : ${points.length} point(s)${dropped ? `, ${dropped} citation(s) écartée(s)` : ""}`);

      if (DRY) { console.log("    (--dry-run : rien n'est écrit)"); traitees++; continue; }
      const { error: err } = await supabase
        .from("commission_reports")
        .update({
          // La provenance reste visible : ces analyses viennent d'un enregistrement,
          // pas d'un compte rendu relu par l'Assemblée.
          // Version courante : sans elle, la tâche des comptes rendus écrits prenait cette
          // analyse pour une ancienne et la « refaisait » à partir de la page vide.
          analysis: { ...analysis, v: VERSION_ANALYSE, source: "transcription" },
          summary, word_count: mots, analyzed_at: new Date().toISOString(),
        })
        .eq("ref", r.ref);
      if (err) throw new Error(err.message);
      await supabase.from("commission_transcripts").upsert(
        { ref: r.ref, texte, mots, source: "transcription", maj_le: new Date().toISOString() }, { onConflict: "ref" });
      console.log("    ✓ enregistrée");
      traitees++;
    } catch (e) {
      console.warn(`    ⚠ ${r.ref} : ${(e as Error).message}`);
    }
  }

  if (!REF && traitees < LIMITE) traitees += await depuisLeJournal(supabase, LIMITE - traitees);

  console.log(`\n=== ${traitees} audition(s) transcrite(s), ${ignorees} réunion(s) avec compte rendu écrit ignorée(s) ===`);
}

/* ───────────── Réunions filmées dont aucun compte rendu n'a jamais paru ───────────── */

/**
 * Le veilleur des auditions (dépôt des mises à jour) tient la liste des réunions tenues. Il y
 * marque « a_transcrire » celles qui ont été filmées et pour lesquelles l'Assemblée n'a
 * publié aucun compte rendu — typiquement les auditions des commissions d'enquête, dont le
 * compte rendu ne sort qu'avec le rapport, des mois plus tard. Elles n'avaient aucune ligne
 * en base : cette tâche ne pouvait pas les voir.
 *
 * On retrouve la vidéo sur le portail vidéo de l'Assemblée, qui liste les réunions de
 * commission par ordre chronologique, l'adresse de chaque vidéo portant son intitulé et sa
 * date. Le rapprochement exige la même date ET plusieurs mots de l'intitulé en commun, sans
 * second candidat aussi bon : dans le doute, on ne transcrit pas — mieux vaut une audition
 * absente qu'une analyse rangée sous la mauvaise réunion.
 */
const PORTAIL = "https://videos.assemblee-nationale.fr";
const MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const NAVIGATEUR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Mots présents dans presque tous les intitulés : ils ne distinguent aucune réunion d'une autre. */
const BANALS = new Set(["commission", "commissions", "audition", "auditions", "representants", "representantes", "nationale",
  "national", "presse", "ouverte", "madame", "monsieur", "president", "presidente", "directeur", "directrice", "general",
  "generale", "mission", "information", "enquete", "table", "ronde", "ministre", "conjointe", "membres", "france", "francaise"]);
const distinctifs = (mots: string[]) => mots.filter(x => x.length >= 5 && !BANALS.has(x));

type Video = { url: string; date: string; mots: Set<string> };

/** Les vidéos de commission du portail, des plus récentes jusqu'à la date voulue. */
async function indexVideos(jusqua: string): Promise<Video[]> {
  const videos = new Map<string, Video>();
  for (let page = 1; page <= 80; page++) {
    // Une page qui ne répond pas ne doit pas faire perdre celles déjà lues.
    let html: string;
    try {
      const r = await fetch(`${PORTAIL}/commissions.p${page}`, { headers: { "User-Agent": NAVIGATEUR } });
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
    await new Promise(x => setTimeout(x, 350));
  }
  return [...videos.values()];
}

/**
 * Ce qui désigne une audition sans équivoque : le NOM DE FAMILLE des personnes entendues
 * (« Mme Claire Hédon » → hedon) et les sigles entre parenthèses (« (CNLE) » → cnle).
 *
 * Les mots de l'intitulé ne suffisent pas : le même jour, deux auditions de la même commission
 * d'enquête partagent « représentants », « lutte », « pauvreté », et un premier essai sur les
 * mots communs rangeait une audition sous la vidéo d'une autre commission.
 */
function reperes(intitule: string): Set<string> {
  const out = new Set<string>();
  for (const m of intitule.matchAll(/(?:\bMM?\.|\bMmes?|\bDr|\bMe)\s+((?:[A-ZÀ-Ý][\wÀ-ÿ'’-]*\s+){0,3}[A-ZÀ-Ý][\wÀ-ÿ'’-]*)/g)) {
    const dernier = m[1].trim().split(/\s+/).pop() ?? "";
    for (const part of sansAccent(dernier).split(/[^a-z]+/)) if (part.length >= 4 && !BANALS.has(part)) out.add(part);
  }
  for (const m of intitule.matchAll(/\(([A-Z]{3,8})\)/g)) out.add(m[1].toLowerCase());
  return out;
}

/** La vidéo d'une réunion : même jour, un nom ou un sigle en commun, et une seule candidate. */
function trouverVideo(videos: Video[], date: string, intitule: string): Video | null {
  const noms = reperes(intitule);
  if (!noms.size) return null;
  const candidates = videos.filter(v => v.date === date && [...noms].some(n => v.mots.has(n)));
  return candidates.length === 1 ? candidates[0] : null;
}

async function mp4DeLaPage(url: string): Promise<string | null> {
  const r = await fetch(url, { headers: { "User-Agent": NAVIGATEUR } });
  if (!r.ok) throw new Error(`page vidéo : HTTP ${r.status}`);
  const mp4 = (await r.text()).match(/https?:\/\/[^"'\s&]+\.mp4/)?.[0];
  return mp4 ?? null;
}

async function depuisLeJournal(supabase: any, reste: number): Promise<number> {
  const { data: file, error } = await supabase.from("cycle_items")
    .select("cle, titre, sujet, date_objet, donnees, tentatives")
    .eq("cycle", "auditions").eq("etape", "a_transcrire").lt("tentatives", 3)
    .order("date_objet", { ascending: false }).limit(40);
  if (error) { console.warn(`  ⚠ journal des auditions illisible : ${error.message}`); return 0; }
  if (!file?.length) return 0;

  console.log(`\n  ${file.length} réunion(s) filmée(s) sans compte rendu écrit, au journal`);
  const videos = await indexVideos(file[file.length - 1].date_objet);
  console.log(`  ${videos.length} vidéo(s) de commission relevée(s) sur le portail`);

  const noter = async (cle: string, tentatives: number, erreur: string) => {
    if (DRY) return;
    await supabase.from("cycle_items").update({ tentatives: tentatives + 1, erreur, agent: "transcripteur", maj_le: new Date().toISOString() })
      .eq("cycle", "auditions").eq("cle", cle);
  };

  // Une vidéo qui réunit deux auditions (« représentants du CNLE, représentants de la DGCS »)
  // ne peut pas être attribuée à l'une d'elles : son analyse mêlerait les deux. On l'écarte.
  const paires = (file as any[]).map(it => ({ it, video: trouverVideo(videos, it.date_objet, String(it.titre ?? "")) }));
  const usage = new Map<string, number>();
  for (const p of paires) if (p.video) usage.set(p.video.url, (usage.get(p.video.url) ?? 0) + 1);
  const sures = paires.filter(p => p.video && usage.get(p.video.url) === 1);
  console.log(`  ${sures.length} réunion(s) rapprochée(s) d'une vidéo sans équivoque`);

  let faites = 0;
  for (const { it, video: v } of sures) {
    if (faites >= reste) break;
    const video = v!;
    console.log(`\n  ${it.date_objet} — ${String(it.titre).slice(0, 70)}\n    vidéo : ${video.url.slice(0, 110)}`);
    try {
      const mp4 = await mp4DeLaPage(video.url);
      if (!mp4) throw new Error("aucun fichier vidéo sur la page");
      const texte = await transcrire(mp4, it.cle);
      const mots = texte.split(/\s+/).length;
      console.log(`    transcription : ${mots.toLocaleString("fr-FR")} mots`);
      if (mots < 200) throw new Error("transcription trop courte");

      const { analysis, dropped } = await analyser(texte, it.titre ?? "", it.date_objet);
      const points = analysis.points_cles ?? [];
      const summary = [analysis.contexte, ...points.slice(0, 4).map(p => `- ${p}`)].filter(Boolean).join("\n\n");
      console.log(`    analyse : ${points.length} point(s)${dropped ? `, ${dropped} citation(s) écartée(s)` : ""}`);
      if (DRY) { console.log("    (--dry-run : rien n'est écrit)"); faites++; continue; }

      const { error: err } = await supabase.from("commission_reports").upsert({
        // Pas de compte rendu, donc pas de référence de compte rendu : la réunion garde
        // son identifiant d'agenda, que le veilleur reconnaîtra.
        ref: it.cle, chamber: "AN", organe_ref: it.donnees?.organe_ref ?? null,
        commission: /^PO\d+$/.test(it.sujet ?? "") ? "Réunion de commission" : (it.sujet ?? "Réunion de commission"),
        title: it.titre, meeting_date: it.date_objet,
        // La source consultable est la vidéo elle-même.
        cr_url: video.url, video_url: video.url,
        analysis: { ...analysis, v: VERSION_ANALYSE, source: "transcription" },
        summary, word_count: mots, analyzed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "ref" });
      if (err) throw new Error(err.message);
      // La transcription est gardée : c'est le seul « compte rendu » de cette audition.
      await supabase.from("commission_transcripts").upsert(
        { ref: it.cle, texte, mots, source: "transcription", maj_le: new Date().toISOString() }, { onConflict: "ref" });
      await supabase.from("cycle_items").update({
        etape: "en_ligne", erreur: null, agent: "transcripteur", en_ligne_le: new Date().toISOString(), maj_le: new Date().toISOString(),
        donnees: { ...it.donnees, video: video.url, transcrit: true },
      }).eq("cycle", "auditions").eq("cle", it.cle);
      console.log("    ✓ en ligne");
      faites++;
    } catch (e) {
      const message = (e as Error).message;
      console.warn(`    ⚠ ${message}`);
      // Quota de transcription ou d'analyse, outil absent de la machine : ce n'est pas la
      // faute de la réunion, on s'arrête sans lui compter un échec.
      if (/429|quota|rate|ENOENT/i.test(message)) break;
      await noter(it.cle, it.tentatives ?? 0, message.slice(0, 300));
    }
  }
  return faites;
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
