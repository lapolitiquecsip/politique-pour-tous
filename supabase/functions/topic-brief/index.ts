import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * « Tout sur un sujet » — la synthèse thématique des abonnés Pro.
 *
 * POURQUOI UNE FONCTION EDGE
 * Le site est un export statique : il n'a pas de serveur à lui. Or cette
 * fonctionnalité demande deux choses qu'un navigateur ne doit jamais faire :
 * détenir la clé d'un modèle de langage, et décider seul si le lecteur y a
 * droit. Les deux vivent donc ici.
 *
 * CE QU'ELLE FAIT
 *   1. vérifie que l'appelant est connecté ET abonné Pro ;
 *   2. rend la synthèse déjà calculée si elle existe — le premier abonné qui
 *      demande un sujet paie l'attente, les suivants l'ont tout de suite ;
 *   3. sinon rassemble la matière, la fait mettre en forme par un modèle
 *      gratuit, l'enregistre et la rend.
 *
 * D'OÙ VIENT LA MATIÈRE
 * D'abord les fiches pratiques de service-public.gouv.fr (table
 * `fiches_pratiques`) : ce sont elles qui disent ce qui S'APPLIQUE — les montants
 * en vigueur, les conditions, et la liste exacte des textes qui les fondent avec
 * leur lien Légifrance. Ensuite les corpus du site, qui disent ce qui CHANGE :
 * Journal officiel, lois votées, textes en discussion, votes, actualité.
 * La première version n'avait que ceux-ci ; elle savait qu'une loi facilitait
 * « la mobilité des apprentis » sans pouvoir dire comment, et ignorait le montant
 * de l'aide à l'embauche d'un apprenti.
 *
 * CE QU'ELLE NE FAIT PAS
 * Elle n'invente rien. Le modèle ne reçoit que les documents trouvés, avec
 * l'instruction de s'y tenir et de dire quand la matière manque. Les textes de
 * loi affichés (titre, lien) viennent des documents, jamais du modèle : il ne
 * fait que désigner, par leur numéro, ceux qui comptent.
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
 * Version du format de la synthèse. Une synthèse en cache d'un autre format est
 * recalculée : sans cela, les sujets déjà demandés resteraient quinze jours dans
 * l'ancienne présentation, sans chiffres ni textes de loi.
 */
const FORMAT = 2;

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
  "gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest,gemini-flash-lite-latest")
  .split(",").map(m => m.trim()).filter(Boolean);

/** Temps laissé à chaque modèle avant de passer au suivant. */
const DELAI_MODELE_MS = Number(Deno.env.get("TOPIC_BRIEF_MODEL_TIMEOUT_MS") ?? 75000);

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Interroge le modèle, en changeant de lignée sur un 429.
 *
 * Les quotas gratuits sont comptés PAR LIGNÉE de modèle : quand l'une sature,
 * les autres répondent normalement. Réessayer la même est du temps perdu — sauf
 * sur un 503 (« forte demande »), passager : les modèles qui l'ont renvoyé ont
 * droit à un second passage après une courte pause.
 *
 * `thinkingBudget: 0` est indispensable pour les modèles qui raisonnent : le
 * raisonnement se déduit du budget de sortie, et un budget trop court est
 * entièrement consommé par la réflexion — l'appel renvoie 200 avec un texte
 * VIDE, sans la moindre erreur. Les modèles qui ne raisonnent pas, eux,
 * refusent ce réglage (400) : on le retire alors pour ce modèle-là.
 */
async function demander(systeme: string, utilisateur: string): Promise<{ texte: string; modele: string }> {
  const cle = Deno.env.get("LLM_FREE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!cle) throw new Error("LLM_FREE_API_KEY absente de la fonction");

  const appeler = (modele: string, avecReflexion: boolean) => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${cle}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Un modèle saturé ne répond pas toujours 503 : il lui arrive de garder
      // la connexion ouverte sans fin. Sans borne, la fonction attendait
      // jusqu'à sa propre limite et le lecteur n'obtenait rien.
      signal: AbortSignal.timeout(DELAI_MODELE_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systeme }] },
        contents: [{ role: "user", parts: [{ text: utilisateur }] }],
        generationConfig: {
          temperature: 0.2,
          // La synthèse détaille désormais montants, conditions et mesures :
          // à 4 096 jetons, les sujets riches étaient coupés en plein JSON.
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          ...(avecReflexion ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    },
  );

  let derniere = "";
  let aRejouer = MODELES;
  for (let passage = 0; passage < 2 && aRejouer.length; passage++) {
    if (passage) await pause(2500);
    const surcharges: string[] = [];
    for (const modele of aRejouer) {
      try {
        let r = await appeler(modele, true);
        if (r.status === 400) r = await appeler(modele, false);
        if (r.status === 503) { derniere = "HTTP 503"; surcharges.push(modele); continue; }
        if (r.status === 429) { derniere = "HTTP 429"; continue; }
        if (!r.ok) { derniere = `HTTP ${r.status} ${(await r.text()).slice(0, 200)}`; continue; }
        const data = await r.json();
        const texte = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        if (!texte.trim()) { derniere = "réponse vide"; continue; }
        return { texte, modele };
      } catch (e) {
        derniere = (e as Error).message;
      }
    }
    aRejouer = surcharges;
  }
  throw new Error(`aucun modèle disponible (${derniere})`);
}

/* ─────────────────────────── La matière du site ──────────────────────────── */

/**
 * Un document numéroté, tel que le modèle le cite et que le lecteur le voit.
 * `groupe` permet à l'interface de les ranger : la fiche pratique, le texte de
 * loi, le Journal officiel, le débat parlementaire, l'actualité.
 */
type Groupe = "fiche" | "texte" | "jo" | "loi" | "debat" | "actu";
type Source = {
  kind: string; groupe: Groupe; title: string; date: string | null; url: string | null;
  note?: string | null;
};

type Ref = { titre: string; url: string | null; complement?: string };
type Service = { titre: string; url: string | null; type: string };
type Fiche = {
  id: string; type: string | null; audiences: string[]; title: string; description: string | null;
  chemin: string | null; body: string; refs: Ref[]; services: Service[]; url: string | null;
  modified_at: string | null; important_at: string | null;
};

/** Échappe ce qui a un sens pour PostgREST dans un motif `ilike`. */
const motif = (q: string) => `%${q.replace(/[%,()]/g, " ").trim()}%`;

const sansAccent = (x: string) =>
  (x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Découpe le sujet en mots cherchables, pluriel ôté.
 *
 * Chercher l'expression exacte « panneau solaire » ne trouvait RIEN : les textes
 * écrivent « panneaux solaires ». Le « s » et le « x » finaux tombent (panneaux →
 * panneau, travaux → travau) et le motif devient un fragment, qui retrouve aussi
 * bien le singulier que le pluriel.
 */
function motsCles(q: string): string[] {
  return sansAccent(q).split(/[^a-z0-9]+/)
    .filter(m => m.length > 3)
    .map(m => (/[sx]$/.test(m) ? m.slice(0, -1) : m));
}

/**
 * La nature d'un texte de référence, lue dans son intitulé.
 * « Code du travail : articles L6243-1 à L6243-1-2 » → Code.
 */
function natureTexte(titre: string): string {
  const t = sansAccent(titre);
  if (/^code /.test(t)) return "Code";
  if (/^loi /.test(t)) return "Loi";
  if (/^ordonnance/.test(t)) return "Ordonnance";
  if (/^decret/.test(t)) return "Décret";
  if (/^arrete/.test(t)) return "Arrêté";
  if (/^(reglement|directive)/.test(t)) return "Droit européen";
  if (/^(circulaire|instruction|note)/.test(t)) return "Circulaire";
  if (/bofip|bulletin officiel/.test(t)) return "Doctrine fiscale";
  return "Texte";
}

/**
 * Rassemble la matière : les fiches pratiques d'abord, puis TOUS les corpus du
 * site.
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
    fiches, jorfFts, laws, legacy, decrets, analyses, dossiers, scrutins,
    scrutinsSenat, explications, commissions, actus, petitions, europe, amendements, profondeur,
  ] = await Promise.all([
    // Recherche plein texte insensible aux accents, classée côté base (le titre
    // pèse plus que le corps) : voir la migration 2026092901.
    sur<Fiche>("fiches", admin.rpc("search_fiches_pratiques", { q: mot, lim: 8 }) as never),
    sur("jorf", admin.from("jorf_texts")
      .select("id, edition_date, titre, explication")
      .textSearch("recherche", mot, { type: "websearch", config: "french" })
      .order("edition_date", { ascending: false }).limit(30)),
    sur("laws", admin.from("laws")
      .select("id, title, summary, impact, context, category, date_adopted, source_urls")
      .or(ou(["title", "summary"])).limit(30)),
    sur("legacy_laws", admin.from("legacy_laws")
      .select("id, title, summary, category, date_adopted, source_urls")
      .or(ou(["title", "summary"])).limit(20)),
    sur("decrees", admin.from("decrees")
      .select("jorf_id, title, display_title, summary, nature, date_publi, source_url")
      .or(ou(["title", "display_title", "summary"])).limit(25)),
    sur("analyses", admin.from("legislative_analyses")
      .select("id, dossier_id, summary, audience, generated_at, source_urls")
      .ilike("summary", L).limit(15)),
    sur("dossiers", admin.from("legislative_dossiers")
      .select("id, title, short_title, status_label, latest_step_at, source_urls")
      .or(ou(["title", "short_title"])).limit(15)),
    sur("scrutins", admin.from("scrutins")
      .select("id, objet, summary, resultat, date_scrutin, pour, contre, abstention, dossier_url")
      .or(ou(["objet", "summary"])).limit(12)),
    sur("scrutins_senat", admin.from("legislative_scrutins")
      .select("id, title, explanation, result_label, source_url")
      .or(ou(["title", "explanation"])).limit(10)),
    sur("vote_explanations", admin.from("vote_explanations")
      .select("vote_id, title, subject, stakes, explanation")
      .or(ou(["title", "subject", "stakes"])).limit(10)),
    sur("commissions", admin.from("commission_reports")
      .select("ref, title, commission, chamber, meeting_date, summary, cr_url")
      .or(ou(["title", "summary"])).limit(8)),
    sur("content", admin.from("content")
      .select("id, titre_simplifie, resume_flash, resume_detaille, date_publication, source_url")
      .or(ou(["titre_simplifie", "resume_flash", "resume_detaille"])).limit(10)),
    sur("petitions", admin.from("petitions")
      .select("id, title, description, signatures, status, url, created_at")
      .or(ou(["title", "description"])).limit(6)),
    sur("europe", admin.from("eu_france_decisions")
      .select("id, title, summary, institution, published_at, url")
      .or(ou(["title", "summary"])).limit(8)),
    sur("amendements", admin.from("legislative_amendments")
      .select("id, subject, outcome_label, chamber, voted_at, source_url")
      .ilike("subject", L).limit(10)),
    sur("profondeur", admin.from("jorf_texts").select("edition_date").order("edition_date").limit(1)),
  ]);

  const sources: Source[] = [];
  const counts: Record<string, number> = {};
  const poser = (kind: string, groupe: Groupe, cle: string, lignes: unknown[], f: (r: never) => Omit<Source, "kind" | "groupe"> | null) => {
    let n = 0;
    for (const r of lignes) {
      const src = f(r as never);
      if (src) { sources.push({ ...src, kind, groupe }); n++; }
    }
    counts[cle] = n;
  };

  // 1. Les fiches pratiques : l'état du droit applicable, montants compris.
  poser("Fiche pratique", "fiche", "fiches", fiches, (f: Fiche) => ({
    title: f.title, date: f.modified_at, url: f.url,
    note: [f.description, f.body].filter(Boolean).join("\n"),
  }));

  // 2. Les textes de référence de ces fiches : les « lois précises », avec leur
  //    lien Légifrance. On les prend dans l'ordre des fiches (la plus pertinente
  //    d'abord), sans doublon, et en nombre borné — une seule fiche en cite
  //    parfois quarante.
  const vus = new Set<string>();
  const textes: Source[] = [];
  for (const f of fiches as Fiche[]) {
    let pris = 0;
    for (const r of f.refs ?? []) {
      const cle = sansAccent(r.url || r.titre);
      if (vus.has(cle)) continue;
      if (pris >= 25 || textes.length >= 45) break;
      vus.add(cle); pris++;
      textes.push({
        kind: natureTexte(r.titre), groupe: "texte", title: r.titre, date: null, url: r.url,
        note: [r.complement, `cité par la fiche « ${f.title} »`].filter(Boolean).join(" — "),
      });
    }
  }
  sources.push(...textes);
  counts.textes = textes.length;

  // 3. Le Journal officiel : décrets et arrêtés récents. Sa table porte un index
  //    plein texte français, qui gère déjà le pluriel ; on ne retombe sur le motif
  //    que s'il ne rend rien.
  let jorf = jorfFts as { id: string; edition_date: string; titre: string; explication: string }[];
  if (!jorf.length) {
    jorf = await sur("jorf_ilike", admin.from("jorf_texts")
      .select("id, edition_date, titre, explication")
      .or(`titre.ilike.${L},explication.ilike.${L}`)
      .order("edition_date", { ascending: false }).limit(30)) as typeof jorf;
    jorf = jorf.filter(t => tousLesMots([t.titre, t.explication]));
  }
  poser("Journal officiel", "jo", "jorf", jorf, (t: { id: string; edition_date: string; titre: string; explication: string }) => ({
    title: t.titre, date: t.edition_date,
    url: `https://www.legifrance.gouv.fr/jorf/id/${t.id}`, note: t.explication,
  }));

  const premiereUrl = (u: unknown) => (Array.isArray(u) ? (u[0] as string) ?? null : (u as string) ?? null);

  poser("Loi", "loi", "lois", (laws as never[]).filter((l: never) =>
    tousLesMots([(l as { title: string }).title, (l as { summary: string }).summary])),
    (l: { title: string; summary: string; impact: string; context: string; date_adopted: string; source_urls: unknown }) => ({
      title: l.title, date: l.date_adopted, url: premiereUrl(l.source_urls),
      note: [l.summary, l.impact, l.context].filter(Boolean).join(" "),
    }));

  poser("Loi (antérieure)", "loi", "lois_anciennes", (legacy as never[]).filter((l: never) =>
    tousLesMots([(l as { title: string }).title, (l as { summary: string }).summary])),
    (l: { title: string; summary: string; date_adopted: string; source_urls: unknown }) => ({
      title: l.title, date: l.date_adopted, url: premiereUrl(l.source_urls), note: l.summary,
    }));

  poser("Décret / arrêté", "jo", "decrets", (decrets as never[]).filter((d: never) =>
    tousLesMots([(d as { title: string }).title, (d as { display_title: string }).display_title, (d as { summary: string }).summary])),
    (d: { title: string; display_title: string; summary: string; date_publi: string; source_url: string }) => ({
      title: d.display_title || d.title, date: d.date_publi, url: d.source_url, note: d.summary,
    }));

  poser("Texte en discussion", "debat", "dossiers", (dossiers as never[]).filter((d: never) =>
    tousLesMots([(d as { title: string }).title, (d as { short_title: string }).short_title])),
    (d: { title: string; short_title: string; status_label: string; latest_step_at: string; source_urls: unknown }) => ({
      title: d.short_title || d.title, date: d.latest_step_at,
      url: premiereUrl(d.source_urls), note: d.status_label,
    }));

  poser("Analyse de texte", "debat", "analyses", (analyses as never[]).filter((a: never) =>
    tousLesMots([(a as { summary: string }).summary])),
    (a: { summary: string; generated_at: string; source_urls: unknown }) => ({
      title: String(a.summary).slice(0, 120), date: a.generated_at,
      url: premiereUrl(a.source_urls), note: a.summary,
    }));

  poser("Vote à l'Assemblée", "debat", "scrutins", (scrutins as never[]).filter((v: never) =>
    tousLesMots([(v as { objet: string }).objet, (v as { summary: string }).summary])),
    (v: { objet: string; summary: string; resultat: string; date_scrutin: string; pour: number; contre: number; abstention: number; dossier_url: string }) => ({
      title: v.objet, date: v.date_scrutin, url: v.dossier_url,
      note: `${v.resultat ?? ""} (${v.pour ?? 0} pour, ${v.contre ?? 0} contre, ${v.abstention ?? 0} abstentions). ${v.summary ?? ""}`.trim(),
    }));

  poser("Vote au Sénat", "debat", "scrutins_senat", (scrutinsSenat as never[]).filter((v: never) =>
    tousLesMots([(v as { title: string }).title, (v as { explanation: string }).explanation])),
    (v: { title: string; explanation: string; result_label: string; source_url: string }) => ({
      title: v.title, date: null, url: v.source_url, note: v.explanation || v.result_label,
    }));

  poser("Enjeu d'un vote", "debat", "explications", (explications as never[]).filter((e: never) =>
    tousLesMots([(e as { title: string }).title, (e as { subject: string }).subject, (e as { stakes: string }).stakes])),
    (e: { title: string; subject: string; stakes: string }) => ({
      title: e.title || e.subject, date: null, url: null, note: e.stakes,
    }));

  poser("Commission", "debat", "commissions", (commissions as never[]).filter((c: never) =>
    tousLesMots([(c as { title: string }).title, (c as { summary: string }).summary])),
    (c: { title: string; commission: string; chamber: string; meeting_date: string; summary: string; cr_url: string }) => ({
      title: `${c.commission ? c.commission + " — " : ""}${c.title}`,
      date: c.meeting_date, url: c.cr_url, note: c.summary,
    }));

  poser("Amendement", "debat", "amendements", (amendements as never[]).filter((a: never) =>
    tousLesMots([(a as { subject: string }).subject])),
    (a: { subject: string; outcome_label: string; voted_at: string; source_url: string }) => ({
      title: a.subject, date: a.voted_at, url: a.source_url, note: a.outcome_label,
    }));

  poser("Pétition", "debat", "petitions", (petitions as never[]).filter((x: never) =>
    tousLesMots([(x as { title: string }).title, (x as { description: string }).description])),
    (x: { title: string; description: string; signatures: number; url: string; created_at: string }) => ({
      title: x.title, date: x.created_at, url: x.url,
      note: `${x.signatures ?? 0} signatures. ${x.description ?? ""}`.trim(),
    }));

  poser("Décision européenne", "loi", "europe", (europe as never[]).filter((e: never) =>
    tousLesMots([(e as { title: string }).title, (e as { summary: string }).summary])),
    (e: { title: string; summary: string; published_at: string; url: string }) => ({
      title: e.title, date: e.published_at, url: e.url, note: e.summary,
    }));

  // L'actualité donne le contexte, jamais la règle : elle ferme la liste.
  poser("Actualité", "actu", "actus", (actus as never[]).filter((a: never) =>
    tousLesMots([(a as { titre_simplifie: string }).titre_simplifie, (a as { resume_flash: string }).resume_flash])),
    (a: { titre_simplifie: string; resume_flash: string; date_publication: string; source_url: string }) => ({
      title: a.titre_simplifie, date: a.date_publication, url: a.source_url, note: a.resume_flash,
    }));

  // Les outils officiels des fiches les plus pertinentes : simulateurs d'abord,
  // puis téléservices et formulaires. Ils ne passent pas par le modèle.
  const RANG: Record<string, number> = { "Simulateur": 0, "Téléservice": 1, "Formulaire": 2 };
  const outils: Service[] = [];
  const outilsVus = new Set<string>();
  for (const f of (fiches as Fiche[]).slice(0, 4)) {
    for (const s of [...(f.services ?? [])].sort((a, b) => (RANG[a.type] ?? 9) - (RANG[b.type] ?? 9))) {
      if (!s.url || outilsVus.has(s.url) || !(s.type in RANG)) continue;
      outilsVus.add(s.url);
      outils.push(s);
    }
  }

  const depuis = (profondeur as { edition_date: string }[])[0]?.edition_date ?? null;
  return { sources, counts, coverage: { jorf_depuis: depuis }, outils: outils.slice(0, 6) };
}

/* ──────────────────────────────── La consigne ────────────────────────────── */

const SYSTEME = `Tu expliques la réglementation française à un professionnel pressé qui n'est pas juriste.

RÈGLES ABSOLUES
- Tu ne t'appuies QUE sur les documents fournis. Aucune connaissance extérieure, aucun chiffre, aucun taux, aucune date qui n'y figure pas.
- Si les documents ne permettent pas de répondre sur un point, tu l'écris. Une aide inventée est pire qu'une absence de réponse.
- Tu écris en français courant : phrases courtes, pas de jargon. Un terme officiel inévitable est expliqué entre parenthèses.
- Tu ne donnes jamais de conseil personnalisé et tu n'écris pas « vous devez ». Tu décris ce que prévoient les textes.
- Chaque point renvoie aux documents dont il vient, par leur numéro.

ÊTRE CONCRET — c'est tout l'intérêt de la synthèse
- Chaque point donne les CHIFFRES : montants, taux, plafonds, seuils, durées, âges, dates d'entrée en vigueur ou de fin.
- Recopie chaque montant, date et seuil EXACTEMENT comme le document l'écrit, avec la condition à laquelle il se rattache. Ne combine jamais deux dates prises à deux endroits différents (une date limite de signature n'est pas une date d'objectif ou de contrôle).
- Ne te contente JAMAIS d'annoncer qu'un texte « met en place des mesures » ou « encadre » quelque chose : dis LESQUELLES, une par ligne.
- Une aide se décrit par : qui y a droit, combien (montant par cas), à quelles conditions, comment la demander.
- Les fiches pratiques (service-public.gouv.fr) décrivent le droit EN VIGUEUR. Quand une fiche distingue plusieurs périodes (« Depuis le 8 mars 2026 », « Entre le 1er janvier et le 7 mars 2026 »), retiens celle qui couvre la DATE DU JOUR donnée plus bas, et signale une date de fin si le dispositif est temporaire.
- Les documents « Code », « Loi », « Décret », « Arrêté » sont les textes de référence cités par les fiches : ce sont les lois précises qui fondent la règle.
- Les amendements, votes, pétitions, analyses et textes en discussion NE SONT PAS le droit en vigueur : ils ne vont que dans « en_cours », jamais dans « regles » ni « aides ».
- Moins de rubriques, mais pleines : mieux vaut trois points précis que huit généralités.

FORMAT — un objet JSON, rien d'autre :
{
  "sujet": "le sujet, en une expression",
  "en_bref": "deux ou trois phrases : ce que c'est et le chiffre ou la règle qui compte le plus",
  "chiffres_cles": [{"valeur": "5 000 €", "libelle": "ce que ce chiffre représente, avec le cas auquel il s'applique", "source": 1}],
  "textes_cles": [{"source": 12, "role": "ce que ce texte fixe, en quelques mots"}],
  "regles": [{"titre": "…", "detail": "une à trois phrases", "points": ["une mesure ou condition précise par ligne"], "sources": [1, 12]}],
  "aides": [{"titre": "…", "pour_qui": "…", "montants": [{"cas": "…", "montant": "…"}], "conditions": ["…"], "demarche": "…", "sources": [2]}],
  "en_cours": [{"titre": "…", "detail": "où en est le texte et ce qu'il changerait, chiffres compris", "sources": [30]}],
  "a_savoir": ["…"],
  "limites": "ce que ces documents ne couvrent pas, en une phrase"
}
Bornes : chiffres_cles 3 à 6 ; textes_cles 3 à 10, choisis parmi les documents Code/Loi/Décret/Arrêté/Ordonnance/Journal officiel, les plus centraux d'abord ; regles 5 au plus ; aides 4 au plus ; en_cours 4 au plus, sans lister les amendements un par un ; a_savoir 4 au plus.
Les tableaux peuvent être vides. Ne remplis jamais une rubrique pour ne pas la laisser vide.`;

/**
 * Longueur des extraits envoyés au modèle, par document.
 *
 * Les quatre fiches les plus pertinentes partent presque entières : ce sont
 * elles qui portent les montants, souvent dans la seconde moitié. Coupée à
 * 3 500 caractères, la fiche « Aides à l'embauche en contrat d'apprentissage »
 * perdait tous ses montants, et la synthèse écrivait « montant non précisé ».
 */
function budgetNote(s: Source, rangFiche: number): number {
  if (s.groupe === "fiche") return rangFiche === 0 ? 20000 : rangFiche < 4 ? 12000 : 5000;
  if (s.groupe === "texte") return 300;
  if (s.groupe === "loi" || s.groupe === "jo") return 700;
  return 350;
}

const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

/** La dernière date complète (avec l'année) d'un intitulé, au format AAAA-MM-JJ. */
function derniereDate(intitule: string): string | null {
  const t = sansAccent(intitule).replace(/1er/g, "1");
  let fin: string | null = null;
  for (const m of t.matchAll(/(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/g)) {
    fin = `${m[3]}-${String(MOIS[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return fin;
}

/**
 * Retire d'une fiche les périodes révolues.
 *
 * Une fiche garde l'historique des règles : « Depuis le 8 mars 2026 », puis
 * « Entre le 1er janvier et le 7 mars 2026 », puis « Du 24 février au 31
 * décembre 2025 ». Envoyées telles quelles, ces anciennes périodes occupent la
 * moitié de l'extrait et le modèle y puise des montants qui ne s'appliquent
 * plus. Une section dont l'intitulé BORNE une période (« entre… », « du… au… »,
 * « avant le… », « jusqu'au… ») et dont la dernière date est passée est
 * remplacée par une mention, pour que le modèle sache qu'elle a existé.
 */
function elaguerPeriodes(corps: string, aujourdhui: string): string {
  const lignes = corps.split("\n");
  const sortie: string[] = [];
  let sauterJusquA = 0; // niveau de titre qui clôt la section sautée (0 = rien à sauter)
  for (const ligne of lignes) {
    const titre = ligne.match(/^(#{2,5}) (.*)$/);
    if (titre) {
      const niveau = titre[1].length;
      if (sauterJusquA && niveau > sauterJusquA) continue;
      sauterJusquA = 0;
      const intitule = sansAccent(titre[2]);
      const borne = /^(entre|du)\b/.test(intitule) || /\b(avant le|jusqu.au)\b/.test(intitule);
      const fin = borne ? derniereDate(titre[2]) : null;
      if (fin && fin < aujourdhui) {
        sortie.push(`${titre[1]} ${titre[2]} — période révolue, omise`);
        sauterJusquA = niveau;
        continue;
      }
    } else if (sauterJusquA) {
      continue;
    }
    sortie.push(ligne);
  }
  return sortie.join("\n");
}

/** Ne garde, d'une liste de renvois du modèle, que des numéros de documents réels. */
const renvoisValides = (x: unknown, max: number): number[] =>
  (Array.isArray(x) ? x : [])
    .map(n => Number(n))
    .filter(n => Number.isInteger(n) && n >= 1 && n <= max)
    .filter((n, i, t) => t.indexOf(n) === i);

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
      .from("profiles").select("subscription_tier").eq("id", user.id).single();
    const niveau = String(profil?.subscription_tier ?? "").toLowerCase();
    if (niveau !== "pro") return json({ error: "réservé aux abonnés Pro" }, 403);

    const { keyword, refresh } = await req.json().catch(() => ({ keyword: "" }));
    const mot = String(keyword ?? "").trim();
    if (mot.length < 3) return json({ error: "sujet trop court" }, 400);
    if (mot.length > 80) return json({ error: "sujet trop long" }, 400);
    const slug = reduire(mot);
    if (!slug) return json({ error: "sujet illisible" }, 400);

    // ── Déjà calculé ? ───────────────────────────────────────────────────────
    const { data: connu } = await admin.from("topic_briefs").select("*").eq("slug", slug).maybeSingle();
    const frais = connu &&
      (connu.brief as { format?: number })?.format === FORMAT &&
      Date.now() - new Date(connu.generated_at).getTime() < FRAICHEUR_JOURS * 86400000;
    if (connu && frais && !refresh) {
      await admin.from("topic_briefs").update({ hits: (connu.hits ?? 0) + 1 }).eq("slug", slug);
      return json({ ...connu, cached: true });
    }

    // ── Rassembler la matière ────────────────────────────────────────────────
    const { sources, counts, coverage, outils } = await rassembler(admin, mot);
    if (!sources.length) {
      return json({
        slug, keyword: mot, empty: true, counts, coverage,
        message: "Aucune fiche officielle, aucun texte ni article ne traite de ce sujet dans ce qui est conservé sur le site.",
      });
    }

    // Plafonds par nature, pour que la règle ne soit jamais évincée par le débat :
    // les fiches et leurs textes de référence passent en entier, puis le Journal
    // officiel et les lois, puis le débat parlementaire, l'actualité en dernier.
    const PLAFOND: Record<Groupe, number> = { fiche: 8, texte: 45, jo: 20, loi: 20, debat: 25, actu: 6 };
    const parGroupe: Record<string, number> = {};
    const retenues = sources.filter(s => {
      parGroupe[s.groupe] = (parGroupe[s.groupe] ?? 0) + 1;
      return parGroupe[s.groupe] <= PLAFOND[s.groupe];
    });

    const aujourdhui = new Date().toISOString().slice(0, 10);
    let rangFiche = -1;
    const dossier = retenues.map((s, i) => {
      if (s.groupe === "fiche") rangFiche++;
      const budget = budgetNote(s, rangFiche);
      const brute = s.groupe === "fiche" && s.note ? elaguerPeriodes(String(s.note), aujourdhui) : s.note;
      const note = brute ? String(brute).slice(0, budget) : "";
      const entete = `[${i + 1}] (${s.kind}${s.date ? `, ${String(s.date).slice(0, 10)}` : ""}) ${s.title}`;
      if (!note) return entete;
      return s.groupe === "fiche"
        ? `${entete}\n<<<\n${note}\n>>>`
        : `${entete}\n    ${note.replace(/\s+/g, " ")}`;
    }).join("\n\n");

    const { texte, modele } = await demander(
      SYSTEME,
      `DATE DU JOUR : ${aujourdhui}\n`
      + `Sujet demandé : « ${mot} »\n`
      + `\nPérimètre : les fiches pratiques décrivent le droit en vigueur à leur date de mise à jour. `
      + `Le Journal officiel conservé ici ne commence que le ${coverage.jorf_depuis ?? "?"} : il dit ce qui a changé récemment, pas tout le droit.\n`
      + `\nDOCUMENTS DISPONIBLES (${retenues.length} sur ${sources.length} trouvés) :\n\n${dossier}`,
    );

    let brut: Record<string, unknown>;
    try {
      brut = JSON.parse(texte.replace(/^```json\s*|\s*```$/g, ""));
    } catch {
      return json({ error: "synthèse illisible, réessayez" }, 502);
    }

    // Les renvois du modèle sont vérifiés un par un : un numéro qui ne désigne
    // aucun document disparaît, et un « texte clé » doit désigner un texte de loi.
    const max = retenues.length;
    const nettoyerPoints = (x: unknown) => (Array.isArray(x) ? x : [])
      .filter(p => p && typeof p === "object")
      .map(p => ({ ...(p as Record<string, unknown>), sources: renvoisValides((p as { sources?: unknown }).sources, max) }));
    const estTexte = (n: number) => ["texte", "jo", "loi"].includes(retenues[n - 1]?.groupe);
    // Le modèle écrit tantôt `source: 12`, tantôt `sources: [12]`, tantôt "12" :
    // un format trop strict ici vidait la rubrique des textes applicables.
    const numero = (t: unknown) => {
      const o = (t ?? {}) as { source?: unknown; sources?: unknown };
      const v = o.source ?? o.sources;
      return Number(Array.isArray(v) ? v[0] : v);
    };
    const brief = {
      ...brut,
      format: FORMAT,
      regles: nettoyerPoints(brut.regles),
      aides: nettoyerPoints(brut.aides),
      en_cours: nettoyerPoints(brut.en_cours),
      chiffres_cles: (Array.isArray(brut.chiffres_cles) ? brut.chiffres_cles : [])
        .filter(c => c && typeof c === "object" && (c as { valeur?: unknown }).valeur)
        .map(c => ({ ...(c as Record<string, unknown>), source: renvoisValides([(c as { source?: unknown }).source], max)[0] ?? null })),
      textes_cles: (Array.isArray(brut.textes_cles) ? brut.textes_cles : [])
        .map(t => ({ source: numero(t), role: String((t as { role?: unknown })?.role ?? "") }))
        .filter(t => Number.isInteger(t.source) && t.source >= 1 && t.source <= max && estTexte(t.source))
        .filter((t, i, tous) => tous.findIndex(u => u.source === t.source) === i),
      outils,
    };
    if (Array.isArray(brut.textes_cles) && brut.textes_cles.length && !brief.textes_cles.length) {
      console.warn("textes_cles tous écartés :", JSON.stringify(brut.textes_cles).slice(0, 300));
    }

    // Ce qui est conservé des sources : de quoi les afficher et les relier, pas
    // le corps des fiches — seize mille caractères par fiche n'ont rien à faire
    // dans chaque réponse envoyée au navigateur.
    const sourcesAffichees = retenues.map(s => ({
      kind: s.kind, groupe: s.groupe, title: s.title, date: s.date, url: s.url,
      note: s.groupe === "texte" ? (s.note ?? null) : null,
    }));

    const ligne = {
      slug, keyword: mot, brief, sources: sourcesAffichees, model: modele,
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
