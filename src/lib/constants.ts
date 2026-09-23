/**
 * Offres d'abonnement et liens de paiement Stripe.
 *
 * Deux formules sont commercialisées :
 *  - « elite » (3,99 €/mois) : la formule citoyenne, AFFICHÉE SOUS LE NOM « Premium ».
 *    La clé reste « elite » : elle est gravée dans les liens Stripe et dans
 *    profiles.subscription_tier, la renommer casserait les abonnements existants.
 *    MENSUEL UNIQUEMENT — pas d'engagement annuel sur cette formule.
 *  - « pro »   (24,99 €/mois ou 239 €/an) : la formule des professionnels de la politique
 *    (collaborateurs parlementaires, affaires publiques, entreprises, presse).
 *    Elle contient TOUT le Premium, plus les outils de veille : suivi des commissions
 *    parlementaires (Assemblée + Sénat) et suivi des dynamiques réseaux sociaux des
 *    candidats à la présidentielle.
 *
 * ⚠️ Ces liens sont en MODE TEST (préfixe « test_ ») : aucun paiement réel n'est encaissé.
 * Pour encaisser, recréer les liens en mode Live et remplacer les URL ci-dessous.
 *
 * « student » et « institution » sont des reliquats non commercialisés : ils sont
 * conservés parce que getPremiumUrl() accepte encore ces clés.
 */
/**
 * Portail client Stripe : l'abonné y change de formule, met à jour sa carte, télécharge
 * ses factures ou résilie, sans que nous ayons à coder quoi que ce soit.
 *
 * À créer une fois dans Stripe : Réglages → Facturation → Portail client → activer,
 * puis copier le lien fourni (https://billing.stripe.com/p/login/…) ci-dessous.
 * Tant que la chaîne est vide, l'interface propose d'écrire à l'assistance plutôt que
 * d'envoyer l'abonné sur un lien mort.
 */
export const STRIPE_PORTAL_URL = "";

/** Adresse de repli, quand le portail n'est pas encore configuré. */
export const CONTACT_EMAIL = "contact@lapolitiquecestsimple.fr";

export const STRIPE_LINKS: Record<string, { monthly: string; annually?: string }> = {
  student: {
    monthly: "https://buy.stripe.com/test_student_monthly", // 1.99€
    annually: "https://buy.stripe.com/test_student_annually" // 19€
  },
  elite: {
    // Pas de clé « annually » : c'est ce qui retire l'option annuelle de cette formule.
    monthly: "https://buy.stripe.com/test_dRmaEWfLW6443jdeOofMA02", // 3,99 €/mois
  },
  pro: {
    monthly: "https://buy.stripe.com/test_fZu4gy7fqdww1b55dOfMA00", // 24,99 €/mois
    annually: "https://buy.stripe.com/test_6oU7sKfLW5003jd6hSfMA01" // 239 €/an
  },
  institution: {
    monthly: "https://buy.stripe.com/test_institution_monthly", // 7.99€
    annually: "https://buy.stripe.com/test_institution_annually" // 77€
  }
};

/**
 * La vente est-elle ouverte ?
 *
 * `false` tant que les liens Stripe ci-dessus sont en mode TEST : les boutons d'achat
 * affichent alors « Bientôt disponible » au lieu d'envoyer vers un paiement fictif, où
 * n'importe quel visiteur obtiendrait un abonnement gratuit avec la carte 4242…
 *
 * À passer à `true` le jour où les liens sont recréés en mode Live — c'est le seul
 * interrupteur à actionner, tout le reste du parcours est déjà en place.
 */
export const SALES_OPEN = false;

/** Niveaux d'accès, du plus faible au plus fort. L'ordre sert aux comparaisons. */
export const TIER_ORDER = ["free", "elite", "pro"] as const;
export type Tier = (typeof TIER_ORDER)[number];

/** Vrai si `tier` donne accès à une fonctionnalité qui exige `required`. */
export function tierAtLeast(tier: Tier, required: Tier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required);
}

/**
 * Descriptif des deux offres affichées sur /premium.
 *
 * La LISTE DES FONCTIONNALITÉS ne vit pas ici : les cartes d'offre affichent
 * directement FEATURES et PRO_FEATURES (src/app/premium/page.tsx), qui portent aussi
 * l'icône et le lien vers la vraie page. Une seconde liste de libellés ici serait une
 * deuxième source de vérité, qu'on oublierait de mettre à jour.
 */
export const PLANS = {
  elite: {
    key: "elite" as const,
    name: "Premium",
    tagline: "Pour tous les citoyens qui veulent comprendre en détail.",
    monthly: 3.99,
    /** null = formule mensuelle uniquement ; la carte n'affiche alors aucune bascule. */
    annually: null,
    audience: "Citoyens",
  },
  pro: {
    key: "pro" as const,
    name: "Pro",
    tagline: "Pour les professionnels de la politique et les entreprises.",
    monthly: 24.99,
    annually: 239,
  },
};
