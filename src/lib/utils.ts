import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { STRIPE_CHECKOUT_URL } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPremiumUrl(userId?: string | null) {
  try {
    const url = new URL(STRIPE_CHECKOUT_URL);
    if (userId) {
      url.searchParams.set("client_reference_id", userId);
    }
    return url.toString();
  } catch (e) {
    return STRIPE_CHECKOUT_URL;
  }
}
