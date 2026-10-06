import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { STRIPE_LINKS } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Lien « devenir membre » partout sur le site : la page des offres, jamais le paiement
 * direct — l'accord sur les CGV et la demande d'accès immédiat s'y recueillent d'abord
 * (C. conso. L221-25). Seul ce récapitulatif appelle lienPaiementStripe.
 */
export function getPremiumUrl(_userId?: string | null, _plan?: string, _cycle?: string) {
  return "/premium#offres";
}

export function lienPaiementStripe(
  userId?: string | null, 
  plan: 'student' | 'elite' | 'pro' | 'institution' = 'elite', 
  cycle: 'monthly' | 'annually' = 'monthly'
) {
  try {
    const links = STRIPE_LINKS[plan];
    // Toutes les formules n'ont pas d'offre annuelle (le Premium est mensuel uniquement) :
    // on retombe sur le mensuel plutôt que de fabriquer une URL invalide.
    const baseUrl = (cycle === 'annually' ? links.annually : links.monthly) ?? links.monthly;
    const url = new URL(baseUrl);
    if (userId) {
      url.searchParams.set("client_reference_id", userId);
    }
    return url.toString();
  } catch (e) {
    return STRIPE_LINKS.elite.monthly;
  }
}
