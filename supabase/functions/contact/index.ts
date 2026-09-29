import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Formulaire de contact : enregistre le message ET l'envoie par e-mail.
 *
 * Jusqu'ici, le formulaire écrivait seulement dans `contact_messages` : rien ne
 * prévenait personne, et les demandes dormaient en base sans que la boîte de
 * l'équipe reçoive quoi que ce soit. Le message part désormais par Resend (le
 * domaine lapolitiquecestsimple.fr y est vérifié) vers CONTACT_TO, avec l'adresse
 * du visiteur en « répondre à » : un clic sur « Répondre » dans Gmail lui écrit.
 *
 * Ouverte sans connexion (tout visiteur peut écrire) ; d'où les garde-fous :
 * champ piège pour les robots, longueurs bornées, cinq messages par heure et par
 * adresse au plus.
 *
 * Déploiement :
 *   supabase functions deploy contact --no-verify-jwt
 *   supabase secrets set RESEND_API_KEY=... CONTACT_TO=lapolitiquecsimple@gmail.com
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const OBJETS: Record<string, string> = {
  support: "Support Premium / Facturation",
  press: "Demande presse",
  idea: "Suggestion de dossier",
  other: "Autre demande",
};

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);

  try {
    const corps = await req.json().catch(() => ({}));
    // Champ piège, invisible pour un humain : un robot le remplit. On répond
    // « envoyé » pour ne rien lui apprendre, sans rien envoyer.
    if (corps.site_web) return json({ ok: true });

    const name = String(corps.name ?? "").trim().slice(0, 120);
    const email = String(corps.email ?? "").trim().slice(0, 200);
    const subject = String(corps.subject ?? "other").trim().slice(0, 40);
    const message = String(corps.message ?? "").trim().slice(0, 5000);
    if (!name || !message) return json({ error: "nom et message requis" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "adresse e-mail invalide" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const uneHeure = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from("contact_messages")
      .select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", uneHeure);
    if ((count ?? 0) >= 5) return json({ error: "trop de messages envoyés, réessayez dans une heure" }, 429);

    // Enregistrer d'abord : si l'envoi échoue, la demande n'est pas perdue.
    const { error: errBase } = await admin.from("contact_messages").insert({ name, email, subject, message });
    if (errBase) console.warn("contact_messages :", errBase.message);

    const cle = Deno.env.get("RESEND_API_KEY");
    const destinataire = Deno.env.get("CONTACT_TO") ?? "lapolitiquecsimple@gmail.com";
    if (!cle) throw new Error("RESEND_API_KEY absente de la fonction");

    const objet = OBJETS[subject] ?? "Autre demande";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "La Politique C'est Simple — Contact <contact@lapolitiquecestsimple.fr>",
        to: [destinataire],
        reply_to: email,
        subject: `[Contact · ${objet}] ${name}`,
        text: `${objet}\n\nDe : ${name} <${email}>\n\n${message}\n\n— Répondez directement à cet e-mail pour écrire à ${name}.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;color:#0f172a">
  <p style="font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#dc2626;margin:0">${echapper(objet)}</p>
  <h2 style="margin:8px 0 4px">${echapper(name)}</h2>
  <p style="margin:0 0 16px;color:#475569"><a href="mailto:${echapper(email)}">${echapper(email)}</a></p>
  <div style="white-space:pre-wrap;line-height:1.6;background:#f8fafc;border-radius:12px;padding:16px">${echapper(message)}</div>
  <p style="font-size:12px;color:#94a3b8;margin-top:16px">Répondez directement à cet e-mail pour écrire à ${echapper(name)}.</p>
</div>`,
      }),
    });
    if (!r.ok) throw new Error(`Resend HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return json({ ok: true });
  } catch (e) {
    console.error("contact :", (e as Error).message);
    return json({ error: "l'envoi a échoué" }, 500);
  }
});
