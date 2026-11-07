/**
 * Veilles par sujet (Pro) : aide à la création d'une veille.
 *
 *   { action: "suggerer", phrase }                     → le sujet décrit en une phrase devient un
 *       intitulé court, des mots-clés (synonymes, sigles, termes juridiques) et des exclusions.
 *       Modèle gratuit (Gemini, LLM_FREE_API_KEY), une fois par veille créée.
 *   { action: "apercu", mots_cles, exclusions, sources } → ce que la veille aurait trouvé ces
 *       30 derniers jours, source par source, avec trois exemples : on règle avant d'enregistrer.
 *
 * La recherche est la même que celle du relevé horaire (veille-correspondance.ts du dépôt des
 * données) : sans accents, en mot entier, pluriel compris, exclusions appliquées.
 * Réservé aux abonnés Pro.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* ───────────────────────────── Recherche (même règle que le relevé) ───────────────────────────── */

const platCar = (c: string) => (c.normalize("NFD")[0] || c).toLowerCase().replace(/[’`]/, "'");
const sansBalises = (s: string | null | undefined) =>
  String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
function motif(mot: string): RegExp | null {
  const m = Array.from(mot.trim()).map(platCar).join("").replace(/\s+/g, " ");
  if (m.length < 2) return null;
  const echappe = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[\\s'-]+");
  return new RegExp(`(^|[^a-z0-9])(${echappe}(?:s|x)?)(?=[^a-z0-9]|$)`);
}
function trouve(texte: string, motsCles: string[], exclusions: string[]): { mot: string; extrait: string } | null {
  const car = Array.from(texte);
  const plat = car.map(platCar).join("");
  for (const ex of exclusions) { const r = motif(ex); if (r && r.test(plat)) return null; }
  for (const mot of motsCles) {
    const r = motif(mot); if (!r) continue;
    const m = r.exec(plat); if (!m) continue;
    const debut = m.index + m[1].length, fin = debut + m[2].length;
    let a = Math.max(0, debut - 110), b = Math.min(car.length, fin + 110);
    while (a > 0 && car[a - 1] !== " ") a--;
    while (b < car.length && car[b] !== " ") b++;
    return { mot, extrait: `${a > 0 ? "…" : ""}${car.slice(a, b).join("").trim()}${b < car.length ? "…" : ""}` };
  }
  return null;
}
/**
 * Le même filtre côté base : expression régulière PostgreSQL, en mot entier (\m … \M), sans
 * accents (« e » cherche e, é, è, ê, ë), pluriel compris. Entre guillemets pour PostgREST, où
 * chaque antislash se double. Les exclusions, elles, sont appliquées ensuite par `trouve`.
 */
const CLASSES: Record<string, string> = { a: "[aàâä]", e: "[eéèêë]", i: "[iîï]", o: "[oôö]", u: "[uùûü]", c: "[cç]", y: "[yÿ]" };
const regexBase = (mot: string) => {
  const corps = Array.from(mot.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))
    .map(c => CLASSES[c] ?? (/[a-z0-9]/.test(c) ? c : /\s/.test(c) ? "[[:space:]'-]+" : "."))
    .join("").replace(/(\[\[:space:\]'-\]\+)+/g, "[[:space:]'-]+");
  return `"${("\\m" + corps + "(s|x)?\\M").split("\\").join("\\\\")}"`;
};

/* ───────────────────────────── Modèle gratuit ───────────────────────────── */

const MODELES = (Deno.env.get("LLM_FREE_MODELS") ??
  "gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest,gemini-flash-lite-latest")
  .split(",").map(m => m.trim()).filter(Boolean);

async function demander(systeme: string, utilisateur: string): Promise<string> {
  const cle = Deno.env.get("LLM_FREE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!cle) throw new Error("LLM_FREE_API_KEY absente de la fonction");
  const appeler = (modele: string, avecReflexion: boolean) => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${cle}`,
    {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systeme }] },
        contents: [{ role: "user", parts: [{ text: utilisateur }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json", ...(avecReflexion ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
      }),
    },
  );
  let derniere = "";
  const debut = Date.now();
  for (const modele of MODELES) {
    if (Date.now() - debut > 25000) break;
    try {
      let r = await appeler(modele, true);
      if (r.status === 400) r = await appeler(modele, false);
      if (!r.ok) { derniere = `HTTP ${r.status}`; continue; }
      const d = await r.json();
      const t = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (t.trim()) return t;
    } catch (e) { derniere = (e as Error).message; }
  }
  // Secours payant (≈ 0,0005 $ l'appel) quand la clé est configurée.
  const ds = Deno.env.get("DEEPSEEK_API_KEY");
  if (ds) {
    const r = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${ds}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model: "deepseek-chat", temperature: 0.2, max_tokens: 800, response_format: { type: "json_object" }, messages: [{ role: "system", content: systeme }, { role: "user", content: utilisateur }] }) }).catch(() => null);
    const t = r?.ok ? (await r.json())?.choices?.[0]?.message?.content ?? "" : "";
    if (t.trim()) return t;
  }
  throw new Error(`aucun modèle disponible (${derniere})`);
}

const CONSIGNE = `Tu prépares une veille parlementaire et réglementaire française pour un professionnel des affaires publiques.
À partir du sujet décrit, donne les mots et expressions qui apparaîtront TELS QUELS dans des amendements, des comptes rendus de commission, des décrets du Journal officiel ou des ordres du jour.
Réponds en JSON : {"intitule": "nom court du sujet, 5 mots maximum", "mots_cles": [...], "exclusions": [...]}
- mots_cles : 6 à 15 entrées, au singulier, avec accents ; le terme principal, ses synonymes, les termes juridiques et administratifs, les sigles officiels (en majuscules) et leur forme développée. Pas de mots trop généraux qui feraient du bruit (« énergie », « loi », « entreprise », « santé » seuls).
- exclusions : 0 à 5 expressions qui créeraient des faux positifs évidents (homonymes), sinon [].
N'invente aucun sigle : n'en donne que si tu es certain qu'il existe.`;

/* ───────────────────────────── Entrée ───────────────────────────── */

const SOURCES = ["amendements", "comptes_rendus", "debats", "questions", "journal_officiel", "agenda", "textes"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const jeton = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const { data: { user } } = await admin.auth.getUser(jeton);
    if (!user) return json({ error: "connexion requise" }, 401);
    const { data: profil } = await admin.from("profiles").select("subscription_tier").eq("id", user.id).single();
    if (String(profil?.subscription_tier ?? "").toLowerCase() !== "pro") return json({ error: "réservé aux abonnés Pro" }, 403);

    const corps = await req.json().catch(() => ({}));

    if (corps.action === "suggerer") {
      const phrase = String(corps.phrase ?? "").trim();
      if (phrase.length < 3 || phrase.length > 300) return json({ error: "décrivez le sujet en une phrase (3 à 300 caractères)" }, 400);
      const liste = (x: unknown, n: number) => [...new Set((Array.isArray(x) ? x : []).map(v => String(v).trim()).filter(v => v.length >= 2 && v.length <= 80))].slice(0, n);
      try {
        const brut = await demander(CONSIGNE, phrase);
        const r = JSON.parse(brut.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
        const mots = liste(r.mots_cles, 15);
        if (mots.length) return json({ intitule: String(r.intitule || phrase).slice(0, 80), mots_cles: mots, exclusions: liste(r.exclusions, 5) });
      } catch { /* quota du modèle gratuit épuisé : secours ci-dessous */ }
      // Secours sans IA : les mots porteurs de la phrase, à compléter par le membre.
      const VIDES = new Set(["le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "et", "ou", "en", "au", "aux", "sur", "pour", "par", "avec", "sans", "dans", "son", "sa", "ses", "leur", "leurs", "ce", "cette", "ces", "qui", "que", "dont", "est", "sont", "impact", "developpement", "question", "sujet", "loi", "lois", "projet", "texte", "mesure", "mesures", "reforme", "reformes", "evolution", "politique", "situation", "avenir", "place", "role", "acces"]);
      const mots = [...new Set(phrase.split(/[^\p{L}\p{N}-]+/u).filter(m => m.length >= 3 && !VIDES.has(m.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase())))].slice(0, 8);
      return json({ intitule: phrase.slice(0, 80), mots_cles: mots, exclusions: [], secours: true });
    }

    if (corps.action === "apercu") {
      const mots: string[] = (Array.isArray(corps.mots_cles) ? corps.mots_cles : []).map(String).filter((m: string) => m.trim().length >= 2).slice(0, 30);
      const excl: string[] = (Array.isArray(corps.exclusions) ? corps.exclusions : []).map(String).slice(0, 30);
      const sources: string[] = (Array.isArray(corps.sources) ? corps.sources : SOURCES).filter((s: string) => SOURCES.includes(s));
      if (!mots.length) return json({ error: "au moins un mot-clé" }, 400);
      const depuis = new Date(Date.now() - 30 * 864e5).toISOString();
      const ou = (champs: string[]) => mots.flatMap(m => champs.map(c => `${c}.imatch.${regexBase(m)}`)).join(",");
      const res: Record<string, { n: number; approche?: boolean; plus?: boolean; exemples: { titre: string; extrait: string; url: string | null }[] }> = {};
      const garder = (cle: string, lignes: { titre: string; texte: string; url: string | null }[]) => {
        const ok = lignes.map(l => ({ l, t: trouve(l.texte, mots, excl) })).filter(x => x.t);
        res[cle] = { n: ok.length, exemples: ok.slice(0, 3).map(x => ({ titre: x.l.titre, extrait: x.t!.extrait, url: x.l.url })) };
      };
      await Promise.all([
        sources.includes("amendements") && (async () => {
          const [an, sen] = await Promise.all([
            admin.from("amendements_an").select("numero, texte_titre, auteur, groupe, dispositif, expose").gte("vu_le", depuis).or(ou(["dispositif", "expose"])).limit(400),
            admin.from("amendements_senat").select("numero, texte_titre, auteur, groupe, dispositif, expose, url").gte("vu_le", depuis).or(ou(["dispositif", "expose"])).limit(400),
          ]);
          garder("amendements", [...(an.data || []), ...(sen.data || [])].map((a: any) => ({ titre: `N° ${a.numero} · ${a.auteur}${a.groupe ? ` (${a.groupe})` : ""} · ${a.texte_titre ?? ""}`, texte: sansBalises(`${a.dispositif ?? ""} ${a.expose ?? ""}`), url: a.url ?? null })));
          // Lecture plafonnée à 400 par chambre : au plafond, le vrai nombre est plus élevé.
          if ((an.data || []).length >= 400 || (sen.data || []).length >= 400) res.amendements.plus = true;
        })(),
        sources.includes("comptes_rendus") && (async () => {
          // Les comptes rendus intégraux sont très longs : la base repère ceux qui contiennent un des
          // mots (filtre large), et seuls les plus récents sont lus en entier pour vérifier et citer.
          const [{ data: r }, { data: refs }] = await Promise.all([
            admin.from("commission_reports").select("ref, chamber, commission, title, summary, cr_url, meeting_date").gte("meeting_date", depuis.slice(0, 10)).limit(400),
            admin.from("commission_transcripts").select("ref").gte("maj_le", depuis).or(ou(["texte"])).limit(400),
          ]);
          const avecMot = new Set((refs || []).map((x: any) => x.ref));
          const candidats = (r || []).filter((x: any) => avecMot.has(x.ref) || trouve(`${x.title ?? ""}. ${x.summary ?? ""}`, mots, excl))
            .sort((a: any, b: any) => String(b.meeting_date).localeCompare(String(a.meeting_date)));
          const { data: t } = await admin.from("commission_transcripts").select("ref, texte").in("ref", candidats.slice(0, 8).map((x: any) => x.ref));
          const integral = new Map((t || []).map((x: any) => [x.ref, x.texte]));
          garder("comptes_rendus", candidats.slice(0, 8).map((x: any) => ({ titre: `${x.chamber === "AN" ? "Assemblée" : "Sénat"} · ${x.commission ?? ""} · ${x.title ?? ""}`, texte: `${x.title ?? ""}. ${x.summary ?? ""}. ${sansBalises(integral.get(x.ref) ?? "")}`, url: x.cr_url ?? null })));
          // Au-delà des huit lus en entier, le décompte vient du filtre de la base (même règle) : il est
          // exact, sauf s'il y a des exclusions, que la base n'applique pas.
          if (candidats.length > 8) { res.comptes_rendus.n += candidats.length - 8; res.comptes_rendus.approche = excl.length > 0; }
        })(),
        sources.includes("debats") && (async () => {
          // Index plein texte des interventions en séance (sans accents) : « mot1 » or « mot2 »…
          const plat = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/"/g, " ");
          const requete = mots.map(m => `"${plat(m)}"`).join(" or ");
          const { data, count } = await admin.from("seance_interventions").select("orateur, qualite, point, texte, seance_uid, date_seance", { count: "exact" })
            .gte("date_seance", depuis).textSearch("recherche", requete, { type: "websearch", config: "french" }).order("date_seance", { ascending: false }).limit(60);
          garder("debats", (data || []).map((i: any) => ({ titre: `${i.orateur ?? ""}${i.qualite ? `, ${i.qualite}` : ""} · ${i.point ?? ""}`, texte: i.texte ?? "", url: `https://www.assemblee-nationale.fr/dyn/17/comptes-rendus/seance/${i.seance_uid}` })));
          // Le décompte vient de l'index ; les exemples sont vérifiés mot pour mot.
          if ((count ?? 0) > res.debats.n) { res.debats.n = count ?? res.debats.n; res.debats.approche = excl.length > 0; }
        })(),
        sources.includes("questions") && (async () => {
          const plat = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/"/g, " ");
          const { data, count } = await admin.from("questions_parlement").select("type, numero, objet, groupe, ministere, texte_question, url", { count: "exact" })
            .gte("date_question", depuis.slice(0, 10)).textSearch("recherche", mots.map(m => `"${plat(m)}"`).join(" or "), { type: "websearch", config: "french" }).order("date_question", { ascending: false }).limit(60);
          garder("questions", (data || []).map((x: any) => ({ titre: `${x.type === "QG" ? "Question au Gouvernement" : `Question écrite n° ${x.numero}`}${x.groupe ? ` (${x.groupe})` : ""} · ${x.objet ?? ""} · ${x.ministere ?? ""}`, texte: `${x.objet ?? ""}. ${x.texte_question ?? ""}`, url: x.url })));
          if ((count ?? 0) > res.questions.n) { res.questions.n = count ?? res.questions.n; res.questions.approche = excl.length > 0; }
        })(),
        sources.includes("journal_officiel") && (async () => {
          const { data } = await admin.from("jorf_texts").select("id, titre, explication").gte("edition_date", depuis.slice(0, 10)).or(ou(["titre", "explication"])).limit(500);
          garder("journal_officiel", (data || []).map((j: any) => ({ titre: j.titre, texte: `${j.titre ?? ""}. ${j.explication ?? ""}`, url: `https://www.legifrance.gouv.fr/jorf/id/${j.id}` })));
        })(),
        sources.includes("agenda") && (async () => {
          const { data } = await admin.from("events").select("title, description, source_url").gte("date", depuis.slice(0, 10)).in("institution", ["AN", "Assemblée nationale", "Sénat"]).or(ou(["title", "description"])).limit(400);
          garder("agenda", (data || []).map((e: any) => ({ titre: e.title, texte: `${e.title ?? ""}. ${e.description ?? ""}`, url: e.source_url ?? null })));
        })(),
        sources.includes("textes") && (async () => {
          const { data } = await admin.from("legislative_dossiers").select("id, title").gte("deposited_at", depuis.slice(0, 10)).or(ou(["title"])).limit(300);
          garder("textes", (data || []).map((d: any) => ({ titre: d.title, texte: d.title ?? "", url: `https://lapolitiquecestsimple.fr/lois/?dossier=${d.id}` })));
        })(),
      ].filter(Boolean));
      return json({ jours: 30, sources: res });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
