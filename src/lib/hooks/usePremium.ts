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
const MEMOIRE_CONNECTE = "lpcs.connecte";
const MEMOIRE_COURRIEL = "lpcs.courriel";

/**
 * Inscrit le niveau retenu, pour la mémoire du navigateur et pour l'habillage.
 *
 * L'attribut posé sur <html> est lu par la feuille de style : c'est lui qui donne
 * sa couleur au bouton « tableau de bord », dès le premier rendu grâce au petit
 * script du gabarit. Il ne décide d'aucun accès.
 */
function retenir(niveau: Tier, courriel?: string | null) {
  try {
    if (niveau === "free") localStorage.removeItem(MEMOIRE);
    else localStorage.setItem(MEMOIRE, niveau);
    localStorage.setItem(MEMOIRE_CONNECTE, "1");
    if (courriel) localStorage.setItem(MEMOIRE_COURRIEL, courriel);
  } catch { /* sans mémoire, tant pis */ }
  try {
    if (niveau === "free") delete document.documentElement.dataset.abonnement;
    else document.documentElement.dataset.abonnement = niveau;
    document.documentElement.dataset.connecte = "1";
  } catch { /* hors navigateur */ }
}

/**
 * Efface la mémoire. Réservé à une DÉCONNEXION CONFIRMÉE.
 *
 * Supabase restaure la session depuis le navigateur de façon asynchrone : à chaque
 * chargement de page, il existe un instant où l'utilisateur paraît déconnecté alors
 * qu'il ne l'est pas. Effacer à ce moment-là faisait retomber l'en-tête sur « Se
 * connecter » et « Premium » pendant une seconde — et, pire, vidait la mémoire pour
 * les visites suivantes.
 */
function oublier() {
  try {
    localStorage.removeItem(MEMOIRE);
    localStorage.removeItem(MEMOIRE_CONNECTE);
    localStorage.removeItem(MEMOIRE_COURRIEL);
  } catch { /* sans mémoire, tant pis */ }
  try {
    delete document.documentElement.dataset.abonnement;
    delete document.documentElement.dataset.connecte;
  } catch { /* hors navigateur */ }
}
function tierMemorise(): Tier | null {
  try {
    const v = localStorage.getItem(MEMOIRE);
    return v === "pro" || v === "elite" || v === "free" ? v : null;
  } catch { return null; }
}
const lire = (cle: string) => { try { return localStorage.getItem(cle); } catch { return null; } };

export function usePremium() {
  const [tier, setTier] = useState<Tier>("free");
  const [hint, setHint] = useState<Tier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  // Ce que la visite précédente savait de la session, pour dessiner l'en-tête avant
  // que Supabase n'ait fini de la restaurer.
  const [connecteMemorise, setConnecteMemorise] = useState(false);
  const [courrielMemorise, setCourrielMemorise] = useState<string | null>(null);

  // Lu après le premier rendu : `localStorage` n'existe pas côté serveur, et une
  // valeur initiale différente entre serveur et navigateur casserait l'hydratation.
  useEffect(() => {
    setHint(tierMemorise());
    setConnecteMemorise(lire(MEMOIRE_CONNECTE) === "1");
    setCourrielMemorise(lire(MEMOIRE_COURRIEL));
  }, []);

  useEffect(() => {
    /**
     * Détermine le niveau d'abonnement, et sort TOUJOURS de l'état de chargement.
     *
     * Deux corrections tiennent dans cette fonction :
     *
     *  — on lit la session déjà restaurée dans le navigateur (`getSession`) plutôt que
     *    de la faire revalider par le serveur (`getUser`). Le hook est monté dans
     *    l'en-tête de CHAQUE page : un aller-retour réseau y précédait le moindre
     *    rendu, ce qui expliquait la lenteur ressentie d'une page à l'autre ;
     *
     *  — tout est enveloppé, de sorte qu'une exception ne puisse plus laisser la page
     *    entre deux eaux. Sans cela, un appel en échec gelait `loading` à vrai : ni le
     *    contenu réservé ni l'invitation à s'abonner ne s'affichaient, et l'espace Pro
     *    restait vide sans le moindre message.
     *
     * La lecture du profil reste protégée par les règles de la base : c'est elle qui
     * décide, pas ce qui est lu ici.
     */
    async function checkPremium() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        if (!user) {
          // On ne touche pas à la mémoire ici : cet appel rend `null` aussi pendant la
          // restauration de session. Seul l'événement SIGNED_OUT fait foi.
          setTier("free");
          setHint("free");
          setUserId(null);
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
          setConnecteMemorise(true);
          setCourrielMemorise(user.email ?? null);
          retenir(niveau, user.email);
        }
      } catch (e) {
        console.warn("usePremium :", (e as Error).message);
      } finally {
        setLoading(false);
      }
    }

    checkPremium();

    // S'abonner aux changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id);
        checkPremium();
      } else if (_event === "SIGNED_OUT") {
        // Déconnexion explicite : là, on oublie pour de bon.
        setUserId(null);
        setTier("free");
        setHint("free");
        setConnecteMemorise(false);
        setCourrielMemorise(null);
        oublier();
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
    /**
     * true quand un niveau a été retenu d'une visite précédente. Permet d'afficher la
     * page tout de suite plutôt qu'un écran d'attente à chaque changement de page.
     * À l'habillage seulement : ne jamais ouvrir un accès sur cette base.
     */
    niveauMemorise: hint !== null,
    /** La visite précédente était connectée. Habillage seulement. */
    connecteMemorise,
    /** Adresse retenue, pour dessiner le bouton de compte avant la restauration. */
    courrielMemorise,
    /** Premium OU Pro — c'est ce que testent toutes les fonctionnalités premium historiques. */
    isPremium: tierAtLeast(tier, "elite"),
    /** Réservé aux outils professionnels (commissions, veille réseaux sociaux). */
    isPro: tier === "pro",
    loading,
    userId,
  };
}
