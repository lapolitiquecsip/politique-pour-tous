"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/hooks/usePremium";
import {
  mesurerVue, mesurerAction, capterParrainage, accepterParrainage, rattacherParrainSiBesoin, definirNiveau,
} from "@/lib/mesure";

/**
 * Posé une fois dans le gabarit : compte les pages vues, repère les actions qui
 * comptent sans toucher aux composants (clics vers le paiement Stripe ou vers les
 * offres), capte les liens de parrainage (avec l'accord du visiteur) et rattache le
 * filleul à la connexion.
 */
export default function Mesure() {
  const chemin = usePathname();
  const { tier, loading, userId } = usePremium();
  // Code de parrainage relevé dans l'adresse, en attente de l'accord du visiteur.
  const [parrainage, setParrainage] = useState<string | null>(null);

  useEffect(() => { if (!loading) definirNiveau(userId ? (tier ?? "free") : "anonyme"); }, [tier, loading, userId]);

  // Une page vue à chaque changement d'adresse.
  useEffect(() => {
    // L'administration n'est pas le site : ses pages fausseraient ce qui intéresse les visiteurs.
    if (!chemin || chemin.startsWith("/admin")) return;
    // Le code de parrainage d'abord : la première page vue doit déjà le porter.
    const code = capterParrainage();
    if (code) setParrainage(code);
    mesurerVue(chemin);
    if (chemin.startsWith("/success")) mesurerAction("paiement_reussi", chemin);
  }, [chemin]);

  useEffect(() => {
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

  if (!parrainage) return null;
  return (
    <div role="dialog" aria-label="Lien de parrainage"
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-lg rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:bottom-5">
      <p className="leading-snug">
        Vous arrivez par le lien de parrainage d&apos;un membre. Le site peut s&apos;en souvenir dans votre navigateur pendant
        90 jours, pour le remercier si vous vous abonnez. Cela ne change rien à votre prix.{" "}
        <a href="/confidentialite#cookies" className="underline">En savoir plus</a>
      </p>{" "}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => setParrainage(null)}
          className="rounded-full bg-muted px-4 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground">Non merci</button>{" "}
        <button type="button" onClick={() => { accepterParrainage(parrainage); setParrainage(null); }}
          className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700">D&apos;accord</button>
      </div>
    </div>
  );
}
