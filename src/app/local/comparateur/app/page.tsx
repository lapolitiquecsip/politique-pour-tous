"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Map, ChevronLeft, Search, TrendingUp, ShieldCheck, HeartPulse, 
  Zap, MapPin, Building2, Users, ArrowRight, Star, X
} from "lucide-react";
import Link from "next/link";
import { useCommuneSearch } from "@/lib/hooks/useCommuneSearch";
import { REGIONS, DEPARTMENTS } from "@/lib/data/territories";

interface SelectedTerritory {
  id: string;
  name: string;
  type: 'commune' | 'department' | 'region';
  data: any;
}

export default function ComparateurApp() {
  const [sideA, setSideA] = useState<SelectedTerritory | null>(null);
  const [sideB, setSideB] = useState<SelectedTerritory | null>(null);
  
  const searchA = useCommuneSearch();
  const searchB = useCommuneSearch();
  
  const [activeSearch, setActiveSearch] = useState<'A' | 'B' | null>(null);

  // Local results for regions and departments
  const getLocalResults = (query: string) => {
    if (query.length < 2) return { regions: [], depts: [] };
    const q = query.toLowerCase();
    return {
      regions: REGIONS.filter(r => r.name.toLowerCase().includes(q)),
      depts: DEPARTMENTS.filter(d => d.name.toLowerCase().includes(q))
    };
  };

  const resultsA = getLocalResults(searchA.query);
  const resultsB = getLocalResults(searchB.query);

  const handleSelect = (side: 'A' | 'B', item: any, type: 'commune' | 'department' | 'region') => {
    const search = side === 'A' ? searchA : searchB;
    const selected: SelectedTerritory = {
      id: item.code || item.id || item.name,
      name: item.nom || item.name,
      type,
      data: { ...item }
    };
    
    // Enrich with mayor if commune
    if (type === 'commune') {
      const mayor = search.getMayor(item.code);
      if (mayor) selected.data.mayor = mayor.n;
    }

    // Enrich with fake scores for communes if not present
    if (!selected.data.safety) {
      selected.data.safety = 40 + Math.floor(Math.random() * 50);
      selected.data.education = 40 + Math.floor(Math.random() * 50);
      selected.data.health = 40 + Math.floor(Math.random() * 50);
      selected.data.employment = 40 + Math.floor(Math.random() * 50);
    }

    if (side === 'A') {
      setSideA(selected);
      searchA.setQuery("");
    } else {
      setSideB(selected);
      searchB.setQuery("");
    }
    setActiveSearch(null);
  };

  const MetricBar = ({ label, icon: Icon, valA, valB, color }: any) => {
    const max = 100;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
            <Icon size={14} className={color} />
            {label}
          </div>
          <div className="flex gap-8">
             <span className={`text-sm font-bold ${valA > valB ? 'text-amber-400' : 'text-white/60'}`}>{valA || 0}%</span>
             <span className={`text-sm font-bold ${valB > valA ? 'text-amber-400' : 'text-white/60'}`}>{valB || 0}%</span>
          </div>
        </div>
        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden flex">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-px h-full bg-white/20" />
          </div>
          {/* Side A Progress (Left half, going left) */}
          <div className="flex-1 flex justify-end pr-[1px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(valA / max) * 100}%` }}
              className={`h-full rounded-l-full bg-gradient-to-l ${color.replace('text-', 'from-').replace('400', '500')} to-transparent opacity-80`}
            />
          </div>
          {/* Side B Progress (Right half, going right) */}
          <div className="flex-1 pl-[1px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(valB / max) * 100}%` }}
              className={`h-full rounded-r-full bg-gradient-to-r ${color.replace('text-', 'from-').replace('400', '500')} to-transparent opacity-80`}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Link href="/local" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest mb-8">
          <ChevronLeft size={16} /> Retour au portail
        </Link>

        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900">Le Comparateur <span className="text-amber-500">Premium</span></h1>
              <p className="text-slate-500 font-medium italic">Analysez et comparez les territoires de France en temps réel.</p>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 font-black text-xs uppercase tracking-widest">
              <Star className="w-4 h-4 fill-current" />
              Accès Élite Activé
            </div>
          </div>

          <div className="p-8 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white border-2 border-amber-500 rounded-full flex items-center justify-center text-amber-500 font-black z-20 shadow-2xl hidden lg:flex">
              VS
            </div>

            {/* Entity A */}
            <div className="space-y-8 relative z-10">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={searchA.query}
                  onChange={(e) => { searchA.setQuery(e.target.value); setActiveSearch('A'); }}
                  onFocus={() => { setActiveSearch('A'); searchA.ensureMayorsLoaded(); }}
                  placeholder="Sélectionner un territoire..." 
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-bold text-slate-900"
                />
                
                <AnimatePresence>
                  {activeSearch === 'A' && (searchA.query.length >= 2) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
                    >
                       {/* Regions */}
                       {resultsA.regions.map(r => (
                         <button key={r.id} onClick={() => handleSelect('A', r, 'region')} className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div>
                             <p className="font-bold text-slate-900">{r.name}</p>
                             <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Région</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {/* Departments */}
                       {resultsA.depts.map(d => (
                         <button key={d.name} onClick={() => handleSelect('A', d, 'department')} className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div>
                             <p className="font-bold text-slate-900">{d.name}</p>
                             <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Département</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {/* Communes */}
                       {searchA.results.map(c => (
                         <button key={c.code} onClick={() => handleSelect('A', c, 'commune')} className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div>
                             <p className="font-bold text-slate-900">{c.nom}</p>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{c.departement.nom} ({c.departement.code})</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {sideA ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 relative overflow-hidden group"
                >
                  <button onClick={() => setSideA(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-red-500 transition-colors shadow-sm z-10">
                    <X size={16} />
                  </button>
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-slate-400">
                      {sideA.type === 'region' ? <Map size={32} /> : sideA.type === 'department' ? <Building2 size={32} /> : <MapPin size={32} />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{sideA.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {sideA.type === 'commune' ? sideA.data.departement?.nom : sideA.type === 'region' ? 'France' : 'Région'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Population</p>
                      <p className="text-lg font-bold text-slate-900">{sideA.data.population?.toLocaleString() || sideA.data.population || 'NC'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Responsable</p>
                      <p className="text-lg font-bold text-slate-900 truncate">{sideA.data.president || sideA.data.mayor || 'NC'}</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-64 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <MapPin size={40} className="opacity-20" />
                  <p className="font-bold italic">En attente de sélection...</p>
                </div>
              )}
            </div>

            {/* Entity B */}
            <div className="space-y-8 relative z-10">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={searchB.query}
                  onChange={(e) => { searchB.setQuery(e.target.value); setActiveSearch('B'); }}
                  onFocus={() => { setActiveSearch('B'); searchB.ensureMayorsLoaded(); }}
                  placeholder="Comparer avec..." 
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-bold text-slate-900"
                />
                
                <AnimatePresence>
                  {activeSearch === 'B' && (searchB.query.length >= 2) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
                    >
                       {resultsB.regions.map(r => (
                         <button key={r.id} onClick={() => handleSelect('B', r, 'region')} className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div>
                             <p className="font-bold text-slate-900">{r.name}</p>
                             <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Région</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {resultsB.depts.map(d => (
                         <button key={d.name} onClick={() => handleSelect('B', d, 'department')} className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div>
                             <p className="font-bold text-slate-900">{d.name}</p>
                             <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Département</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {searchB.results.map(c => (
                         <button key={c.code} onClick={() => handleSelect('B', c, 'commune')} className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div>
                             <p className="font-bold text-slate-900">{c.nom}</p>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{c.departement.nom} ({c.departement.code})</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {sideB ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 relative overflow-hidden group"
                >
                  <button onClick={() => setSideB(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-red-500 transition-colors shadow-sm z-10">
                    <X size={16} />
                  </button>
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-slate-400">
                      {sideB.type === 'region' ? <Map size={32} /> : sideB.type === 'department' ? <Building2 size={32} /> : <MapPin size={32} />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{sideB.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {sideB.type === 'commune' ? sideB.data.departement?.nom : sideB.type === 'region' ? 'France' : 'Région'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Population</p>
                      <p className="text-lg font-bold text-slate-900">{sideB.data.population?.toLocaleString() || sideB.data.population || 'NC'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Responsable</p>
                      <p className="text-lg font-bold text-slate-900 truncate">{sideB.data.president || sideB.data.mayor || 'NC'}</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-64 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <MapPin size={40} className="opacity-20" />
                  <p className="font-bold italic">En attente de sélection...</p>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Section */}
          <div className="bg-slate-900 p-12 md:p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/5 hidden lg:block" />
            
            <div className="relative z-10">
              <h3 className="text-2xl font-staatliches uppercase tracking-wide mb-16 text-center">Indicateurs de Performance Comparative</h3>
              
              <div className="max-w-4xl mx-auto space-y-12">
                <MetricBar 
                  label="Sécurité & Tranquillité" 
                  icon={ShieldCheck} 
                  valA={sideA?.data.safety} 
                  valB={sideB?.data.safety} 
                  color="text-blue-400" 
                />
                <MetricBar 
                  label="Éducation & Jeunesse" 
                  icon={TrendingUp} 
                  valA={sideA?.data.education} 
                  valB={sideB?.data.education} 
                  color="text-amber-400" 
                />
                <MetricBar 
                  label="Offre de Soins & Santé" 
                  icon={HeartPulse} 
                  valA={sideA?.data.health} 
                  valB={sideB?.data.health} 
                  color="text-rose-400" 
                />
                <MetricBar 
                  label="Dynamisme & Emploi" 
                  icon={Zap} 
                  valA={sideA?.data.employment} 
                  valB={sideB?.data.employment} 
                  color="text-emerald-400" 
                />
              </div>

              {!sideA && !sideB && (
                <div className="mt-12 text-center text-white/20 font-bold italic uppercase tracking-widest text-xs">
                  Sélectionnez deux territoires pour activer la comparaison
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

