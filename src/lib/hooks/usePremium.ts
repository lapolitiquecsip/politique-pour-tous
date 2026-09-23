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
/**
 * Dernier niveau connu, gardé d'une visite à l'autre.
 *
 * Il ne sert QU'À L'HABILLAGE, jamais à ouvrir une porte : le temps que Supabase
 * réponde, le bouton d'en-tête restait gris puis virait à l'or ou au violet, ce qui
 * se voyait à chaque page. Les réserves d'accès, elles, continuent d'attendre la
 * vérification (`loading`), sans quoi une valeur périmée laisserait entrevoir du
 * contenu Pro à qui n'y a pas droit.
 */
const MEMOIRE = "lpcs.tier";
function tierMemorise(): Tier | null {
  try {
    const v = localStorage.getItem(MEMOIRE);
    return v === "pro" || v === "elite" || v === "free" ? v : null;
  } catch { return null; }
}

export function usePremium() {
  const [tier, setTier] = useState<Tier>("free");
  const [hint, setHint] = useState<Tier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Lu après le premier rendu : `localStorage` n'existe pas côté serveur, et une
  // valeur initiale différente entre serveur et navigateur casserait l'hydratation.
  useEffect(() => { setHint(tierMemorise()); }, []);

  useEffect(() => {
    async function checkPremium() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setTier("free");
        setHint("free");
        try { localStorage.removeItem(MEMOIRE); } catch { /* sans mémoire, tant pis */ }
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
        const niveau: Tier = raw === "pro" ? "pro"
          : (raw === "elite" || res.data?.is_premium) ? "elite"
          : "free";
        setTier(niveau);
        setHint(niveau);
        try { localStorage.setItem(MEMOIRE, niveau); } catch { /* sans mémoire, tant pis */ }
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
        setHint("free");
        try { localStorage.removeItem(MEMOIRE); } catch { /* sans mémoire, tant pis */ }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    tier,
    /**
     * Niveau à utiliser pour L'HABILLAGE seulement : le niveau vérifié dès qu'il est
     * connu, sinon celui de la dernière visite. Ne jamais s'en servir pour décider
     * d'un accès.
     */
    tierAffiche: loading ? (hint ?? tier) : tier,
    /** Premium OU Pro — c'est ce que testent toutes les fonctionnalités premium historiques. */
    isPremium: tierAtLeast(tier, "elite"),
    /** Réservé aux outils professionnels (commissions, veille réseaux sociaux). */
    isPro: tier === "pro",
    loading,
    userId,
  };
}
