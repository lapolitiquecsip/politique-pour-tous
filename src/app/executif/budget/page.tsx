"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Info, 
  Zap, 
  ArrowRight,
  Landmark,
  ShieldCheck,
  Scale,
  Crown
} from "lucide-react";
import Link from "next/link";
import { usePremium } from "@/lib/hooks/usePremium";
import { BUDGETS } from "../page"; // We can export this from the other page if needed, or redefine.

const BUDGET_METRICS = [
  { label: "Dépenses Totales", value: "540 Md€", sub: "Budget Général de l'État", icon: CircleDollarSign, color: "text-blue-600" },
  { label: "Part du PIB", value: "55.8 %", sub: "Dépenses Publiques Totales", icon: Landmark, color: "text-red-600" },
  { label: "Déficit Prévu", value: "3.4 %", sub: "Objectif de réduction", icon: TrendingDown, color: "text-amber-600" },
  { label: "Dette Publique", value: "112 %", sub: "Rapport au PIB", icon: ShieldCheck, color: "text-slate-600" },
];

const RECETTES = [
  { label: "TVA", amount: 115, desc: "Taxe sur la Valeur Ajoutée (Consommation)", color: "bg-blue-500" },
  { label: "Impôt sur le revenu", amount: 98, desc: "Impôt direct sur les revenus des ménages", color: "bg-red-500" },
  { label: "Impôt sur les sociétés", amount: 65, desc: "Impôt sur les bénéfices des entreprises", color: "bg-emerald-500" },
  { label: "TICPE", amount: 30, desc: "Taxe sur les produits énergétiques (Carburants)", color: "bg-amber-500" },
  { label: "Autres", amount: 232, desc: "Taxes diverses, amendes, dividendes de l'État", color: "bg-slate-300" },
];

const MISSIONS_DETAILED = [
  {
    title: "Charge de la dette",
    amount: "60.34 Md€",
    impact: "Critique",
    desc: "C'est le coût de l'argent emprunté. Avec la hausse des taux, ce poste est devenu l'un des plus lourds du budget. L'État paie ici les intérêts de ses dettes passées sans pour autant rembourser le capital.",
    color: "bg-orange-500"
  },
  {
    title: "Éducation Nationale",
    amount: "89.62 Md€",
    impact: "Prioritaire",
    desc: "Premier poste de dépense du budget général. Il couvre les salaires de plus d'un million d'agents et le fonctionnement de tout le système scolaire français.",
    color: "bg-blue-600"
  },
  {
    title: "Défense",
    amount: "66.48 Md€",
    impact: "Régalien",
    desc: "Le budget des armées est en forte croissance pour répondre aux enjeux géopolitiques mondiaux. Il finance la modernisation nucléaire et les nouveaux équipements militaires.",
    color: "bg-red-600"
  },
  {
    title: "Remboursements et dégrèvements",
    amount: "145.6 Md€",
    impact: "Mécanique",
    desc: "Techniquement le plus gros bloc, mais c'est un flux de 'retour'. L'État rend ici de l'argent aux contribuables et entreprises (crédits d'impôt, trop-perçus de TVA).",
    color: "bg-slate-400"
  }
];

export default function DetailedBudgetPage() {
  const { isPremium, loading } = usePremium();

  if (loading) return null;

  if (!isPremium) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="relative w-28 h-28 mx-auto mb-10">
            <div className="absolute inset-0 bg-amber-400 rounded-[2.5rem] rotate-6 opacity-20 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(251,191,36,0.4)] flex items-center justify-center transform hover:rotate-0 transition-transform duration-700">
              <div className="relative">
                <Zap size={48} className="text-slate-950" fill="currentColor" />
                <motion.div 
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-5 -right-5 bg-slate-950 text-amber-400 p-2 rounded-xl border border-amber-400/30 shadow-2xl flex items-center gap-1.5"
                >
                  <Crown size={12} fill="currentColor" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Premium</span>
                </motion.div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-staatliches text-white uppercase tracking-wider">Analyse Budgétaire Elite</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Accédez à l'analyse la plus précise du budget de l'État. 
            Découvrez où va chaque euro de vos impôts avec nos graphiques interactifs et nos décryptages d'experts.
          </p>
          <Link 
            href="/premium"
            className="inline-block px-12 py-5 bg-gradient-to-r from-amber-200 to-amber-500 text-slate-950 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-amber-900/40"
          >
            Débloquer l'accès Premium
          </Link>
          <div className="pt-8">
            <Link href="/executif" className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ArrowLeft size={14} /> Retour à la page Exécutif
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Link href="/executif" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-8">
            <ArrowLeft size={14} /> Retour à l'Exécutif
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Zap size={12} fill="currentColor" /> Analyse Premium Elite
              </div>
              <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
                La Loi de <span className="text-blue-600">Finances 2026</span>
              </h1>
              <p className="text-xl text-slate-500 font-medium italic">
                Décryptage intégral de la dépense publique et des ressources de l'État.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-950 text-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-900/20">
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Déficit Public</p>
                  <p className="text-3xl font-black text-amber-400">3.4% <span className="text-sm text-white/50">PIB</span></p>
               </div>
               <div className="w-px h-12 bg-white/10 mx-2" />
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dépense Totale</p>
                  <p className="text-3xl font-black text-white">540 <span className="text-sm text-white/50">Md€</span></p>
               </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 mt-16 space-y-16">
        
        {/* KEY METRICS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {BUDGET_METRICS.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 ${metric.color}`}>
                <metric.icon size={24} />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{metric.label}</h3>
              <p className="text-4xl font-black text-slate-900 leading-none mb-2">{metric.value}</p>
              <p className="text-xs text-slate-500 font-medium italic">{metric.sub}</p>
            </motion.div>
          ))}
        </section>

        {/* REVENUE ANALYSIS (WHERE MONEY COMES FROM) */}
        <section className="bg-white rounded-[3rem] border border-slate-200 p-8 md:p-16 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48" />
           
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <PieChart size={24} />
                   </div>
                   <h2 className="text-4xl font-staatliches uppercase tracking-wider text-slate-900">
                      Origine des <span className="text-blue-600">Recettes</span>
                   </h2>
                </div>
                
                <p className="text-lg text-slate-600 leading-relaxed font-medium italic">
                  Pour dépenser, l'État doit d'abord collecter. La TVA reste la source d'oxygène principale de la France, suivie par l'impôt sur le revenu.
                </p>

                <div className="space-y-6">
                   {RECETTES.map((item, i) => (
                     <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${item.color}`} />
                              <span className="text-sm font-bold text-slate-900">{item.label}</span>
                           </div>
                           <span className="text-sm font-black text-slate-900">{item.amount} Md€</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             whileInView={{ width: `${(item.amount / 232) * 100}%` }}
                             transition={{ duration: 1.5, delay: i * 0.1 }}
                             className={`h-full ${item.color} rounded-full`}
                           />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic pl-6">{item.desc}</p>
                     </div>
                   ))}
                </div>
              </div>

              <div className="relative aspect-square max-w-md mx-auto">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent rounded-full animate-pulse" />
                 <div className="absolute inset-8 border-[20px] border-slate-900 rounded-full flex flex-col items-center justify-center text-center p-8">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Fiscal Net</p>
                    <p className="text-5xl font-black text-slate-900 mb-2">540</p>
                    <p className="text-xl font-bold text-slate-400 uppercase">Milliards €</p>
                 </div>
              </div>
           </div>
        </section>

        {/* DETAILED MISSIONS FOCUS */}
        <section className="space-y-10">
           <div className="text-center max-w-2xl mx-auto space-y-4">
              <h2 className="text-4xl font-staatliches uppercase tracking-wider text-slate-900">
                 Zoom sur les <span className="text-red-600">Points de Vigilance</span>
              </h2>
              <p className="text-slate-500 font-medium italic">
                Pourquoi certains budgets pèsent-ils plus lourd que d'autres ? Analyse des piliers de la Loi de Finances.
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {MISSIONS_DETAILED.map((mission, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden group"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${mission.color}`} />
                  
                  <div className="flex justify-between items-start mb-8">
                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                       mission.impact === 'Critique' ? 'bg-red-100 text-red-600' : 
                       mission.impact === 'Prioritaire' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                     }`}>
                        Impact : {mission.impact}
                     </div>
                     <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{mission.amount}</p>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
                    {mission.title}
                  </h3>
                  
                  <p className="text-slate-500 leading-relaxed text-sm font-medium italic">
                    {mission.desc}
                  </p>

                  <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En savoir plus</span>
                     <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ArrowRight size={18} />
                     </div>
                  </div>
                </motion.div>
              ))}
           </div>
        </section>

        {/* SUMMARY CTA */}
        <section className="bg-slate-950 rounded-[3.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white rounded-full animate-[spin_20s_linear_infinite]" />
           </div>
           
           <div className="relative z-10 max-w-3xl mx-auto space-y-8">
              <h2 className="text-5xl md:text-7xl font-staatliches text-white uppercase tracking-tighter">
                Comprendre pour <span className="text-blue-500">Agir</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium italic leading-relaxed">
                Le budget est l'acte politique le plus important de l'année. Il détermine nos capacités de défense, la qualité de nos écoles et la pérennité de notre modèle social.
              </p>
              <div className="pt-8 flex flex-wrap items-center justify-center gap-6">
                 <button className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                   Télécharger le rapport complet (PDF)
                 </button>
                 <button className="px-10 py-5 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">
                   Comparer avec 2025
                 </button>
              </div>
           </div>
        </section>

      </div>
    </main>
  );
}
