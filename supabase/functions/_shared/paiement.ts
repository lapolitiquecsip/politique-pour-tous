/**
 * Ce que le webhook Stripe et la page de retour du paiement partagent : le niveau acheté, et le
 * compte de l'acheteur, qui peut avoir payé depuis un lien direct, sans être connecté.
 */

/**
 * Détermine le niveau acheté (« elite » ou « pro »).
 *
 * On regarde d'abord les identifiants de prix Stripe si le secret STRIPE_PRICE_PRO est
 * renseigné (un ou plusieurs identifiants `price_…`, séparés par des virgules) ; sinon on
 * tranche sur le montant payé : Pro vaut 24,99 €/mois ou 239 €/an, Elite 3,99 €/mois et
 * rien d'autre. Le seuil de 15 € les sépare donc sans ambiguïté possible.
 */
export async function resolveTier(stripe: any, session: any): Promise<'elite' | 'pro'> {
  // Identifiants `price_…` ou `prod_…` des offres Pro, séparés par des virgules.
  const proIds = (Deno.env.get('STRIPE_PRICE_PRO') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)

  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
    if (proIds.length) {
      const produit = (i: any) => typeof i.price?.product === 'string' ? i.price.product : i.price?.product?.id
      return items.data.some((i: any) => proIds.includes(i.price?.id ?? '') || proIds.includes(produit(i) ?? '')) ? 'pro' : 'elite'
    }
    // Sans identifiants : le prix en euros de l'offre, jamais le montant payé (conversion de devise).
    const euros = items.data.reduce((t: number, i: any) => t + (i.price?.unit_amount ?? 0) * (i.quantity ?? 1), 0)
    if (euros > 0) return euros >= 1500 ? 'pro' : 'elite'
  } catch (e) {
    console.warn(`Lecture des line items impossible (${(e as Error).message}) — repli sur le montant.`)
  }

  // amount_total est en centimes, dans la devise payée : ce repli ne vaut que pour l'euro.
  return (session.amount_total ?? 0) >= 1500 ? 'pro' : 'elite'
}

/** Le compte portant cette adresse, dans l'annuaire d'authentification (`profiles` n'a pas de colonne e-mail). */
export async function compteParEmail(supabase: any, email: string): Promise<any | null> {
  const voulu = email.trim().toLowerCase()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Annuaire illisible : ${error.message}`)
    const trouve = data.users.find((u: any) => (u.email ?? '').toLowerCase() === voulu)
    if (trouve) return trouve
    if (data.users.length < 1000) return null
  }
  return null
}

/**
 * Le compte de l'acheteur, créé s'il n'en a pas : un paiement encaissé ne reste jamais sans accès.
 *
 * `cree_par_paiement` retient le paiement qui l'a créé. C'est ce qui autorise la connexion
 * automatique au retour du paiement, et seulement elle : Stripe ne vérifie pas l'adresse saisie, si
 * bien que connecter d'office à un compte déjà existant livrerait n'importe quel compte à quiconque
 * paie en tapant l'adresse d'un autre. `app_metadata` n'est pas modifiable par le membre.
 */
export async function compteDeLAcheteur(supabase: any, email: string, sessionId: string): Promise<any> {
  const existant = await compteParEmail(supabase, email)
  if (existant) return existant
  const { data, error } = await supabase.auth.admin.createUser({
    email, email_confirm: true, app_metadata: { cree_par_paiement: sessionId },
  })
  if (data?.user) return data.user
  // Le webhook et la page de retour arrivent en même temps : l'autre vient peut-être de le créer.
  const cree = await compteParEmail(supabase, email)
  if (cree) return cree
  throw new Error(`Création du compte impossible : ${error?.message ?? 'raison inconnue'}`)
}
