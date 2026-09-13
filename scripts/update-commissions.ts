/**
 * CRON : suivi des commissions parlementaires (fonctionnalité de l'abonnement Pro).
 *
 * Deux étapes indépendantes :
 *
 *  1. INGESTION SÉNAT — les comptes rendus de commission du Sénat sont publiés en HTML
 *     à l'adresse /compte-rendu-commissions/AAAAMMJJ/<slug>.html (une page par commission
 *     et par semaine, contenant le verbatim intégral). Ils relèvent de la Licence Ouverte
 *     Etalab, leur réutilisation est donc explicitement autorisée. Les pages d'index par
 *     commission (lois.html, finances.html…) sont stables dans le temps, contrairement aux
 *     slugs datés qui dérivent (« eco » devient « affeco », « lois » devient « loi »…) :
 *     on part donc TOUJOURS des index, jamais d'URL devinée.
 *     L'Assemblée, elle, est déjà ingérée par le backend dans la même table.
 *
 *  2. ANALYSE DÉTAILLÉE — pour chaque réunion sans analyse, on lit le compte rendu intégral
 *     et on en tire une fiche structurée (contexte, ce qui s'est dit, chiffres avancés,
 *     positions défendues, verbatim marquant, suites). C'est ce que voit l'abonné Pro.
 *
 * Usage :
 *   npx tsx scripts/update-commissions.ts                  # marche courante
 *   npx tsx scripts/update-commissions.ts --weeks=30        # rattrapage Sénat
 *   npx tsx scripts/update-commissions.ts --analyses=40     # plus d'analyses d'un coup
 *   npx tsx scripts/update-commissions.ts --skip-analysis   # ingestion seule (gratuit)
 *
 * Variables requises : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * ANTHROPIC_API_KEY n'est nécessaire que pour l'étape 2.
 */
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const UA = "Mozilla/5.0 (compatible; lapolitiquecestsimple/1.0; +https://lapolitiquecestsimple.fr)";
const SENAT = "https://www.senat.fr";

/** Pages d'index stables, une par commission permanente. Clé = nom affiché sur le site. */
const SENATE_INDEXES: { page: string; commission: string }[] = [
  { page: "lois", commission: "Commission des lois" },
  { page: "finances", commission: "Commission des finances" },
  { page: "economie", commission: "Commission des affaires économiques" },
  { page: "culture", commission: "Commission de la culture, de l'éducation et de la communication" },
  { page: "affaires-sociales", commission: "Commission des affaires sociales" },
  { page: "developpement-durable", commission: "Commission de l'aménagement du territoire et du développement durable" },
  { page: "affaires-etrangeres", commission: "Commission des affaires étrangères, de la défense et des forces armées" },
  { page: "affaires-europeennes", commission: "Commission des affaires européennes" },
];

/* ─────────────────────────── Utilitaires HTML ─────────────────────────── */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»",
  eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", rsquo: "’", lsquo: "‘", hellip: "…",
  ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û", euml: "ë", iuml: "ï", uuml: "ü", acirc: "â",
  ugrave: "ù", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", oelig: "œ", deg: "°", euro: "€",
  Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç", Ecirc: "Ê", Icirc: "Î", Ocirc: "Ô", Ucirc: "Û",
};

function decodeEntities(s: string): string {
  return String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => NAMED[n] ?? NAMED[n.toLowerCase()] ?? m)
    .replace(/ /g, " ");
}

/**
 * HTML → texte lisible, en gardant les sauts de PARAGRAPHE (donc les tours de parole).
 *
 * Le HTML du Sénat coupe les phrases par des retours à la ligne au milieu des
 * paragraphes : on ne peut donc pas se fier au « \n » du source. On marque d'abord
 * les vraies fins de bloc, puis on écrase tout le reste des blancs.
 */
function htmlToText(html: string): string {
  const BREAK = "\uE000";
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, BREAK)
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, BREAK)
      .replace(/<[^>]+>/g, " ")
  )
    .split(BREAK)
    // Les balises en ligne devenues espaces laissent « Raynal , président . » :
    // on recolle la ponctuation française (qui garde son espace avant « ; : ! ? »).
    .map(l => l.replace(/\s+/g, " ").replace(/\s+([,.\)])/g, "$1").replace(/\(\s+/g, "(").trim())
    .filter(Boolean)
    .join("\n");
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.warn(`  ⚠ échec ${url} : ${(e as Error).message}`);
    return null;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ─────────────────────── Étape 1 : ingestion Sénat ─────────────────────── */

type ParsedMeeting = {
  ref: string;
  commission: string;
  title: string;
  meeting_date: string;
  cr_url: string;
  text: string;
};

const MONTHS: Record<string, number> = {
  janvier: 1, "février": 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, "décembre": 12,
};

/** « Mercredi 1er juillet 2026 » → « 2026-07-01 ». */
function parseFrenchDate(label: string): string | null {
  const m = decodeEntities(label).toLowerCase().match(/(\d{1,2})(?:er)?\s+([a-zéûî]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[2]];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

/**
 * Découpe une page hebdomadaire en réunions.
 * Structure du Sénat : h1 = commission, h2 = date de séance, h3 = objet de la réunion,
 * puis le verbatim jusqu'au titre suivant.
 */
export function parseSenateWeek(html: string, url: string, fallbackCommission: string): ParsedMeeting[] {
  const start = html.search(/<h1/i);
  if (start < 0) return [];
  const body = html.slice(start).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");

  // Le titre de la page est en CAPITALES NON ACCENTUÉES (« COMMISSION DES AFFAIRES
  // ECONOMIQUES ») : le repasser en minuscules donne « affaires economiques », sans
  // accents et impossible à réaccentuer proprement. On préfère donc le nom curé de
  // SENATE_INDEXES, qui vient de la page d'index d'où le lien a été trouvé, et on ne
  // retombe sur le titre que s'il n'y a pas de nom curé (cas d'un appel hors ingestion).
  let commissionLabel = fallbackCommission;
  if (!commissionLabel) {
    const h1 = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const raw = h1
      ? decodeEntities(h1[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
          .replace(/^COMPTES RENDUS DE LA\s*/i, "")
      : "";
    commissionLabel = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "Commission";
  }

  // Toutes les balises h2/h3, dans l'ordre du document.
  const marks = [...body.matchAll(/<(h[23])[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => ({
    level: m[1].toLowerCase(),
    text: decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
    start: m.index!,
    end: m.index! + m[0].length,
  }));

  const out: ParsedMeeting[] = [];
  let currentDate: string | null = null;
  let seq = 0;

  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    if (mark.level === "h2") {
      currentDate = parseFrenchDate(mark.text) ?? currentDate;
      continue;
    }
    if (!currentDate) continue;

    const text = htmlToText(body.slice(mark.end, marks[i + 1]?.start ?? body.length));
    // Une entrée sans verbatim exploitable (simple renvoi, page vide) n'a rien à analyser.
    if (text.length < 400) continue;

    seq += 1;
    out.push({
      // Identifiant stable : même page relue ⇒ même ref ⇒ mise à jour, pas de doublon.
      ref: `SENAT-${currentDate.replace(/-/g, "")}-${url.split("/").pop()?.replace(".html", "")}-${seq}`,
      commission: commissionLabel,
      title: mark.text,
      meeting_date: currentDate,
      cr_url: url,
      text,
    });
  }
  return out;
}

async function ingestSenate(supabase: any, weeks: number) {
  console.log(`\n📜 Ingestion Sénat — ${weeks} dernières semaines`);
  const cutoff = new Date(Date.now() - weeks * 7 * 864e5).toISOString().slice(0, 10).replace(/-/g, "");

  // 1. Découverte des pages hebdomadaires via les index stables par commission.
  const weekPages = new Map<string, string>(); // url → commission de repli
  for (const { page, commission } of SENATE_INDEXES) {
    const html = await fetchText(`${SENAT}/compte-rendu-commissions/${page}.html`);
    if (!html) { console.warn(`  ⚠ index ${page} inaccessible`); continue; }
    for (const m of html.matchAll(/href="(\/compte-rendu-commissions\/(\d{8})\/[a-z0-9_-]+\.html)"/gi)) {
      if (m[2] >= cutoff) weekPages.set(`${SENAT}${m[1]}`, commission);
    }
    await sleep(300);
  }
  console.log(`  ${weekPages.size} page(s) hebdomadaire(s) à examiner`);
  if (!weekPages.size) return;

  // 2. On saute les pages déjà ingérées pour ne pas retélécharger tout l'historique.
  //    `--refresh` force la relecture, pour propager une correction du parseur aux
  //    réunions déjà en base (les `ref` étant stables, l'upsert met à jour sans doublon).
  const refresh = process.argv.includes("--refresh");
  const { data: known } = await supabase
    .from("commission_reports").select("cr_url").eq("chamber", "SENAT");
  const seen = refresh ? new Set<string>() : new Set((known ?? []).map((r: any) => r.cr_url));
  if (refresh) console.log("  (--refresh : les pages déjà connues sont relues)");

  let inserted = 0, skipped = 0;
  for (const [url, fallback] of weekPages) {
    if (seen.has(url)) { skipped++; continue; }
    const html = await fetchText(url);
    if (!html) continue;

    const meetings = parseSenateWeek(html, url, fallback);
    if (!meetings.length) { await sleep(400); continue; }

    const rows = meetings.map(m => ({
      ref: m.ref,
      chamber: "SENAT",
      commission: m.commission,
      title: m.title,
      meeting_date: m.meeting_date,
      cr_url: m.cr_url,
      // `summary` et `analysis` sont volontairement ABSENTS de cet objet : à l'insertion
      // ils valent null par défaut, et lors d'une relecture (--refresh) ils ne sont pas
      // écrasés — sans quoi on effacerait des analyses déjà payées en jetons.
      // Le verbatim brut n'est pas stocké : il est relu depuis cr_url au moment de l'analyse.
      word_count: m.text.split(/\s+/).length,
    }));

    const { error } = await supabase.from("commission_reports").upsert(rows, { onConflict: "ref" });
    if (error) { console.warn(`  ⚠ insertion ${url} : ${error.message}`); continue; }

    inserted += rows.length;
    console.log(`  ✓ ${url.split("/").slice(-2).join("/")} — ${rows.length} réunion(s)`);
    await sleep(400); // on reste courtois avec senat.fr
  }
  console.log(`  → ${inserted} réunion(s) ajoutée(s), ${skipped} page(s) déjà connue(s)`);
}

/* ──────────────── Étape 2 : analyse détaillée (abonnement Pro) ──────────────── */

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: "enregistrer_analyse",
  description: "Enregistre l'analyse structurée d'une réunion de commission parlementaire.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["contexte", "points_cles", "chiffres", "positions", "citations", "suites"],
    properties: {
      contexte: {
        type: "string",
        description: "2 à 3 phrases : de quoi traite la réunion, qui est auditionné, pourquoi maintenant.",
      },
      points_cles: {
        type: "array",
        description: "5 à 9 points sur ce qui a RÉELLEMENT été dit, du plus important au moins important. Phrases complètes et factuelles.",
        items: { type: "string" },
      },
      chiffres: {
        type: "array",
        description: "Chiffres avancés pendant la réunion. Vide si aucun chiffre n'a été cité.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["valeur", "quoi"],
          properties: {
            valeur: { type: "string", description: "Le chiffre tel qu'énoncé, ex. « 125 milliards d'euros », « 5,1 % du PIB »." },
            quoi: { type: "string", description: "Ce que mesure ce chiffre, en une courte phrase." },
          },
        },
      },
      positions: {
        type: "array",
        description: "Positions défendues, une par orateur marquant. Vide si la réunion est purement technique.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["orateur", "groupe", "position"],
          properties: {
            orateur: { type: "string", description: "Nom tel qu'il apparaît, ex. « Mme Muriel Jourda »." },
            groupe: { type: "string", description: "Groupe politique ou fonction si le compte rendu l'indique, sinon chaîne vide." },
            position: { type: "string", description: "Ce que cette personne défend, en une à deux phrases." },
          },
        },
      },
      citations: {
        type: "array",
        description: "1 à 3 extraits verbatim marquants, recopiés MOT POUR MOT depuis le compte rendu.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["orateur", "texte"],
          properties: {
            orateur: { type: "string" },
            texte: { type: "string", description: "Citation exacte, sans guillemets, 30 mots maximum." },
          },
        },
      },
      suites: {
        type: "array",
        description: "Suites annoncées : rapport à venir, vote programmé, saisine, nouvelle audition. Vide si rien n'est annoncé.",
        items: { type: "string" },
      },
    },
  },
};

const SYSTEM = `Tu analyses des comptes rendus de commissions parlementaires françaises pour des professionnels de la politique : collaborateurs parlementaires, directions des affaires publiques, journalistes.

Règles absolues :
- Tu ne rapportes QUE ce qui figure dans le compte rendu. Aucune connaissance extérieure, aucune extrapolation, aucun commentaire de ta part.
- Tu restes stricement neutre : tu rapportes les positions, tu ne les évalues pas.
- Les citations sont recopiées mot pour mot. Si tu n'es pas certain d'un extrait, tu ne le cites pas.
- Un champ sans matière dans le compte rendu reste un tableau vide. Ne jamais combler un vide.
- Tes lecteurs connaissent le vocabulaire parlementaire : sois précis et dense, pas pédagogique.`;

/** Récupère le verbatim intégral d'une réunion depuis son compte rendu officiel. */
async function loadTranscript(row: any): Promise<string | null> {
  if (!row.cr_url) return null;
  const html = await fetchText(row.cr_url);
  if (!html) return null;

  if (row.chamber === "SENAT") {
    // La page hebdomadaire contient plusieurs réunions : on ré-extrait la bonne par son titre.
    const meetings = parseSenateWeek(html, row.cr_url, row.commission ?? "");
    const match = meetings.find(m => m.ref === row.ref)
      ?? meetings.find(m => m.title.slice(0, 60) === String(row.title ?? "").slice(0, 60));
    return match?.text ?? null;
  }

  // Assemblée : la page de compte rendu ne contient qu'une réunion.
  const start = html.search(/<h1/i);
  const text = htmlToText(start >= 0 ? html.slice(start) : html);
  return text.length > 400 ? text : null;
}

async function analyseMeetings(supabase: any, limit: number) {
  console.log(`\n🧠 Analyse détaillée — jusqu'à ${limit} réunion(s)`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("  ⚠ ANTHROPIC_API_KEY absente : étape ignorée.");
    return;
  }

  const { data: rows, error } = await supabase
    .from("commission_reports")
    .select("ref, chamber, commission, title, meeting_date, cr_url, summary")
    .is("analysis", null)
    .order("meeting_date", { ascending: false })
    .limit(limit);

  if (error) { console.error(`  ✗ ${error.message}`); return; }
  if (!rows?.length) { console.log("  Rien à analyser."); return; }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let done = 0, failed = 0;

  for (const row of rows) {
    const label = `${row.meeting_date} ${String(row.title ?? "").slice(0, 60)}`;
    const transcript = await loadTranscript(row);

    if (!transcript) {
      console.warn(`  ⚠ verbatim introuvable : ${label}`);
      failed++;
      continue;
    }

    try {
      // Les comptes rendus peuvent être très longs ; on diffuse pour ne pas heurter
      // le délai HTTP du SDK, et on ne tronque jamais le texte transmis.
      const stream = anthropic.messages.stream({
        model: "claude-opus-5",
        max_tokens: 8000,
        system: SYSTEM,
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
        messages: [{
          role: "user",
          content: `Compte rendu de la ${row.commission ?? "commission"} — séance du ${row.meeting_date}.\nObjet : ${row.title ?? "(non précisé)"}\n\n--- COMPTE RENDU INTÉGRAL ---\n${transcript}`,
        }],
      });
      const message = await stream.finalMessage();

      const call = message.content.find(b => b.type === "tool_use");
      if (!call || call.type !== "tool_use") throw new Error("aucune analyse renvoyée");
      const analysis = call.input as Record<string, unknown>;

      // Résumé court dérivé de l'analyse, pour le fil d'auditions tout public.
      const points = (analysis.points_cles as string[]) ?? [];
      const summary = row.summary
        ?? [analysis.contexte, ...points.slice(0, 4).map(p => `- ${p}`)].filter(Boolean).join("\n\n");

      const { error: upErr } = await supabase
        .from("commission_reports")
        .update({
          analysis,
          summary,
          word_count: transcript.split(/\s+/).length,
          analyzed_at: new Date().toISOString(),
        })
        .eq("ref", row.ref);

      if (upErr) throw new Error(upErr.message);

      done++;
      const u = message.usage;
      console.log(`  ✓ ${label} — ${u.input_tokens} jetons entrants, ${u.output_tokens} sortants`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${label} : ${(e as Error).message}`);
    }
  }

  console.log(`  → ${done} analyse(s) générée(s), ${failed} échec(s)`);
}

/* ───────────────────────────────── Entrée ───────────────────────────────── */

function arg(name: string, fallback: number): number {
  const raw = process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Suivi des commissions parlementaires ===");

  if (!process.argv.includes("--skip-scrape")) {
    await ingestSenate(supabase, arg("weeks", 3));
  }
  if (!process.argv.includes("--skip-analysis")) {
    await analyseMeetings(supabase, arg("analyses", 10));
  }

  console.log("\n=== Terminé ===");
}

// Le fichier est aussi importé par ses tests : on ne lance le CRON que s'il est
// exécuté directement.
if (process.argv[1]?.includes("update-commissions")) {
  main().catch(e => {
    console.error("Erreur fatale :", e);
    process.exit(1);
  });
}
