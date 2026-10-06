import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.16.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Versement automatique des commissions de parrainage (Stripe Connect, comptes Express).
 *
 * Parrain connecté :
 *  - { action: "relier" }  → crée son compte Stripe Express si besoin et renvoie le lien
 *                            d'inscription chez Stripe (identité + IBAN, saisis chez Stripe) ;
 *  - { action: "etat" }    → compte relié ? inscription terminée ? versements actifs ?
 *  - { action: "tableau" } → lien vers son espace Stripe (historique des virements).
 * Tâche quotidienne (clé de service) :
 *  - { action: "verser" }  → pour chaque parrain prêt dont les commissions disponibles
 *                            atteignent le seuil : un transfert par commission, adossé au
 *                            paiement du filleul (source_transaction : pas besoin de solde
 *                            d'avance) ; Stripe vire ensuite sur le compte bancaire du parrain.
 *  - { action: "diagnostic" } → Connect est-il activé sur le compte Stripe ?
 *
 * Déploiement : supabase functions deploy parrainage-versements
 */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});
const SITE = "https://lapolitiquecestsimple.fr";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/** Compte prêt à recevoir : inscription finie, transferts et virements autorisés par Stripe. */
const pret = (a: any) => !!a.details_submitted && a.payouts_enabled && a.capabilities?.transfers === "active";

/** Le paiement (charge) derrière une commission : facture d'abonnement, ou session de paiement. */
async function paiementDe(ref: string): Promise<string | null> {
  if (ref.startsWith("in_")) {
    const f: any = await stripe.invoices.retrieve(ref);
    return typeof f.charge === "string" ? f.charge : f.charge?.id ?? null;
  }
  if (ref.startsWith("cs_")) {
    const s: any = await stripe.checkout.sessions.retrieve(ref, { expand: ["payment_intent"] });
    const pi = s.payment_intent;
    if (pi) return typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;
    if (s.invoice) return paiementDe(typeof s.invoice === "string" ? s.invoice : s.invoice.id);
  }
  return null;
}

async function verser() {
  const db = admin();
  // 1. Les comptes reliés pas encore actifs : l'inscription a peut-être été terminée depuis.
  const { data: attente } = await db.from("parrains").select("user_id, stripe_compte").not("stripe_compte", "is", null).eq("versements_actifs", false);
  for (const p of attente || []) {
    try { if (pret(await stripe.accounts.retrieve(p.stripe_compte))) await db.from("parrains").update({ versements_actifs: true }).eq("user_id", p.user_id); }
    catch (e) { console.warn(`compte ${p.stripe_compte} : ${(e as Error).message}`); }
  }

  // 2. Les commissions dues, parrain par parrain (seuil atteint).
  const { data: lots, error } = await db.rpc("commissions_a_verser");
  if (error) throw error;
  const bilan: any[] = [];
  for (const lot of lots || []) {
    let verse = 0, echecs = 0;
    for (let i = 0; i < lot.ids.length; i++) {
      const id = lot.ids[i], facture = lot.factures[i], montant = Number(lot.montants[i]);
      try {
        const charge = await paiementDe(facture);
        if (!charge) throw new Error(`paiement introuvable pour ${facture}`);
        const tr = await stripe.transfers.create({
          amount: Math.round(montant * 100), currency: "eur", destination: lot.stripe_compte,
          source_transaction: charge, transfer_group: `parrainage-${lot.parrain_id}`,
          description: "Commission de parrainage — La Politique C'est Simple",
          metadata: { commission_id: String(id), facture },
        }, { idempotencyKey: `commission-${id}` });
        await db.from("commissions").update({ statut: "versee", versee_le: new Date().toISOString(), stripe_transfert: tr.id, erreur_versement: null }).eq("id", id);
        verse += montant;
      } catch (e) {
        echecs++;
        await db.from("commissions").update({ erreur_versement: (e as Error).message.slice(0, 300) }).eq("id", id);
      }
    }
    bilan.push({ parrain: lot.parrain_id, verse: Math.round(verse * 100) / 100, echecs });
  }
  return { ok: true, comptes_verifies: (attente || []).length, versements: bilan };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);
  try {
    const corps: any = await req.json().catch(() => ({}));
    const { action } = corps;
    const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const db = admin();

    // Tâches planifiées (clé de service).
    if (jeton && jeton === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      if (action === "verser") return json(await verser());
      if (action === "diagnostic") {
        try {
          const l = await stripe.accounts.list({ limit: 3 });
          return json({ connect: true, mode: (Deno.env.get("STRIPE_SECRET_KEY") ?? "").startsWith("sk_live") ? "live" : "test", comptes: l.data.length });
        } catch (e) { return json({ connect: false, erreur: (e as Error).message }); }
      }
      // Essais de bout en bout, MODE TEST SEULEMENT : un compte de parrain fictif complet
      // (identité et IBAN de test Stripe), et le remboursement d'un paiement.
      if ((Deno.env.get("STRIPE_SECRET_KEY") ?? "").startsWith("sk_test")) {
        if (action === "essai_compte") {
          const a = await stripe.accounts.create({
            type: "custom", country: "FR", business_type: "individual", email: "parrain-essai@example.com",
            capabilities: { transfers: { requested: true } },
            business_profile: { product_description: "Essai parrainage", url: SITE, mcc: "7399" },
            individual: {
              first_name: "Essai", last_name: "Parrain", email: "parrain-essai@example.com", phone: "+33612345678",
              dob: { day: 1, month: 1, year: 1990 },
              address: { line1: "1 rue de Rivoli", city: "Paris", postal_code: "75001", country: "FR" },
            },
            external_account: { object: "bank_account", country: "FR", currency: "eur", account_number: "FR1420041010050500013M02606" },
            tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "8.8.8.8" },
          });
          const relu: any = await stripe.accounts.retrieve(a.id);
          return json({ compte: a.id, pret: pret(relu), transfers: relu.capabilities?.transfers, exigences: relu.requirements?.currently_due });
        }
        if (action === "essai_rembourser") {
          const charge = await paiementDe(String(corps.facture));
          if (!charge) return json({ error: "paiement introuvable" }, 404);
          const r = await stripe.refunds.create({ charge });
          return json({ remboursement: r.id, statut: r.status });
        }
        if (action === "essai_transfert") {
          const t: any = await stripe.transfers.retrieve(String(corps.transfert));
          return json({ id: t.id, montant: t.amount / 100, destination: t.destination, repris: t.amount_reversed / 100 });
        }
        if (action === "essai_supprimer") return json(await stripe.accounts.del(String(corps.compte)));
      }
      return json({ error: "action inconnue" }, 400);
    }

    const { data: qui } = await db.auth.getUser(jeton);
    const user = qui?.user;
    if (!user) return json({ error: "connexion requise" }, 401);
    const { data: parrain } = await db.from("parrains").select("user_id, stripe_compte, versements_actifs").eq("user_id", user.id).maybeSingle();
    if (!parrain) return json({ error: "Créez d'abord votre lien de parrainage." }, 400);

    if (action === "relier") {
      let compte = parrain.stripe_compte as string | null;
      if (!compte) {
        const a = await stripe.accounts.create({
          type: "express", country: "FR", email: user.email ?? undefined, business_type: "individual",
          capabilities: { transfers: { requested: true } },
          business_profile: { product_description: "Commissions de parrainage du site La Politique C'est Simple", url: SITE, mcc: "7399" },
          metadata: { user_id: user.id },
        });
        compte = a.id;
        await db.from("parrains").update({ stripe_compte: compte }).eq("user_id", user.id);
      }
      const lien = await stripe.accountLinks.create({
        account: compte, type: "account_onboarding",
        refresh_url: `${SITE}/parrainage/?versements=relancer`, return_url: `${SITE}/parrainage/?versements=retour`,
      });
      return json({ url: lien.url });
    }

    if (action === "etat") {
      if (!parrain.stripe_compte) return json({ relie: false, actif: false });
      const a: any = await stripe.accounts.retrieve(parrain.stripe_compte);
      const actif = pret(a);
      if (actif !== parrain.versements_actifs) await db.from("parrains").update({ versements_actifs: actif }).eq("user_id", user.id);
      return json({ relie: true, actif, a_completer: !a.details_submitted, en_verification: !!a.details_submitted && !actif });
    }

    if (action === "tableau") {
      if (!parrain.stripe_compte) return json({ error: "aucun compte relié" }, 400);
      const l = await stripe.accounts.createLoginLink(parrain.stripe_compte);
      return json({ url: l.url });
    }
    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    console.error("parrainage-versements :", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
