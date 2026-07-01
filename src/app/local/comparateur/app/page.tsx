"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Map, ChevronLeft, Search, TrendingUp, ShieldCheck, HeartPulse, 
  Zap, MapPin, Building2, Users, ArrowRight, Star, X, Loader2
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCommuneSearch } from "@/lib/hooks/useCommuneSearch";
import { usePremium } from "@/lib/hooks/usePremium";
import { REGIONS, DEPARTMENTS } from "@/lib/data/territories";
import { regionPaths } from "@/lib/data/regionPaths";
import { departmentPaths } from "@/lib/data/departmentPaths";

interface SelectedTerritory {
  id: string;
  name: string;
  type: 'commune' | 'department' | 'region';
  data: any;
}

function ComparateurContent() {
  const { userId, isPremium, loading } = usePremium();
  const router = useRouter();
  const searchParams = useSearchParams();
  const allowedType = searchParams.get('type'); // 'region' | 'department' | 'commune'

  const [sideA, setSideA] = useState<SelectedTerritory | null>(null);
  const [sideB, setSideB] = useState<SelectedTerritory | null>(null);
  
  const searchA = useCommuneSearch();
  const searchB = useCommuneSearch();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [activeSearch, setActiveSearch] = useState<'A' | 'B' | null>(null);
  const containerRefA = useRef<HTMLDivElement>(null);
  const containerRefB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRefA.current && !containerRefA.current.contains(event.target as Node) &&
        containerRefB.current && !containerRefB.current.contains(event.target as Node)
      ) {
        setActiveSearch(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!loading && !isPremium) {
      router.replace("/local/comparateur");
    }
  }, [isPremium, loading, router]);

  // Local results for regions and departments with accent insensitivity
  const getLocalResults = (query: string) => {
    const q = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    if (query.length < 2) {
      return {
        regions: (!allowedType || allowedType === 'region') ? REGIONS : [],
        depts: (!allowedType || allowedType === 'department') ? DEPARTMENTS : []
      };
    }
    
    const filterFn = (name: string) => 
      name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q);

    return {
      regions: (!allowedType || allowedType === 'region') ? REGIONS.filter(r => filterFn(r.name)) : [],
      depts: (!allowedType || allowedType === 'department') ? DEPARTMENTS.filter(d => filterFn(d.name)) : []
    };
  };

  const resultsA = getLocalResults(searchA.query);
  const resultsB = getLocalResults(searchB.query);

  const handleSelect = async (side: 'A' | 'B', item: any, type: 'commune' | 'department' | 'region') => {
    const search = side === 'A' ? searchA : searchB;
    const codeInsee = item.code || item.id || item.name;
    const itemName = item.nom || item.name;

    try {
      const populationParam = (item.population !== undefined && item.population !== null) ? `&population=${item.population}` : "";
      const res = await fetch(`${API_URL}/api/comparateur/${codeInsee}?name=${encodeURIComponent(itemName)}${populationParam}`);
      const details = await res.json();

      const selected: SelectedTerritory = {
        id: codeInsee,
        name: itemName,
        type,
        data: details
      };
      
      // Enrich with mayor if commune
      if (type === 'commune') {
        const mayor = search.getMayor(codeInsee);
        if (mayor && !selected.data.politique.elu) selected.data.politique.elu = mayor.n;
      }

      if (side === 'A') {
        setSideA(selected);
        searchA.setQuery("");
      } else {
        setSideB(selected);
        searchB.setQuery("");
      }
      setActiveSearch(null);
    } catch (err) {
      console.error("Failed to fetch territory details", err);
    }
  };

  useEffect(() => {
    if (loading || !isPremium) return;
    const preselectedId = searchParams.get('id') || searchParams.get('code');
    const preselectedType = searchParams.get('type') as 'region' | 'department' | 'commune' | null;
    
    if (preselectedId && preselectedType) {
      if (preselectedType === 'region') {
        const item = REGIONS.find(r => r.id === preselectedId || r.name === preselectedId);
        if (item) {
          handleSelect('A', item, 'region');
        }
      } else if (preselectedType === 'department') {
        const item = DEPARTMENTS.find(d => d.id === preselectedId || d.name === preselectedId);
        if (item) {
          handleSelect('A', item, 'department');
        }
      } else if (preselectedType === 'commune') {
        const fetchCommune = async () => {
          try {
            const res = await fetch(`https://geo.api.gouv.fr/communes/${preselectedId}?fields=nom,code,codesPostaux,population,departement,region`);
            const data = await res.json();
            if (data && data.code) {
              handleSelect('A', data, 'commune');
            }
          } catch (e) {
            console.error("Error pre-loading commune:", e);
          }
        };
        fetchCommune();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, isPremium]);

  if (loading || !isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    );
  }

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
  
  const showDropdownA = activeSearch === 'A' && (resultsA.regions.length > 0 || resultsA.depts.length > 0 || searchA.results.length > 0);
  const showDropdownB = activeSearch === 'B' && (resultsB.regions.length > 0 || resultsB.depts.length > 0 || searchB.results.length > 0);

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
              <div ref={containerRefA} className="relative">
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
                  {showDropdownA && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
                    >
                       {/* Regions */}
                       {resultsA.regions.map(r => (
                         <button key={r.id} onClick={() => handleSelect('A', r, 'region')} className="w-full px-8 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                             {regionPaths[r.id] ? (
                               <svg 
                                 viewBox="0 0 250 250" 
                                 className="w-full h-full text-blue-500"
                                 preserveAspectRatio="xMidYMid meet"
                               >
                                 <path 
                                   d={regionPaths[r.id]} 
                                   fill="currentColor" 
                                   stroke="white" 
                                   strokeWidth="3" 
                                   strokeLinejoin="round"
                                 />
                               </svg>
                             ) : (
                               <Map size={20} className="text-slate-400" />
                             )}
                           </div>
                           <div className="flex-1">
                             <p className="font-bold text-slate-900">{r.name}</p>
                             <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Région</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {/* Departments */}
                       {resultsA.depts.map(d => (
                         <button key={d.name} onClick={() => handleSelect('A', d, 'department')} className="w-full px-8 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                             {departmentPaths[d.id] ? (
                               <svg 
                                 viewBox={departmentPaths[d.id].viewBox} 
                                 className="w-full h-full text-blue-500"
                                 preserveAspectRatio="xMidYMid meet"
                               >
                                 <path 
                                   d={departmentPaths[d.id].d} 
                                   fill="currentColor" 
                                   stroke="white" 
                                   strokeWidth="2" 
                                   strokeLinejoin="round"
                                 />
                               </svg>
                             ) : (
                               <Building2 size={20} className="text-blue-500" />
                             )}
                           </div>
                           <div className="flex-1">
                             <p className="font-bold text-slate-900">{d.name}</p>
                             <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Département</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {/* Communes */}
                       {(!allowedType || allowedType === 'commune') && searchA.results.map(c => (
                         <button key={c.code} onClick={() => handleSelect('A', c, 'commune')} className="w-full px-8 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                             <MapPin size={20} />
                           </div>
                           <div className="flex-1">
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
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-slate-400 overflow-hidden shrink-0 p-2">
                      {sideA.type === 'region' && regionPaths[sideA.id] ? (
                        <svg 
                          viewBox="0 0 250 250" 
                          className="w-full h-full text-blue-500 drop-shadow-sm opacity-90"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <path 
                            d={regionPaths[sideA.id]} 
                            fill="currentColor" 
                            stroke="white" 
                            strokeWidth="2.5" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : sideA.type === 'department' && departmentPaths[sideA.id] ? (
                        <svg 
                          viewBox={departmentPaths[sideA.id].viewBox} 
                          className="w-full h-full text-blue-500 drop-shadow-sm opacity-90"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <path 
                            d={departmentPaths[sideA.id].d} 
                            fill="currentColor" 
                            stroke="white" 
                            strokeWidth="2" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : sideA.type === 'region' ? (
                        <Map size={32} />
                      ) : sideA.type === 'department' ? (
                        <Building2 size={32} />
                      ) : (
                        <MapPin size={32} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{sideA.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {sideA.type === 'commune' ? sideA.data.departement?.nom || 'Commune' : sideA.type === 'region' ? 'Région' : 'Département'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Population</p>
                      <p className="text-lg font-bold text-slate-900">{(sideA.data.demographie?.populationTotal || sideA.data.population)?.toLocaleString() || 'NC'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Responsable</p>
                      <p className="text-lg font-bold text-slate-900 truncate">{sideA.data.president || sideA.data.politique?.elu || sideA.data.mayor || 'NC'}</p>
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
              <div ref={containerRefB} className="relative">
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
                  {showDropdownB && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
                    >
                       {resultsB.regions.map(r => (
                         <button key={r.id} onClick={() => handleSelect('B', r, 'region')} className="w-full px-8 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                             {regionPaths[r.id] ? (
                               <svg 
                                 viewBox="0 0 250 250" 
                                 className="w-full h-full text-blue-500"
                                 preserveAspectRatio="xMidYMid meet"
                               >
                                 <path 
                                   d={regionPaths[r.id]} 
                                   fill="currentColor" 
                                   stroke="white" 
                                   strokeWidth="3" 
                                   strokeLinejoin="round"
                                 />
                               </svg>
                             ) : (
                               <Map size={20} className="text-slate-400" />
                             )}
                           </div>
                           <div className="flex-1">
                             <p className="font-bold text-slate-900">{r.name}</p>
                             <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Région</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {/* Departments */}
                       {resultsB.depts.map(d => (
                         <button key={d.name} onClick={() => handleSelect('B', d, 'department')} className="w-full px-8 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center p-1">
                             {departmentPaths[d.id] ? (
                               <svg 
                                 viewBox={departmentPaths[d.id].viewBox} 
                                 className="w-full h-full text-blue-500"
                                 preserveAspectRatio="xMidYMid meet"
                               >
                                 <path 
                                   d={departmentPaths[d.id].d} 
                                   fill="currentColor" 
                                   stroke="white" 
                                   strokeWidth="2" 
                                   strokeLinejoin="round"
                                 />
                               </svg>
                             ) : (
                               <Building2 size={20} className="text-blue-500" />
                             )}
                           </div>
                           <div className="flex-1">
                             <p className="font-bold text-slate-900">{d.name}</p>
                             <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Département</p>
                           </div>
                           <ArrowRight size={16} className="text-slate-300" />
                         </button>
                       ))}
                       {(!allowedType || allowedType === 'commune') && searchB.results.map(c => (
                         <button key={c.code} onClick={() => handleSelect('B', c, 'commune')} className="w-full px-8 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left">
                           <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                             <MapPin size={20} />
                           </div>
                           <div className="flex-1">
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
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-slate-400 overflow-hidden shrink-0 p-2">
                      {sideB.type === 'region' && regionPaths[sideB.id] ? (
                        <svg 
                          viewBox="0 0 250 250" 
                          className="w-full h-full text-blue-500 drop-shadow-sm opacity-90"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <path 
                            d={regionPaths[sideB.id]} 
                            fill="currentColor" 
                            stroke="white" 
                            strokeWidth="2.5" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : sideB.type === 'department' && departmentPaths[sideB.id] ? (
                        <svg 
                          viewBox={departmentPaths[sideB.id].viewBox} 
                          className="w-full h-full text-blue-500 drop-shadow-sm opacity-90"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <path 
                            d={departmentPaths[sideB.id].d} 
                            fill="currentColor" 
                            stroke="white" 
                            strokeWidth="2" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : sideB.type === 'region' ? (
                        <Map size={32} />
                      ) : sideB.type === 'department' ? (
                        <Building2 size={32} />
                      ) : (
                        <MapPin size={32} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{sideB.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {sideB.type === 'commune' ? sideB.data.departement?.nom || 'Commune' : sideB.type === 'region' ? 'Région' : 'Département'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Population</p>
                      <p className="text-lg font-bold text-slate-900">{(sideB.data.demographie?.populationTotal || sideB.data.population)?.toLocaleString() || 'NC'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Responsable</p>
                      <p className="text-lg font-bold text-slate-900 truncate">{sideB.data.president || sideB.data.politique?.elu || sideB.data.mayor || 'NC'}</p>
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
          <div className="bg-slate-50/50 border-t border-slate-100 p-12 md:p-16 text-slate-800 overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-slate-200/60 hidden lg:block" />
            
            <div className="relative z-10">
              <h3 className="text-3xl font-staatliches uppercase tracking-widest mb-16 text-center bg-gradient-to-r from-rose-600 via-fuchsia-600 to-rose-600 bg-clip-text text-transparent">Indicateurs de Performance Comparative</h3>
              
              {!sideA && !sideB ? (
                <div className="mt-12 text-center text-slate-400 font-bold italic uppercase tracking-widest text-xs">
                  Sélectionnez deux territoires pour activer la comparaison
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-24">
                  {[
                    {
                      title: "Démographie",
                      metrics: [
                        { key: "demographie.populationTotal", label: "Population Totale", color: "text-blue-500", format: (v: any) => v ? v.toLocaleString('fr-FR') : 'NC', max: 13000000 },
                        { key: "demographie.densite", label: "Densité (hab/km²)", color: "text-blue-500", format: (v: any) => v ? v.toLocaleString('fr-FR') : 'NC', max: 21000 },
                        { key: "demographie.moins25ans", label: "Moins de 25 ans (%)", color: "text-blue-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                        { key: "demographie.plus65ans", label: "Plus de 65 ans (%)", color: "text-blue-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                      ]
                    },
                    {
                      title: "Économie & Emploi",
                      metrics: [
                        { key: "economie.chomage", label: "Taux de chômage (%)", color: "text-emerald-500", format: (v: any) => v ? `${v}%` : 'NC', max: 25, inverse: true },
                        { key: "economie.revenuMedian", label: "Revenu médian mensuel", color: "text-emerald-500", format: (v: any) => v ? `${v} €` : 'NC', max: 4000 },
                        { key: "economie.pauvrete", label: "Taux de pauvreté (%)", color: "text-emerald-500", format: (v: any) => v ? `${v}%` : 'NC', max: 30, inverse: true },
                      ]
                    },
                    {
                      title: "Éducation",
                      metrics: [
                        { key: "education.bac", label: "Taux de réussite au bac (%)", color: "text-indigo-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                        { key: "education.diplomesSup", label: "Diplômés du supérieur (%)", color: "text-indigo-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                        { key: "education.decrochage", label: "Décrochage scolaire (%)", color: "text-indigo-500", format: (v: any) => v ? `${v}%` : 'NC', max: 20, inverse: true },
                      ]
                    },
                    {
                      title: "Santé",
                      metrics: [
                        { key: "sante.medecins10k", label: "Médecins pour 10k hab.", color: "text-rose-500", format: (v: any) => v ? v : 'NC', max: 100 },
                        { key: "sante.esperanceVie", label: "Espérance de vie (ans)", color: "text-rose-500", format: (v: any) => v ? v : 'NC', max: 90 },
                        { key: "sante.scoreAPL", label: "APL médecins (consult./an)", color: "text-rose-500", format: (v: any) => v ?? 'NC', max: 8 },
                      ]
                    },
                    {
                      title: "Sécurité",
                      metrics: [
                        { key: "securite.atteintesPersonnes", label: "Atteintes personnes / 1000", color: "text-amber-500", format: (v: any) => v ? v : 'NC', max: 50, inverse: true },
                        { key: "securite.atteintesBiens", label: "Atteintes biens / 1000", color: "text-amber-500", format: (v: any) => v ? v : 'NC', max: 100, inverse: true },
                      ]
                    },
                    {
                      title: "Logement",
                      metrics: [
                        { key: "logement.prixM2", label: "Prix moyen au m²", color: "text-cyan-500", format: (v: any) => v ? `${v.toLocaleString('fr-FR')} €` : 'NC', max: 15000, inverse: true },
                        { key: "logement.logementsSociaux", label: "Logements sociaux (%)", color: "text-cyan-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                        { key: "logement.proprietaires", label: "Propriétaires (%)", color: "text-cyan-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                      ]
                    },
                    {
                      title: "Finances Locales",
                      metrics: [
                        { key: "finances.budgetHabitant", label: "Budget par habitant", color: "text-pink-500", format: (v: any) => v ? `${v} €` : 'NC', max: 5000 },
                        { key: "finances.endettement", label: "Taux d'endettement (%)", color: "text-pink-500", format: (v: any) => v ? `${v}%` : 'NC', max: 150, inverse: true },
                        { key: "finances.investissement", label: "Part investissement (%)", color: "text-pink-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                      ]
                    },
                    {
                      title: "Environnement",
                      metrics: [
                        { key: "environnement.qualiteAir", label: "Indice ATMO moyen (1-6)", color: "text-purple-500", format: (v: any) => v ?? 'NC', max: 6, inverse: true },
                        { key: "environnement.surfaceNaturelle", label: "Surface naturelle (%)", color: "text-purple-500", format: (v: any) => v ? `${v}%` : 'NC', max: 100 },
                      ]
                    }
                  ].map((category, catIdx) => (
                    <div key={catIdx} className="space-y-8">
                      <h4 className="text-xl font-staatliches uppercase tracking-wide border-b border-slate-200 pb-4 text-slate-900">{category.title}</h4>
                      <div className="space-y-8">
                        {(category.metrics as any[]).map((metric, mIdx) => {
                          const getVal = (data: any, path: string) => {
                            if (!data) return null;
                            return path.split('.').reduce((obj, key) => (obj && typeof obj[key] !== 'undefined') ? obj[key] : null, data);
                          };
                          
                          const valA = getVal(sideA?.data, metric.key);
                          const valB = getVal(sideB?.data, metric.key);
                          
                          // Determine winner (A, B, or none)
                          let winner = null;
                          if (valA !== null && valB !== null) {
                            if (valA > valB) winner = metric.inverse ? 'B' : 'A';
                            else if (valB > valA) winner = metric.inverse ? 'A' : 'B';
                          }

                          const renderBar = (val: any, max: number, isRight: boolean) => {
                            if (val === null) return null;
                            const percent = Math.min((val / max) * 100, 100);
                            return (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                className={`h-full ${isRight ? 'rounded-r-full bg-gradient-to-r' : 'rounded-l-full bg-gradient-to-l'} ${metric.color.replace('text-', 'from-')} to-transparent opacity-80`}
                              />
                            );
                          };

                          return (
                            <div key={mIdx} className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <div className={`flex-1 text-right font-extrabold text-sm ${winner === 'A' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {metric.format(valA)}
                                </div>
                                <div className={`flex-[2] text-center font-black uppercase text-[10px] tracking-widest text-slate-500 ${metric.color}`}>
                                  {metric.label}
                                </div>
                                <div className={`flex-1 text-left font-extrabold text-sm ${winner === 'B' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {metric.format(valB)}
                                </div>
                              </div>
                              <div className="relative h-2 bg-slate-200/60 rounded-full overflow-hidden flex">
                                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                  <div className="w-px h-full bg-slate-300" />
                                </div>
                                <div className="flex-1 flex justify-end pr-[1px]">
                                  {renderBar(valA, metric.max, false)}
                                </div>
                                <div className="flex-1 pl-[1px]">
                                  {renderBar(valB, metric.max, true)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {/* Politique (Text only) */}
                  <div className="space-y-8">
                    <h4 className="text-xl font-staatliches uppercase tracking-wide border-b border-slate-200 pb-4 text-slate-900">Politique</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Side A */}
                      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                        <div className="text-center font-staatliches uppercase tracking-wider text-xl text-rose-600 mb-6 flex flex-col items-center gap-2">
                          <span>{sideA?.name || "Territoire A"}</span>
                          {sideA?.data.isEstimated && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] uppercase tracking-widest rounded-full border border-amber-200">
                              Données estimées
                            </span>
                          )}
                        </div>
                        {sideA?.data.politique ? (
                          <>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100/80">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Présidentielle 2022 (T1)</div>
                              <div className="text-sm font-bold text-slate-800">{sideA.data.politique.pres2022T1}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100/80">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Présidentielle 2022 (T2)</div>
                              <div className="text-sm font-bold text-slate-800">{sideA.data.politique.pres2022T2}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100/80">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Élu en place</div>
                              <div className="text-sm font-bold text-slate-800">{sideA.data.politique.elu} {sideA.data.politique.eluDepuis && `(depuis ${sideA.data.politique.eluDepuis})`}</div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-slate-400 italic text-sm py-4">Données non disponibles</div>
                        )}
                      </div>
                      
                      {/* Side B */}
                      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                        <div className="text-center font-staatliches uppercase tracking-wider text-xl text-fuchsia-600 mb-6 flex flex-col items-center gap-2">
                          <span>{sideB?.name || "Territoire B"}</span>
                          {sideB?.data.isEstimated && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] uppercase tracking-widest rounded-full border border-amber-200">
                              Données estimées
                            </span>
                          )}
                        </div>
                        {sideB?.data.politique ? (
                          <>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100/80">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Présidentielle 2022 (T1)</div>
                              <div className="text-sm font-bold text-slate-800">{sideB.data.politique.pres2022T1}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100/80">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Présidentielle 2022 (T2)</div>
                              <div className="text-sm font-bold text-slate-800">{sideB.data.politique.pres2022T2}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100/80">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Élu en place</div>
                              <div className="text-sm font-bold text-slate-800">{sideB.data.politique.elu} {sideB.data.politique.eluDepuis && `(depuis ${sideB.data.politique.eluDepuis})`}</div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-slate-400 italic text-sm py-4">Données non disponibles</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ComparateurApp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    }>
      <ComparateurContent />
    </Suspense>
  );
}

