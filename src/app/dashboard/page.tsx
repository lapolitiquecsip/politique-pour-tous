"use client";

import { useEffect } from "react";
import { usePremium } from "@/lib/hooks/usePremium";
import EspacePersonnel from "@/components/dashboard/EspacePersonnel";

/**
 * Le tableau de bord.
 *
 * Pour un abonné Pro ou Premium, il se réduit aux réglages du compte : son espace
 * (alertes, votes, élus suivis, favoris… et les outils Pro) a pris la place de la page
 * d'offre, dont il n'a plus l'usage. Pour un compte classique, tout reste réuni ici.
 */
export default function DashboardPage() {
  const { isPremium, loading } = usePremium();
  // Liens anciens (e-mails, favoris) vers une rubrique du tableau de bord : pour un abonné,
  // elle vit désormais dans son espace (/premium), au même nom d'ancre.
  useEffect(() => {
    if (loading || !isPremium) return;
    const renvoyer = () => {
      const ancre = window.location.hash;
      if (/^#(preferences|alertes|parrainage|votes|suivis|profil|emails-pro)$/.test(ancre)) window.location.replace(`/premium/${ancre}`);
    };
    renvoyer();
    window.addEventListener("hashchange", renvoyer);
    return () => window.removeEventListener("hashchange", renvoyer);
  }, [loading, isPremium]);
  // Tant que le niveau n'est pas connu, on n'affiche rien plutôt qu'une page
  // complète qui se réduirait sous les yeux du lecteur une seconde plus tard.
  if (loading) return <EspacePersonnel mode="compte" />;
  // Premium et Pro : leur espace est sur /premium ; ici, le compte seulement.
  return <EspacePersonnel mode={isPremium ? "compte" : "tout"} />;
}
