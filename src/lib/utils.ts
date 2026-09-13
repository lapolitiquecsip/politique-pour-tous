import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { STRIPE_LINKS } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPremiumUrl(
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
