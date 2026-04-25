"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Users, 
  CircleDollarSign, 
  ScrollText, 
  ChevronRight,
  Landmark,
  Building2,
  TrendingUp,
  Search,
  ArrowRight,
  Newspaper,
  CalendarDays
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import FeedItemCard from "@/components/home/FeedItemCard";
import GlossaryText from "@/components/ui/GlossaryText";

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
    budget: "47.2 Md€",
    priority: "LPM & Modernisation nucléaire"
  },
  {
    name: "Bruno Retailleau",
    role: "Ministre de l'Intérieur",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Bruno_Retailleau_2024.jpg/800px-Bruno_Retailleau_2024.jpg",
    ministry: "Place Beauvau",
    budget: "22.1 Md€",
    priority: "Sécurité publique & Immigration"
  }
];

const BUDGETS = [
  { label: "Éducation Nationale", amount: 63.6, color: "bg-blue-500" },
  { label: "Défense", amount: 47.2, color: "bg-red-500" },
  { label: "Enseignement Supérieur", amount: 26.5, color: "bg-emerald-500" },
  { label: "Intérieur", amount: 22.1, color: "bg-purple-500" },
  { label: "Justice", amount: 10.1, color: "bg-amber-500" },
  { label: "Solidarités", amount: 35.8, color: "bg-indigo-500" }
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

  useEffect(() => {
    async function loadNews() {
      const news = await api.getContent(4, "gouvernement");
      setGovtNews(news);
      setLoadingNews(false);
    }
    loadNews();
  }, []);

  const filteredMinisters = MINISTERS.filter(m => 
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
                {filteredMinisters.map((minister, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={minister.image} 
                        alt={minister.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                      <div className="absolute bottom-4 left-6">
                        <p className="text-blue-400 font-black text-[9px] uppercase tracking-widest mb-1">Ministère</p>
                        <h4 className="text-white font-bold text-sm leading-tight">{minister.ministry}</h4>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mb-1">
                          {minister.name}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500 italic line-clamp-2 leading-relaxed">
                          {minister.role}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
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

                      <button className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-blue-600 transition-colors pt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">Voir l'action détaillée</span>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    </div>
                  </motion.div>
                ))}
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

              <div className="space-y-6">
                {BUDGETS.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                      <span className="text-xs font-black text-slate-900">{item.amount} Md€</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(item.amount / 63.6) * 100}%` }}
                        transition={{ duration: 1.5, delay: idx * 0.1 }}
                        className={`h-full ${item.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                Détails de la loi de finances <TrendingUp size={14} />
              </button>
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

            {/* HOW IT WORKS SECTION */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
               <div className="flex items-center gap-3 mb-6">
                 <Building2 className="text-blue-600" size={24} />
                 <h3 className="text-xl font-staatliches uppercase tracking-wide text-slate-900">Le Pouvoir Exécutif</h3>
               </div>
               <p className="text-sm text-slate-500 leading-relaxed font-medium italic mb-6">
                 Le Gouvernement détermine et conduit la politique de la Nation. Il dispose de l'administration et de la force armée.
               </p>
               <Link href="/vocabulaire" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:translate-x-1 transition-transform">
                 En savoir plus sur Matignon <ChevronRight size={14} />
               </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
