"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Star, RefreshCw as Loader2, X, AlertCircle, ArrowRight, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AwardBadge } from "@/components/ui/award-badge";
import { usePathname } from "next/navigation";
import { usePremium } from "@/lib/hooks/usePremium";
import { SALES_OPEN } from "@/lib/constants";
import { getPremiumUrl } from "@/lib/utils";

export default function PremiumButton() {
  const pathname = usePathname();
  const { isPremium, loading: statusLoading, userId } = usePremium();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hasOtherPremium, setHasOtherPremium] = useState(false);
  const [enRetrait, setEnRetrait] = useState(false);

  // Défilement vers le bas : le bouton se retire ; vers le haut : il revient. Sur le premier
  // écran de l'accueil, il reste caché : il recouvrait la carte « Mes élus locaux », et
  // l'offre y est déjà expliquée en une ligne sous les quatre actions.
  useEffect(() => {
    const premierEcran = (y: number) => pathname === "/" && y < 520;
    let dernier = window.scrollY;
    setEnRetrait(premierEcran(dernier));
    const surDefilement = () => {
      const y = window.scrollY;
      if (Math.abs(y - dernier) < 8) return;
      setEnRetrait(premierEcran(y) || (y > dernier && y > 240));
      dernier = y;
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, [pathname]);

  useEffect(() => {
    const checkPremiumElements = () => {
      // Find all anchors, buttons, or divs that mention premium or elite,
      // excluding our floating button container
      const elements = Array.from(document.querySelectorAll('a, button, [class*="premium"], [class*="Premium"], [class*="teaser"]'));
      
      const found = elements.some((el) => {
        // Exclude our own floating button container
        if (el.closest('.floating-premium-container')) {
          return false;
        }
        
        const text = (el.textContent || '').toLowerCase();
        const href = el.getAttribute('href') || '';
        
        // Incitations to premium
        return href.includes('/premium') || 
               text.includes('devenir premium') || 
               text.includes('passer au premium') || 
               text.includes('découvrir l\'offre elite') ||
               text.includes('devenir premium elite') ||
               text.includes('membres premium') ||
               text.includes('accès premium') ||
               text.includes('débloquer le sénat');
      });
      
      setHasOtherPremium(found);
    };

    // Run check initially
    checkPremiumElements();

    // Create a MutationObserver to listen for DOM additions/toggles/navigation changes
    const observer = new MutationObserver(checkPremiumElements);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    return () => observer.disconnect();
  }, [pathname]);

  const handlePremiumClick = async () => {
    // Vente fermée : on envoie sur la page des offres plutôt que vers un paiement
    // fictif, où n'importe qui obtiendrait un abonnement gratuit.
    if (!SALES_OPEN) {
      window.location.href = "/premium";
      return;
    }

    if (!userId) {
      setError("auth_required");
      return;
    }

    setLoading(true);

    // Jamais de paiement direct : la page des offres recueille d'abord l'accord sur les
    // CGV et la demande d'accès immédiat (C. conso. L221-25).
    window.location.href = "/premium#offres";
  };

  // Ne pas afficher si :
  // 1. Déjà Premium
  // 2. Sur la page /premium ou une page de loi
  // 3. Masqué manuellement
  // 4. Chargement du statut en cours
  // 5. Un autre bouton premium est déjà visible sur la page (sauf sur la page d'accueil '/')
  const shouldHideDueToOtherPremium = hasOtherPremium && pathname !== "/";
  if (isPremium || statusLoading || dismissed || shouldHideDueToOtherPremium || pathname === "/premium" || pathname.startsWith("/lois/")) return null;

  return (
    <>
      {/* Bouton flottant. `flottant` : effacé quand une fenêtre est ouverte (globals.css).
          Il s'écarte aussi pendant qu'on fait défiler vers le bas — c'est là qu'il masquait
          les liens « Lire » et « Détails » des cartes — et revient dès qu'on remonte. */}
      <div className={`flottant fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 sm:right-6 z-50 flex flex-col items-end gap-3 floating-premium-container transition-all duration-300 ${enRetrait ? "pointer-events-none translate-y-24 opacity-0" : ""}`}>
        {/* Message d'erreur */}
        <AnimatePresence>
          {error === "auth_required" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full right-0 mb-4 w-72 bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-start gap-3 border border-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />{" "}
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">Authentification requise</p>{" "}
                <p className="text-xs opacity-90 mt-1 mb-2">Veuillez vous connecter pour accéder au paiement.</p>{" "}
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card text-red-700 dark:text-red-400 rounded-lg text-xs font-extrabold hover:bg-red-50 transition-colors shadow-sm"
                >
                  Se connecter{" "}
                  <ArrowRight size={12} />
                </Link>
              </div>{" "}
              <button
                onClick={() => setError(null)}
                className="text-white/70 hover:text-white flex-shrink-0"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
          {error && error !== "auth_required" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-[280px] flex items-start gap-2"
            >
              <span>{error}</span>{" "}
              <button
                onClick={() => setError(null)}
                className="shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>{" "}

        {/* Le bouton Premium */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.5, type: "spring", stiffness: 200 }}
        >
          <div className="relative group">
            {/* Bouton de fermeture (croix discrète) */}
            {/* Sans survol possible (écran tactile), la croix reste visible : sinon on ne
                pouvait jamais masquer le bouton sur téléphone. */}
            <button
              onClick={() => setDismissed(true)}
              className="absolute -top-2 -right-2 z-10 bg-slate-800 hover:bg-slate-700 text-white/60 hover:text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all duration-200"
              title="Masquer"
              aria-label="Masquer le bouton Premium"
            >
              <X className="w-3 h-3" />
            </button>{" "}

            {/* Mobile : pastille compacte (prend beaucoup moins de place). */}
            <button
              onClick={handlePremiumClick}
              aria-label="Découvrir l'offre Premium (ce qui est gratuit, ce qui est payant)"
              className="sm:hidden flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 ring-2 ring-white/60 dark:ring-slate-900 transition-transform active:scale-95"
            >
              <Crown className="h-5 w-5" />
            </button>{" "}

            {/* Écran large : badge complet. */}
            <div className="hidden sm:block">
              <AwardBadge
                titleText={loading ? "Redirection..." : SALES_OPEN ? "Devenir Premium" : "Découvrir Premium"}
                subtitleText="Abonnement Citoyen"
                onClick={handlePremiumClick}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
