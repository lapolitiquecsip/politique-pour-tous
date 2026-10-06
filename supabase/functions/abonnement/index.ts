import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.16.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Résiliation en ligne de l'abonnement (« résiliation en trois clics »).
 *
 * Code de la consommation, art. L215-1-1 et D215-1 s. : un contrat conclu en ligne se
 * résilie en ligne, par une fonctionnalité directement accessible ; le professionnel
 * confirme sur un support durable (ici un e-mail) la date à laquelle le contrat prend fin.
 *
 *  - { action: "etat" }     → les abonnements en cours du membre connecté ;
 *  - { action: "resilier" } → fin à l'échéance de la période payée + accusé par e-mail.
 *
 * Déploiement :
 *   supabase functions deploy abonnement
 *   (secrets déjà posés : STRIPE_SECRET_KEY, RESEND_API_KEY)
 */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const dateFr = (s: number) =>
  new Date(s * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

const offre = (sub: any) => {
  const p = sub.items?.data?.[0]?.price;
  const montant = p?.unit_amount != null ? (p.unit_amount / 100).toFixed(2).replace(".", ",") + " €" : "";
  const nom = (p?.unit_amount ?? 0) >= 1500 ? "Pro" : "Premium";
  return { nom, montant, periode: p?.recurring?.interval === "year" ? "an" : "mois" };
};

async function envoyer(to: string, sujet: string, texte: string, html: string) {
  const cle = Deno.env.get("RESEND_API_KEY");
  if (!cle) throw new Error("RESEND_API_KEY absente");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "La Politique C'est Simple <contact@lapolitiquecestsimple.fr>", to: [to], subject: sujet, text: texte, html }),
  });
  if (!r.ok) throw new Error(`Resend HTTP ${r.status}`);
}

/**
 * C. conso. L215-1 : pour un contrat à reconduction tacite, informer l'abonné de sa faculté
 * de ne pas reconduire, au plus tôt trois mois et au plus tard un mois avant l'échéance.
 * Fenêtre retenue : 35 à 85 jours avant ; une fois par échéance (métadonnée Stripe).
 */
async function rappelsAnnuels() {
  const maintenant = Math.floor(Date.now() / 1000);
  let envoyes = 0, vus = 0, curseur: string | undefined;
  do {
    const page: any = await stripe.subscriptions.list({ status: "active", limit: 100, starting_after: curseur, expand: ["data.customer"] });
    for (const s of page.data) {
      vus++;
      const p = s.items?.data?.[0]?.price;
      if (p?.recurring?.interval !== "year" || s.cancel_at_period_end) continue;
      const jours = (s.current_period_end - maintenant) / 86400;
      if (jours < 35 || jours > 85) continue;
      if (s.metadata?.rappel_echeance === String(s.current_period_end)) continue;
      const email = typeof s.customer === "object" ? s.customer?.email : null;
      if (!email) continue;
      const { nom, montant } = offre(s);
      const fin = dateFr(s.current_period_end);
      const texte = `Bonjour,\n\nVotre abonnement ${nom} annuel arrive à échéance le ${fin}. Sans action de votre part, il sera renouvelé automatiquement pour un an, au prix de ${montant}.\n\nSi vous ne souhaitez pas le renouveler, résiliez-le avant cette date depuis votre espace : Mon compte → Paramètres → « Résilier mon abonnement » (https://lapolitiquecestsimple.fr/dashboard). Vous garderez l'accès jusqu'au ${fin}.\n\nLa Politique C'est Simple`;
      await envoyer(email, `Votre abonnement ${nom} se renouvelle le ${fin}`, texte,
        `<div style="font-family:Arial,sans-serif;max-width:600px;color:#0f172a;line-height:1.6">${texte.split("\n\n").map(x => `<p>${x.replace(/\n/g, "<br>")}</p>`).join("")}</div>`);
      await stripe.subscriptions.update(s.id, { metadata: { ...s.metadata, rappel_echeance: String(s.current_period_end) } });
      envoyes++;
    }
    curseur = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (curseur);
  return { ok: true, abonnements_vus: vus, rappels_envoyes: envoyes };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    // Tâche planifiée (clé de service) : rappel d'échéance des abonnements annuels.
    if (jeton && jeton === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return json(await rappelsAnnuels());
    const { data: qui } = await admin.auth.getUser(jeton);
    const user = qui?.user;
    if (!user) return json({ error: "connexion requise" }, 401);

    const { action } = await req.json().catch(() => ({}));
    const { data: profil } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    const client = profil?.stripe_customer_id as string | undefined;
    const subs = client
      ? (await stripe.subscriptions.list({ customer: client, status: "all", limit: 10 })).data
          .filter((s: any) => ["active", "trialing", "past_due"].includes(s.status))
      : [];

    const etat = subs.map((s: any) => ({
      id: s.id, ...offre(s), fin: s.current_period_end, fin_texte: dateFr(s.current_period_end),
      resilie: !!s.cancel_at_period_end,
    }));
    if (action === "etat") return json({ abonnements: etat });
    if (action !== "resilier") return json({ error: "action inconnue" }, 400);
    if (!subs.length) return json({ error: "aucun abonnement payant en cours" }, 404);

    const faits = [];
    for (const s of subs) {
      const maj: any = s.cancel_at_period_end ? s : await stripe.subscriptions.update(s.id, { cancel_at_period_end: true });
      faits.push({ ...offre(maj), fin: maj.current_period_end, fin_texte: dateFr(maj.current_period_end) });
    }

    // Accusé de réception sur support durable (art. D215-3).
    const cle = Deno.env.get("RESEND_API_KEY");
    if (cle && user.email) {
      const lignes = faits.map(f => `Offre ${f.nom}${f.montant ? ` (${f.montant} par ${f.periode})` : ""} : résiliée, fin le ${f.fin_texte}.`);
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "La Politique C'est Simple <contact@lapolitiquecestsimple.fr>",
          to: [user.email],
          subject: "Confirmation de la résiliation de votre abonnement",
          text: `Bonjour,\n\nNous avons bien reçu, le ${dateFr(Math.floor(Date.now() / 1000))}, la résiliation de votre abonnement.\n\n${lignes.join("\n")}\n\nVous gardez l'accès à votre offre jusqu'à cette date ; aucun nouveau prélèvement ne sera effectué. Votre compte gratuit reste ouvert.\n\nLa Politique C'est Simple — https://lapolitiquecestsimple.fr`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;color:#0f172a;line-height:1.6">
  <h2 style="margin:0 0 12px">Votre résiliation est enregistrée</h2>
  <p>Nous avons bien reçu, le <strong>${dateFr(Math.floor(Date.now() / 1000))}</strong>, la résiliation de votre abonnement.</p>
  <ul>${lignes.map(l => `<li>${l}</li>`).join("")}</ul>
  <p>Vous gardez l'accès à votre offre jusqu'à cette date ; aucun nouveau prélèvement ne sera effectué. Votre compte gratuit reste ouvert.</p>
  <p style="font-size:12px;color:#64748b">Conservez cet e-mail : il vaut accusé de réception de votre résiliation (art. L215-1-1 du Code de la consommation).</p>
</div>`,
        }),
      });
      if (!r.ok) console.error(`accusé de résiliation non envoyé : HTTP ${r.status}`);
    }
    return json({ ok: true, resiliations: faits });
  } catch (e) {
    console.error("abonnement :", (e as Error).message);
    return json({ error: "opération impossible pour le moment" }, 500);
  }
});
