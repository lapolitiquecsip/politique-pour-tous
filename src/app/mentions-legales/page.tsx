"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header "Poster" Section */}
      <div className="relative bg-slate-950 py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent scale-150" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm"
          >
            <Landmark className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Conformité Juridique</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-9xl font-staatliches text-white leading-none uppercase italic mb-6">
            Mentions <span className="text-red-600 font-sans tracking-tighter not-italic">Légales</span>
          </h1>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 max-w-4xl py-20">
        <div className="prose prose-slate prose-lg max-w-none space-y-12 text-slate-700">
          
          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-6 border-l-4 border-red-600 pl-6">
              1. Éditeur du site
            </h2>
            <p className="leading-relaxed font-medium">
              Le site <strong>La Politique, C’est Simple</strong> est édité par :
            </p>
            <ul className="list-none space-y-2 mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <li><strong>Raison sociale :</strong> [NOM DE VOTRE ENTREPRISE / VOTRE NOM]</li>
              <li><strong>Forme juridique :</strong> [EX: SAS, Auto-entrepreneur]</li>
              <li><strong>Siège social :</strong> [VOTRE ADRESSE]</li>
              <li><strong>Numéro SIREN :</strong> [VOTRE SIREN]</li>
              <li><strong>Directeur de la publication :</strong> [NOM DU DIRECTEUR]</li>
              <li><strong>Contact email :</strong> support@lapolitiquesimple.fr</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-6 border-l-4 border-red-600 pl-6">
              2. Hébergement
            </h2>
            <p className="leading-relaxed">
              Le site est hébergé par :
            </p>
            <ul className="list-none space-y-2 mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <li><strong>Hébergeur :</strong> Vercel Inc.</li>
              <li><strong>Adresse :</strong> 340 S Lemon Ave #4133 Walnut, CA 91789, USA</li>
              <li><strong>Site web :</strong> https://vercel.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-6 border-l-4 border-red-600 pl-6">
              3. Propriété Intellectuelle
            </h2>
            <p className="leading-relaxed">
              L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
            </p>
            <p className="mt-4 italic text-slate-500">
              La reproduction de tout ou partie de ce site sur un support électronique quel qu'il soit est formellement interdite sauf autorisation expresse du directeur de la publication.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-6 border-l-4 border-red-600 pl-6">
              4. Données Personnelles et Cookies
            </h2>
            <p className="leading-relaxed">
              Conformément à la loi « Informatique et Libertés » du 6 janvier 1978 modifiée et au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition au traitement de vos données personnelles.
            </p>
            <p className="mt-4">
              Nous utilisons des cookies essentiels pour le fonctionnement du site et la gestion de vos abonnements via Stripe. Aucun cookie publicitaire tiers n'est utilisé sans votre consentement préalable.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
