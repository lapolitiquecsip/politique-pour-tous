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

/**
 * Rassemble la matière dans les corpus du site.
 *
 * Les cinq requêtes partent ENSEMBLE : enchaînées, elles ajoutaient deux
 * secondes à une attente déjà dominée par le modèle.
 *
 * Le texte intégral des articles (`content.raw_text`) est volontairement écarté :
 * un `ilike` dessus n'a aucun index à sa disposition et balaie toute la table,
 * ce qui prenait plusieurs minutes — assez pour faire expirer la fonction. Les
 * titres et les résumés suffisent à repérer un sujet.
 */
async function rassembler(admin: ReturnType<typeof createClient>, mot: string) {
  const like = motif(mot);

  const [jorfFts, lois, dossiers, actus, commissions, profondeur] = await Promise.all([
    admin.from("jorf_texts")
      .select("id, edition_date, titre, explication")
      .textSearch("recherche", mot, { type: "websearch", config: "french" })
      .order("edition_date", { ascending: false }).limit(40),
    admin.from("promulgated_laws")
      .select("id, title, promulgated_at, eli_url, source_url")
      .ilike("title", like).order("promulgated_at", { ascending: false }).limit(15),
    admin.from("legislative_dossiers")
      .select("id, title, short_title, status_label, latest_step_at, source_urls")
      .or(`title.ilike.${like},short_title.ilike.${like}`)
      .order("latest_step_at", { ascending: false }).limit(15),
    admin.from("content")
      .select("id, titre_simplifie, resume_flash, date_publication, source_url")
      .or(`titre_simplifie.ilike.${like},resume_flash.ilike.${like},resume_detaille.ilike.${like}`)
      .order("date_publication", { ascending: false }).limit(12),
    admin.from("commission_reports")
      .select("ref, title, commission, chamber, meeting_date, summary, cr_url")
      .or(`title.ilike.${like},summary.ilike.${like}`)
      .order("meeting_date", { ascending: false }).limit(12),
    // Jusqu'où remonte le Journal officiel conservé : la synthèse doit pouvoir
    // dire sur quelle période elle s'appuie, sinon « la réglementation » laisse
    // croire à un état complet du droit.
    admin.from("jorf_texts").select("edition_date").order("edition_date").limit(1),
  ]);

  const sources: Source[] = [];
  const counts: Record<string, number> = {};

  // Le Journal officiel est là où vivent décrets et arrêtés, donc la règle
  // applicable. La table porte un index plein texte français ; quand il ne rend
  // rien (mot composé, orthographe inhabituelle), on retombe sur une
  // correspondance simple.
  let jorf = jorfFts;
  if (jorf.error || !jorf.data?.length) {
    jorf = await admin.from("jorf_texts")
      .select("id, edition_date, titre, explication")
      .or(`titre.ilike.${like},explication.ilike.${like}`)
      .order("edition_date", { ascending: false }).limit(40);
  }
  for (const t of jorf.data ?? []) {
    sources.push({
      kind: "Journal officiel", title: t.titre, date: t.edition_date,
      url: `https://www.legifrance.gouv.fr/jorf/id/${t.id}`, note: t.explication,
    });
  }
  counts.jorf = jorf.data?.length ?? 0;

  for (const l of lois.data ?? []) {
    sources.push({ kind: "Loi promulguée", title: l.title, date: l.promulgated_at, url: l.eli_url || l.source_url });
  }
  counts.lois = lois.data?.length ?? 0;

  for (const d of dossiers.data ?? []) {
    sources.push({
      kind: "Texte en cours", title: d.short_title || d.title, date: d.latest_step_at,
      url: Array.isArray(d.source_urls) ? d.source_urls[0] ?? null : null, note: d.status_label,
    });
  }
  counts.dossiers = dossiers.data?.length ?? 0;

  for (const c of commissions.data ?? []) {
    sources.push({
      kind: `Commission (${c.chamber === "SENAT" ? "Sénat" : "Assemblée"})`,
      title: `${c.commission ? c.commission + " — " : ""}${c.title}`,
      date: c.meeting_date, url: c.cr_url, note: c.summary,
    });
  }
  counts.commissions = commissions.data?.length ?? 0;

  // L'actualité donne le contexte, jamais la règle.
  for (const a of actus.data ?? []) {
    sources.push({
      kind: "Actualité", title: a.titre_simplifie, date: a.date_publication,
      url: a.source_url, note: a.resume_flash,
    });
  }
  counts.actus = actus.data?.length ?? 0;

  const depuis = profondeur.data?.[0]?.edition_date ?? null;
  return { sources, counts, coverage: { jorf_depuis: depuis } };
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

    // Numérotés pour que le modèle puisse y renvoyer, et tronqués pour tenir
    // dans une requête : quarante notices entières dépassent le raisonnable.
    const dossier = sources.map((s, i) =>
      `[${i + 1}] (${s.kind}${s.date ? `, ${String(s.date).slice(0, 10)}` : ""}) ${s.title}`
      + (s.note ? `\n    ${String(s.note).slice(0, 400)}` : ""),
    ).join("\n");

    const { texte, modele } = await demander(
      SYSTEME,
      `Sujet demandé : « ${mot} »\n`
      + `\nPérimètre : le Journal officiel conservé ici commence le ${coverage.jorf_depuis ?? "?"}. `
      + `Une règle antérieure à cette date peut donc être absente : ne présente jamais ces documents comme l'état complet du droit.\n`
      + `\nDOCUMENTS DISPONIBLES (${sources.length}) :\n${dossier}`,
    );

    let brief: unknown;
    try {
      brief = JSON.parse(texte.replace(/^```json\s*|\s*```$/g, ""));
    } catch {
      return json({ error: "synthèse illisible, réessayez" }, 502);
    }

    const ligne = {
      slug, keyword: mot, brief, sources, counts: { ...counts, ...coverage }, model: modele,
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
