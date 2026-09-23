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
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SYSTEM, SHAPE, dropInventedQuotes, type Analysis } from "./lib/commission-prompt";

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
const LLM_MODEL = process.env.COMMISSION_MODEL || "deepseek-v4-pro";
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

/** Suit le lien court, puis lit la page vidéo pour en extraire le fichier MP4. */
async function fichierMp4(lienCourt: string): Promise<string | null> {
  const redirection = await fetch(lienCourt, { redirect: "follow", headers: { "User-Agent": UA } });
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
  const audio = join(dossier, "audio.ogg");
  try {
    await execFileP("ffmpeg", [
      "-nostdin", "-loglevel", "error", "-y",
      "-i", mp4,
      "-vn",                        // pas d'image
      "-ac", "1", "-ar", "16000",   // mono 16 kHz : ce que le modèle attend
      "-c:a", "libopus", "-b:a", "16k",
      audio,
    ], { maxBuffer: 1 << 24, timeout: 40 * 60 * 1000 });

    const taille = (await stat(audio)).size;
    console.log(`    audio extrait : ${(taille / 1e6).toFixed(1)} Mo`);
    // Les interfaces de transcription plafonnent en général à 25 Mo.
    if (taille > 24e6) throw new Error(`audio trop lourd (${(taille / 1e6).toFixed(0)} Mo)`);

    const form = new FormData();
    form.append("file", new Blob([await readFile(audio)], { type: "audio/ogg" }), `${etiquette}.ogg`);
    form.append("model", ASR_MODEL);
    form.append("language", "fr");
    form.append("response_format", "text");

    const r = await fetch(ASR_URL, { method: "POST", headers: { Authorization: `Bearer ${ASR_KEY}` }, body: form });
    const corps = await r.text();
    if (!r.ok) throw new Error(`transcription : HTTP ${r.status} — ${corps.slice(0, 160)}`);
    return corps.trim();
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
  if (!LLM_KEY) throw new Error("DEEPSEEK_API_KEY absente");
  const r = await fetch(`${LLM_URL}chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: `${SYSTEM}\n\n${SHAPE}\n${AVERTISSEMENT}` },
        { role: "user", content: `Audition du ${date}.\nObjet : ${titre}\n\n--- TRANSCRIPTION AUTOMATIQUE ---\n${texte}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 16000,
    }),
  });
  const body: any = await r.json();
  if (!r.ok) throw new Error(`analyse : HTTP ${r.status} — ${JSON.stringify(body).slice(0, 160)}`);
  const brut = body.choices?.[0]?.message?.content ?? "";
  if (!brut.trim()) throw new Error("analyse vide");
  const parsed: Analysis = JSON.parse(brut.replace(/^```json\s*|\s*```$/g, ""));
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
    // Bruyant : sans clé, ces auditions resteraient indéfiniment sans contenu.
    console.error("❌ ASR_API_KEY absente : aucune audition ne peut être transcrite.");
    console.error("   Clé gratuite : console.groq.com → API Keys, puis secret GitHub ASR_API_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Auditions sans compte rendu écrit ===");
  let q = supabase
    .from("commission_reports")
    .select("ref, commission, chamber, title, meeting_date, cr_url")
    .is("analysis", null)
    .not("cr_url", "is", null)
    .order("meeting_date", { ascending: false })
    .limit(REF ? 1 : LIMITE * 8);   // on élargit : la plupart ont un compte rendu écrit
  if (REF) q = q.eq("ref", REF);

  const { data, error } = await q;
  if (error) { console.error(`❌ lecture : ${error.message}`); process.exit(1); }
  if (!data?.length) { console.log("  Rien à traiter."); return; }

  let traitees = 0, ignorees = 0;
  for (const r of data as any[]) {
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
          analysis: { ...analysis, source: "transcription" },
          summary, word_count: mots, analyzed_at: new Date().toISOString(),
        })
        .eq("ref", r.ref);
      if (err) throw new Error(err.message);
      console.log("    ✓ enregistrée");
      traitees++;
    } catch (e) {
      console.warn(`    ⚠ ${r.ref} : ${(e as Error).message}`);
    }
  }

  console.log(`\n=== ${traitees} audition(s) transcrite(s), ${ignorees} réunion(s) avec compte rendu écrit ignorée(s) ===`);
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
