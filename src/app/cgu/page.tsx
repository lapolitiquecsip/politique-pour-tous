"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function CGU() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header "Poster" Section */}
      <div className="relative bg-white py-24 md:py-32 overflow-hidden border-b border-slate-200">
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 mb-8"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Protection de l'Utilisateur</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-9xl font-staatliches text-slate-900 leading-none uppercase italic mb-6">
            Conditions <span className="text-blue-600 font-sans tracking-tighter not-italic">D'Utilisation</span>
          </h1>
          <p className="text-slate-500 font-medium uppercase tracking-[0.2em] text-xs">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 max-w-4xl py-20 bg-white shadow-2xl -mt-12 rounded-[3.5rem] relative z-20 border border-slate-200 mb-32">
        <div className="prose prose-slate prose-lg max-w-none space-y-12 text-slate-700 p-8 md:p-12">
          
          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-8">
              ARTICLE 1 : OBJET
            </h2>
            <p className="leading-relaxed">
              Les présentes Conditions Générales d’Utilisation (CGU) déterminent les règles d’accès au site <strong>La Politique, C’est Simple</strong> et ses conditions d’utilisation. En accédant au site, l’utilisateur accepte sans réserve l’intégralité des présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-8">
              ARTICLE 2 : ACCÈS AU SITE ET SERVICES
            </h2>
            <p className="leading-relaxed">
              Le site est accessible gratuitement à tout utilisateur disposant d'un accès à internet. Tous les coûts afférents à l'accès, qu'il s'agisse de frais matériels, ou d'accès à internet sont exclusivement à la charge de l'utilisateur.
            </p>
            <p className="mt-4">
              Certaines fonctionnalités (analyses expertes, dossiers complets) sont réservées aux membres ayant souscrit à l'offre <strong>Premium</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-8">
              ARTICLE 3 : RESPONSABILITÉ DE L'ÉDITEUR
            </h2>
            <p className="leading-relaxed">
              Les informations diffusées sur le site proviennent de sources fiables. Toutefois, l'éditeur ne peut garantir l'exactitude des données transmises, notamment les calendriers législatifs sujets à modification rapide par l'Assemblée Nationale ou le Sénat. 
            </p>
            <p className="mt-4 italic">
              Le contenu est fourni à titre informatif et éducatif uniquement et ne saurait constituer un conseil juridique ou officiel.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-8">
              ARTICLE 4 : PROPRIÉTÉ INTELLECTUELLE
            </h2>
            <p className="leading-relaxed">
              Les marques, logos, visuels et le design "Poster Impact" sont la propriété exclusive de l'éditeur. Toute reproduction totale ou partielle de ces éléments sans autorisation écrite préalable est constitutive de contrefaçon.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
