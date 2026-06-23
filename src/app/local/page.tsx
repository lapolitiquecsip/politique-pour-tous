"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Users, Building2, TrendingUp, Search, ArrowRight, Vote,
  History, Building, ChevronRight, Map, Layers, LayoutGrid, Lock, Loader2, Star, Coins, Scale, ShieldCheck
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import GlossaryText from "@/components/ui/GlossaryText";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";
import { getPremiumUrl, cn } from "@/lib/utils";
import { departmentPaths } from "@/lib/data/departmentPaths";
import { useCommuneSearch } from "@/lib/hooks/useCommuneSearch";
import type { CommuneResult } from "@/lib/hooks/useCommuneSearch";
import CommuneDetailPanel from "@/components/local/CommuneDetailPanel";
import TerritoryDetailPanel from "@/components/local/TerritoryDetailPanel";
import { REGIONS, DEPARTMENTS } from "@/lib/data/territories";
import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";
import { AwardBadge } from "@/components/ui/award-badge";

const getPartyTheme = (party: string) => {
  switch (party) {
    case "PS":
      return {
        badge: "bg-rose-600 text-white shadow-rose-600/30",
        text: "text-rose-400",
        hoverBg: "group-hover/btn:bg-rose-600",
        hoverText: "group-hover:text-rose-600"
      };
    case "EELV":
      return {
        badge: "bg-emerald-600 text-white shadow-emerald-600/30",
        text: "text-emerald-400",
        hoverBg: "group-hover/btn:bg-emerald-600",
        hoverText: "group-hover:text-emerald-600"
      };
    case "LR":
      return {
        badge: "bg-blue-600 text-white shadow-blue-600/30",
        text: "text-blue-400",
        hoverBg: "group-hover/btn:bg-blue-600",
        hoverText: "group-hover:text-blue-600"
      };
    case "Horizons":
      return {
        badge: "bg-cyan-600 text-white shadow-cyan-600/30",
        text: "text-cyan-400",
        hoverBg: "group-hover/btn:bg-cyan-600",
        hoverText: "group-hover:text-cyan-600"
      };
    case "MoDem":
      return {
        badge: "bg-orange-500 text-white shadow-orange-500/30",
        text: "text-orange-400",
        hoverBg: "group-hover/btn:bg-orange-500",
        hoverText: "group-hover:text-orange-500"
      };
    case "UDI":
      return {
        badge: "bg-amber-500 text-white shadow-amber-500/30",
        text: "text-amber-500",
        hoverBg: "group-hover/btn:bg-amber-500",
        hoverText: "group-hover:text-amber-500"
      };
    case "PRG":
      return {
        badge: "bg-fuchsia-600 text-white shadow-fuchsia-600/30",
        text: "text-fuchsia-500",
        hoverBg: "group-hover/btn:bg-fuchsia-600",
        hoverText: "group-hover:text-fuchsia-600"
      };
    case "Renaissance":
    case "RE":
    case "LREM":
      return {
        badge: "bg-sky-600 text-white shadow-sky-600/30",
        text: "text-sky-500",
        hoverBg: "group-hover/btn:bg-sky-600",
        hoverText: "group-hover:text-sky-600"
      };
    case "DVD":
      return {
        badge: "bg-indigo-900 text-white shadow-indigo-900/30",
        text: "text-indigo-400",
        hoverBg: "group-hover/btn:bg-indigo-900",
        hoverText: "group-hover:text-indigo-900"
      };
    case "DVG":
    default:
      return {
        badge: "bg-fuchsia-600 text-white shadow-fuchsia-600/30",
        text: "text-fuchsia-400",
        hoverBg: "group-hover/btn:bg-fuchsia-600",
        hoverText: "group-hover:text-fuchsia-600"
      };
  }
};

const cardColors = [
  { text: 'text-pink-500', bg: 'bg-pink-500', lightBg: 'bg-pink-50' },
  { text: 'text-emerald-500', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50' },
  { text: 'text-blue-500', bg: 'bg-blue-500', lightBg: 'bg-blue-50' },
  { text: 'text-purple-500', bg: 'bg-purple-500', lightBg: 'bg-purple-50' },
  { text: 'text-amber-500', bg: 'bg-amber-500', lightBg: 'bg-amber-50' },
  { text: 'text-rose-500', bg: 'bg-rose-500', lightBg: 'bg-rose-50' },
  { text: 'text-indigo-500', bg: 'bg-indigo-500', lightBg: 'bg-indigo-50' },
  { text: 'text-cyan-500', bg: 'bg-cyan-500', lightBg: 'bg-cyan-50' },
];

const DepartmentGridCard: React.FC<{
  item: any;
  onSelect: (item: any) => void;
  isPremium?: boolean;
}> = ({ item, onSelect, isPremium }) => {
  const colorIndex = (item.id.charCodeAt(0) + (item.id.charCodeAt(item.id.length - 1) || 0)) % cardColors.length;
  const theme = cardColors[colorIndex];
  
  // Resolve party theme or fall back to standard color index theme
  const partyTheme = getPartyTheme(item.party);
  const cardTheme = partyTheme.text !== "text-fuchsia-400" ? partyTheme : {
    badge: `bg-${theme.text.split('-')[1]}-600 text-white shadow-${theme.text.split('-')[1]}-600/30`,
    text: theme.text,
    hoverBg: `group-hover/btn:${theme.bg}`,
    hoverText: `group-hover:${theme.text}`
  };

  const pathData = departmentPaths[item.id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={() => onSelect(item)}
      className="cursor-pointer border border-slate-200/80 bg-white rounded-3xl overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-xl transition-all duration-300 shadow-sm"
    >
      {/* Top Banner: Colored background and two columns */}
      <div className={cn("relative h-36 shrink-0 w-full flex items-center justify-between overflow-hidden border-b border-slate-100 px-6", theme.lightBg)}>
        {/* Subtle background graphic */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_70%)]" />
        
        {/* Left column: Text */}
        <div className="relative z-10 max-w-[65%] space-y-1">
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white border inline-block shadow-sm", theme.text)}>
            N° {item.id}
          </span>
          <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest mt-1">Département</p>
          <h4 className="text-slate-900 font-extrabold text-lg leading-tight line-clamp-2">{item.name}</h4>
        </div>

        {/* Right column: Geographic Shape */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center rounded-2xl bg-white/90 border border-slate-100/80 shadow-md overflow-hidden p-2 transition-transform hover:scale-105">
          {pathData ? (
            <svg 
              viewBox={pathData.viewBox} 
              className={cn("w-full h-full drop-shadow-sm opacity-90", theme.text)}
              preserveAspectRatio="xMidYMid meet"
            >
              <path 
                d={pathData.d} 
                fill="currentColor" 
                stroke="white" 
                strokeWidth="1.5" 
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <MapPin size={28} className={theme.text} />
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5 bg-white">
        <div className="space-y-3">
          {/* President row */}
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-100 text-slate-500")}>
              <Users size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Président</p>
              <p className="font-bold text-slate-800 text-xs truncate">{item.president}</p>
            </div>
          </div>
          
          {/* Party row */}
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-100 text-slate-500")}>
              <Building2 size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Parti Majoritaire</p>
              <span className={cn("inline-block font-black text-[9px] px-2 py-0.5 rounded-full mt-0.5 border border-slate-100 shadow-sm bg-slate-50 text-slate-700", 
                item.party !== "N/A" && "font-black"
              )}>
                {item.party}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between group/btn">
          <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors duration-200", cardTheme.text)}>
            Analyser
          </span>
          <div className={cn("w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-all duration-300", 
            "group-hover/btn:bg-rose-600 group-hover/btn:text-white group-hover/btn:scale-110 shadow-sm"
          )}>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Featured cities shown by default (Top 20)
const FEATURED_CITIES = [
  { name: "Paris", code: "75056", mayor: "Emmanuel Grégoire", party: "PS", population: "2.1M", image: "/cities/paris_bg_1779624272735.png", safety: 60, education: 90, health: 95, employment: 88 },
  { name: "Marseille", code: "13055", mayor: "Benoît Payan", party: "DVG", population: "870K", image: "/cities/marseille_bg_1779624285652.png", safety: 55, education: 78, health: 85, employment: 75 },
  { name: "Lyon", code: "69123", mayor: "Grégory Doucet", party: "EELV", population: "522K", image: "/cities/lyon_bg_1779624298539.png", safety: 72, education: 85, health: 88, employment: 84 },
  { name: "Toulouse", code: "31555", mayor: "Jean-Luc Moudenc", party: "LR", population: "498K", image: "/cities/toulouse_bg_1779624313174.png", safety: 75, education: 82, health: 80, employment: 78 },
  { name: "Nice", code: "06088", mayor: "Eric Ciotti", party: "LR", population: "342K", image: "/cities/nice_bg_1779624331877.png", safety: 68, education: 75, health: 82, employment: 72 },
  { name: "Nantes", code: "44109", mayor: "Johanna Rolland", party: "PS", population: "320K", image: "/cities/nantes_bg_1779624348520.png", safety: 70, education: 84, health: 82, employment: 85 },
  { name: "Montpellier", code: "34172", mayor: "Michaël Delafosse", party: "PS", population: "300K", image: "/cities/montpellier_bg_1779624362702.png", safety: 65, education: 80, health: 85, employment: 74 },
  { name: "Strasbourg", code: "67482", mayor: "Catherine Trautmann", party: "PS", population: "290K", image: "/cities/strasbourg_bg_1779624376756.png", safety: 74, education: 85, health: 86, employment: 80 },
  { name: "Bordeaux", code: "33063", mayor: "Thomas Cazenave", party: "Horizons", population: "260K", image: "/cities/bordeaux_bg_1779624397748.png", safety: 76, education: 88, health: 89, employment: 82 },
  { name: "Lille", code: "59350", mayor: "Arnaud Deslandes", party: "PS", population: "236K", image: "/cities/lille_bg_1779624410952.png", safety: 62, education: 80, health: 83, employment: 75 },
  { name: "Rennes", code: "35238", mayor: "Nathalie Appéré", party: "PS", population: "225K", image: "/cities/rennes_bg_1779624423348.png", safety: 80, education: 89, health: 88, employment: 86 },
  { name: "Reims", code: "51454", mayor: "Arnaud Robinet", party: "Horizons", population: "180K", image: "/cities/reims_bg_1779624439328.png", safety: 72, education: 79, health: 84, employment: 77 },
  { name: "Toulon", code: "83137", mayor: "Josée Massi", party: "DVD", population: "180K", image: "/cities/toulon_bg_1779624460673.png", safety: 64, education: 74, health: 80, employment: 72 },
  { name: "Saint-Étienne", code: "42218", mayor: "Régis Juanico", party: "PS", population: "174K", image: "/cities/saint_etienne_bg_1779624474559.png", safety: 60, education: 75, health: 81, employment: 68 },
  { name: "Le Havre", code: "76351", mayor: "Édouard Philippe", party: "Horizons", population: "165K", image: "/cities/le_havre_bg_1779624488137.png", safety: 65, education: 76, health: 82, employment: 74 },
  { name: "Grenoble", code: "38185", mayor: "Laurence Ruffin", party: "EELV", population: "158K", image: "/cities/grenoble_bg_1779624501302.png", safety: 58, education: 86, health: 85, employment: 80 },
  { name: "Dijon", code: "21231", mayor: "Nathalie Koenders", party: "PS", population: "158K", image: "/cities/dijon_bg_1779624520804.png", safety: 78, education: 85, health: 87, employment: 82 },
  { name: "Angers", code: "49007", mayor: "Christophe Béchu", party: "Horizons", population: "155K", image: "https://images.unsplash.com/photo-1559828556-3a7a9bdc99b7?auto=format&fit=crop&q=80&w=800", safety: 82, education: 88, health: 89, employment: 85 },
  { name: "Nîmes", code: "30189", mayor: "Vincent Bouget", party: "DVG", population: "148K", image: "https://images.unsplash.com/photo-1590089415225-401ed6f9b8ce?auto=format&fit=crop&q=80&w=800", safety: 61, education: 73, health: 80, employment: 70 },
  { name: "Villeurbanne", code: "69266", mayor: "Cédric Van Styvendael", party: "PS", population: "154K", image: "https://images.unsplash.com/photo-1506751470038-d52362479020?auto=format&fit=crop&q=80&w=800", safety: 68, education: 82, health: 84, employment: 79 },
];

const teaserConfigs = {
  commune: {
    title: "Comparateur de communes",
    description: "Comparez instantanément les budgets, la sécurité, l'éducation, la santé et la qualité de vie de toutes les villes françaises.",
    entityA: "Lyon",
    subA: "69000",
    entityB: "Bordeaux",
    subB: "33000",
    metric1Label: "Sécurité",
    metric1ValA: "7.6 / 10",
    metric1ValB: "8.2 / 10",
    metric1ColorA: "text-emerald-800",
    metric1ColorB: "text-emerald-800",
    metric2Label: "Éducation",
    metric2ValA: "82 / 100",
    metric2ValB: "88 / 100",
    metric2ColorA: "text-slate-800",
    metric2ColorB: "text-slate-800",
    metric3Label: "Cadre de vie",
    metric3ValA: "Moyen",
    metric3ValB: "Excellent",
    metric3ColorA: "text-amber-800",
    metric3ColorB: "text-emerald-800",
  },
  departement: {
    title: "Comparateur de départements",
    description: "Comparez instantanément les indicateurs financiers, la sécurité locale, la fiscalité et les performances de tous les départements.",
    entityA: "Rhône",
    subA: "N° 69",
    entityB: "Gironde",
    subB: "N° 33",
    metric1Label: "Sécurité",
    metric1ValA: "8.2 / 10",
    metric1ValB: "6.5 / 10",
    metric1ColorA: "text-emerald-800",
    metric1ColorB: "text-amber-800",
    metric2Label: "Budget / Hab.",
    metric2ValA: "1 240 €",
    metric2ValB: "980 €",
    metric2ColorA: "text-slate-800",
    metric2ColorB: "text-slate-800",
    metric3Label: "Fiscalité",
    metric3ValA: "Basse",
    metric3ValB: "Élevée",
    metric3ColorA: "text-emerald-800",
    metric3ColorB: "text-rose-800",
  },
  region: {
    title: "Comparateur de régions",
    description: "Comparez les compétences régionales : transports ferroviaires (TER), lycées, développement économique et aménagement.",
    entityA: "Île-de-France",
    subA: "12,2 M hab.",
    entityB: "PACA",
    subB: "5,1 M hab.",
    metric1Label: "Transports",
    metric1ValA: "Très dense",
    metric1ValB: "Moyen",
    metric1ColorA: "text-emerald-800",
    metric1ColorB: "text-amber-800",
    metric2Label: "Budget Lycées",
    metric2ValA: "680 M€",
    metric2ValB: "310 M€",
    metric2ColorA: "text-slate-800",
    metric2ColorB: "text-slate-800",
    metric3Label: "Développement",
    metric3ValA: "Très élevé",
    metric3ValB: "Élevé",
    metric3ColorA: "text-emerald-800",
    metric3ColorB: "text-emerald-800",
  }
};

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
  const [visibleCount, setVisibleCount] = useState(12);
  
  useEffect(() => {
    setVisibleCount(12);
  }, [search, activeTab]);
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
    const s = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const filterFn = (name: string, president?: string) => {
      const normName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const normPres = president ? president.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      return normName.includes(s) || normPres.includes(s);
    };

    if (activeTab === "region") {
      const base = REGIONS.map(r => {
        const dyn = dynamicTerritories.find(d => d.id === r.id && d.type === 'region');
        return dyn ? { ...r, ...dyn } : r;
      });
      return base.filter(r => filterFn(r.name, r.president));
    } else if (activeTab === "departement") {
      const base = DEPARTMENTS.map(d => {
        const dyn = dynamicTerritories.find(dt => dt.id === d.id && dt.type === 'department');
        return dyn ? { ...d, ...dyn, type: 'department' as const } : { ...d, type: 'department' as const };
      });
      return base.filter(d => filterFn(d.name, d.president));
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

            <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-tight mb-8 py-4 text-black">
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
                placeholder={
                  activeTab === 'commune' 
                    ? "Rechercher une ville, un code postal..." 
                    : activeTab === 'departement' 
                    ? "Rechercher un département, un président..." 
                    : "Rechercher une région, un président..."
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (activeTab === 'commune') {
                    communeSearch.setQuery(e.target.value);
                    setShowDropdown(true);
                  }
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-3xl py-7 pl-20 pr-10 text-xl font-medium text-slate-900 focus:outline-none focus:border-rose-600/30 focus:bg-rose-50/10 transition-all shadow-xl shadow-slate-200/20"
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
                        {FEATURED_CITIES.map((city, idx) => {
                          const theme = getPartyTheme(city.party);
                          return (
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
                                  population: city.population.endsWith('M') 
                                    ? Math.round(parseFloat(city.population) * 1000000) 
                                    : city.population.endsWith('K') 
                                    ? Math.round(parseFloat(city.population) * 1000) 
                                    : parseInt(city.population),
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
                                  <span className={`${theme.badge} px-5 pt-2 pb-1 rounded-2xl shadow-lg font-staatliches uppercase tracking-wider text-2xl inline-block transform -rotate-2 hover:rotate-0 transition-transform`}>
                                    {city.name}
                                  </span>
                                  <p className="text-white font-black text-[9px] uppercase tracking-widest bg-slate-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                    {city.mayor} <span className="opacity-60">•</span> <span className={theme.text}>{city.party}</span>
                                  </p>
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
                                <div className={`w-full flex items-center justify-between group/btn text-slate-900 ${theme.hoverText} transition-colors pt-2`}>
                                  <span className="text-[10px] font-black uppercase tracking-widest">Voir les détails</span>
                                  <div className={`w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center ${theme.hoverBg} group-hover/btn:text-white transition-all`}><ChevronRight size={18} /></div>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
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

              {/* REGION TAB: Carousel */}
              {activeTab === 'region' && (
                <div className="w-full py-4">
                  <StaggerTestimonials 
                    items={filteredItems.map((item: any) => ({...item, type: 'region'}))} 
                    onSelect={(t) => setSelectedTerritory(t)} 
                    isPremium={isPremium}
                  />
                </div>
              )}

              {/* DEPARTMENT TAB: Grid and Pagination */}
              {activeTab === 'departement' && (
                <div className="w-full py-4 space-y-8">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm">
                      <p className="text-slate-400 font-bold text-sm">Aucun département ne correspond à votre recherche.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.slice(0, visibleCount).map((item: any) => (
                          <DepartmentGridCard
                            key={item.id}
                            item={item}
                            onSelect={(t) => setSelectedTerritory(t)}
                            isPremium={isPremium}
                          />
                        ))}
                      </div>
                      
                      {filteredItems.length > visibleCount && (
                        <div className="flex justify-center pt-4">
                          <button
                            onClick={() => setVisibleCount(prev => prev + 12)}
                            className={cn(
                              "px-8 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-full shadow-md hover:border-rose-600 hover:text-rose-600 transition-all active:scale-95 duration-200 cursor-pointer"
                            )}
                          >
                            Charger plus de départements
                          </button>
                        </div>
                      )}
                    </>
                  )}
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

            {/* Mayors by Party Panel */}
            {activeTab === 'commune' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-staatliches uppercase tracking-wide">Maires par Étiquette</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">France entière • Mandature 2026 vs 2020</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm">
                    <Building size={22} />
                  </div>
                </div>
                
                <div className="space-y-5">
                  {[
                    { party: "Sans Étiquette", count: 23412, diff: 212, color: "bg-slate-400", total: 34965 },
                    { party: "Divers Droite", count: 4850, diff: -130, color: "bg-indigo-900", total: 34965 },
                    { party: "Divers Gauche", count: 3200, diff: 90, color: "bg-fuchsia-600", total: 34965 },
                    { party: "Les Républicains", count: 1250, diff: -180, color: "bg-blue-600", total: 34965 },
                    { party: "Parti Socialiste", count: 850, diff: -110, color: "bg-rose-600", total: 34965 },
                    { party: "RN", count: 280, diff: 155, color: "bg-sky-900", total: 34965 },
                  ].map((stat, idx) => (
                    <div key={idx} className="space-y-2 group">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${stat.color} shadow-sm shadow-${stat.color.replace('bg-', '')}/30`} />
                          {stat.party}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-950">{stat.count.toLocaleString('fr-FR')}</span>
                          <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-black tracking-tight ${
                            stat.diff >= 0 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {stat.diff >= 0 ? `+${stat.diff}` : stat.diff}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.count / stat.total) * 100}%` }}
                          transition={{ duration: 1, delay: 0.2 + (idx * 0.1) }}
                          className={`h-full ${stat.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-50 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Progression</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Recul</span>
                  </p>
                  <p className="text-xs text-slate-500 italic text-center">
                    La majorité des communes rurales de moins de 3500 habitants sont gérées par des maires sans étiquette. Les évolutions comparent les résultats post-2026 à la mandature de 2020.
                  </p>
                </div>
              </div>
            )}
            
            {/* Premium Teaser / Comparator Access */}
            {(() => {
              const config = teaserConfigs[activeTab] || teaserConfigs.commune;
              return (
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] p-8 text-slate-900 space-y-6 shadow-xl shadow-orange-200">
                  {pLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="animate-spin text-slate-900" size={32} />
                      <p className="text-xs font-bold text-slate-900/60 uppercase tracking-wider">Vérification de l'accès...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 border border-white/30 text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                          <Coins size={12} className="text-slate-900 fill-slate-900/10" />
                          {isPremium ? "Outil Premium Actif" : "Option Premium"}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                          {isPremium ? (
                            <ShieldCheck size={14} className="text-slate-900" />
                          ) : (
                            <Lock size={14} className="text-slate-900" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-3xl font-staatliches uppercase tracking-wide leading-none">{config.title}</h3>
                        <p className="text-xs font-semibold opacity-95 leading-relaxed">
                          {isPremium 
                            ? "Utilisez notre outil d'analyse comparative en temps réel pour comparer les budgets et indicateurs de performance."
                            : config.description}
                        </p>
                      </div>

                      {/* Comparator Preview Mockup */}
                      <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-3xl p-5 relative overflow-hidden shadow-inner my-2">
                        {/* Entity headers */}
                        <div className="grid grid-cols-7 items-center gap-1 text-center mb-4">
                          <div className="col-span-3 bg-white/30 rounded-2xl p-2.5 flex flex-col items-center border border-white/10 shadow-sm min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 truncate max-w-full">{config.entityA}</span>
                            <span className="text-[9px] font-bold text-slate-700 mt-0.5 truncate max-w-full">{config.subA}</span>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shadow-md border border-white/15">VS</span>
                          </div>
                          <div className="col-span-3 bg-white/30 rounded-2xl p-2.5 flex flex-col items-center border border-white/10 shadow-sm min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 truncate max-w-full">{config.entityB}</span>
                            <span className="text-[9px] font-bold text-slate-700 mt-0.5 truncate max-w-full">{config.subB}</span>
                          </div>
                        </div>

                        {/* Comparative Metrics (Locked & Blurred only if not premium) */}
                        <div className="space-y-3.5 relative">
                          {/* Metric 1 */}
                          <div className="grid grid-cols-7 items-center text-xs font-bold text-slate-900 border-b border-white/10 pb-2">
                            <div className={cn("col-span-2 text-left font-black", config.metric1ColorA)}>{config.metric1ValA}</div>
                            <div className="col-span-3 text-center text-[8px] uppercase tracking-widest text-slate-700 font-extrabold flex items-center justify-center gap-1">
                              <Scale size={10} className="opacity-60" /> {config.metric1Label}
                            </div>
                            <div className={cn("col-span-2 text-right font-black", config.metric1ColorB)}>{config.metric1ValB}</div>
                          </div>
                          
                          {/* Metric 2 */}
                          <div className="grid grid-cols-7 items-center text-xs font-bold text-slate-900 border-b border-white/10 pb-2">
                            <div className={cn("col-span-2 text-left font-black", config.metric2ColorA)}>{config.metric2ValA}</div>
                            <div className="col-span-3 text-center text-[8px] uppercase tracking-widest text-slate-700 font-extrabold">
                              {config.metric2Label}
                            </div>
                            <div className={cn("col-span-2 text-right font-black", config.metric2ColorB)}>{config.metric2ValB}</div>
                          </div>

                          {/* Metric 3 */}
                          <div className="grid grid-cols-7 items-center text-xs font-bold text-slate-900">
                            <div className={cn("col-span-2 text-left font-black", config.metric3ColorA)}>{config.metric3ValA}</div>
                            <div className="col-span-3 text-center text-[8px] uppercase tracking-widest text-slate-700 font-extrabold">
                              {config.metric3Label}
                            </div>
                            <div className={cn("col-span-2 text-right font-black", config.metric3ColorB)}>{config.metric3ValB}</div>
                          </div>

                          {/* Lock Overlay */}
                          {!isPremium && (
                            <div className="absolute -inset-2 bg-white/5 backdrop-blur-[3.5px] rounded-2xl flex items-center justify-center border border-white/10 shadow-sm">
                              <div className="bg-slate-900/90 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border border-white/10">
                                <Lock size={12} className="text-amber-400 fill-amber-400" />
                                <span className="text-[9px] font-black uppercase tracking-wider">Débloquer le comparateur</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {isPremium ? (
                        <Link 
                          href={`/local/comparateur/app?type=${activeTab === 'departement' ? 'department' : activeTab}`}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-staatliches uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-[0.98] duration-150"
                        >
                          <span>Lancer le comparateur</span>
                          <ArrowRight size={16} />
                        </Link>
                      ) : (
                        <AwardBadge 
                          titleText="Découvrir l'offre Elite"
                          subtitleText="Accès Premium"
                          link={getPremiumUrl()}
                          className="w-full"
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })()}
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
