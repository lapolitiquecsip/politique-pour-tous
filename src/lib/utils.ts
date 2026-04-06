import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { STRIPE_LINKS } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPremiumUrl(
  userId?: string | null, 
  plan: 'student' | 'elite' | 'family' = 'elite', 
  cycle: 'monthly' | 'annually' = 'monthly'
) {
  try {
    const baseUrl = STRIPE_LINKS[plan][cycle];
    const url = new URL(baseUrl);
    if (userId) {
      url.searchParams.set("client_reference_id", userId);
    }
    return url.toString();
  } catch (e) {
    return STRIPE_LINKS.elite.monthly;
  }
}
