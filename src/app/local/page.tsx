"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Users, Building2, TrendingUp, Search, ArrowRight, Vote,
  History, Building, ChevronRight, Map, Layers, LayoutGrid, Lock, Loader2, Star
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import GlossaryText from "@/components/ui/GlossaryText";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";
import { getPremiumUrl } from "@/lib/utils";
import { useCommuneSearch } from "@/lib/hooks/useCommuneSearch";
import type { CommuneResult } from "@/lib/hooks/useCommuneSearch";
import CommuneDetailPanel from "@/components/local/CommuneDetailPanel";
// Using data from backend now
// Featured cities shown by default
const FEATURED_CITIES = [
  { name: "Paris", code: "75056", mayor: "Emmanuel Grégoire", party: "PS", population: "2.1M", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_du_trocad%C3%A9ro.jpg/800px-La_Tour_Eiffel_vue_du_trocad%C3%A9ro.jpg", safety: 60, education: 90, health: 95, employment: 88 },
  { name: "Marseille", code: "13055", mayor: "Benoît Payan", party: "DVG", population: "870K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Marseille_Vieux_Port.jpg/800px-Marseille_Vieux_Port.jpg", safety: 55, education: 78, health: 85, employment: 75 },
  { name: "Lyon", code: "69123", mayor: "Grégory Doucet", party: "EELV", population: "522K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lyon_-_Place_Bellecour.jpg/800px-Lyon_-_Place_Bellecour.jpg", safety: 72, education: 85, health: 88, employment: 84 },
  { name: "Toulouse", code: "31555", mayor: "Jean-Luc Moudenc", party: "LR", population: "498K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Capitole_de_Toulouse.jpg/800px-Capitole_de_Toulouse.jpg", safety: 75, education: 82, health: 80, employment: 78 },
  { name: "Nice", code: "06088", mayor: "Eric Ciotti", party: "Horizons", population: "342K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Promenade_des_Anglais_Nice.jpg/800px-Promenade_des_Anglais_Nice.jpg", safety: 68, education: 75, health: 82, employment: 72 },
  { name: "Nantes", code: "44109", mayor: "Johanna Rolland", party: "PS", population: "320K", image: "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&q=80&w=800", safety: 70, education: 84, health: 82, employment: 85 },
];

export default function LocalPoliticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-rose-600" size={40} /></div>}>
      <LocalPoliticsContent />
    </Suspense>
  );
}

function LocalPoliticsContent() {
  const { userId, isPremium, loading: pLoading } = usePremium();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"region" | "departement" | "commune">("commune");
  const [search, setSearch] = useState("");
  const communeSearch = useCommuneSearch();
  const [selectedCommune, setSelectedCommune] = useState<CommuneResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loadingSave, setLoadingSave] = useState<string | null>(null);

  useEffect(() => {
    if (userId && isPremium) {
      api.getUserSavedItems(userId).then(setSavedItems);
    }
  }, [userId, isPremium]);

  useEffect(() => {
    const code = searchParams.get('code');
    const type = searchParams.get('type');
    
    if (code && type) {
      if (type === 'commune') {
        setActiveTab('commune');
        // Fetch commune data and open panel
        const fetchCommune = async () => {
           try {
             const res = await fetch(`https://geo.api.gouv.fr/communes/${code}?fields=nom,code,codesPostaux,population,departement,region`);
             const data = await res.json();
             if (data && data.code) {
               setSelectedCommune(data);
             }
           } catch (e) {
             console.error("Error fetching linked commune:", e);
           }
        };
        fetchCommune();
      } else if (type === 'region') {
        setActiveTab('region');
        setSearch(code); // Filter by region name
      } else if (type === 'department') {
        setActiveTab('departement');
        setSearch(code); // Filter by department name
      }
    }
  }, [searchParams]);

  const toggleFavorite = async (id: string, type: 'region' | 'department') => {
    if (!userId) {
      alert("Veuillez vous connecter pour enregistrer vos favoris.");
      return;
    }

    if (!isPremium) {
      alert("Cette fonctionnalité est réservée aux membres PREMIUM. Passez à l'offre Elite pour suivre vos territoires !");
      return;
    }

    setLoadingSave(id);
    try {
      const isCurrentlySaved = savedItems.some(i => i.item_id === id && i.item_type === type);
      if (isCurrentlySaved) {
        await api.unsaveItem(userId, id, type);
      } else {
        await api.saveItem(userId, id, type);
      }
      
      // Refresh saved items list
      const updated = await api.getUserSavedItems(userId);
      setSavedItems(updated);
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
    } finally {
      setLoadingSave(null);
    }
  };

  const [territoriesData, setTerritoriesData] = useState<{regions: any[], departments: any[]}>({ regions: [], departments: [] });
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    fetch(`${API_URL}/api/comparateur/list`)
      .then(res => res.json())
      .then(data => {
        if (data && data.regions) setTerritoriesData(data);
      })
      .catch(err => console.error("Error fetching list:", err));
  }, [API_URL]);

  const filteredItems = (() => {
    const s = search.toLowerCase();
    if (activeTab === "region") {
      return territoriesData.regions.filter(r => r.name.toLowerCase().includes(s) || (r.president && r.president.toLowerCase().includes(s)));
    } else if (activeTab === "departement") {
      return territoriesData.departments.filter(d => d.name.toLowerCase().includes(s) || (d.president && d.president.toLowerCase().includes(s)));
    }
    return []; // communes handled separately
  })();

  return (
    <>
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
              La Politique <span className="inline-block bg-gradient-to-r from-rose-600 via-fuchsia-600 to-rose-600 bg-clip-text text-transparent italic pl-2 pr-12">Locale</span>
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
                {activeTab === 'commune' && communeSearch.loading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400 animate-spin" size={18} />
                )}
                <input 
                  type="text"
                  placeholder={
                    activeTab === 'commune' ? "Rechercher parmi 35 000 communes..." : 
                    activeTab === 'departement' ? "Rechercher un département, un président..." :
                    "Rechercher une région, un président..."
                  }
                  value={activeTab === 'commune' ? communeSearch.query : search}
                  onChange={(e) => {
                    if (activeTab === 'commune') {
                      communeSearch.setQuery(e.target.value);
                      communeSearch.ensureMayorsLoaded();
                      setShowDropdown(true);
                    } else {
                      setSearch(e.target.value);
                    }
                  }}
                  onFocus={() => {
                    if (activeTab === 'commune') {
                      communeSearch.ensureMayorsLoaded();
                      setShowDropdown(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-sm font-medium text-slate-900"
                />

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {activeTab === 'commune' && showDropdown && communeSearch.results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/60 overflow-hidden z-40 max-h-[400px] overflow-y-auto"
                    >
                      {communeSearch.results.map((commune, i) => {
                        const mayor = communeSearch.getMayor(commune.code);
                        return (
                          <button
                            key={commune.code}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedCommune(commune);
                              setShowDropdown(false);
                              communeSearch.setQuery(commune.nom);
                            }}
                            className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-rose-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-fuchsia-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                              <MapPin size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">{commune.nom}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{commune.codesPostaux?.[0]}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>{commune.departement?.nom}</span>
                                {mayor && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="font-semibold text-slate-700">{mayor.n}</span>
                                    {mayor.p && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-bold">{mayor.p}</span>}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] font-bold text-slate-400">{commune.population?.toLocaleString('fr-FR')} hab.</span>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Counter badge */}
                {activeTab === 'commune' && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {communeSearch.mayorsDb ? '34 637 communes disponibles' : communeSearch.mayorsLoading ? 'Chargement de la base...' : 'Tapez pour rechercher'}
                    </span>
                    {communeSearch.mayorsDb && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                )}
              </div>
            </div>

            {/* COMMUNE TAB: Featured cities + search results */}
            {activeTab === 'commune' && (
              <>
                {!communeSearch.query && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grandes villes</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {FEATURED_CITIES.map((city, idx) => (
                        <motion.button
                          key={city.code}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          onClick={async () => {
                            await communeSearch.ensureMayorsLoaded();
                            const res = await fetch(`https://geo.api.gouv.fr/communes/${city.code}?fields=nom,code,codesPostaux,population,departement,region`);
                            const data = await res.json();
                            setSelectedCommune(data);
                          }}
                          className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 text-left"
                        >
                          <div className="relative h-48 overflow-hidden">
                            <img src={city.image} alt={city.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                            <div className="absolute bottom-4 left-6">
                              <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest mb-1">Commune</p>
                              <h4 className="text-white font-bold text-xl leading-tight">{city.name}</h4>
                            </div>
                          </div>
                          <div className="p-8 space-y-6">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Maire</span>
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full">{city.party}</span>
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-tight">{city.mayor}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Users size={10} /> Population</span>
                                <p className="text-sm font-black text-slate-900">{city.population}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Building2 size={10} /> Mandat</span>
                                <p className="text-sm font-black text-slate-900">2026</p>
                              </div>
                            </div>
                            <div className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-rose-600 transition-colors pt-2">
                              <span className="text-[10px] font-black uppercase tracking-widest">Voir les détails</span>
                              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-rose-600 group-hover/btn:text-white transition-all"><ChevronRight size={18} /></div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* REGION / DEPARTMENT TAB: Card grid */}
            {activeTab !== 'commune' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredItems.map((item: any, idx: number) => (
                  <motion.div
                    key={`${activeTab}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06 }}
                    className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500"
                  >
                    {item.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          {isPremium && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.name, activeTab === 'region' ? 'region' : 'department');
                              }}
                              disabled={loadingSave === item.name}
                              className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                                savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department'))
                                  ? "bg-amber-400 text-slate-900" 
                                  : "bg-white/20 text-white hover:bg-white/30"
                              }`}
                            >
                              {loadingSave === item.name ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Star size={14} className={savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department')) ? "fill-current" : ""} />
                              )}
                            </button>
                          )}
                        </div>

                        <div className="absolute bottom-4 left-6">
                          <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest mb-1">{activeTab === 'region' ? 'Région' : 'Département'}</p>
                          <h4 className="text-white font-bold text-xl leading-tight">{item.name}</h4>
                        </div>
                      </div>
                    )}
                    {!item.image && (
                      <div className="relative h-28 bg-gradient-to-br from-rose-600 to-fuchsia-600 flex items-end p-6">
                        <div className="absolute top-4 right-4 flex gap-2">
                          {isPremium && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.name, activeTab === 'region' ? 'region' : 'department');
                              }}
                              disabled={loadingSave === item.name}
                              className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                                savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department'))
                                  ? "bg-amber-400 text-slate-900" 
                                  : "bg-white/20 text-white hover:bg-white/30"
                              }`}
                            >
                              {loadingSave === item.name ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Star size={14} className={savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department')) ? "fill-current" : ""} />
                              )}
                            </button>
                          )}
                        </div>
                        <div>
                          <p className="text-rose-200 font-black text-[9px] uppercase tracking-widest mb-1">{activeTab === 'region' ? 'Région' : 'Département'}</p>
                          <h4 className="text-white font-bold text-xl leading-tight">{item.name}</h4>
                        </div>
                      </div>
                    )}
                    <div className="p-8 space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Président(e)</span>
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full">{item.party}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-tight">{item.president}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><TrendingUp size={10} /> Budget</span>
                          <p className="text-sm font-black text-slate-900">{item.budget}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Users size={10} /> Population</span>
                          <p className="text-sm font-black text-slate-900">{item.population || "N/A"}</p>
                        </div>
                      </div>
                      <button className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-rose-600 transition-colors pt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">Voir les compétences</span>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-rose-600 group-hover/btn:text-white transition-all"><ChevronRight size={18} /></div>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

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

            {/* TEASER/TOOL: LE COMPARATEUR TERRITORIAL */}
            <Link 
              href={isPremium ? "/local/comparateur/app" : "/local/comparateur"}
              className="relative group block overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                 <Map size={120} />
              </div>

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">Le Comparateur</h3>
                  {isPremium && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase rounded-full">Elite</span>}
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-200">
                  <Map size={20} />
                </div>
              </div>
              
              <div className={`space-y-4 transition-all duration-700 ${!isPremium ? 'opacity-40 blur-[5px] pointer-events-none' : 'opacity-100'}`}>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black">A</div>
                    <span className="text-sm font-bold text-slate-400">Territoire A...</span>
                  </div>
                </div>
                <div className="flex justify-center -my-2 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center text-amber-500 font-black text-[10px] shadow-lg">VS</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black">B</div>
                    <span className="text-sm font-bold text-slate-400">Territoire B...</span>
                  </div>
                </div>
              </div>

              {/* TEASER OVERLAY - ONLY FOR NON-PREMIUM */}
              {(!isPremium && !pLoading) && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10">
                  <div className="space-y-2 mb-6">
                    <h4 className="text-xl font-staatliches uppercase tracking-tight text-amber-600">Le Comparateur <span className="text-slate-900">Territorial</span></h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">
                      Villes vs Villes, Départements vs Départements <br />
                      ou Régions vs Régions : comparez tout.
                    </p>
                  </div>
                  <div className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl transition-all group-hover:bg-amber-500 group-hover:scale-105">
                    Découvrir l'outil
                  </div>
                </div>
              )}
            </Link>

            {/* TEASER/TOOL: RADAR DES GRANDS TRAVAUX */}
            <Link 
              href={isPremium ? "/local/radar/app" : "/local/radar"}
              className="relative group block overflow-hidden bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Building2 size={80} className="text-amber-400" />
              </div>

              <div className="flex items-center justify-between mb-8 relative z-20">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">Radar des Grands Travaux</h3>
                  {isPremium && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase rounded-full border border-amber-500/30">Accès Illimité</span>}
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                  <TrendingUp size={16} />
                </div>
              </div>

              <div className={`space-y-4 transition-all duration-700 relative z-10 ${!isPremium ? 'opacity-20 blur-[6px] pointer-events-none' : 'opacity-100'}`}>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold mb-2">Extension du Métro</h4>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-2/3 shadow-[0_0_10px_#f59e0b]" />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold mb-2">Pôle Santé Régional</h4>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-1/3 shadow-[0_0_10px_#f59e0b]" />
                  </div>
                </div>
              </div>

              {/* TEASER OVERLAY - ONLY FOR NON-PREMIUM */}
              {(!isPremium && !pLoading) && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] flex flex-col items-center justify-center p-6 text-center z-30">
                  <div className="space-y-2 mb-6">
                    <h4 className="text-xl font-staatliches uppercase tracking-tight text-white">Radar des <span className="text-amber-500 italic">Grands Travaux</span></h4>
                    <p className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-relaxed">
                      Suivi budgétaire, retards et <br />
                      coulisses des chantiers locaux.
                    </p>
                  </div>
                  <div className="px-6 py-3 bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 group-hover:bg-white group-hover:text-amber-600 transition-all">
                    Accéder aux dossiers
                  </div>
                </div>
              )}
            </Link>

          </div>
        </div>
      </div>
    </main>

      {/* COMMUNE DETAIL PANEL */}
      <CommuneDetailPanel
        commune={selectedCommune}
        mayor={selectedCommune ? communeSearch.getMayor(selectedCommune.code) : null}
        onClose={() => setSelectedCommune(null)}
      />
    </>
  );
}
