"use client";

import { usePremium } from "@/lib/hooks/usePremium";
import EspacePersonnel from "@/components/dashboard/EspacePersonnel";

/**
 * Le tableau de bord.
 *
 * Pour un abonné Pro, il se réduit aux réglages du compte : son espace de travail
 * — alertes, commissions, Journal officiel, votes, élus suivis — a pris la place de
 * la page d'offre, dont il n'a plus l'usage. Pour tous les autres, les deux restent
 * réunis ici.
 */
export default function DashboardPage() {
  const { isPro, loading } = usePremium();
  // Tant que le niveau n'est pas connu, on n'affiche rien plutôt qu'une page
  // complète qui se réduirait sous les yeux du lecteur une seconde plus tard.
  if (loading) return <EspacePersonnel mode="compte" />;
  return <EspacePersonnel mode={isPro ? "compte" : "tout"} />;
}
