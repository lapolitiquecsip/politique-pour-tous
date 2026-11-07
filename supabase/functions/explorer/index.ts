/**
 * Explorer IA (Pro) : une question en français, une réponse rédigée UNIQUEMENT à partir de nos
 * données (débats en séance, questions au Gouvernement, amendements, qui pèse, lobbying HATVP,
 * textes de loi), chaque phrase renvoyant à une source numérotée et reliée à l'original.
 *
 *   { action: "question", question }  → { reponse, sources, reste }
 *   { action: "cle_mcp", libelle? }     → { url } : clé personnelle du connecteur, montrée une fois
 *   { action: "revoquer_mcp", id }      → révoque une clé
 *
 * Modèles : Gemini gratuit d'abord (LLM_FREE_API_KEY) ; s'il est saturé, DeepSeek (secret
 * DEEPSEEK_API_KEY, ~0,002 $ la réponse, inscrit dans ia_depenses) quand il est configuré.
 * 20 questions par jour et par membre.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as D from "../_shared/donnees-pro.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (c: unknown, status = 200) => new Response(JSON.stringify(c), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const QUOTA_JOUR = 20;
const MODELES = (Deno.env.get("LLM_FREE_MODELS") ?? "gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest,gemini-flash-lite-latest").split(",").map(m => m.trim()).filter(Boolean);

/** Un appel au modèle : gratuit d'abord, DeepSeek en secours. Renvoie le texte et ce qu'il a coûté. */
/** Plafond mensuel de toute l'IA payante du site (20 $, budget-claude.ts) : au-delà, pas de secours payant. */
let budgetVerifie: boolean | null = null;
// deno-lint-ignore no-explicit-any
async function budgetDisponible(admin: any): Promise<boolean> {
  if (budgetVerifie !== null) return budgetVerifie;
  const debutMois = new Date(); debutMois.setUTCDate(1); debutMois.setUTCHours(0, 0, 0, 0);
  const { data, error } = await admin.from("ia_depenses").select("usd").gte("cree_le", debutMois.toISOString()).limit(20000);
  // Journal illisible : on ne dépense pas (mieux vaut une réponse en moins qu'une facture inattendue).
  budgetVerifie = !error && (data || []).reduce((t: number, x: { usd: number }) => t + Number(x.usd || 0), 0) < Number(Deno.env.get("IA_BUDGET_MOIS") ?? 20);
  return budgetVerifie;
}

// deno-lint-ignore no-explicit-any
async function modele(admin: any, systeme: string, utilisateur: string, json_: boolean): Promise<{ texte: string; modele: string; cout: number }> {
  const cle = Deno.env.get("LLM_FREE_API_KEY");
  // Gemini saturé : 15 s par modèle, 35 s en tout, puis le secours — sinon la fonction dépassait sa
  // durée maximale avant d'arriver à DeepSeek, et l'abonné recevait une erreur.
  const debut = Date.now();
  if (cle) for (const m of MODELES) {
    if (Date.now() - debut > 35000) break;
    for (const reflexion of [true, false]) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${cle}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: systeme }] }, contents: [{ role: "user", parts: [{ text: utilisateur }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048, ...(json_ ? { responseMimeType: "application/json" } : {}), ...(reflexion ? { thinkingConfig: { thinkingBudget: 0 } } : {}) } }),
        });
        if (r.status === 400 && reflexion) continue;
        if (!r.ok) break;
        const d = await r.json();
        const t = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        if (t.trim()) return { texte: t, modele: m, cout: 0 };
        break;
      } catch { break; }
    }
  }
  const ds = Deno.env.get("DEEPSEEK_API_KEY");
  if (!ds || !(await budgetDisponible(admin))) throw new Error("satur");
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${ds}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ model: "deepseek-chat", temperature: 0.1, max_tokens: 1500, ...(json_ ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "system", content: systeme }, { role: "user", content: utilisateur }] }),
  });
  if (!r.ok) throw new Error("satur");
  const d = await r.json();
  const u = d?.usage || {};
  // Tarif de pointe deepseek-chat : 0,27 $ / M en entrée, 1,10 $ / M en sortie (borne haute).
  const cout = ((u.prompt_tokens || 0) * 0.27 + (u.completion_tokens || 0) * 1.1) / 1e6;
  return { texte: d?.choices?.[0]?.message?.content ?? "", modele: "deepseek-chat", cout };
}

const PLAN = `Tu prépares une recherche dans une base parlementaire française (débats en séance, questions au Gouvernement, amendements, lobbying déclaré, textes de loi).
À partir de la question, réponds en JSON : {"requete": "mots-clés pour une recherche plein texte, syntaxe websearch : expressions entre guillemets, « or » entre synonymes ; 2 à 6 termes, au singulier", "depuis": "AAAA-MM-JJ ou null (si la question vise une période : « cette année », « depuis 2025 »…)", "qui": true si la question porte sur des personnes, groupes ou acteurs}
Aujourd'hui : ${new Date().toISOString().slice(0, 10)}.`;

const REDACTION = `Tu es l'analyste d'une plateforme de veille parlementaire française. Réponds à la question en français, en 250 mots au plus, UNIQUEMENT avec les informations des sources numérotées fournies.
Règles :
- chaque phrase se termine par la ou les sources qui la justifient : [1], [2][5] ;
- n'invente rien, aucun chiffre ni nom absent des sources ; si les sources ne suffisent pas, dis-le clairement et dis ce qu'elles montrent quand même ;
- distingue ce qui a été adopté, rejeté ou seulement proposé ;
- style direct, sans titre ni formule de politesse.`;

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

    // Diagnostic (administrateurs) : le secours DeepSeek répond-il ? Un appel minuscule, sans Gemini.
    if (corps.action === "diagnostic") {
      const { data: adm } = await admin.from("administrateurs").select("user_id").eq("user_id", user.id).maybeSingle();
      if (!adm) return json({ error: "réservé aux administrateurs" }, 403);
      const ds = Deno.env.get("DEEPSEEK_API_KEY");
      if (!ds) return json({ deepseek: "absente" });
      const r = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${ds}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ model: "deepseek-chat", max_tokens: 5, messages: [{ role: "user", content: "Réponds seulement : OK" }] }) }).catch(() => null);
      const d = r?.ok ? await r.json() : null;
      return json({ deepseek: r?.ok ? "ok" : `refus ${r?.status ?? "réseau"}`, reponse: d?.choices?.[0]?.message?.content ?? null, budget_disponible: await budgetDisponible(admin), gemini: !!Deno.env.get("LLM_FREE_API_KEY") });
    }

    // ── Connecteur MCP : clés personnelles ──
    if (corps.action === "cle_mcp") {
      const octets = crypto.getRandomValues(new Uint8Array(24));
      const cle = Array.from(octets, b => b.toString(16).padStart(2, "0")).join("");
      const empreinte = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cle))), b => b.toString(16).padStart(2, "0")).join("");
      const { count } = await admin.from("mcp_cles").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("revoquee_le", null);
      if ((count ?? 0) >= 5) return json({ error: "5 clés actives au plus : révoquez-en une." }, 400);
      const { error } = await admin.from("mcp_cles").insert({ user_id: user.id, empreinte, libelle: String(corps.libelle || "Mon assistant").slice(0, 60) });
      if (error) throw error;
      return json({ url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mcp?cle=${cle}` });
    }
    if (corps.action === "revoquer_mcp") {
      await admin.from("mcp_cles").update({ revoquee_le: new Date().toISOString() }).eq("user_id", user.id).eq("id", Number(corps.id));
      return json({ ok: true });
    }

    // ── Question ──
    const question = String(corps.question ?? "").trim();
    if (question.length < 8 || question.length > 500) return json({ error: "Posez votre question en une ou deux phrases (8 à 500 caractères)." }, 400);
    const { count: posees } = await admin.from("explorer_questions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("cree_le", new Date(Date.now() - 864e5).toISOString());
    if ((posees ?? 0) >= QUOTA_JOUR) return json({ error: `Vous avez posé ${QUOTA_JOUR} questions ces dernières 24 heures : l'Explorer sera de nouveau disponible demain.` }, 429);

    let cout = 0; let nomModele = "";
    let plan: { requete?: string; depuis?: string | null; qui?: boolean } = {};
    try {
      const p = await modele(admin, PLAN, question, true); cout += p.cout; nomModele = p.modele;
      plan = JSON.parse(p.texte.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    } catch (e) {
      if ((e as Error).message === "satur") return json({ error: "Les modèles d'IA sont saturés pour le moment. Réessayez dans quelques minutes." }, 503);
      throw e;
    }
    const requete = String(plan.requete || question).slice(0, 200);
    const depuis = /^\d{4}-\d{2}-\d{2}$/.test(String(plan.depuis)) ? String(plan.depuis) : null;

    const lots = await Promise.all([
      D.debats(admin, requete, depuis, 8).catch(() => []), D.questions(admin, requete, depuis, null, 5).catch(() => []),
      D.amendements(admin, requete, depuis, 5).catch(() => []), D.lois(admin, requete, 4).catch(() => []),
      plan.qui ? D.quiPese(admin, requete, depuis, 8).catch(() => []) : Promise.resolve([]),
      plan.qui ? D.lobbying(admin, requete, 5).catch(() => []) : Promise.resolve([]),
    ]);
    const sources = lots.flat().slice(0, 32);
    if (!sources.length) {
      await admin.from("explorer_questions").insert({ user_id: user.id, question, reponse: null, sources: [], modele: nomModele, cout_usd: cout });
      return json({ reponse: "Nos données (débats, questions, amendements, lobbying, textes) ne contiennent rien sur ce sujet. Essayez un autre mot, plus courant ou plus précis.", sources: [], requete, reste: QUOTA_JOUR - (posees ?? 0) - 1 });
    }

    let reponse = "";
    try {
      const r = await modele(admin, REDACTION, `Question : ${question}\n\nSources :\n${D.enSources(sources)}`, false); cout += r.cout; nomModele = r.modele;
      reponse = r.texte.trim();
    } catch { return json({ error: "Les modèles d'IA sont saturés pour le moment. Réessayez dans quelques minutes." }, 503); }
    // Garde-fou : un renvoi vers une source qui n'existe pas est retiré.
    reponse = reponse.replace(/\[(\d+)\]/g, (m, n) => (Number(n) >= 1 && Number(n) <= sources.length ? m : ""));

    await admin.from("explorer_questions").insert({ user_id: user.id, question, reponse, sources, modele: nomModele, cout_usd: Number(cout.toFixed(5)) });
    if (cout > 0) await admin.from("ia_depenses").insert({ poste: "explorer", modele: nomModele, usd: Number(cout.toFixed(5)), detail: "Explorer IA" });
    return json({ reponse, sources, requete, reste: QUOTA_JOUR - (posees ?? 0) - 1 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
