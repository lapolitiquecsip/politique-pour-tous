"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Users, Building2, TrendingUp, Search, ArrowRight, Vote,
  History, Building, ChevronRight, Map, Layers, LayoutGrid, Lock, Loader2, Star, Coins
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
import TerritoryDetailPanel from "@/components/local/TerritoryDetailPanel";
import { REGIONS, DEPARTMENTS } from "@/lib/data/territories";
import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";
import { AwardBadge } from "@/components/ui/award-badge";

// Featured cities shown by default (Top 20)
const FEATURED_CITIES = [
  { name: "Paris", code: "75056", mayor: "Anne Hidalgo", party: "PS", population: "2.1M", image: "/cities/paris_bg_1779624272735.png", safety: 60, education: 90, health: 95, employment: 88 },
  { name: "Marseille", code: "13055", mayor: "Benoît Payan", party: "DVG", population: "870K", image: "/cities/marseille_bg_1779624285652.png", safety: 55, education: 78, health: 85, employment: 75 },
  { name: "Lyon", code: "69123", mayor: "Grégory Doucet", party: "EELV", population: "522K", image: "/cities/lyon_bg_1779624298539.png", safety: 72, education: 85, health: 88, employment: 84 },
  { name: "Toulouse", code: "31555", mayor: "Jean-Luc Moudenc", party: "LR", population: "498K", image: "/cities/toulouse_bg_1779624313174.png", safety: 75, education: 82, health: 80, employment: 78 },
  { name: "Nice", code: "06088", mayor: "Christian Estrosi", party: "Horizons", population: "342K", image: "/cities/nice_bg_1779624331877.png", safety: 68, education: 75, health: 82, employment: 72 },
  { name: "Nantes", code: "44109", mayor: "Johanna Rolland", party: "PS", population: "320K", image: "/cities/nantes_bg_1779624348520.png", safety: 70, education: 84, health: 82, employment: 85 },
  { name: "Montpellier", code: "34172", mayor: "Michaël Delafosse", party: "PS", population: "300K", image: "/cities/montpellier_bg_1779624362702.png", safety: 65, education: 80, health: 85, employment: 74 },
  { name: "Strasbourg", code: "67482", mayor: "Jeanne Barseghian", party: "EELV", population: "290K", image: "/cities/strasbourg_bg_1779624376756.png", safety: 74, education: 85, health: 86, employment: 80 },
  { name: "Bordeaux", code: "33063", mayor: "Pierre Hurmic", party: "EELV", population: "260K", image: "/cities/bordeaux_bg_1779624397748.png", safety: 76, education: 88, health: 89, employment: 82 },
  { name: "Lille", code: "59350", mayor: "Martine Aubry", party: "PS", population: "236K", image: "/cities/lille_bg_1779624410952.png", safety: 62, education: 80, health: 83, employment: 75 },
  { name: "Rennes", code: "35238", mayor: "Nathalie Appéré", party: "PS", population: "225K", image: "/cities/rennes_bg_1779624423348.png", safety: 80, education: 89, health: 88, employment: 86 },
  { name: "Reims", code: "51454", mayor: "Arnaud Robinet", party: "Horizons", population: "180K", image: "/cities/reims_bg_1779624439328.png", safety: 72, education: 79, health: 84, employment: 77 },
  { name: "Toulon", code: "83137", mayor: "Josée Massi", party: "DVD", population: "180K", image: "/cities/toulon_bg_1779624460673.png", safety: 64, education: 74, health: 80, employment: 72 },
  { name: "Saint-Étienne", code: "42218", mayor: "Gaël Perdriau", party: "DVD", population: "174K", image: "/cities/saint_etienne_bg_1779624474559.png", safety: 60, education: 75, health: 81, employment: 68 },
  { name: "Le Havre", code: "76351", mayor: "Édouard Philippe", party: "Horizons", population: "165K", image: "/cities/le_havre_bg_1779624488137.png", safety: 65, education: 76, health: 82, employment: 74 },
  { name: "Grenoble", code: "38185", mayor: "Éric Piolle", party: "EELV", population: "158K", image: "/cities/grenoble_bg_1779624501302.png", safety: 58, education: 86, health: 85, employment: 80 },
  { name: "Dijon", code: "21231", mayor: "François Rebsamen", party: "PS", population: "158K", image: "/cities/dijon_bg_1779624520804.png", safety: 78, education: 85, health: 87, employment: 82 },
  { name: "Angers", code: "49007", mayor: "Jean-Marc Verchère", party: "MoDem", population: "155K", image: "https://images.unsplash.com/photo-1559828556-3a7a9bdc99b7?auto=format&fit=crop&q=80&w=800", safety: 82, education: 88, health: 89, employment: 85 },
  { name: "Nîmes", code: "30189", mayor: "Jean-Paul Fournier", party: "LR", population: "148K", image: "https://images.unsplash.com/photo-1590089415225-401ed6f9b8ce?auto=format&fit=crop&q=80&w=800", safety: 61, education: 73, health: 80, employment: 70 },
  { name: "Villeurbanne", code: "69266", mayor: "Cédric Van Styvendael", party: "PS", population: "154K", image: "https://images.unsplash.com/photo-1506751470038-d52362479020?auto=format&fit=crop&q=80&w=800", safety: 68, education: 82, health: 84, employment: 79 },
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
  const [dynamicTerritories, setDynamicTerritories] = useState<any[]>([]);

  useEffect(() => {
    if (userId && isPremium) {
      api.getUserSavedItems(userId).then(setSavedItems);
    }
    api.getTerritories().then(data => {
      if (data && data.length > 0) setDynamicTerritories(data);
    });
    // Pre-load mayors DB to avoid "Données non disponibles" on direct clicks
    communeSearch.ensureMayorsLoaded();
  }, [userId, isPremium, communeSearch]);

  const [selectedTerritory, setSelectedTerritory] = useState<any | null>(null);

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
      const base = REGIONS.map(r => {
        const dyn = dynamicTerritories.find(d => d.id === r.id && d.type === 'region');
        return dyn ? { ...r, ...dyn } : r;
      });
      return base.filter(r => r.name.toLowerCase().includes(s) || (r.president && r.president.toLowerCase().includes(s)));
    } else if (activeTab === "departement") {
      const base = DEPARTMENTS.map(d => {
        const dyn = dynamicTerritories.find(dt => dt.id === d.id && dt.type === 'department');
        return dyn ? { ...d, ...dyn } : d;
      });
      return base.filter(d => d.name.toLowerCase().includes(s) || (d.president && d.president.toLowerCase().includes(s)));
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
                          Mise à jour 2026
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
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                              <div className="absolute bottom-4 left-6 z-10 flex flex-col items-start gap-2">
                                <span className="bg-rose-500 text-white px-5 pt-2 pb-1 rounded-2xl shadow-lg font-staatliches uppercase tracking-wider text-2xl inline-block transform -rotate-2 hover:rotate-0 transition-transform">
                                  {city.name}
                                </span>
                                <p className="text-rose-300 font-black text-[9px] uppercase tracking-widest bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">{city.mayor}</p>
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
                <div className="w-full py-4">
                  <StaggerTestimonials 
                    items={filteredItems.map((item: any) => ({...item, type: activeTab === 'region' ? 'region' : 'department'}))} 
                    onSelect={(t) => setSelectedTerritory(t)} 
                    isPremium={isPremium}
                  />
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
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 opacity-60">
                      <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-slate-400" /> Mars 2026
                      </p>
                      <p className="font-bold text-lg mb-1 line-through opacity-50">Élections Municipales</p>
                      <p className="text-xs text-white/40 italic">Scrutin terminé • Nouveaux maires installés.</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                      <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest mb-1">Mai - Juin 2026</p>
                      <p className="font-bold text-lg mb-1">Installation des EPCI</p>
                      <p className="text-sm text-white/60">Élection des présidents de communautés de communes et métropoles.</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 opacity-50">
                      <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">Mars 2028</p>
                      <p className="font-bold text-lg mb-1">Régionales & Départementales</p>
                      <p className="text-sm text-white/60">Renouvellement des conseils régionaux et départementaux.</p>
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
                <AwardBadge 
                  titleText="Découvrir l'offre Elite"
                  subtitleText="Accès Premium"
                  link={getPremiumUrl()}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    
    <CommuneDetailPanel 
      commune={selectedCommune}
      mayor={selectedCommune ? communeSearch.getMayor(selectedCommune.code) : null}
      onClose={() => setSelectedCommune(null)} 
    />

    <TerritoryDetailPanel 
      territory={selectedTerritory}
      onClose={() => setSelectedTerritory(null)}
    />
    </>
  );
}
