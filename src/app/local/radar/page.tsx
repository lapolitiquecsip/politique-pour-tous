"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, ArrowRight, Eye, Landmark, TrendingUp, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";

export default function RadarConcept() {
  const { userId, isPremium, loading } = usePremium();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isPremium) {
      router.replace("/local/radar/app");
    }
  }, [isPremium, loading, router]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* 1. Header Navigation */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Link href="/local" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest">
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
            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 text-amber-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-amber-500/20">
              <Eye size={40} />
            </div>

            <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tighter leading-none">
              Radar des <span className="text-amber-500 italic">Grands Travaux</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/60 font-medium italic leading-relaxed max-w-2xl">
              Suivez l'utilisation de l'argent public en temps réel. Ne soyez plus spectateur des chantiers, devenez un citoyen informé.
            </p>

            <div className="h-1.5 w-32 bg-amber-500 rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* 3. Value Propositions */}
      <section className="py-24 bg-white/5 border-y border-white/10">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl border border-white/10">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-2xl font-staatliches uppercase tracking-wide">Dérives Budgétaires</h3>
              <p className="text-white/40 leading-relaxed font-medium">Nous comparons les budgets annoncés lors des lancements de projets avec les coûts réels au fil des ans.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 shadow-xl border border-white/10">
                <Landmark size={24} />
              </div>
              <h3 className="text-2xl font-staatliches uppercase tracking-wide">Coulisses du Pouvoir</h3>
              <p className="text-white/40 leading-relaxed font-medium">Découvrez qui sont les entreprises attributaires des marchés et les décisions prises lors des conseils régionaux/départementaux.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 shadow-xl border border-white/10">
                <Building2 size={24} />
              </div>
              <h3 className="text-2xl font-staatliches uppercase tracking-wide">Impact Local</h3>
              <p className="text-white/40 leading-relaxed font-medium">Analyses d'experts sur l'impact environnemental et social des grands projets (Tramway, Stades, Éco-quartiers).</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pricing & CTA */}
      <section className="py-32 px-4">
        <div className="container mx-auto max-w-3xl text-center bg-white rounded-[3.5rem] p-12 md:p-20 text-slate-900 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10 space-y-10">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter leading-none">
                Passez au <span className="text-amber-600">Premium</span>
              </h2>
              <p className="text-slate-500 text-lg font-medium italic">
                Sachez enfin où va votre argent.
              </p>
            </div>

            <div className="inline-flex flex-col items-center gap-2">
              <span className="text-5xl font-black text-slate-900">2,99€<span className="text-xl text-slate-400">/mois</span></span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Offre Élite</p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link
                href={getPremiumUrl(userId)}
                className="w-full md:w-auto px-12 py-6 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-amber-500 transition-all text-xl flex items-center justify-center gap-4 group shadow-2xl shadow-slate-950/20"
              >
                Activer mon accès
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
            
            <p className="text-xs text-slate-400 font-medium">
              Accès immédiat au Radar et à l'intégralité du contenu exclusif.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
