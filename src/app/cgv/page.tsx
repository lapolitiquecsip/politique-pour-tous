"use client";

import { motion } from "framer-motion";
import { CreditCard, Sparkles } from "lucide-react";

export default function CGV() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header "Poster" Section */}
      <div className="relative bg-gradient-to-r from-amber-400 to-amber-600 py-24 md:py-32 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/5 border border-black/10 mb-8"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em]">Conditions de Vente Premium</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-9xl font-staatliches text-white leading-none uppercase italic mb-6">
            Conditions <span className="text-slate-950 font-sans tracking-tighter not-italic">De Vente</span>
          </h1>
          <p className="text-white/80 font-medium uppercase tracking-[0.2em] text-xs">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 max-w-4xl py-20 bg-slate-900 shadow-2xl -mt-12 rounded-[3.5rem] relative z-20 border border-white/5 mb-32">
        <div className="prose prose-invert prose-lg max-w-none space-y-12 text-slate-300 p-8 md:p-12">
          
          <section>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <CreditCard className="w-5 h-5" />
              </div>
              OBJET DES CONDITIONS DE VENTE
            </h2>
            <p className="leading-relaxed">
              Les présentes CGV s'appliquent sans restriction aux ventes de services et d’abonnements <strong>Premium</strong> conclus via le site par les Clients. La souscription d'un abonnement vaut acceptation sans réserve des CGV en vigueur au jour de la commande.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">
              PRIX ET PAIEMENT
            </h2>
            <p className="leading-relaxed">
              Les tarifs des abonnements sont indiqués sur le site en Euros et toutes taxes comprises (TTC). Le paiement est exigible immédiatement à la commande. 
            </p>
            <p className="mt-4 p-6 bg-white/5 rounded-2xl border border-white/10 font-mono text-sm">
              Sécurisation : Les transactions sont traitées par le prestataire de paiement <strong>Stripe</strong>. Aucune information bancaire n'est stockée sur nos serveurs.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">
              DROIT DE RÉTRACTATION
            </h2>
            <p className="leading-relaxed">
              Compte tenu de la nature du contenu numérique fourni dès la validation de l'abonnement et dont l'exécution commence avec l'accord préalable exprès de l'utilisateur, ce dernier renonce expressément à son droit de rétractation (Art. L221-28 du Code de la Consommation).
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">
              RÉSILIATION
            </h2>
            <p className="leading-relaxed">
              L'utilisateur peut résilier son abonnement à tout moment via son espace membre ou le portail de facturation Stripe. La résiliation prendra effet à l'issue de la période d'abonnement en cours.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
