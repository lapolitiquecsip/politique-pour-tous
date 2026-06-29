"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Calendar, ChevronRight, Search, Filter, UserCheck, X, Zap, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

import { useSearchParams } from "next/navigation";

import { usePremium } from "@/lib/hooks/usePremium";

export default function LawsGrid({ onSelectLaw, categoryFilter }: { onSelectLaw?: (law: any) => void, categoryFilter?: string | null }) {
  const [laws, setLaws] = useState<any[]>([]);
  const [deputies, setDeputies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const { isPremium } = usePremium();
  const searchParams = useSearchParams();
  const lawId = searchParams.get("id");

  useEffect(() => {
    async function load() {
      try {
        const [lawsData, deputiesData] = await Promise.all([
          api.getProposals(),
          api.getDeputies()
        ]);
        setLaws(lawsData);
        setDeputies(deputiesData);
      } catch (err) {
        console.error("Error loading laws:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const findDeputy = (authorName: string) => {
    if (!authorName || authorName === 'Le Gouvernement') return null;
    const cleanName = authorName.replace(/^(M\.|Mme\.|Monsieur|Madame)\s+/, "").trim().toLowerCase();
    const deputy = deputies.find(d => {
      const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
      return fullName.includes(cleanName) || cleanName.includes(fullName);
    });
    return deputy || null;
  };

  const filteredLaws = laws
    .filter(law => {
      const matchesSearch = law.title.toLowerCase().includes(search.toLowerCase()) ||
                           (law.category && law.category.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter ? law.category === categoryFilter || law.category?.includes(categoryFilter) : true;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // 1. Try to extract date from context "[YYYY-MM-DD] Dossier..."
      const getPubDate = (law: any) => {
        const match = law.context?.match(/^\[(\d{4}-\d{2}-\d{2})\]/);
        if (match) return new Date(match[1]).getTime();
        return 0;
      };

      const dateA = getPubDate(a);
      const dateB = getPubDate(b);
      if (dateA !== dateB) return dateB - dateA;

      // 2. Fallback to dossier sequential number
      const getDossierNum = (law: any) => {
        const url = law.source_urls?.[0] || "";
        const matchUrl = url.match(/DLR5L\d+N(\d+)/);
        if (matchUrl) return parseInt(matchUrl[1], 10);
        
        const matchSummary = law.summary?.match(/DLR5L\d+N(\d+)/);
        if (matchSummary) return parseInt(matchSummary[1], 10);

        const matchAny = url.match(/(\d+)$/);
        if (matchAny) return parseInt(matchAny[1], 10);
        
        return 0;
      };

      const numA = getDossierNum(a);
      const numB = getDossierNum(b);
      
      if (numA !== numB) return numB - numA;
      
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const totalPages = Math.ceil(filteredLaws.length / itemsPerPage);
  const paginatedLaws = filteredLaws.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Rechercher un projet ou une proposition de loi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-14 pr-8 py-5 rounded-[2rem] bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-900 font-medium"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : paginatedLaws.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedLaws.map((law, index) => (
              <motion.div
                key={law.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <span className="px-4 py-2 bg-slate-50 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest border border-slate-200">
                      {law.category}
                    </span>
                    {law.status && (
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {law.status}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 leading-tight group-hover:text-blue-600 transition-colors">
                    {law.title}
                  </h3>
                  
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                    {law.summary}
                  </p>
                </div>

                {(() => {
                  const deputy = findDeputy(law.author);
                  const content = (
                    <div className={`flex items-center gap-4 p-4 rounded-2xl mb-6 ${deputy ? 'bg-blue-50/50 group-hover:bg-blue-50 transition-colors' : 'bg-slate-50'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${deputy ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                        {deputy ? (
                          <img 
                            src={deputy.photo_url || deputy.image_url} 
                            alt={`${deputy.first_name} ${deputy.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
                            }}
                          />
                        ) : (
                          <UserCheck size={14} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {law.category === 'Projet de loi' ? 'Initiative' : 'Déposé par'}
                        </span>
                        <span className={`text-xs font-bold ${deputy ? 'text-blue-700' : 'text-slate-700'}`}>
                          {law.author}
                        </span>
                      </div>
                    </div>
                  );

                  return deputy ? (
                    <Link href={`/deputes/${deputy.slug}`} className="block">
                      {content}
                    </Link>
                  ) : content;
                })()}

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Calendar size={14} />
                    <span>{law.context?.replace(/\[.*?\]\s*/, "") || "Dossier en cours"}</span>
                  </div>
                  <button 
                    onClick={() => onSelectLaw ? onSelectLaw(law) : null}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    Détails du dossier <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-center mt-12 gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Précédent
                </button>
                
                <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-md p-1 scrollbar-hide">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }}
                          className={`w-10 h-10 shrink-0 rounded-xl font-bold text-sm transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="w-10 h-10 flex items-center justify-center text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  onClick={() => {
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  Suivant
                </button>
              </div>
              <p className="text-slate-400 text-sm font-medium">Page {currentPage} sur {totalPages}</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <FileText className="mx-auto text-slate-300 w-16 h-16 mb-4" />
          <h3 className="text-xl font-bold text-slate-900">Aucun dossier trouvé</h3>
          <p className="text-slate-500">Essayez d'ajuster votre recherche.</p>
        </div>
      )}
    </div>
  );
}
