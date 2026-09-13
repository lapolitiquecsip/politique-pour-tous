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
 *   npx tsx scripts/update-commissions.ts                    # marche courante
 *   npx tsx scripts/update-commissions.ts --weeks=30          # rattrapage Sénat
 *   npx tsx scripts/update-commissions.ts --skip-analysis     # ingestion seule (gratuite)
 *   npx tsx scripts/update-commissions.ts --skip-scrape --analyses=700 --concurrency=6
 *                                                            # rattrapage de l'historique
 *
 * Options de l'étape 2 :
 *   --analyses=N      nombre maximum d'analyses sur ce passage (défaut 20)
 *   --concurrency=N   analyses menées en parallèle (défaut 4)
 *   --min-balance=X   réserve de solde DeepSeek à ne pas entamer, en dollars (défaut 0.4).
 *                     La dépense est comptée localement à partir des jetons consommés, et
 *                     NON par sondage du solde distant, facturé en différé : c'est ce
 *                     sondage qui avait laissé le compte passer en négatif.
 *   --offpeak-only    ne rien analyser pendant les heures pleines de DeepSeek, où le
 *                     tarif double. Activé par le cron.
 *
 * Variables requises : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * DEEPSEEK_API_KEY n'est nécessaire que pour l'étape 2 (analyses).
 */
import { createClient } from "@supabase/supabase-js";

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

/**
 * Moteur d'analyse : DeepSeek, par son point d'accès compatible OpenAI.
 *
 * Choisi après comparaison mesurée sur un même compte rendu (Gemini Flash Lite,
 * DeepSeek, Claude Haiku 4.5) : DeepSeek a rendu les citations les plus fidèles au
 * verbatim, là où un concurrent plus cher avait reformulé une citation et daté un
 * chiffre du mauvais exercice.
 *
 * `deepseek-v4-pro` est le modèle de qualité ; `deepseek-flash` coûte ~6 fois moins
 * mais extrait nettement moins de chiffres. Basculer par la variable COMMISSION_MODEL.
 *
 * ⚠️ max_tokens généreux À DESSEIN : ces modèles raisonnent, et un plafond trop bas
 * renvoie une réponse VIDE sans la moindre erreur — panne silencieuse difficile à voir.
 */
const MODEL = process.env.COMMISSION_MODEL || "deepseek-v4-pro";
const LLM_BASE_URL = process.env.COMMISSION_BASE_URL || "https://api.deepseek.com/";
const LLM_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const SYSTEM = `Tu analyses des comptes rendus de commissions parlementaires françaises pour des professionnels de la politique : collaborateurs parlementaires, directions des affaires publiques, journalistes.

Règles absolues :
- Tu ne rapportes QUE ce qui figure dans le compte rendu. Aucune connaissance extérieure, aucune extrapolation, aucun commentaire de ta part.
- Tu restes strictement neutre : tu rapportes les positions, tu ne les évalues pas.
- Les citations sont recopiées MOT POUR MOT depuis le compte rendu. Si tu n'es pas certain d'un extrait, tu ne le cites pas.
- Chaque chiffre est rattaché à l'exercice dont le compte rendu le date.
- Un champ sans matière dans le compte rendu reste un tableau vide. Ne jamais combler un vide.
- Tes lecteurs connaissent le vocabulaire parlementaire : sois précis et dense, pas pédagogique.`;

const SHAPE = `Réponds UNIQUEMENT par un objet JSON de cette forme exacte :
{
  "contexte": "2 à 3 phrases : de quoi traite la réunion, qui est auditionné, pourquoi maintenant",
  "points_cles": ["5 à 9 points sur ce qui a RÉELLEMENT été dit, du plus important au moins important"],
  "chiffres": [{"valeur": "le chiffre tel qu'énoncé", "quoi": "ce qu'il mesure, avec l'exercice concerné"}],
  "positions": [{"orateur": "M./Mme Nom", "groupe": "groupe ou fonction, sinon chaîne vide", "position": "ce qu'il ou elle défend"}],
  "citations": [{"orateur": "M./Mme Nom", "texte": "citation exacte, 30 mots maximum"}],
  "suites": ["suites annoncées : rapport, vote, saisine, nouvelle audition"]
}`;

type Analysis = {
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
function dropInventedQuotes(analysis: Analysis, transcript: string): { analysis: Analysis; dropped: number } {
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

/**
 * Heures pleines DeepSeek : 01h-04h et 06h-10h UTC, du lundi au vendredi.
 * Tout le reste — nuits, midi, soirées, et l'intégralité du week-end — est à moitié prix.
 * Le rattrapage de l'historique a donc tout intérêt à tourner hors de ces fenêtres.
 */
function isOffPeak(d = new Date()): boolean {
  const day = d.getUTCDay();                 // 0 = dimanche, 6 = samedi
  if (day === 0 || day === 6) return true;   // week-end : toujours creux
  const h = d.getUTCHours();
  return !((h >= 1 && h < 4) || (h >= 6 && h < 10));
}

/**
 * Plafond de coût d'un appel, en dollars, d'après les jetons réellement consommés.
 *
 * On applique TOUJOURS le tarif haut de deepseek-v4-pro (heures pleines, cache manqué),
 * même en heures creuses. C'est délibéré : le premier rattrapage a été facturé 0,0259 $
 * par analyse là où les tarifs creux publiés annonçaient 0,0187 $. Un garde-fou qui
 * sous-estime laisse le compte passer en négatif ; un garde-fou qui surestime s'arrête
 * un peu tôt et laisse du solde. Entre les deux, le choix est vite fait.
 */
const RATE_IN = 1.32, RATE_OUT = 3.96;   // $ par million de jetons

function estimateCost(inTok: number, outTok: number): number {
  return (inTok * RATE_IN + outTok * RATE_OUT) / 1e6;
}

/** Solde DeepSeek en dollars, ou null si l'appel échoue. */
async function readBalance(): Promise<number | null> {
  try {
    const r = await fetch("https://api.deepseek.com/user/balance", {
      headers: { Authorization: `Bearer ${LLM_API_KEY}` },
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    return Number(j.balance_infos?.[0]?.total_balance ?? NaN) || null;
  } catch { return null; }
}

/** Analyse une réunion et l'enregistre. Renvoie un compte rendu d'exécution. */
async function analyseOne(supabase: any, row: any) {
  const transcript = await loadTranscript(row);
  if (!transcript) return { ok: false, reason: "verbatim introuvable", dropped: 0, inTok: 0, outTok: 0 };

  // DeepSeek abaisse la concurrence autorisée à mesure que le solde baisse : les 429
  // arrivent alors en rafale. On patiente plutôt que de perdre la réunion.
  let res!: Response, body: any;
  for (let attempt = 1; ; attempt++) {
    res = await fetch(`${LLM_BASE_URL}chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: `${SYSTEM}\n\n${SHAPE}` },
          {
            role: "user",
            content: `Compte rendu de la ${row.commission ?? "commission"} — séance du ${row.meeting_date}.\nObjet : ${row.title ?? "(non précisé)"}\n\n--- COMPTE RENDU INTÉGRAL ---\n${transcript}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 16000,
      }),
    });
    body = await res.json();
    if (res.status !== 429 || attempt >= 4) break;
    await sleep(attempt * 15000);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(body).slice(0, 160)}`);

  const raw = body.choices?.[0]?.message?.content ?? "";
  if (!raw.trim()) throw new Error("réponse vide (plafond de jetons trop bas ?)");
  const parsed: Analysis = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));

  const { analysis, dropped } = dropInventedQuotes(parsed, transcript);
  const points = analysis.points_cles ?? [];
  const summary = row.summary
    ?? [analysis.contexte, ...points.slice(0, 4).map(p => `- ${p}`)].filter(Boolean).join("\n\n");

  const { error } = await supabase
    .from("commission_reports")
    .update({ analysis, summary, word_count: transcript.split(/\s+/).length, analyzed_at: new Date().toISOString() })
    .eq("ref", row.ref);
  if (error) throw new Error(error.message);

  return {
    ok: true, dropped,
    inTok: body.usage?.prompt_tokens ?? 0,
    outTok: body.usage?.completion_tokens ?? 0,
    points: points.length,
    chiffres: (analysis.chiffres ?? []).length,
    citations: (analysis.citations ?? []).length,
  };
}

async function analyseMeetings(
  supabase: any,
  limit: number,
  opts: { concurrency: number; minBalance: number; offPeakOnly: boolean },
) {
  console.log(`\n🧠 Analyse détaillée — jusqu'à ${limit} réunion(s), modèle ${MODEL}`);
  if (!LLM_API_KEY) {
    console.warn("  ⚠ DEEPSEEK_API_KEY absente : étape ignorée.");
    return;
  }

  if (opts.offPeakOnly && !isOffPeak()) {
    console.log("  ⏸ Heures pleines DeepSeek (tarif double) : analyses reportées au prochain passage.");
    return;
  }

  const startBalance = await readBalance();
  if (startBalance !== null) {
    console.log(`  Solde DeepSeek : ${startBalance.toFixed(2)} $${isOffPeak() ? " (heures creuses, tarif réduit)" : " (heures pleines)"}`);
    if (startBalance <= opts.minBalance) {
      console.warn(`  ⚠ Solde insuffisant (plancher ${opts.minBalance} $) : rien n'est lancé.`);
      return;
    }
  }

  const { data: rows, error } = await supabase
    .from("commission_reports")
    .select("ref, chamber, commission, title, meeting_date, cr_url, summary")
    .is("analysis", null)
    .order("meeting_date", { ascending: false })   // les réunions récentes d'abord
    .limit(limit);

  if (error) { console.error(`  ✗ ${error.message}`); return; }
  if (!rows?.length) { console.log("  Rien à analyser."); return; }
  console.log(`  ${rows.length} réunion(s) à traiter, ${opts.concurrency} en parallèle`);

  let done = 0, failed = 0, quotesDropped = 0, tokensIn = 0, tokensOut = 0;
  let halted = false;
  let cursor = 0;
  // Ce qu'on s'autorise à dépenser sur ce passage, réserve déduite.
  const budget = startBalance !== null ? Math.max(0, startBalance - opts.minBalance) : null;
  let spent = 0;
  if (budget !== null) console.log(`  Budget de ce passage : ${budget.toFixed(2)} $ (réserve ${opts.minBalance} $)`);

  // Pool de travailleurs : chacun pioche la réunion suivante jusqu'à épuisement.
  const worker = async () => {
    while (!halted) {
      const i = cursor++;
      if (i >= rows.length) return;
      const row = rows[i];
      const label = `${row.meeting_date} ${String(row.title ?? "").slice(0, 48)}`;
      try {
        const r = await analyseOne(supabase, row);
        if (!r.ok) { failed++; console.warn(`  ⚠ ${label} : ${r.reason}`); continue; }
        done++; quotesDropped += r.dropped; tokensIn += r.inTok; tokensOut += r.outTok;
        console.log(`  ✓ [${done + failed}/${rows.length}] ${label} — ${r.points} pts, ${r.chiffres} chiffres, ${r.citations} cit.${r.dropped ? ` (${r.dropped} écartée·s)` : ""}`);

        // Budget suivi LOCALEMENT, contrôlé après CHAQUE analyse.
        //
        // On n'interroge pas le solde distant pour cela : DeepSeek facture en différé,
        // si bien qu'un sondage périodique lit une valeur périmée et laisse le
        // traitement filer au-delà du plancher — c'est précisément ce qui a fait passer
        // le compte en négatif lors du premier rattrapage. Les jetons consommés, eux,
        // sont connus immédiatement et ne mentent pas.
        spent += estimateCost(r.inTok, r.outTok);
        if (budget !== null && spent >= budget) {
          halted = true;
          console.warn(`\n  ⛔ Budget atteint : ${spent.toFixed(2)} $ sur ${budget.toFixed(2)} $ disponibles — arrêt propre.`);
        }
      } catch (e) {
        failed++;
        console.warn(`  ✗ ${label} : ${(e as Error).message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: opts.concurrency }, worker));

  console.log(`\n  → ${done} analyse(s), ${failed} échec(s), ${quotesDropped} citation(s) écartée(s) car absentes du verbatim`);
  console.log(`  → ${tokensIn} jetons entrants, ${tokensOut} sortants`);
  console.log(`  → plafond de dépense ${spent.toFixed(2)} $ (${done ? (spent / done).toFixed(4) : "—"} $/analyse au tarif haut ; la facture réelle est plus basse)`);
  // Le solde annoncé se met à jour avec du retard : indicatif seulement.
  const endBalance = await readBalance();
  if (endBalance !== null) console.log(`  → solde annoncé par DeepSeek : ${endBalance.toFixed(2)} $ (facturation différée)`);
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
    await analyseMeetings(supabase, arg("analyses", 20), {
      concurrency: arg("concurrency", 4),
      minBalance: Number(process.argv.find(a => a.startsWith("--min-balance="))?.split("=")[1] ?? 0.4),
      // Le cron l'active pour ne jamais payer le tarif fort ; un lancement manuel passe outre.
      offPeakOnly: process.argv.includes("--offpeak-only"),
    });
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
