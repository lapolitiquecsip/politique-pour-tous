/**
 * Connecteur MCP (Pro) : nos données parlementaires dans l'assistant de l'abonné (Claude,
 * ChatGPT, Mistral…). Protocole MCP en « HTTP streamable », réponses JSON simples, lecture seule.
 *
 * Adresse : …/functions/v1/mcp?cle=<clé personnelle> — la clé est créée dans l'espace Pro
 * (fonction « explorer », action cle_mcp) ; seule son empreinte SHA-256 est en base, elle se
 * révoque d'un clic, et ne sert que tant que son titulaire est abonné Pro.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as D from "../_shared/donnees-pro.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const depuis = { type: "string", description: "Date de début AAAA-MM-JJ (facultatif)" };
const OUTILS = [
  { name: "chercher_debats", description: "Prises de parole en séance publique à l'Assemblée nationale (comptes rendus officiels depuis 2024) : qui a dit quoi, quand, sur quel point de l'ordre du jour. Recherche plein texte en français (« expression exacte », or, -exclusion).",
    inputSchema: { type: "object", properties: { requete: { type: "string" }, depuis }, required: ["requete"] } },
  { name: "chercher_questions", description: "Questions écrites et questions au Gouvernement des députés, avec le ministère interrogé et l'état de la réponse.",
    inputSchema: { type: "object", properties: { requete: { type: "string" }, depuis, statut: { type: "string", enum: ["repondue", "attente"] } }, required: ["requete"] } },
  { name: "chercher_amendements", description: "Amendements déposés à l'Assemblée et au Sénat sur les textes en cours : auteur, groupe, article, sort, dispositif et exposé.",
    inputSchema: { type: "object", properties: { requete: { type: "string" }, depuis }, required: ["requete"] } },
  { name: "qui_pese", description: "Parlementaires les plus actifs sur un sujet : interventions en séance, questions, amendements déposés et adoptés, avec un score (1/1/2/5).",
    inputSchema: { type: "object", properties: { sujet: { type: "string" }, depuis }, required: ["sujet"] } },
  { name: "lobbying", description: "Représentants d'intérêts actifs sur un sujet d'après le répertoire de la HATVP : organisations, objets de leurs actions, décideurs publics ciblés.",
    inputSchema: { type: "object", properties: { sujet: { type: "string" } }, required: ["sujet"] } },
  { name: "chercher_lois", description: "Projets et propositions de loi (Assemblée, Sénat) : titre, étape en cours, résumé.",
    inputSchema: { type: "object", properties: { requete: { type: "string" } }, required: ["requete"] } },
];

const reponse = (id: unknown, result: unknown) => new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { headers: { ...CORS, "Content-Type": "application/json" } });
const erreur = (id: unknown, code: number, message: string, status = 200) => new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { status, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Connecteur MCP de La politique, c'est simple : à ajouter dans votre assistant (Claude, ChatGPT…).", { status: 405, headers: CORS });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // La clé : dans l'adresse (?cle=) ou en en-tête Authorization: Bearer.
  const url = new URL(req.url);
  const cle = url.searchParams.get("cle") || req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!/^[0-9a-f]{48}$/.test(cle)) return erreur(null, -32001, "Clé absente ou invalide : créez-la dans votre espace Pro.", 401);
  const empreinte = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cle))), b => b.toString(16).padStart(2, "0")).join("");
  const { data: ligne } = await admin.from("mcp_cles").select("id, user_id, revoquee_le").eq("empreinte", empreinte).maybeSingle();
  if (!ligne || ligne.revoquee_le) return erreur(null, -32001, "Clé révoquée ou inconnue.", 401);
  const { data: profil } = await admin.from("profiles").select("subscription_tier").eq("id", ligne.user_id).single();
  if (String(profil?.subscription_tier ?? "").toLowerCase() !== "pro") return erreur(null, -32001, "Le connecteur est réservé aux abonnés Pro.", 403);

  let msg: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try { msg = await req.json(); } catch { return erreur(null, -32700, "JSON invalide", 400); }
  if (Array.isArray(msg)) return erreur(null, -32600, "Lots de requêtes non pris en charge", 400);
  const { id, method, params = {} } = msg;

  // Notifications (pas d'identifiant) : accusé de réception sans corps.
  if (id === undefined) return new Response(null, { status: 202, headers: CORS });
  if (method === "initialize") {
    const demandee = String(params.protocolVersion || "");
    return reponse(id, { protocolVersion: VERSIONS.includes(demandee) ? demandee : VERSIONS[0], capabilities: { tools: {} },
      serverInfo: { name: "La politique, c'est simple", version: "1.0.0" },
      instructions: "Données parlementaires françaises officielles. Citez toujours la source (lien) de chaque élément utilisé." });
  }
  if (method === "ping") return reponse(id, {});
  if (method === "tools/list") return reponse(id, { tools: OUTILS });
  if (method === "tools/call") {
    const nom = String(params.name || "");
    const a = (params.arguments || {}) as Record<string, string>;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(a.depuis || "") ? a.depuis : null;
    try {
      const elements =
        nom === "chercher_debats" ? await D.debats(admin, a.requete, d, 10)
        : nom === "chercher_questions" ? await D.questions(admin, a.requete, d, a.statut || null, 10)
        : nom === "chercher_amendements" ? await D.amendements(admin, a.requete, d, 8)
        : nom === "qui_pese" ? await D.quiPese(admin, a.sujet, d, 15)
        : nom === "lobbying" ? await D.lobbying(admin, a.sujet, 10)
        : nom === "chercher_lois" ? await D.lois(admin, a.requete, 8)
        : null;
      if (!elements) return erreur(id, -32602, `Outil inconnu : ${nom}`);
      await admin.from("mcp_cles").update({ utilisee_le: new Date().toISOString() }).eq("id", ligne.id);
      const texte = elements.length ? elements.map(e => `• ${e.type} — ${e.titre}${e.date ? ` (${String(e.date).slice(0, 10)})` : ""}\n  ${e.texte}${e.url ? `\n  Source : ${e.url}` : ""}`).join("\n\n") : "Aucun résultat dans les données pour cette recherche.";
      return reponse(id, { content: [{ type: "text", text: texte }], isError: false });
    } catch (e) {
      return reponse(id, { content: [{ type: "text", text: `Recherche impossible : ${(e as Error).message}. Vérifiez la formulation (guillemets fermés).` }], isError: true });
    }
  }
  return erreur(id, -32601, `Méthode non prise en charge : ${method}`);
});
