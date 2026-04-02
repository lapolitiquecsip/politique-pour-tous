"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Star, RefreshCw as Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PremiumButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const handlePremiumClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Vérifier si l'utilisateur est connecté
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Veuillez vous connecter pour accéder au paiement");
        setLoading(false);
        return;
      }

      // 2. Appeler la Edge Function Supabase
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: { userId: user.id, email: user.email },
        }
      );

      if (fnError) {
        setError("Erreur lors de la création du paiement. Réessayez.");
        setLoading(false);
        return;
      }

      // 3. Rediriger vers Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Impossible de démarrer le paiement. Réessayez.");
        setLoading(false);
      }
    } catch (err) {
      setError("Une erreur inattendue est survenue.");
      setLoading(false);
    }
  };

  if (dismissed) return null;

  return (
    <>
      {/* Bouton flottant fixe — visible sur toutes les pages */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Message d'erreur */}
        <AnimatePresence>
          {error === "auth_required" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full right-0 mb-4 w-72 bg-red-500 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-start gap-3 border border-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">Authentification requise</p>
                <p className="text-xs opacity-90 mt-1 mb-2">Veuillez vous connecter pour accéder au paiement.</p>
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-extrabold hover:bg-red-50 transition-colors shadow-sm"
                >
                  Se connecter
                  <ArrowRight size={12} />
                </Link>
              </div>
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
              className="bg-red-500 text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-[280px] flex items-start gap-2"
            >
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Le bouton Premium */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.5, type: "spring", stiffness: 200 }}
        >
          <div className="relative group">
            {/* Bouton de fermeture (croix discrète) */}
            <button
              onClick={() => setDismissed(true)}
              className="absolute -top-2 -right-2 z-10 bg-slate-800 hover:bg-slate-700 text-white/60 hover:text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Masquer"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Bouton principal */}
            <button
              onClick={handlePremiumClick}
              disabled={loading}
              className="
                relative overflow-hidden
                flex items-center gap-3 px-6 py-4
                bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500
                hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400
                text-slate-900 font-bold text-[15px]
                rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.4)]
                hover:shadow-[0_8px_40px_rgba(245,158,11,0.6)]
                hover:-translate-y-1 active:translate-y-0
                transition-all duration-300
                disabled:opacity-70 disabled:cursor-wait
                group/btn
              "
            >
              {/* Effet de brillance animé */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" />

              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Star className="w-5 h-5 drop-shadow-sm" />
              )}

              <span className="relative">
                {loading ? "Redirection..." : "Devenir Premium"}
              </span>

              {!loading && (
                <span className="relative flex items-center gap-1 bg-slate-900/20 px-2.5 py-1 rounded-lg text-xs font-extrabold">
                  3€
                  <span className="text-[10px] font-medium opacity-80">/mois</span>
                </span>
              )}

              {!loading && (
                <Star className="w-4 h-4 opacity-60 animate-pulse" />
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
