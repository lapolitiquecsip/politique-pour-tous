import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.16.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compteDeLAcheteur, resolveTier } from "../_shared/paiement.ts";

/**
 * Le retour du paiement : relier le navigateur de l'acheteur à son compte, sans lui faire perdre le fil.
 *
 * Les liens de paiement s'ouvrent sans être connecté. La page /success appelle cette fonction avec
 * l'identifiant du paiement (session_id, connu du seul acheteur), et reçoit l'un de ces états :
 *   - connecte      le navigateur est déjà sur le bon compte ;
 *   - connexion     compte créé par CE paiement : un jeton à usage unique ouvre la session ;
 *   - lien          compte existant : un lien de connexion part à son adresse. Jamais de connexion
 *                   d'office : Stripe ne vérifie pas l'adresse saisie (voir compteDeLAcheteur) ;
 *   - autre_compte  le navigateur est connecté à un autre compte que celui de l'achat ;
 *   - inconnu       identifiant invalide, ou paiement non abouti.
 *
 * { session_id, renvoyer: true } renvoie le lien (Supabase limite l'envoi à un par minute).
 *
 * Déploiement : supabase functions deploy session-paiement --no-verify-jwt
 */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});
const SITE = "https://lapolitiquecestsimple.fr";
const VALIDITE_CONNEXION = 24 * 3600;   // secondes : au-delà, on repasse par le lien par e-mail

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** m***@free.fr : assez pour se reconnaître, pas assez pour qui tomberait sur le lien. */
const masquer = (email: string) => {
  const [nom, domaine] = email.split("@");
  return `${nom.slice(0, 1)}***@${domaine}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { session_id: id, renvoyer } = await req.json().catch(() => ({}));
    if (typeof id !== "string" || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return json({ etat: "inconnu" });

    const session: any = await stripe.checkout.sessions.retrieve(id).catch(() => null);
    const paye = session?.status === "complete" && ["paid", "no_payment_required"].includes(session?.payment_status);
    if (!paye) return json({ etat: "inconnu" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const offre = await resolveTier(stripe, session);

    // Le compte de l'achat : celui du membre connecté au moment de payer, sinon celui de l'adresse saisie.
    let compte: any = null;
    if (session.client_reference_id) {
      compte = (await supabase.auth.admin.getUserById(session.client_reference_id)).data?.user ?? null;
    }
    const email = compte?.email ?? session.customer_details?.email;
    if (!email) return json({ etat: "inconnu" });
    if (!compte) compte = await compteDeLAcheteur(supabase, email, session.id);
    const base = { offre, email: masquer(email) };

    // Le navigateur est-il déjà connecté, et sur quel compte ?
    const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const visiteur = jeton ? (await supabase.auth.getUser(jeton)).data?.user ?? null : null;
    if (visiteur?.id === compte.id) return json({ ...base, etat: "connecte" });
    if (visiteur && !renvoyer) return json({ ...base, etat: "autre_compte" });

    // Compte créé par ce paiement : une connexion d'office, une seule, peu après le paiement.
    const meta = compte.app_metadata ?? {};
    const recent = Date.now() / 1000 - session.created < VALIDITE_CONNEXION;
    if (meta.cree_par_paiement === session.id && !meta.connexion_donnee && recent && !renvoyer) {
      const { data: lien, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email: compte.email });
      if (!error && lien?.properties?.hashed_token) {
        await supabase.auth.admin.updateUserById(compte.id, { app_metadata: { ...meta, connexion_donnee: true } });
        return json({ ...base, etat: "connexion", token_hash: lien.properties.hashed_token, nouveau: true });
      }
      console.error(`Jeton de connexion non généré : ${error?.message}`);
    }

    // Sinon, le lien par e-mail : c'est lui qui prouve que l'adresse est bien celle de l'acheteur.
    const { error: envoi } = await supabase.auth.signInWithOtp({
      email: compte.email,
      options: { shouldCreateUser: false, emailRedirectTo: `${SITE}/premium/?bienvenue=1` },
    });
    // Limite d'un envoi par minute : un lien vient de partir, inutile d'alarmer.
    if (envoi && envoi.status !== 429) console.error(`Lien de connexion non envoyé : ${envoi.message}`);
    return json({ ...base, etat: "lien", envoye: !envoi || envoi.status === 429 });
  } catch (e) {
    console.error(`session-paiement : ${(e as Error).message}`);
    return json({ etat: "inconnu" });
  }
});
