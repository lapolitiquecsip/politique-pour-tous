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
  ChevronRight,
  Map,
  Layers,
  LayoutGrid,
  Lock
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

const REGIONS = [
  { name: "Île-de-France", president: "Valérie Pécresse", party: "LR", budget: "5.0 Md€", population: "12.3M", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800" },
  { name: "Auvergne-Rhône-Alpes", president: "Laurent Wauquiez", party: "LR", budget: "3.6 Md€", population: "8.1M", image: "https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&q=80&w=800" },
  { name: "Hauts-de-France", president: "Xavier Bertrand", party: "LR", budget: "3.4 Md€", population: "6.0M", image: "https://images.unsplash.com/photo-1595863266931-1509a259c40a?auto=format&fit=crop&q=80&w=800" }
];

const DEPARTMENTS = [
  { name: "Nord", president: "Christian Poiret", party: "DVD", budget: "3.5 Md€", population: "2.6M", image: "https://images.unsplash.com/photo-1595113316349-9fa4ee24f884?auto=format&fit=crop&q=80&w=800" },
  { name: "Bouches-du-Rhône", president: "Martine Vassal", party: "DVD", budget: "2.8 Md€", population: "2.0M", image: "https://images.unsplash.com/photo-1563606734-706798032742?auto=format&fit=crop&q=80&w=800" },
  { name: "Gironde", president: "Jean-Luc Gleyze", party: "PS", budget: "2.1 Md€", population: "1.6M", image: "https://images.unsplash.com/photo-1517404212328-40a61576d1ff?auto=format&fit=crop&q=80&w=800" }
];

export default function LocalPoliticsPage() {
  const [activeTab, setActiveTab] = useState<"region" | "departement" | "commune">("commune");
  const [search, setSearch] = useState("");

  const filteredItems = (() => {
    const s = search.toLowerCase();
    if (activeTab === "commune") {
      return CITIES.filter(c => c.name.toLowerCase().includes(s) || c.mayor.toLowerCase().includes(s));
    } else if (activeTab === "region") {
      return REGIONS.filter(r => r.name.toLowerCase().includes(s) || r.president.toLowerCase().includes(s));
    } else {
      return DEPARTMENTS.filter(d => d.name.toLowerCase().includes(s) || d.president.toLowerCase().includes(s));
    }
  })();

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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-rose-600">Action Locale</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-tight mb-8 py-4">
              La Politique <span className="inline-block bg-gradient-to-r from-rose-600 via-fuchsia-600 to-rose-600 bg-clip-text text-transparent italic px-2">Locale</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 font-medium italic leading-relaxed max-w-3xl mx-auto text-pretty">
              Découvrez les acteurs de vos territoires, des maires aux conseillers municipaux, et comprenez comment vos impôts locaux façonnent votre ville.
            </p>

            <div className="h-1.5 w-32 bg-gradient-to-r from-rose-600 to-fuchsia-600 mt-8 rounded-full" />
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 mt-12">
        {/* 1.5 TABS NAVIGATION (GROS PANNEAU) */}
        <div className="mb-16">
          <div className="bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row gap-2">
            {[
              { id: "region", label: "La Région", icon: Map },
              { id: "departement", label: "Le Département", icon: Layers },
              { id: "commune", label: "La Commune", icon: LayoutGrid }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-4 py-8 rounded-[2rem] transition-all duration-500 relative overflow-hidden group
                    ${isActive ? 'bg-white text-rose-600 shadow-[0_20px_50px_rgba(225,29,72,0.15)] border border-rose-100 translate-y-[-4px]' : 'hover:bg-slate-50 text-slate-400'}
                  `}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-gradient-to-r from-rose-50 to-fuchsia-50 pointer-events-none" 
                    />
                  )}
                  <Icon size={24} className={isActive ? 'text-rose-600' : 'group-hover:text-slate-600'} />
                  <div className="text-left relative z-10">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isActive ? 'text-rose-400' : 'text-slate-300'}`}>Échelon</p>
                    <span className="text-xl font-bold font-staatliches uppercase tracking-wide">{tab.label}</span>
                  </div>
                  {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-rose-600 rounded-t-full" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN CONTENT - ITEMS GRID */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder={
                    activeTab === 'commune' ? "Rechercher une ville, un maire..." : 
                    activeTab === 'departement' ? "Rechercher un département, un président..." :
                    "Rechercher une région, un président..."
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-sm font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredItems.map((item: any, idx: number) => (
                <motion.div
                  key={`${activeTab}-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    <div className="absolute bottom-4 left-6">
                      <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest mb-1">
                        {activeTab === 'region' ? 'Région' : activeTab === 'departement' ? 'Département' : 'Commune'}
                      </p>
                      <h4 className="text-white font-bold text-xl leading-tight">{item.name}</h4>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          {activeTab === 'region' || activeTab === 'departement' ? 'Président(e)' : 'Maire'}
                        </span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full">{item.party}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-tight">
                        {item.president || item.mayor}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                          <TrendingUp size={10} /> Budget
                        </span>
                        <p className="text-sm font-black text-slate-900">{item.budget}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                          <Users size={10} /> Population
                        </span>
                        <p className="text-sm font-black text-slate-900">{item.population || "N/A"}</p>
                      </div>
                    </div>

                    <button className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-rose-600 transition-colors pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest">Voir les compétences</span>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-rose-600 group-hover/btn:text-white transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* SECTION: ÉLECTIONS */}
            <section className="bg-rose-950 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
               <Vote className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
               <div className="relative z-10 space-y-8">
                 <div className="space-y-4">
                   <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter leading-none">
                     Prochaines <span className="text-rose-400 italic">Échéances</span>
                   </h2>
                   <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
                     Préparez-vous pour les scrutins de 2026. La démocratie commence au bas de chez vous.
                   </p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-rose-400 font-black text-[10px] uppercase tracking-widest mb-4">Printemps 2026</p>
                     <h4 className="text-xl font-bold mb-2">Municipales</h4>
                     <p className="text-white/40 text-sm">Élection des maires pour 6 ans.</p>
                   </div>
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-fuchsia-400 font-black text-[10px] uppercase tracking-widest mb-4">2027</p>
                     <h4 className="text-xl font-bold mb-2">Législatives</h4>
                     <p className="text-white/40 text-sm">Renouvellement des députés.</p>
                   </div>
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-pink-400 font-black text-[10px] uppercase tracking-widest mb-4">2028</p>
                     <h4 className="text-xl font-bold mb-2">Sénatoriales</h4>
                     <p className="text-white/40 text-sm">Renouvellement partiel.</p>
                   </div>
                 </div>
               </div>
            </section>
          </div>

          {/* SIDEBAR - TOOLS & INFO */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* INFO INTRO */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 relative overflow-hidden">
               <div className="relative z-10 space-y-6">
                 <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
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

            {/* BUDGET CHART */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20">
               <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-bold text-slate-900">Top Budgets</h3>
                 <Building size={20} className="text-slate-400" />
               </div>
               <div className="space-y-6">
                 {[
                   { label: "Paris", val: 100, color: "bg-rose-600" },
                   { label: "Marseille", val: 16, color: "bg-fuchsia-600" },
                   { label: "Lyon", val: 8, color: "bg-pink-600" }
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

            {/* PREMIUM: COMPARATEUR DE TERRITOIRES */}
            <div className="relative group overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Comparateur</h3>
                <Map size={20} className="text-rose-500" />
              </div>
              
              <div className="space-y-4 opacity-40 blur-[2px] pointer-events-none">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">Ville A...</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-black text-xs">VS</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">Ville B...</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>

              {/* LOCK OVERLAY */}
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-rose-600 mb-4 ring-1 ring-rose-100">
                  <Lock size={24} />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Comparateur Premium</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-4">Comparez sécurité, éducation et fiscalité entre deux villes.</p>
                <button className="px-6 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-600/20 hover:scale-105 transition-all">
                  Débloquer l'accès
                </button>
              </div>
            </div>

            {/* PREMIUM: GRANDS PROJETS URBAINS */}
            <div className="relative group overflow-hidden bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-rose-900/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Grands Projets</h3>
                <Building2 size={20} className="text-rose-400" />
              </div>

              <div className="space-y-4 opacity-30 blur-[2px] pointer-events-none">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold mb-2">Tramway Ligne T10</h4>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-2/3" />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold mb-2">Éco-quartier Flaubert</h4>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-1/3" />
                  </div>
                </div>
              </div>

              {/* LOCK OVERLAY */}
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center text-rose-400 mb-4">
                  <Lock size={24} />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-white mb-2">Suivi des Chantiers</h4>
                <p className="text-[10px] text-white/50 font-medium leading-relaxed mb-4">Coûts réels, retards et impact de l'investissement public.</p>
                <button className="px-6 py-2 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                  Voir les dossiers
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
