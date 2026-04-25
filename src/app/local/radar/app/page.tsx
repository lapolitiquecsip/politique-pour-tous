"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ChevronLeft, Building2, TrendingUp, Calendar, AlertCircle, MapPin, ChevronDown } from "lucide-react";
import Link from "next/link";

const PROJECTS_BY_CITY: Record<string, any[]> = {
  "Marseille": [
    { title: "Extension Métro Ligne B", budget: "1.2 Md€", progress: 75, status: "En cours", delay: "4 mois" },
    { title: "Nouveau Pôle Santé Ouest", budget: "450 M€", progress: 30, status: "Fondations", delay: "0" },
    { title: "Rénovation Quartier Historique", budget: "85 M€", progress: 95, status: "Finitions", delay: "1 an" }
  ],
  "Paris": [
    { title: "Grand Paris Express - Ligne 15", budget: "3.5 Md€", progress: 60, status: "Tunnelier", delay: "8 mois" },
    { title: "Réaménagement Porte de la Chapelle", budget: "120 M€", progress: 85, status: "Voirie", delay: "2 mois" },
    { title: "Village Olympique", budget: "950 M€", progress: 98, status: "Livraison", delay: "0" }
  ],
  "Lyon": [
    { title: "Prolongement Métro B - St Genis", budget: "390 M€", progress: 90, status: "Tests", delay: "1 mois" },
    { title: "Quartier Lyon Part-Dieu", budget: "250 M€", progress: 55, status: "Gros œuvre", delay: "3 mois" },
    { title: "Ligne de Tram T10", budget: "180 M€", progress: 20, status: "Terrassement", delay: "0" }
  ],
  "Toulouse": [
    { title: "3ème Ligne de Métro (Toulouse Aerospace Express)", budget: "2.7 Md€", progress: 15, status: "Études/Forage", delay: "0" },
    { title: "Rénovation Basilique St-Sernin", budget: "45 M€", progress: 70, status: "Restauration", delay: "6 mois" }
  ]
};

export default function RadarApp() {
  const [selectedCity, setSelectedCity] = useState("Marseille");
  const projects = PROJECTS_BY_CITY[selectedCity] || [];

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

            {/* City Selector */}
            <div className="w-full md:w-72 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Filtrer par Ville</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" />
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer group-hover:bg-white/10"
                >
                  {Object.keys(PROJECTS_BY_CITY).map(city => (
                    <option key={city} value={city} className="bg-slate-900 text-white">{city}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List of projects */}
            <div className="lg:col-span-2 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedCity}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {projects.map((project, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex justify-between items-start mb-8">
                        <div className="space-y-1">
                          <h3 className="text-2xl font-bold group-hover:text-amber-400 transition-colors">{project.title}</h3>
                          <p className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Building2 size={12} /> {selectedCity}
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
                            transition={{ duration: 1.5, delay: i * 0.1 }}
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:bg-white/10 transition-colors">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-white/30">Retard estimé</p>
                            <p className={`text-xs font-bold ${project.delay !== '0' ? 'text-rose-500' : 'text-emerald-500'}`}>{project.delay === '0' ? 'Aucun' : project.delay}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:bg-white/10 transition-colors">
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
                </motion.div>
              </AnimatePresence>
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
