"use client";

import { useEffect, useRef, useState } from "react";
import AccordAchat from "@/components/premium/AccordAchat";
import { usePremium } from "@/lib/hooks/usePremium";
import { PLANS, SALES_OPEN } from "@/lib/constants";
import { lienPaiementStripe } from "@/lib/utils";
import { mesurerAction, mesurerPuisPartir } from "@/lib/mesure";
import { EVENEMENT_ESSAI, lienVersOffres } from "@/lib/essai-premium";

/**
 * La fenêtre « Essai gratuit Premium », une pour tout le site (voir src/lib/essai-premium.ts).
 *
 * Tout bouton qui mène à l'abonnement Premium l'ouvre au lieu de la page des offres : un clic sur un
 * lien « /premium » est intercepté ici, en phase de capture, avant que Next ne change de page.
 * Un membre déjà abonné, la vente fermée, ou un lien de l'offre Pro (data-offre-lien="pro") :
 * rien n'est intercepté, le lien fait ce qu'il faisait.
 */
export default function EssaiPremium() {
  const { userId, isPremium, loading } = usePremium();
  const [ouverte, setOuverte] = useState(false);
  const actif = SALES_OPEN && !loading && !isPremium;
  const actifRef = useRef(actif);
  actifRef.current = actif;

  useEffect(() => {
    const ouvrir = (origine: string) => {
      void mesurerAction("achat_choix_elite");
      void mesurerAction(`essai_premium_${origine}`);
      setOuverte(true);
    };
    const clic = (e: MouseEvent) => {
      if (!actifRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      // data-offre-lien : lien qui gère lui-même son clic ou mène ailleurs ; data-offre="pro" : encart de l'offre Pro.
      if (!a || a.target === "_blank" || a.closest('[data-offre-lien], [data-offre="pro"]') || !lienVersOffres(a.href)) return;
      e.preventDefault();
      e.stopPropagation();
      ouvrir("lien");
    };
    const appel = () => {
      // Abonné ou vente fermée : la redirection demandée par le code a lieu normalement.
      if (actifRef.current) ouvrir("code");
      else window.location.href = "/premium";
    };
    document.addEventListener("click", clic, true);
    window.addEventListener(EVENEMENT_ESSAI, appel);
    return () => { document.removeEventListener("click", clic, true); window.removeEventListener(EVENEMENT_ESSAI, appel); };
  }, []);

  if (!ouverte) return null;
  return (
    <AccordAchat cle="elite" offre={PLANS.elite.name} prix={`${PLANS.elite.monthly.toFixed(2).replace(".", ",")} €`} periode="mois" userId={userId}
      onFermer={() => setOuverte(false)}
      onContinuer={() => { void mesurerPuisPartir("clic_paiement", lienPaiementStripe(userId, "elite", "monthly")); }} />
  );
}
