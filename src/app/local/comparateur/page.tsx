"use client";

import { motion } from "framer-motion";
import { Map, ArrowRight, ShieldCheck, Zap, Globe, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";

export default function ComparateurConcept() {
  const { userId } = usePremium();

  return (
    <main className="min-h-screen bg-white">
      {/* 1. Header Navigation */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Link href="/local" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest">
          <ChevronLeft size={16} /> Retour au portail local
        </Link>
      </div>

      {/* 2. Hero Section */}
      <section className="pt-12 pb-24 px-4 overflow-hidden">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8"
          >
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-amber-500/20">
              <Map size={40} />
            </div>

            <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tighter leading-none">
              Le Comparateur <span className="text-amber-500 italic">Territorial</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-500 font-medium italic leading-relaxed max-w-2xl">
              Comparez deux <strong>Communes</strong>, deux <strong>Départements</strong> ou deux <strong>Régions</strong> entre eux pour comprendre les différences de gestion et de qualité de vie.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
               {["Villes vs Villes", "Dépts vs Dépts", "Régions vs Régions"].map((text) => (
                 <div key={text} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                   {text}
                 </div>
               ))}
            </div>

            <div className="h-1.5 w-32 bg-amber-500 rounded-full mt-4" />
          </motion.div>
        </div>
      </section>

      {/* 3. Value Propositions */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-xl border border-slate-100">
                <Globe size={24} />
              </div>
              <h3 className="text-2xl font-staatliches uppercase tracking-wide text-slate-900">Analyse Multicritères</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Comparez deux zones sur la sécurité, le taux de chômage, l'offre de soins et la performance des écoles locales.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-xl border border-slate-100">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl font-staatliches uppercase tracking-wide text-slate-900">Fiscalité Décryptée</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Visualisez l'évolution de la taxe foncière et des dépenses publiques pour comprendre la gestion de votre commune.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl border border-slate-100">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-2xl font-staatliches uppercase tracking-wide text-slate-900">Données Certifiées</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Accédez à des données officielles (INSEE, Ministères) traitées et mises en forme pour être compréhensibles par tous.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pricing & CTA */}
      <section className="py-32 px-4">
        <div className="container mx-auto max-w-3xl text-center bg-slate-900 rounded-[3.5rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10 space-y-10">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter leading-none">
                Rejoignez le <span className="text-amber-400">Premium</span>
              </h2>
              <p className="text-white/60 text-lg font-medium italic">
                Ne laissez plus le hasard décider de votre cadre de vie.
              </p>
            </div>

            <div className="inline-flex flex-col items-center gap-2">
              <span className="text-5xl font-black text-white">2,99€<span className="text-xl text-white/40">/mois</span></span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Sans engagement</p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link
                href={getPremiumUrl(userId)}
                className="w-full md:w-auto px-12 py-6 bg-white text-slate-900 font-black rounded-[2rem] hover:bg-amber-400 transition-all text-xl flex items-center justify-center gap-4 group shadow-2xl shadow-white/10"
              >
                Activer mon accès
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
            
            <p className="text-xs text-white/30 font-medium">
              Accès immédiat au comparateur et à tous les outils exclusifs de la plateforme.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
