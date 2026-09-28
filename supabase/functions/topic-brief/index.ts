import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * « Tout sur un sujet » — la synthèse thématique des abonnés.
 *
 * POURQUOI UNE FONCTION EDGE
 * Le site est un export statique : il n'a pas de serveur à lui. Or cette
 * fonctionnalité demande deux choses qu'un navigateur ne doit jamais faire :
 * détenir la clé d'un modèle de langage, et décider seul si le lecteur y a
 * droit. Les deux vivent donc ici.
 *
 * CE QU'ELLE FAIT
 *   1. vérifie que l'appelant est connecté ET abonné (Premium ou Pro) ;
 *   2. rend la synthèse déjà calculée si elle existe — le premier abonné qui
 *      demande un sujet paie l'attente, les suivants l'ont tout de suite ;
 *   3. sinon rassemble la matière dans les corpus du site (Journal officiel,
 *      lois promulguées, textes en cours, actualité), la fait mettre en forme
 *      par un modèle gratuit, l'enregistre et la rend.
 *
 * CE QU'ELLE NE FAIT PAS
 * Elle n'invente rien. Le modèle ne reçoit que les documents trouvés, avec
 * l'instruction de s'y tenir et de dire quand la matière manque. Une synthèse
 * qui affirmerait un taux d'aide ou une obligation légale sans texte derrière
 * serait pire qu'une absence de réponse : le lecteur en tirerait une décision.
 *
 * Déploiement :
 *   supabase functions deploy topic-brief
 *   supabase secrets set LLM_FREE_API_KEY=...
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/** Durée au-delà de laquelle une synthèse est recalculée : la matière bouge. */
const FRAICHEUR_JOURS = 14;

/**
 * Réduit un sujet à sa forme comparable.
 *
 * « Panneaux solaires », « panneau solaire » et « PANNEAU SOLAIRE » sont le même
 * sujet. Sans cette réduction, chacun ferait un appel au modèle et occuperait
 * une ligne de cache différente pour le même contenu.
 */
function reduire(mot: string): string {
  return mot
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    // Pluriel simple. On ne touche pas aux mots de trois lettres ou moins :
    // « gaz » ou « pas » y perdraient leur dernière lettre.
    .map(m => (m.length > 3 && m.endsWith("s") ? m.slice(0, -1) : m))
    .join("-");
}

/* ─────────────────────────── Les modèles gratuits ────────────────────────── */

const MODELES = (Deno.env.get("LLM_FREE_MODELS") ??
  "gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest")
  .split(",").map(m => m.trim()).filter(Boolean);

/**
 * Interroge le modèle, en changeant de lignée sur un 429.
 *
 * Les quotas gratuits sont comptés PAR LIGNÉE de modèle : quand l'une sature,
 * les autres répondent normalement. Réessayer la même est du temps perdu.
 * `thinkingBudget: 0` est indispensable : ces modèles raisonnent, et le
 * raisonnement se déduit du budget de sortie — un budget trop court est
 * entièrement consommé par la réflexion et l'appel renvoie 200 avec un texte
 * VIDE, sans la moindre erreur.
 */
async function demander(systeme: string, utilisateur: string): Promise<{ texte: string; modele: string }> {
  const cle = Deno.env.get("LLM_FREE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!cle) throw new Error("LLM_FREE_API_KEY absente de la fonction");

  let derniere = "";
  for (const modele of MODELES) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${cle}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systeme }] },
            contents: [{ role: "user", parts: [{ text: utilisateur }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      );
      if (r.status === 429 || r.status === 503) { derniere = `HTTP ${r.status}`; continue; }
      if (!r.ok) { derniere = `HTTP ${r.status} ${(await r.text()).slice(0, 200)}`; continue; }
      const data = await r.json();
      const texte = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (!texte.trim()) { derniere = "réponse vide"; continue; }
      return { texte, modele };
    } catch (e) {
      derniere = (e as Error).message;
    }
  }
  throw new Error(`aucun modèle disponible (${derniere})`);
}

/* ─────────────────────────── La matière du site ──────────────────────────── */

type Source = { kind: string; title: string; date: string | null; url: string | null; note?: string | null };

/** Échappe ce qui a un sens pour PostgREST dans un motif `ilike`. */
const motif = (q: string) => `%${q.replace(/[%,()]/g, " ").trim()}%`;

const sansAccent = (x: string) =>
  (x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Découpe le sujet en mots cherchables, pluriel ôté.
 *
 * C'est la correction la plus importante de cette collecte. Chercher
 * l'expression exacte « panneau solaire » ne trouvait RIEN : les textes écrivent
 * « panneaux solaires ». Mesuré sur la base : zéro document par expression
 * exacte, dix-neuf par mots. Le « s » et le « x » finaux tombent (panneaux →
 * panneau, travaux → travau) et le motif devient un fragment, qui retrouve aussi
 * bien le singulier que le pluriel.
 */
function motsCles(q: string): string[] {
  return sansAccent(q).split(/[^a-z0-9]+/)
    .filter(m => m.length > 3)
    .map(m => (/[sx]$/.test(m) ? m.slice(0, -1) : m));
}

type Source = { kind: string; title: string; date: string | null; url: string | null; note?: string | null };

/**
 * Rassemble la matière dans TOUS les corpus du site.
 *
 * Une requête par corpus, toutes lancées ensemble, et CHACUNE ISOLÉE : un corpus
 * lent ou en échec rend une liste vide au lieu de faire tomber la synthèse
 * entière. Le cas est réel — les amendements, trente-cinq mille textes sans index
 * de recherche, dépassent parfois le délai maximum d'une requête.
 *
 * On filtre sur le mot le plus long (le plus sélectif), puis on écarte en mémoire
 * ce qui ne contient pas TOUS les mots : une seule requête par table, et la
 * précision d'une recherche multi-mots.
 *
 * Le texte intégral des articles de presse (`content.raw_text`) reste écarté :
 * un `ilike` dessus balaie la table et prenait plusieurs minutes.
 */
async function rassembler(admin: ReturnType<typeof createClient>, mot: string) {
  const mots = motsCles(mot);
  const pivot = [...mots].sort((a, b) => b.length - a.length)[0] || sansAccent(mot);
  const L = motif(pivot);
  const like = motif(mot);

  /** Isole un corpus : son échec ne coûte que son propre contenu. */
  const sur = async <T>(nom: string, p: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    try {
      const r = await p;
      if (r.error) { console.warn(`corpus ${nom} :`, (r.error as { message?: string }).message); return []; }
      return r.data ?? [];
    } catch (e) {
      console.warn(`corpus ${nom} :`, (e as Error).message);
      return [];
    }
  };

  /** Ne garde que ce qui contient tous les mots du sujet. */
  const tousLesMots = (champs: unknown[]) => {
    const texte = sansAccent(champs.filter(Boolean).join(" "));
    return mots.every(m => texte.includes(m));
  };

  const ou = (colonnes: string[]) => colonnes.map(c => `${c}.ilike.${L}`).join(",");

  const [
    jorfFts, laws, legacy, decrets, analyses, dossiers, scrutins,
    scrutinsSenat, explications, commissions, actus, petitions, europe, amendements, profondeur,
  ] = await Promise.all([
    sur("jorf", admin.from("jorf_texts")
      .select("id, edition_date, titre, explication")
      .textSearch("recherche", mot, { type: "websearch", config: "french" })
      .order("edition_date", { ascending: false }).limit(40)),
    sur("laws", admin.from("laws")
      .select("id, title, summary, content, context, category, date_adopted, source_urls")
      .or(ou(["title", "summary", "content"])).limit(40)),
    sur("legacy_laws", admin.from("legacy_laws")
      .select("id, title, summary, category, date_adopted, source_urls")
      .or(ou(["title", "summary"])).limit(25)),
    sur("decrees", admin.from("decrees")
      .select("jorf_id, title, display_title, summary, nature, date_publi, source_url")
      .or(ou(["title", "display_title", "summary"])).limit(30)),
    sur("analyses", admin.from("legislative_analyses")
      .select("id, dossier_id, summary, audience, generated_at, source_urls")
      .ilike("summary", L).limit(25)),
    sur("dossiers", admin.from("legislative_dossiers")
      .select("id, title, short_title, status_label, latest_step_at, source_urls")
      .or(ou(["title", "short_title"])).limit(20)),
    sur("scrutins", admin.from("scrutins")
      .select("id, objet, summary, resultat, date_scrutin, pour, contre, abstention, dossier_url")
      .or(ou(["objet", "summary"])).limit(20)),
    sur("scrutins_senat", admin.from("legislative_scrutins")
      .select("id, title, explanation, result_label, source_url")
      .or(ou(["title", "explanation"])).limit(15)),
    sur("vote_explanations", admin.from("vote_explanations")
      .select("vote_id, title, subject, stakes, explanation")
      .or(ou(["title", "subject", "stakes"])).limit(15)),
    sur("commissions", admin.from("commission_reports")
      .select("ref, title, commission, chamber, meeting_date, summary, cr_url")
      .or(ou(["title", "summary"])).limit(12)),
    sur("content", admin.from("content")
      .select("id, titre_simplifie, resume_flash, resume_detaille, date_publication, source_url")
      .or(ou(["titre_simplifie", "resume_flash", "resume_detaille"])).limit(15)),
    sur("petitions", admin.from("petitions")
      .select("id, title, description, signatures, status, url, created_at")
      .or(ou(["title", "description"])).limit(10)),
    sur("europe", admin.from("eu_france_decisions")
      .select("id, title, summary, institution, published_at, url")
      .or(ou(["title", "summary"])).limit(10)),
    sur("amendements", admin.from("legislative_amendments")
      .select("id, subject, outcome_label, chamber, voted_at, source_url")
      .ilike("subject", L).limit(15)),
    sur("profondeur", admin.from("jorf_texts").select("edition_date").order("edition_date").limit(1)),
  ]);

  const sources: Source[] = [];
  const counts: Record<string, number> = {};
  const poser = (kind: string, cle: string, lignes: unknown[], f: (r: never) => Source | null) => {
    let n = 0;
    for (const r of lignes) {
      const src = f(r as never);
      if (src) { sources.push({ ...src, kind }); n++; }
    }
    counts[cle] = n;
  };

  // Le Journal officiel : décrets et arrêtés du jour, donc la règle applicable.
  // Sa table porte un index plein texte français, qui gère déjà le pluriel ; on ne
  // retombe sur le motif que s'il ne rend rien.
  let jorf = jorfFts as { id: string; edition_date: string; titre: string; explication: string }[];
  if (!jorf.length) {
    jorf = await sur("jorf_ilike", admin.from("jorf_texts")
      .select("id, edition_date, titre, explication")
      .or(`titre.ilike.${L},explication.ilike.${L}`)
      .order("edition_date", { ascending: false }).limit(40)) as typeof jorf;
    jorf = jorf.filter(t => tousLesMots([t.titre, t.explication]));
  }
  poser("Journal officiel", "jorf", jorf, (t: { id: string; edition_date: string; titre: string; explication: string }) => ({
    kind: "", title: t.titre, date: t.edition_date,
    url: `https://www.legifrance.gouv.fr/jorf/id/${t.id}`, note: t.explication,
  }));

  const premiereUrl = (u: unknown) => (Array.isArray(u) ? (u[0] as string) ?? null : (u as string) ?? null);

  poser("Loi", "lois", (laws as never[]).filter((l: never) =>
    tousLesMots([(l as { title: string }).title, (l as { summary: string }).summary, (l as { content: string }).content])),
    (l: { id: string; title: string; summary: string; context: string; date_adopted: string; source_urls: unknown }) => ({
      kind: "", title: l.title, date: l.date_adopted, url: premiereUrl(l.source_urls),
      note: l.summary || l.context,
    }));

  poser("Loi (antérieure)", "lois_anciennes", (legacy as never[]).filter((l: never) =>
    tousLesMots([(l as { title: string }).title, (l as { summary: string }).summary])),
    (l: { title: string; summary: string; date_adopted: string; source_urls: unknown }) => ({
      kind: "", title: l.title, date: l.date_adopted, url: premiereUrl(l.source_urls), note: l.summary,
    }));

  poser("Décret / arrêté", "decrets", (decrets as never[]).filter((d: never) =>
    tousLesMots([(d as { title: string }).title, (d as { display_title: string }).display_title, (d as { summary: string }).summary])),
    (d: { title: string; display_title: string; summary: string; date_publi: string; source_url: string }) => ({
      kind: "", title: d.display_title || d.title, date: d.date_publi, url: d.source_url, note: d.summary,
    }));

  poser("Analyse de texte", "analyses", (analyses as never[]).filter((a: never) =>
    tousLesMots([(a as { summary: string }).summary])),
    (a: { summary: string; generated_at: string; source_urls: unknown }) => ({
      kind: "", title: String(a.summary).slice(0, 120), date: a.generated_at,
      url: premiereUrl(a.source_urls), note: a.summary,
    }));

  poser("Texte en cours", "dossiers", (dossiers as never[]).filter((d: never) =>
    tousLesMots([(d as { title: string }).title, (d as { short_title: string }).short_title])),
    (d: { title: string; short_title: string; status_label: string; latest_step_at: string; source_urls: unknown }) => ({
      kind: "", title: d.short_title || d.title, date: d.latest_step_at,
      url: premiereUrl(d.source_urls), note: d.status_label,
    }));

  poser("Vote à l'Assemblée", "scrutins", (scrutins as never[]).filter((v: never) =>
    tousLesMots([(v as { objet: string }).objet, (v as { summary: string }).summary])),
    (v: { objet: string; summary: string; resultat: string; date_scrutin: string; pour: number; contre: number; abstention: number; dossier_url: string }) => ({
      kind: "", title: v.objet, date: v.date_scrutin, url: v.dossier_url,
      note: `${v.resultat ?? ""} (${v.pour ?? 0} pour, ${v.contre ?? 0} contre, ${v.abstention ?? 0} abstentions). ${v.summary ?? ""}`.trim(),
    }));

  poser("Vote au Sénat", "scrutins_senat", (scrutinsSenat as never[]).filter((v: never) =>
    tousLesMots([(v as { title: string }).title, (v as { explanation: string }).explanation])),
    (v: { title: string; explanation: string; result_label: string; source_url: string }) => ({
      kind: "", title: v.title, date: null, url: v.source_url, note: v.explanation || v.result_label,
    }));

  poser("Enjeu d'un vote", "explications", (explications as never[]).filter((e: never) =>
    tousLesMots([(e as { title: string }).title, (e as { subject: string }).subject, (e as { stakes: string }).stakes])),
    (e: { title: string; subject: string; stakes: string }) => ({
      kind: "", title: e.title || e.subject, date: null, url: null, note: e.stakes,
    }));

  poser("Commission", "commissions", (commissions as never[]).filter((c: never) =>
    tousLesMots([(c as { title: string }).title, (c as { summary: string }).summary])),
    (c: { title: string; commission: string; chamber: string; meeting_date: string; summary: string; cr_url: string }) => ({
      kind: "", title: `${c.commission ? c.commission + " — " : ""}${c.title}`,
      date: c.meeting_date, url: c.cr_url, note: c.summary,
    }));

  poser("Amendement", "amendements", (amendements as never[]).filter((a: never) =>
    tousLesMots([(a as { subject: string }).subject])),
    (a: { subject: string; outcome_label: string; voted_at: string; source_url: string }) => ({
      kind: "", title: a.subject, date: a.voted_at, url: a.source_url, note: a.outcome_label,
    }));

  poser("Pétition", "petitions", (petitions as never[]).filter((x: never) =>
    tousLesMots([(x as { title: string }).title, (x as { description: string }).description])),
    (x: { title: string; description: string; signatures: number; url: string; created_at: string }) => ({
      kind: "", title: x.title, date: x.created_at, url: x.url,
      note: `${x.signatures ?? 0} signatures. ${x.description ?? ""}`.trim(),
    }));

  poser("Décision européenne", "europe", (europe as never[]).filter((e: never) =>
    tousLesMots([(e as { title: string }).title, (e as { summary: string }).summary])),
    (e: { title: string; summary: string; published_at: string; url: string }) => ({
      kind: "", title: e.title, date: e.published_at, url: e.url, note: e.summary,
    }));

  // L'actualité donne le contexte, jamais la règle : elle ferme la liste.
  poser("Actualité", "actus", (actus as never[]).filter((a: never) =>
    tousLesMots([(a as { titre_simplifie: string }).titre_simplifie, (a as { resume_flash: string }).resume_flash])),
    (a: { titre_simplifie: string; resume_flash: string; date_publication: string; source_url: string }) => ({
      kind: "", title: a.titre_simplifie, date: a.date_publication, url: a.source_url, note: a.resume_flash,
    }));

  const depuis = (profondeur as { edition_date: string }[])[0]?.edition_date ?? null;
  return { sources, counts, coverage: { jorf_depuis: depuis }, mots, pivot, like };
}

/* ──────────────────────────────── La consigne ────────────────────────────── */

const SYSTEME = `Tu expliques la réglementation française à quelqu'un qui n'est pas juriste.

RÈGLES ABSOLUES
- Tu ne t'appuies QUE sur les documents fournis. Aucune connaissance extérieure, aucun chiffre, aucun taux, aucune date qui n'y figure pas.
- Si les documents ne permettent pas de répondre sur un point, tu l'écris. « Les textes réunis ici ne disent rien des aides » est une réponse utile ; une aide inventée ne l'est pas.
- Tu écris en français courant : phrases courtes, pas de jargon. Quand un terme officiel est inévitable, tu l'expliques entre parenthèses.
- Tu ne donnes jamais de conseil personnalisé et tu n'écris pas « vous devez ». Tu décris ce que prévoient les textes.
- Chaque point renvoie au document dont il vient, par son numéro entre crochets : [3].

FORMAT — un objet JSON, rien d'autre :
{
  "sujet": "le sujet, en une expression",
  "en_bref": "trois à cinq phrases : l'essentiel pour quelqu'un qui découvre",
  "regles": [{"titre": "…", "detail": "…", "sources": [1,4]}],
  "aides": [{"titre": "…", "detail": "…", "sources": [2]}],
  "en_cours": [{"titre": "…", "detail": "…", "sources": [7]}],
  "a_savoir": ["…"],
  "limites": "ce que ces documents ne couvrent pas, en une phrase"
}
Les tableaux peuvent être vides. Ne remplis jamais une rubrique pour ne pas la laisser vide.`;

/* ─────────────────────────────────── Entrée ──────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    // ── Qui appelle, et a-t-il droit à cette rubrique ? ──────────────────────
    const jeton = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!jeton) return json({ error: "connexion requise" }, 401);
    const { data: { user }, error: errUser } = await admin.auth.getUser(jeton);
    if (errUser || !user) return json({ error: "connexion requise" }, 401);

    const { data: profil } = await admin
      .from("profiles").select("subscription_tier, is_premium").eq("id", user.id).single();
    const niveau = String(profil?.subscription_tier ?? "").toLowerCase();
    const abonne = niveau === "pro" || niveau === "elite" || profil?.is_premium === true;
    if (!abonne) return json({ error: "réservé aux abonnés Premium et Pro" }, 403);

    const { keyword, refresh } = await req.json().catch(() => ({ keyword: "" }));
    const mot = String(keyword ?? "").trim();
    if (mot.length < 3) return json({ error: "sujet trop court" }, 400);
    if (mot.length > 80) return json({ error: "sujet trop long" }, 400);
    const slug = reduire(mot);
    if (!slug) return json({ error: "sujet illisible" }, 400);

    // ── Déjà calculé ? ───────────────────────────────────────────────────────
    const { data: connu } = await admin.from("topic_briefs").select("*").eq("slug", slug).maybeSingle();
    const frais = connu &&
      Date.now() - new Date(connu.generated_at).getTime() < FRAICHEUR_JOURS * 86400000;
    if (connu && frais && !refresh) {
      await admin.from("topic_briefs").update({ hits: (connu.hits ?? 0) + 1 }).eq("slug", slug);
      return json({ ...connu, cached: true });
    }

    // ── Rassembler la matière ────────────────────────────────────────────────
    const { sources, counts, coverage } = await rassembler(admin, mot);
    if (!sources.length) {
      return json({
        slug, keyword: mot, empty: true, counts, coverage,
        message: "Aucun texte officiel ni article ne mentionne ce sujet dans ce qui est conservé sur le site.",
      });
    }

    // Quatorze corpus peuvent rendre plusieurs centaines de notices : on plafonne
    // ce qui part au modèle. L'ordre de `sources` n'est pas un hasard — Journal
    // officiel, lois, décrets, puis les textes en cours, et l'actualité en
    // dernier : couper par la fin écarte d'abord le contexte, jamais la règle.
    const retenues = sources.slice(0, 80);

    // Numérotés pour que le modèle puisse y renvoyer, et tronqués pour tenir
    // dans une requête : quarante notices entières dépassent le raisonnable.
    const dossier = retenues.map((s, i) =>
      `[${i + 1}] (${s.kind}${s.date ? `, ${String(s.date).slice(0, 10)}` : ""}) ${s.title}`
      + (s.note ? `\n    ${String(s.note).slice(0, 400)}` : ""),
    ).join("\n");

    const { texte, modele } = await demander(
      SYSTEME,
      `Sujet demandé : « ${mot} »\n`
      + `\nPérimètre : le Journal officiel conservé ici commence le ${coverage.jorf_depuis ?? "?"}. `
      + `Une règle antérieure à cette date peut donc être absente : ne présente jamais ces documents comme l'état complet du droit.\n`
      + `\nDOCUMENTS DISPONIBLES (${retenues.length} sur ${sources.length} trouvés) :\n${dossier}`,
    );

    let brief: unknown;
    try {
      brief = JSON.parse(texte.replace(/^```json\s*|\s*```$/g, ""));
    } catch {
      return json({ error: "synthèse illisible, réessayez" }, 502);
    }

    const ligne = {
      slug, keyword: mot, brief, sources: retenues, model: modele,
      counts: { ...counts, ...coverage, total_trouves: sources.length },
      generated_at: new Date().toISOString(), hits: (connu?.hits ?? 0) + 1,
    };
    const { error: errEcriture } = await admin.from("topic_briefs").upsert(ligne, { onConflict: "slug" });
    if (errEcriture) console.warn("écriture du récap :", errEcriture.message);

    return json({ ...ligne, cached: false });
  } catch (e) {
    console.error("topic-brief :", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
