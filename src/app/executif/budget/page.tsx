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
import { BUDGETS } from "../page";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const COMPARISON_DATA = [
  { label: "Enseignement scolaire", val2025: 65.62, val2026: 66.01, trend: "up" },
  { label: "Recherche et ens. sup.", val2025: 31.55, val2026: 32.12, trend: "up" },
  { label: "Défense", val2025: 50.45, val2026: 57.10, trend: "up" },
  { label: "Engagements financiers (Dette)", val2025: 56.40, val2026: 59.34, trend: "up" },
  { label: "Justice", val2025: 10.45, val2026: 11.20, trend: "up" },
  { label: "Sécurités", val2025: 24.18, val2026: 24.85, trend: "up" },
  { label: "Solidarité & Insertion", val2025: 30.68, val2026: 31.45, trend: "up" },
  { label: "Écologie & Mobilité", val2025: 27.25, val2026: 27.80, trend: "up" },
  { label: "Travail et emploi", val2025: 19.82, val2026: 19.10, trend: "down" },
  { label: "Cohésion des territoires", val2025: 23.10, val2026: 22.45, trend: "down" },
  { label: "Investir pour la France de 2030", val2025: 5.85, val2026: 6.20, trend: "up" },
  { label: "Relations avec les coll. terr.", val2025: 4.38, val2026: 4.25, trend: "down" },
  { label: "Agriculture & Alimentation", val2025: 4.52, val2026: 4.68, trend: "up" },
  { label: "Action extérieure de l'État", val2025: 3.42, val2026: 3.55, trend: "up" },
  { label: "Culture", val2025: 3.82, val2026: 3.95, trend: "up" },
  { label: "Santé", val2025: 1.55, val2026: 1.62, trend: "up" },
  { label: "Immigration & Intégration", val2025: 2.12, val2026: 2.30, trend: "up" },
  { label: "Outre-mer", val2025: 2.85, val2026: 2.92, trend: "up" },
  { label: "Anciens combattants", val2025: 1.95, val2026: 1.88, trend: "down" },
  { label: "Économie", val2025: 3.58, val2026: 3.45, trend: "down" },
  { label: "Sport & Vie associative", val2025: 1.25, val2026: 1.15, trend: "down" },
  { label: "Aide publique au dév.", val2025: 4.35, val2026: 4.10, trend: "down" },
];

const BUDGET_METRICS = [
  { label: "Dépenses Totales", value: "500.9 Md€", sub: "Budget Général de l'État", icon: CircleDollarSign, color: "text-blue-600" },
  { label: "Part du PIB", value: "54.2 %", sub: "Dépenses Publiques Totales", icon: Landmark, color: "text-red-600" },
  { label: "Déficit Prévu", value: "4.7 %", sub: "Objectif de réduction", icon: TrendingDown, color: "text-amber-600" },
  { label: "Dette Publique", value: "114 %", sub: "Rapport au PIB", icon: ShieldCheck, color: "text-slate-600" },
];

const RECETTES = [
  { label: "TVA", amount: 112, desc: "Taxe sur la Valeur Ajoutée (Consommation)", color: "bg-blue-500" },
  { label: "Impôt sur le revenu", amount: 95, desc: "Impôt direct sur les revenus des ménages", color: "bg-red-500" },
  { label: "Impôt sur les sociétés", amount: 62, desc: "Impôt sur les bénéfices des entreprises", color: "bg-emerald-500" },
  { label: "TICPE", amount: 28, desc: "Taxe sur les produits énergétiques (Carburants)", color: "bg-amber-500" },
  { label: "Autres", amount: 203.9, desc: "Taxes diverses, amendes, dividendes de l'État", color: "bg-slate-300" },
];

const MISSIONS_DETAILED = [
  {
    title: "Engagements financiers",
    amount: "59.34 Md€",
    impact: "Critique",
    desc: "C'est le coût de la charge de la dette. Avec la hausse des taux, ce poste est devenu l'un des plus lourds du budget. L'État paie ici les intérêts de ses dettes passées sans pour autant rembourser le capital.",
    color: "bg-orange-500"
  },
  {
    title: "Enseignement scolaire",
    amount: "66.01 Md€",
    impact: "Prioritaire",
    desc: "Premier poste de dépense du budget général. Il couvre les salaires de plus d'un million d'agents et le fonctionnement de tout le système scolaire français (premier et second degrés).",
    color: "bg-blue-600"
  },
  {
    title: "Défense",
    amount: "57.10 Md€",
    impact: "Régalien",
    desc: "Le budget des armées est en forte croissance conformément à la Loi de Programmation Militaire (LPM). Il finance la modernisation nucléaire et les nouveaux équipements.",
    color: "bg-red-600"
  },
  {
    title: "Recherche et ens. sup.",
    amount: "32.12 Md€",
    impact: "Avenir",
    desc: "Ce budget finance les universités, les organismes de recherche (CNRS, INSERM...) et les bourses étudiantes. Un pilier pour l'innovation et la compétitivité future.",
    color: "bg-emerald-600"
  }
];

export default function DetailedBudgetPage() {
  const { isPremium, loading } = usePremium();

  if (loading) return null;

  if (!isPremium) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-xl w-full text-center space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              backgroundPosition: ["0% 50%", "200% 50%"],
            }}
            transition={{
              backgroundPosition: {
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: { duration: 0.5 },
              y: { duration: 0.5 }
            }}
            className="text-4xl md:text-7xl font-staatliches uppercase tracking-wider bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-[length:200%_auto] bg-clip-text text-transparent"
          >
            Analyse Budgétaire Elite
          </motion.h1>
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
      <header className="bg-white border-b border-slate-200 pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="container mx-auto max-w-6xl">
          <Link href="/executif" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-8">
            <ArrowLeft size={14} /> Retour à l'Exécutif
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">

              <h1 className="text-5xl md:text-8xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
                Budget <span className="text-blue-600">2026</span>
              </h1>
              <p className="text-xl text-slate-500 font-medium italic">
                Décryptage intégral de la dépense publique et des ressources de l'État.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-950 text-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-900/20">
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Déficit Public</p>
                  <p className="text-3xl font-black text-amber-400">4.7% <span className="text-sm text-white/50">PIB</span></p>
               </div>
               <div className="w-px h-12 bg-white/10 mx-2" />
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dépense Totale</p>
                  <p className="text-3xl font-black text-white">500.9 <span className="text-sm text-white/50">Md€</span></p>
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
           
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-7 space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <PieChart size={24} />
                    </div>
                    <h2 className="text-4xl font-staatliches uppercase tracking-wider text-slate-900">
                        Origine des <span className="text-blue-600">Recettes</span>
                    </h2>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed font-medium italic max-w-2xl">
                    Pour dépenser, l'État doit d'abord collecter. La TVA reste la source d'oxygène principale de la France, suivie par l'impôt sur le revenu.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                   {RECETTES.map((item, i) => (
                     <motion.div 
                       key={i} 
                       initial={{ opacity: 0, x: -20 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       transition={{ delay: i * 0.1 }}
                       className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors"
                     >
                        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${item.color.replace('bg-', 'bg-')}`} />
                        <div className="space-y-1">
                           <div className="flex justify-between items-baseline gap-4">
                              <span className="text-sm font-bold text-slate-900">{item.label}</span>
                              <span className="text-sm font-black text-slate-900 whitespace-nowrap">{item.amount} Md€</span>
                           </div>
                           <p className="text-[10px] text-slate-400 font-medium italic leading-tight">{item.desc}</p>
                        </div>
                     </motion.div>
                   ))}
                </div>
              </div>

              <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
                 {/* DONUT CHART SVG */}
                 <div className="relative w-72 h-72 md:w-80 md:h-80">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                       {/* Calculate segments manually for a clean donut */}
                       {(() => {
                          let currentOffset = 0;
                          const total = 500.9;
                         return RECETTES.map((item, i) => {
                           const percentage = (item.amount / total) * 100;
                           const strokeDasharray = `${percentage} ${100 - percentage}`;
                           const strokeDashoffset = -currentOffset;
                           currentOffset += percentage;
                           
                           const colorMap: {[key: string]: string} = {
                             'bg-blue-500': '#3b82f6',
                             'bg-red-500': '#ef4444',
                             'bg-emerald-500': '#10b981',
                             'bg-amber-500': '#f59e0b',
                             'bg-slate-300': '#cbd5e1'
                           };

                           return (
                             <motion.circle
                               key={i}
                               cx="50"
                               cy="50"
                               r="40"
                               fill="transparent"
                               stroke={colorMap[item.color] || '#334155'}
                               strokeWidth="12"
                               strokeDasharray={strokeDasharray}
                               strokeDashoffset={100} // Start hidden
                               animate={{ strokeDashoffset }}
                               transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "circOut" }}
                               strokeLinecap="round"
                               pathLength="100"
                             />
                           );
                         });
                       })()}
                    </svg>
                    
                    {/* CENTER LABEL */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fiscal</p>
                        <div className="flex items-baseline gap-1">
                           <span className="text-5xl font-black text-slate-900">500.9</span>
                           <span className="text-xl font-bold text-slate-400">Md€</span>
                        </div>
                    </div>
                 </div>
                 
                 {/* DECORATIVE ELEMENTS */}
                 <div className="mt-8 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500" />
                       <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Budget Général</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200" />
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-slate-300" />
                       <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Fonds Spéciaux</span>
                    </div>
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
                Pourquoi certains budgets pèsent-ils plus lourd que d'autres ? Analyse des piliers du Budget.
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
        <section className="bg-slate-950 rounded-[3.5rem] p-8 md:p-20 relative overflow-hidden shadow-2xl border border-white/5">
           <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -mr-96 -mt-96" />
           
           <div className="relative z-10 space-y-12">
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <h2 className="text-4xl md:text-6xl font-staatliches text-white uppercase tracking-tighter">
                  Évolution <span className="text-blue-500">2025 → 2026</span>
                </h2>
                <p className="text-slate-400 font-medium italic">
                  Comparez les priorités budgétaires d'une année sur l'autre pour identifier les grandes orientations politiques.
                </p>
              </div>

              <div className="bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="border-b border-white/10">
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mission de l'État</th>
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Budget 2025</th>
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Budget 2026</th>
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Évolution</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {COMPARISON_DATA.map((row, i) => {
                            const diff = ((row.val2026 - row.val2025) / row.val2025) * 100;
                            return (
                              <motion.tr 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="hover:bg-white/[0.02] transition-colors"
                              >
                                 <td className="px-8 py-5">
                                    <span className="text-sm font-bold text-white">{row.label}</span>
                                 </td>
                                 <td className="px-8 py-5 text-slate-400 font-mono text-sm">{row.val2025} Md€</td>
                                 <td className="px-8 py-5 text-white font-mono font-bold text-sm">{row.val2026} Md€</td>
                                 <td className="px-8 py-5 text-right">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                      row.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                       {row.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                       {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                    </div>
                                 </td>
                              </motion.tr>
                            );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-white/10">
                 <div className="text-left">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Source Officielle</p>
                    <p className="text-xs text-slate-400 italic">Direction du Budget - Ministère de l'Économie et des Finances</p>
                 </div>
                 <button className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                    Télécharger le rapport comparatif (PDF)
                 </button>
              </div>
           </div>
        </section>

      </div>
    </main>
  );
}
