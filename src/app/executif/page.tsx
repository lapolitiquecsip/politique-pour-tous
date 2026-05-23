"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Users, 
  CircleDollarSign, 
  ScrollText, 
  ChevronRight,
  ChevronDown,
  Landmark,
  Building2,
  TrendingUp,
  Search,
  ArrowRight,
  Newspaper,
  CalendarDays,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import FeedItemCard from "@/components/home/FeedItemCard";
import GlossaryText from "@/components/ui/GlossaryText";
import ministersBios from "@/lib/data/ministersBios.json";
import MinisterImage from "@/components/executif/MinisterImage";
import { AwardBadge } from "@/components/ui/award-badge";

const normalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/^(m\.|mme\.|m\s|mme\s)/, "") // Remove M. or Mme
    .replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric chars (like hyphens or special quotes)
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
};

// Mock Data for the demonstration
const MINISTERS = [
  {
    name: "Michel Barnier",
    role: "Premier Ministre",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Michel_Barnier_2024.jpg/800px-Michel_Barnier_2024.jpg",
    ministry: "Hôtel de Matignon",
    budget: "4.2 Md€",
    priority: "Réforme de l'État & Équilibre budgétaire"
  },
  {
    name: "Antoine Armand",
    role: "Ministre de l'Économie, des Finances et de la Souveraineté industrielle et numérique",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Antoine_Armand_2024.jpg/800px-Antoine_Armand_2024.jpg",
    ministry: "Bercy",
    budget: "15.8 Md€",
    priority: "Attractivité & Désendettement"
  },
  {
    name: "Jean-Noël Barrot",
    role: "Ministre de l'Europe et des Affaires étrangères",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Jean-No%C3%ABl_Barrot_2024.jpg/800px-Jean-No%C3%ABl_Barrot_2024.jpg",
    ministry: "Quai d'Orsay",
    budget: "3.5 Md€",
    priority: "Diplomatie & Souveraineté Européenne"
  },
  {
    name: "Sébastien Lecornu",
    role: "Ministre des Armées",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/S%C3%A9bastien_Lecornu_2022.jpg/800px-S%C3%A9bastien_Lecornu_2022.jpg",
    ministry: "Hôtel de Brienne",
    budget: "66.48 Md€",
    priority: "LPM & Modernisation nucléaire"
  },
  {
    name: "Bruno Retailleau",
    role: "Ministre de l'Intérieur",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Bruno_Retailleau_2024.jpg/800px-Bruno_Retailleau_2024.jpg",
    ministry: "Place Beauvau",
    budget: "33.06 Md€",
    priority: "Sécurité publique & Immigration"
  }
];

export const BUDGETS = [
  { 
    label: "Remboursements et dégrèvements", 
    amount: 145.60, 
    color: "bg-slate-400",
    desc: "Sommes que l'État rend aux contribuables (ex: trop-perçu d'impôts, crédits d'impôt ou aides à l'investissement)."
  },
  { 
    label: "Éducation Nationale", 
    amount: 89.62, 
    color: "bg-blue-500",
    desc: "Premier budget de l'État : salaires des enseignants, fonctionnement des écoles, collèges et lycées."
  },
  { 
    label: "Pensions (CAS)", 
    amount: 69.33, 
    color: "bg-slate-500",
    desc: "Financement des retraites des fonctionnaires de l'État (militaires, enseignants, agents publics)."
  },
  { 
    label: "Défense (Armées)", 
    amount: 66.48, 
    color: "bg-red-500",
    desc: "Équipement des forces armées, modernisation nucléaire et opérations militaires."
  },
  { 
    label: "Charge de la dette", 
    amount: 60.34, 
    color: "bg-orange-500",
    desc: "Paiement des intérêts sur l'argent que l'État a emprunté pour financer ses déficits passés."
  },
  { 
    label: "Intérieur (Sécurités & Admin)", 
    amount: 33.06, 
    color: "bg-purple-500",
    desc: "Financement de la Police, de la Gendarmerie, de la sécurité routière et de l'administration des territoires."
  },
  { 
    label: "Enseignement Supérieur & Recherche", 
    amount: 31.63, 
    color: "bg-emerald-500",
    desc: "Financement des universités, des grandes écoles et de la recherche scientifique française."
  },
  { 
    label: "Solidarité et Insertion", 
    amount: 31.28, 
    color: "bg-indigo-500",
    desc: "Aides aux plus démunis, aux personnes handicapées (AAH) et protection de l'enfance."
  },
  { 
    label: "Écologie et Mobilité", 
    amount: 22.76, 
    color: "bg-green-500",
    desc: "Transition écologique, protection de la biodiversité, routes et infrastructures ferroviaires."
  },
  { 
    label: "Cohésion des territoires", 
    amount: 22.57, 
    color: "bg-blue-400",
    desc: "Aides au logement (APL), rénovation urbaine et soutien aux zones rurales."
  },
  { 
    label: "Travail et emploi", 
    amount: 20.82, 
    color: "bg-cyan-500",
    desc: "Politiques de l'emploi, formation professionnelle et financement de l'apprentissage."
  },
  { 
    label: "Justice", 
    amount: 12.97, 
    color: "bg-amber-500",
    desc: "Fonctionnement des tribunaux, des prisons et de la protection judiciaire de la jeunesse."
  },
  { 
    label: "Gestion des finances publiques", 
    amount: 11.02, 
    color: "bg-slate-300",
    desc: "Coût des services qui collectent l'impôt (Bercy) et gèrent la dépense publique."
  },
  { 
    label: "Régimes sociaux et de retraite", 
    amount: 6.07, 
    color: "bg-rose-400",
    desc: "Soutien à certains régimes de retraite spécifiques (ex: marins, mineurs) et solidarité nationale."
  },
  { 
    label: "Agriculture et Alimentation", 
    amount: 4.13, 
    color: "bg-lime-600",
    desc: "Soutien aux agriculteurs, sécurité sanitaire des aliments et gestion des forêts."
  },
  { 
    label: "Relations Collectivités", 
    amount: 3.96, 
    color: "bg-sky-400",
    desc: "Dotations versées par l'État aux mairies, départements et régions."
  },
  { 
    label: "Culture", 
    amount: 3.74, 
    color: "bg-pink-500",
    desc: "Protection du patrimoine, soutien à la création artistique et médias publics."
  },
  { 
    label: "Aide au développement", 
    amount: 3.57, 
    color: "bg-yellow-600",
    desc: "Actions de solidarité internationale et aide aux pays en développement."
  },
  { 
    label: "Économie", 
    amount: 3.51, 
    color: "bg-indigo-400",
    desc: "Soutien aux entreprises, au commerce extérieur et régulation de la concurrence."
  },
  { 
    label: "Santé", 
    amount: 1.89, 
    color: "bg-red-400",
    desc: "Prévention, sécurité sanitaire et pilotage du système de santé."
  }
];

const DECREES = [
  { id: 1, title: "Décret n° 2026-452 relatif à l'encadrement des loyers", date: "24 Avril 2026", type: "Réglementaire" },
  { id: 2, title: "Décret n° 2026-450 portant nomination du préfet de région", date: "22 Avril 2026", type: "Nomination" },
  { id: 3, title: "Décret n° 2026-448 relatif à la cybersécurité des entreprises", date: "20 Avril 2026", type: "Sûreté" },
  { id: 4, title: "Décret n° 2026-445 sur la réforme de l'assurance chômage", date: "18 Avril 2026", type: "Social" }
];

export default function ExecutifPage() {
  const [search, setSearch] = useState("");
  const [govtNews, setGovtNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [hoveredBudget, setHoveredBudget] = useState<any>(null);

  const [dynamicMinisters, setDynamicMinisters] = useState<any[]>(MINISTERS);

  useEffect(() => {
    async function loadNews() {
      const news = await api.getContent(4, "gouvernement");
      setGovtNews(news);
      setLoadingNews(false);
    }
    loadNews();
  }, []);

  useEffect(() => {
    async function loadGov() {
      try {
        const res = await fetch('/api/government');
        const json = await res.json();
        if (json.success && json.data) {
           const mapped = json.data.map((apiMin: any) => {
              const apiNameNorm = normalizeName(apiMin.ministerName);
              const bioMatch = (ministersBios as any[]).find(b => 
                normalizeName(b.name) === apiNameNorm || 
                (b.name.toLowerCase().includes('moutchou') && apiMin.ministerName.toLowerCase().includes('moutchou'))
              );
              const hardcoded = MINISTERS.find(m => m.name && normalizeName(m.name) === apiNameNorm);
              
              let finalImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(apiMin.ministerName)}&background=0D8ABC&color=fff&size=512`;
              if (apiMin.ministerName.toLowerCase().includes('moutchou')) {
                finalImage = 'https://images.weserv.nl/?url=www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/720908.jpg&w=1000';
              } else if (bioMatch && bioMatch.image) {
                finalImage = bioMatch.image;
              } else if (hardcoded && hardcoded.image) {
                finalImage = hardcoded.image;
              }

              return {
                 name: apiMin.ministerName,
                 role: apiMin.role,
                 ministry: apiMin.ministryName,
                 image: finalImage,
                 budget: "Détails via Analyse Premium",
                 priority: "Mission gouvernementale"
              }
           });
           
           // Trier pour mettre le Premier ministre en premier
           const sorted = mapped.sort((a: any, b: any) => {
             if (a.role.toLowerCase().includes('premier ministre')) return -1;
             if (b.role.toLowerCase().includes('premier ministre')) return 1;
             return 0;
           });

           if (sorted.length > 0) {
             setDynamicMinisters(sorted);
           }
        }
      } catch(e) {
        console.error("Failed to load government", e);
      }
    }
    loadGov();
  }, []);

  const filteredMinisters = dynamicMinisters.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.ministry.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* 1. HERO SECTION (POSTER IMPACT STYLE) */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden bg-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none">
          <span className="absolute top-10 left-10 text-[15rem] font-staatliches leading-none rotate-12">GOUVERNEMENT</span>
          <span className="absolute bottom-10 right-10 text-[15rem] font-staatliches leading-none -rotate-12">EXÉCUTIF</span>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-red-600">Pouvoir Exécutif</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tighter leading-none mb-8">
              Le <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">Gouvernement</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 font-medium italic leading-relaxed max-w-3xl mx-auto">
              <GlossaryText>
                Comprendre l'action ministérielle, les budgets alloués et les décisions réglementaires qui façonnent la France au quotidien.
              </GlossaryText>
            </p>

            <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-8 rounded-full" />
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN CONTENT AREA */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* SEARCH & MINISTERS SECTION */}
            <section className="space-y-8">
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <h2 className="text-3xl font-staatliches uppercase tracking-wider text-slate-900">
                  Les Membres du <span className="text-blue-600">Gouvernement</span>
                </h2>
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMinisters.map((minister, idx) => {
                  const slug = minister.ministry 
                    ? minister.ministry.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    : 'ministere-inconnu';

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col"
                    >
                      <div className="relative h-48 overflow-hidden shrink-0">
                        <MinisterImage 
                          src={minister.image} 
                          fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(minister.name)}&background=0D8ABC&color=fff&size=512`}
                          alt={minister.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                        <div className="absolute bottom-4 left-6">
                          <p className="text-blue-400 font-black text-[9px] uppercase tracking-widest mb-1">Ministre</p>
                          <h4 className="text-white font-bold text-sm leading-tight">{minister.name}</h4>
                        </div>
                      </div>

                      <div className="p-6 flex flex-col flex-grow">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mb-1 capitalize">
                            {minister.ministry}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 italic line-clamp-2 leading-relaxed">
                            {minister.role}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 mt-auto mb-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                              <CircleDollarSign size={10} /> Budget
                            </span>
                            <p className="text-sm font-black text-slate-900">{minister.budget}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                              <TrendingUp size={10} /> Priorité
                            </span>
                            <p className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">{minister.priority}</p>
                          </div>
                        </div>

                        <Link href={`/executif/ministere/${slug}`} className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-blue-600 transition-colors pt-2">
                          <span className="text-[10px] font-black uppercase tracking-widest">Voir le ministère en détail</span>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-all">
                            <ChevronRight size={16} />
                          </div>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* GOVERNMENT NEWS SECTION */}
            <section className="space-y-8 bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                  <Newspaper size={24} />
                </div>
                <h2 className="text-3xl font-staatliches uppercase tracking-wider text-slate-900">
                  Actus du <span className="text-red-600">Gouvernement</span>
                </h2>
              </div>

              {loadingNews ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array(2).fill(0).map((_, i) => (
                    <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
                  ))}
                </div>
              ) : govtNews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {govtNews.map((item) => (
                    <FeedItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                  <p className="text-slate-500 font-medium italic">Aucune actualité gouvernementale récente disponible.</p>
                </div>
              )}

              <div className="text-center">
                 <Link href="/" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:underline">
                   Voir toutes les actualités de la plateforme
                 </Link>
              </div>
            </section>
          </div>

          {/* SIDEBAR - BUDGETS & DECREES */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* CALENDAR CTA - CONTEXTUAL ACCESS */}
            <Link href="/calendrier" className="group block">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-500/20 relative overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
                <CalendarDays className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                <div className="relative z-10 space-y-4">
                   <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                     <CalendarDays size={20} />
                   </div>
                   <h3 className="text-2xl font-staatliches uppercase tracking-tight leading-none">
                     Agenda du <br /> Gouvernement
                   </h3>
                   <p className="text-amber-50 text-xs font-medium leading-relaxed opacity-80">
                     Suivez les déplacements, conseils des ministres et auditions en direct.
                   </p>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pt-2">
                     Ouvrir le calendrier <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                   </div>
                </div>
              </div>
            </Link>

            {/* BUDGET CARD */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Budgets de l'État</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Répartition 2026</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <CircleDollarSign size={24} />
                </div>
              </div>

              {/* Hover Explanation Box - Moved to top */}
              <div className="mb-8 min-h-[90px] flex items-center justify-center bg-slate-50 rounded-3xl p-4 border border-slate-100">
                {hoveredBudget ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full"
                  >
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Détails de la mission</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed italic font-medium">
                      {hoveredBudget.desc}
                    </p>
                  </motion.div>
                ) : (
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                      Survolez un budget pour <br /> voir son explication
                    </p>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="space-y-6 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar scroll-smooth">
                  {BUDGETS.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="group/item relative space-y-2 cursor-help"
                      onMouseEnter={() => setHoveredBudget(item)}
                      onMouseLeave={() => setHoveredBudget(null)}
                    >
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-bold text-slate-600 leading-tight pr-4">{item.label}</span>
                        <span className="text-xs font-black text-slate-900 whitespace-nowrap">{item.amount} Md€</span>
                      </div>
                      
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(item.amount / 145.60) * 100}%` }}
                          transition={{ duration: 1.5, delay: 0.1 }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Scroll Indicator */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 animate-bounce pointer-events-none">
                   <span className="text-[8px] font-black uppercase text-slate-400">Scrollez pour voir plus</span>
                   <ChevronDown size={12} className="text-slate-400" />
                </div>
              </div>

              <div className="flex justify-center mt-8 w-full">
                <AwardBadge 
                  link="/executif/budget"
                  className="w-full"
                />
              </div>
            </motion.div>

            {/* DECREES CARD - SIMPLE LIST */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden"
            >
              <ScrollText className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 -rotate-12" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">Derniers Décrets</h3>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Journal Officiel</p>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <ScrollText size={20} />
                  </div>
                </div>

                <div className="space-y-3">
                  {DECREES.map((decree) => (
                    <div key={decree.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">{decree.type}</span>
                        <span className="text-[8px] text-white/40 font-bold">{decree.date}</span>
                      </div>
                      <h4 className="text-xs font-bold leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">{decree.title}</h4>
                    </div>
                  ))}
                </div>

                <a 
                  href="https://www.legifrance.gouv.fr/jorf/jo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-8 py-4 bg-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                >
                  Consulter Legifrance <ArrowRight size={14} />
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </main>
  );
}
