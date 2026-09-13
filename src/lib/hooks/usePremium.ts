"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { tierAtLeast, type Tier } from "@/lib/constants";

/**
 * Statut d'abonnement de l'utilisateur courant.
 *
 * Trois niveaux : « free », « elite » (3,99 €) et « pro » (24,99 €).
 * Le niveau est lu dans profiles.subscription_tier ; si la colonne n'existe pas
 * encore (migration non appliquée), on retombe sur l'ancien booléen is_premium,
 * qui vaut alors « elite ». Aucune page ne casse pendant la migration.
 */
export function usePremium() {
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkPremium() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setTier("free");
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Tentative avec la colonne subscription_tier…
      type Row = { is_premium: boolean | null; subscription_tier?: string | null };
      let res: { data: Row | null; error: { message: string } | null } = await supabase
        .from("profiles")
        .select("is_premium, subscription_tier")
        .eq("id", user.id)
        .single();

      // …repli si la colonne n'est pas encore en base.
      if (res.error) {
        res = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", user.id)
          .single();
      }

      if (res.error) {
        console.warn("Erreur usePremium:", res.error.message);
        setTier("free");
      } else {
        const raw = String(res.data?.subscription_tier || "").toLowerCase();
        if (raw === "pro") setTier("pro");
        else if (raw === "elite" || res.data?.is_premium) setTier("elite");
        else setTier("free");
      }

      setLoading(false);
    }

    checkPremium();

    // S'abonner aux changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id);
        checkPremium();
      } else {
        setUserId(null);
        setTier("free");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    tier,
    /** Elite OU Pro — c'est ce que testent toutes les fonctionnalités premium historiques. */
    isPremium: tierAtLeast(tier, "elite"),
    /** Réservé aux outils professionnels (commissions, veille réseaux sociaux). */
    isPro: tier === "pro",
    loading,
    userId,
  };
}
