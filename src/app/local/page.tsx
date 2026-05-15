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
import { REGIONS, DEPARTMENTS } from "@/lib/data/territories";

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

  const filteredItems = (() => {
    const s = search.toLowerCase();
    if (activeTab === "region") {
      return REGIONS.filter(r => r.name.toLowerCase().includes(s) || (r.president && r.president.toLowerCase().includes(s)));
    } else if (activeTab === "departement") {
      return DEPARTMENTS.filter(d => d.name.toLowerCase().includes(s) || (d.president && d.president.toLowerCase().includes(s)));
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
                    flex-1 flex items-center justify-center gap-4 py-6 px-8 rounded-[2rem] transition-all duration-500 group
                    ${isActive ? "bg-rose-50 text-rose-600 shadow-inner" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}
                  `}
                >
                  <div className={`p-3 rounded-2xl transition-colors ${isActive ? "bg-rose-100" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Échelon</p>
                    <p className="text-lg font-staatliches uppercase tracking-wide">{tab.label}</p>
                  </div>
                  {isActive && (
                    <motion.div layoutId="activeTab" className="w-1.5 h-1.5 rounded-full bg-rose-600 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* LEFT COL: Search & List */}
          <div className="lg:col-span-8 space-y-12">
            {/* Search Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-600 transition-colors">
                <Search size={22} />
              </div>
              <input
                type="text"
                placeholder={activeTab === 'commune' ? "Rechercher une ville, un code postal..." : "Rechercher une région, un président..."}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (activeTab === 'commune') {
                    communeSearch.setQuery(e.target.value);
                    setShowDropdown(true);
                  }
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-3xl py-7 pl-20 pr-10 text-xl font-medium focus:outline-none focus:border-rose-600/30 focus:bg-rose-50/10 transition-all shadow-xl shadow-slate-200/20"
              />
              
              {/* Commune Dropdown */}
              <AnimatePresence>
                {activeTab === 'commune' && showDropdown && search.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 w-full mt-4 bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto"
                  >
                    {communeSearch.results.map((c: CommuneResult) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setSelectedCommune(c);
                          setSearch("");
                          setShowDropdown(false);
                        }}
                        className="w-full px-8 py-6 text-left hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{c.nom}</p>
                          <p className="text-sm text-slate-400">{c.codesPostaux[0]} • {c.departement.nom}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                          <ChevronRight size={20} />
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Content Display */}
            <div className="space-y-8">
              {activeTab === 'commune' && (
                <>
                  {!selectedCommune ? (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-staatliches uppercase tracking-wide">Villes à la Une</h3>
                        <div className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-widest">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                          Mise à jour 2024
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {FEATURED_CITIES.map((city, idx) => (
                          <motion.button
                            key={city.code}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => {
                              // Simulate selecting a commune from search
                              setSelectedCommune({
                                nom: city.name,
                                code: city.code,
                                population: parseInt(city.population.replace('M', '000000').replace('K', '000')),
                                codesPostaux: [],
                                departement: { nom: "" },
                                region: { nom: "" }
                              } as any);
                            }}
                            className="group relative bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 text-left"
                          >
                            <div className="h-40 overflow-hidden relative">
                              <img src={city.image} alt={city.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                              <div className="absolute bottom-4 left-6">
                                <h4 className="text-white font-bold text-xl">{city.name}</h4>
                                <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest">{city.mayor}</p>
                              </div>
                            </div>
                            <div className="p-6">
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
                  ) : (
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedCommune(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-colors font-black text-[10px] uppercase tracking-widest"
                      >
                        <ChevronRight className="rotate-180" size={16} />
                        Retour à la liste
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* REGION / DEPARTMENT TAB: Card grid */}
              {activeTab !== 'commune' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredItems.map((item: any, idx: number) => (
                    <motion.div
                      key={`${activeTab}-${item.id || idx}`}
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
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-rose-600">
                            <Users size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Président</p>
                            <p className="font-bold text-slate-900">{item.president}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-rose-600">
                            <Building2 size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parti Majoritaire</p>
                            <p className="font-bold text-slate-900">{item.party}</p>
                          </div>
                        </div>
                        <Link 
                          href={activeTab === 'region' ? `/local/comparateur?id=${item.id}&type=region` : `/local/comparateur?id=${item.id}&type=department`}
                          className="w-full py-4 px-6 bg-slate-900 text-white rounded-2xl font-staatliches uppercase tracking-wide flex items-center justify-center gap-3 hover:bg-rose-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Analyser les performances
                          <ArrowRight size={18} />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COL: Sidebars */}
          <div className="lg:col-span-4 space-y-8">
            {/* Prochaines échéances Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/20 blur-3xl rounded-full" />
               <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center"><Vote size={20} className="text-rose-400" /></div>
                   <h3 className="text-2xl font-staatliches uppercase tracking-wide">Prochaines échéances</h3>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                      <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest mb-1">Mars 2026</p>
                      <p className="font-bold text-lg mb-1">Élections Municipales</p>
                      <p className="text-sm text-white/60">Renouvellement de tous les maires de France.</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 opacity-50">
                      <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">Mars 2028</p>
                      <p className="font-bold text-lg mb-1">Élections Régionales</p>
                      <p className="text-sm text-white/60">Renouvellement des conseils régionaux.</p>
                    </div>
                 </div>
               </div>
            </div>

            {/* "Le Saviez-vous" Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-6">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <History size={20} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-900 leading-tight">Le Saviez-vous ?</h3>
                <p className="text-slate-500 italic leading-relaxed">
                  Les maires sont élus par le conseil municipal, qui est lui-même élu au suffrage universel direct.
                </p>
                <div className="pt-4 border-t border-slate-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Astuce</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Passez votre souris sur les mots soulignés pour voir leur définition.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Premium Teaser (if not premium) */}
            {!isPremium && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] p-8 text-slate-900 space-y-6 shadow-xl shadow-orange-200">
                <div className="w-12 h-12 rounded-2xl bg-white/30 flex items-center justify-center">
                  <Lock size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-staatliches uppercase tracking-wide leading-tight">Accès Premium</h3>
                  <p className="text-sm font-medium opacity-90">Débloquez l'analyse comparative détaillée des budgets et de la sécurité de votre commune.</p>
                </div>
                <Link 
                  href={getPremiumUrl()}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-staatliches uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  Découvrir l'offre Elite
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    
    <CommuneDetailPanel 
      isOpen={!!selectedCommune} 
      onClose={() => setSelectedCommune(null)} 
      commune={selectedCommune}
    />
    </>
  );
}
