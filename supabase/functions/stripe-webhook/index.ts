import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.16.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

/**
 * Détermine le niveau acheté (« elite » ou « pro »).
 *
 * On regarde d'abord les identifiants de prix Stripe si le secret STRIPE_PRICE_PRO est
 * renseigné (un ou plusieurs identifiants `price_…`, séparés par des virgules) ; sinon on
 * tranche sur le montant payé : Pro vaut 24,99 €/mois ou 239 €/an, Elite 3,99 €/mois et
 * rien d'autre. Le seuil de 15 € les sépare donc sans ambiguïté possible.
 */
async function resolveTier(session: any): Promise<'elite' | 'pro'> {
  const proPrices = (Deno.env.get('STRIPE_PRICE_PRO') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)

  if (proPrices.length) {
    try {
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
      if (items.data.some(i => proPrices.includes(i.price?.id ?? ''))) return 'pro'
      return 'elite'
    } catch (e) {
      console.warn(`Lecture des line items impossible (${e.message}) — repli sur le montant.`)
    }
  }

  // amount_total est en centimes. 1500 = 15 €.
  return (session.amount_total ?? 0) >= 1500 ? 'pro' : 'elite'
}

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response("Pas de signature", { status: 400 })
  }

  try {
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

    // Vérification de l'authenticité
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.client_reference_id
      const customerEmail = session.customer_details?.email
      const tier = await resolveTier(session)

      console.log(`Traitement du paiement - ID: ${userId} / Email: ${customerEmail} / Formule: ${tier}`)

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // STRATÉGIE D'IDENTIFICATION :
      // 1. client_reference_id, posé par le site quand l'acheteur est connecté (le plus sûr) ;
      // 2. sinon, on retrouve le compte par l'e-mail saisi au paiement.
      //
      // La table `profiles` N'A PAS de colonne `email` : chercher dessus échouait avec une
      // erreur SQL, et l'acheteur non connecté ne recevait jamais son abonnement. On passe
      // donc par l'annuaire d'authentification, qui est la source de vérité des e-mails.
      let targetId: string | null = userId ?? null

      if (!targetId && customerEmail) {
        const wanted = customerEmail.trim().toLowerCase()
        for (let page = 1; page <= 10 && !targetId; page++) {
          const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
          if (error) { console.error(`Recherche par e-mail impossible : ${error.message}`); break }
          targetId = data.users.find(u => (u.email ?? '').toLowerCase() === wanted)?.id ?? null
          if (data.users.length < 1000) break // dernière page atteinte
        }
        if (!targetId) console.error(`Aucun compte ne correspond à l'e-mail ${customerEmail}`)
      }

      if (!targetId) {
        // On répond 200 : rien ne sert de faire réessayer Stripe, le compte n'existe pas.
        // Le paiement est encaissé et devra être rattaché à la main.
        console.error("PAIEMENT NON RATTACHÉ — aucun compte identifié. À traiter manuellement.")
        return new Response(JSON.stringify({ received: true, matched: false }), { status: 200 })
      }

      // is_premium reste à true dans tous les cas : il commande les accès premium
      // historiques. subscription_tier distingue Elite de Pro.
      let { error } = await supabase
        .from('profiles')
        .update({ is_premium: true, subscription_tier: tier })
        .eq('id', targetId)

      // Repli si la migration ajoutant subscription_tier n'est pas encore appliquée.
      if (error && /subscription_tier/.test(error.message ?? '')) {
        console.warn("Colonne subscription_tier absente — activation en premium simple.")
        error = (await supabase.from('profiles').update({ is_premium: true }).eq('id', targetId)).error
      }
      if (error) throw error
      console.log(`Succès ! Accès ${tier} activé pour ${targetId}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error(`Erreur Webhook : ${err.message}`)
    return new Response(`Erreur : ${err.message}`, { status: 400 })
  }
})
