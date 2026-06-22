import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.16.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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

      console.log(`Traitement du paiement - ID: ${userId} / Email: ${customerEmail}`)

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // STRATÉGIE DE RECHERCHE : 
      // 1. On cherche par ID (le plus sûr)
      // 2. SINON on cherche par EMAIL (plan B)
      
      let updateQuery;
      
      if (userId) {
        updateQuery = supabase.from('profiles').update({ is_premium: true }).eq('id', userId)
      } else if (customerEmail) {
        updateQuery = supabase.from('profiles').update({ is_premium: true }).eq('email', customerEmail)
      }

      if (updateQuery) {
        const { error } = await updateQuery
        if (error) throw error
        console.log(`Succès ! Accès Premium activé pour ${userId || customerEmail}`)
      } else {
        console.error("Impossible d'identifier l'utilisateur (ni ID, ni Email)")
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error(`Erreur Webhook : ${err.message}`)
    return new Response(`Erreur : ${err.message}`, { status: 400 })
  }
})
