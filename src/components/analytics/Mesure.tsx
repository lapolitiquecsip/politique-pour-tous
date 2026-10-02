"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/hooks/usePremium";
import {
  mesurerVue, mesurerAction, capterParrainage, rattacherParrainSiBesoin, definirNiveau,
} from "@/lib/mesure";

/**
 * Posé une fois dans le gabarit : compte les pages vues, repère les actions qui
 * comptent sans toucher aux composants (clics vers le paiement Stripe ou vers les
 * offres), capte les liens de parrainage et rattache le filleul à la connexion.
 */
export default function Mesure() {
  const chemin = usePathname();
  const { tier, loading, userId } = usePremium();

  useEffect(() => { if (!loading) definirNiveau(userId ? (tier ?? "free") : "anonyme"); }, [tier, loading, userId]);

  // Une page vue à chaque changement d'adresse.
  useEffect(() => {
    if (!chemin) return;
    mesurerVue(chemin);
    if (chemin.startsWith("/success")) mesurerAction("paiement_reussi", chemin);
  }, [chemin]);

  useEffect(() => {
    capterParrainage();
    void rattacherParrainSiBesoin();
    const { data } = supabase.auth.onAuthStateChange((evenement) => {
      if (evenement === "SIGNED_IN") void rattacherParrainSiBesoin();
    });

    // Les clics qui disent l'intérêt pour les offres, repérés à un seul endroit.
    const surClic = (e: MouseEvent) => {
      const lien = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!lien?.href) return;
      if (lien.href.includes("buy.stripe.com")) mesurerAction("clic_paiement");
      else if (/\/premium\/?($|[?#])/.test(lien.href) && !window.location.pathname.startsWith("/premium")) mesurerAction("clic_offres");
    };
    document.addEventListener("click", surClic, { capture: true });
    return () => { data.subscription.unsubscribe(); document.removeEventListener("click", surClic, { capture: true }); };
  }, []);

  return null;
}
