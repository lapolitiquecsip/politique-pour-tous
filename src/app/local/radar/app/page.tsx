"use client";

import { motion } from "framer-motion";
import { Eye, ChevronLeft, Building2, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function RadarApp() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Link href="/local" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest mb-8">
          <ChevronLeft size={16} /> Retour au portail
        </Link>

        <div className="space-y-12">
          <header className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full">Exclusivité Élite</span>
                <span className="text-white/20 font-black text-xs uppercase tracking-widest">Temps Réel</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-none">Radar des <br /><span className="text-amber-500 italic">Grands Travaux</span></h1>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List of projects */}
            <div className="lg:col-span-2 space-y-6">
              {[
                { title: "Extension Métro Ligne B", budget: "1.2 Md€", progress: 75, status: "En cours", delay: "4 mois" },
                { title: "Nouveau Pôle Santé Ouest", budget: "450 M€", progress: 30, status: "Fondations", delay: "0" },
                { title: "Rénovation Quartier Historique", budget: "85 M€", progress: 95, status: "Finitions", delay: "1 an" }
              ].map((project, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all group">
                  <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold group-hover:text-amber-400 transition-colors">{project.title}</h3>
                      <p className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <Building2 size={12} /> Chantier Local
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-amber-500">{project.budget}</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Budget Alloué</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                      <span className="text-white/40">Progression</span>
                      <span className="text-amber-400">{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1.5, delay: i * 0.2 }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white/30">Retard estimé</p>
                        <p className={`text-xs font-bold ${project.delay !== '0' ? 'text-rose-500' : 'text-emerald-500'}`}>{project.delay === '0' ? 'Aucun' : project.delay}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                        <AlertCircle size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white/30">Statut</p>
                        <p className="text-xs font-bold">{project.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-8">
              <div className="bg-amber-500 p-10 rounded-[3rem] text-slate-900 shadow-2xl shadow-amber-500/20">
                <TrendingUp size={40} className="mb-6" />
                <h3 className="text-2xl font-staatliches uppercase tracking-tight leading-none mb-4">Analyse de la <br />Dépense Publique</h3>
                <p className="text-slate-900/60 text-sm font-medium italic mb-8">Nous surveillons les appels d'offres et les dépassements de coûts pour vous.</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-900/10">
                    <span className="text-[10px] font-black uppercase">Dépassement Moyen</span>
                    <span className="font-bold">+18.5%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-900/10">
                    <span className="text-[10px] font-black uppercase">Chantiers Actifs</span>
                    <span className="font-bold">142</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
                <Eye size={32} className="text-white/20 mb-6" />
                <h3 className="text-xl font-bold mb-4">Comment ça marche ?</h3>
                <p className="text-white/40 text-sm leading-relaxed italic">
                  Nos algorithmes croisent les données des plateformes de marchés publics avec les rapports d'expertise locale pour vous livrer une vision sans filtre.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
