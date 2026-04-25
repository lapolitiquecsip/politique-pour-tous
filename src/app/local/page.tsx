"use client";

import { motion } from "framer-motion";
import { 
  MapPin, 
  Users, 
  Building2, 
  TrendingUp, 
  Search,
  ArrowRight,
  Vote,
  History,
  Building,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import GlossaryText from "@/components/ui/GlossaryText";

// Mock Data for Local Politics
const CITIES = [
  {
    name: "Paris",
    mayor: "Anne Hidalgo",
    party: "PS",
    budget: "10.5 Md€",
    lastElection: "2020",
    score: "48.5%",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_du_trocad%C3%A9ro.jpg/800px-La_Tour_Eiffel_vue_du_trocad%C3%A9ro.jpg"
  },
  {
    name: "Marseille",
    mayor: "Benoît Payan",
    party: "DVG",
    budget: "1.6 Md€",
    lastElection: "2020",
    score: "53.5%",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Marseille_Vieux_Port.jpg/800px-Marseille_Vieux_Port.jpg"
  },
  {
    name: "Lyon",
    mayor: "Grégory Doucet",
    party: "EELV",
    budget: "0.8 Md€",
    lastElection: "2020",
    score: "52.4%",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lyon_-_Place_Bellecour.jpg/800px-Lyon_-_Place_Bellecour.jpg"
  },
  {
    name: "Toulouse",
    mayor: "Jean-Luc Moudenc",
    party: "LR",
    budget: "0.9 Md€",
    lastElection: "2020",
    score: "51.9%",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Capitole_de_Toulouse.jpg/800px-Capitole_de_Toulouse.jpg"
  },
  {
    name: "Nice",
    mayor: "Christian Estrosi",
    party: "Horizons",
    budget: "0.7 Md€",
    lastElection: "2020",
    score: "59.3%",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Promenade_des_Anglais_Nice.jpg/800px-Promenade_des_Anglais_Nice.jpg"
  }
];

export default function LocalPoliticsPage() {
  const [search, setSearch] = useState("");

  const filteredCities = CITIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.mayor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* 1. HERO SECTION (POSTER IMPACT STYLE) */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden bg-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none">
          <span className="absolute top-10 left-10 text-[15rem] font-staatliches leading-none rotate-12">TERRITOIRES</span>
          <span className="absolute bottom-10 right-10 text-[15rem] font-staatliches leading-none -rotate-12">PROXIMITÉ</span>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Action Locale</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tighter leading-[1.1] mb-8 pb-2">
              La Politique <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent italic px-1">Locale</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 font-medium italic leading-relaxed max-w-3xl mx-auto text-pretty">
              Découvrez les acteurs de vos territoires, des maires aux conseillers municipaux, et comprenez comment vos impôts locaux façonnent votre ville.
            </p>

            <div className="h-1.5 w-32 bg-gradient-to-r from-emerald-600 to-teal-600 mt-8 rounded-full" />
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN CONTENT - CITIES GRID */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Rechercher une ville ou un maire..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2 px-6 py-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Building2 size={18} className="text-emerald-600" />
                <span className="text-sm font-bold text-slate-700">34 945 Communes en France</span>
              </div>
            </div>

            {/* CITIES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredCities.map((city, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={city.image} 
                      alt={city.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    <div className="absolute bottom-4 left-6">
                      <p className="text-emerald-400 font-black text-[9px] uppercase tracking-widest mb-1">Commune</p>
                      <h4 className="text-white font-bold text-xl leading-tight">{city.name}</h4>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Le Maire</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">{city.party}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight">
                        {city.mayor}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                          <TrendingUp size={10} /> Budget
                        </span>
                        <p className="text-sm font-black text-slate-900">{city.budget}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                          <Vote size={10} /> Élu avec
                        </span>
                        <p className="text-sm font-black text-slate-900">{city.score}</p>
                      </div>
                    </div>

                    <button className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-emerald-600 transition-colors pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest">Voir le détail du mandat</span>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-emerald-600 group-hover/btn:text-white transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* SECTION: ÉLECTIONS MUNICIPALES */}
            <section className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
               <Vote className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
               <div className="relative z-10 space-y-8">
                 <div className="space-y-4">
                   <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter leading-none">
                     Prochaines <span className="text-emerald-400 italic">Échéances</span>
                   </h2>
                   <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
                     Les élections municipales sont le coeur de la démocratie de proximité. Préparez-vous pour les scrutins de 2026.
                   </p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-4">Printemps 2026</p>
                     <h4 className="text-xl font-bold mb-2">Municipales</h4>
                     <p className="text-white/40 text-sm">Élection des maires et conseillers pour 6 ans.</p>
                   </div>
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-teal-400 font-black text-[10px] uppercase tracking-widest mb-4">2027</p>
                     <h4 className="text-xl font-bold mb-2">Législatives</h4>
                     <p className="text-white/40 text-sm">Renouvellement des députés par circonscription.</p>
                   </div>
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-4">2028</p>
                     <h4 className="text-xl font-bold mb-2">Sénatoriales</h4>
                     <p className="text-white/40 text-sm">Renouvellement partiel de la chambre haute.</p>
                   </div>
                 </div>
               </div>
            </section>
          </div>

          {/* SIDEBAR - TOOLS & INFO */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* GLOSSARY TOOLTIP INTRO */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 relative overflow-hidden">
               <div className="relative z-10 space-y-6">
                 <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                   <History size={24} />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-xl font-bold text-slate-900">Le Saviez-vous ?</h3>
                   <p className="text-slate-500 text-sm leading-relaxed font-medium">
                     <GlossaryText>
                       Les maires sont élus par le conseil municipal, qui est lui-même élu au suffrage universel direct.
                     </GlossaryText>
                   </p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Astuce</p>
                   <p className="text-[10px] text-slate-600 font-medium italic">
                     Passez votre souris sur les mots soulignés pour voir leur définition.
                   </p>
                 </div>
               </div>
            </div>

            {/* CITY BUDGET CHART */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20">
               <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-bold text-slate-900">Top Budgets</h3>
                 <Building size={20} className="text-slate-400" />
               </div>
               <div className="space-y-6">
                 {[
                   { label: "Paris", val: 100, color: "bg-blue-500" },
                   { label: "Marseille", val: 16, color: "bg-emerald-500" },
                   { label: "Lyon", val: 8, color: "bg-teal-500" }
                 ].map((item, i) => (
                   <div key={i} className="space-y-2">
                     <div className="flex justify-between text-[11px] font-bold">
                       <span>{item.label}</span>
                       <span className="text-slate-400">{item.val / 10} Md€</span>
                     </div>
                     <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         whileInView={{ width: `${item.val}%` }}
                         transition={{ duration: 1, delay: i * 0.1 }}
                         className={`h-full ${item.color}`}
                       />
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* CTA GUIDE */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/20 group">
               <Building2 className="w-12 h-12 mb-6 text-white/50 group-hover:scale-110 transition-transform" />
               <h4 className="text-2xl font-staatliches uppercase tracking-wide leading-none mb-4">Comprendre la <br />Décentralisation</h4>
               <p className="text-emerald-50/80 text-sm leading-relaxed mb-6">
                 Comment les compétences sont-elles réparties entre l'État et les communes ? Notre guide pédagogique vous explique tout.
               </p>
               <button className="w-full py-4 bg-white text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                 Lire le guide <ArrowRight size={14} />
               </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
