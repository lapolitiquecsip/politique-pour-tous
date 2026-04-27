"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Calendar, ChevronRight, Search, Filter, UserCheck, X, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function LawsGrid() {
  const [laws, setLaws] = useState<any[]>([]);
  const [deputies, setDeputies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLaw, setSelectedLaw] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const [lawsData, deputiesData] = await Promise.all([
          api.getLaws(),
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

  const findDeputySlug = (authorName: string) => {
    if (!authorName || authorName === 'Le Gouvernement') return null;
    const cleanName = authorName.replace(/^(M\.|Mme\.|Monsieur|Madame)\s+/, "").trim().toLowerCase();
    const deputy = deputies.find(d => {
      const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
      return fullName.includes(cleanName) || cleanName.includes(fullName);
    });
    return deputy ? deputy.slug : null;
  };

  const filteredLaws = laws
    .filter(law => 
      law.title.toLowerCase().includes(search.toLowerCase()) ||
      (law.category && law.category.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = a.context?.match(/\[(\d{4}-\d{2}-\d{2})\]/)?.[1] || "0000-00-00";
      const dateB = b.context?.match(/\[(\d{4}-\d{2}-\d{2})\]/)?.[1] || "0000-00-00";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

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
      ) : filteredLaws.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLaws.map((law, index) => (
            <motion.div
              key={law.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                      {law.category || 'Législation'}
                    </span>
                    {law.date_adopted && (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-[10px] font-black uppercase tracking-widest">
                        Adopté
                      </span>
                    )}
                  </div>
                  <FileText className="text-slate-300 w-6 h-6 group-hover:text-blue-500 transition-colors" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-4 leading-tight group-hover:text-blue-600 transition-colors line-clamp-3">
                  {law.title}
                </h3>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">
                  {law.summary}
                </p>

                {law.author && (() => {
                  const slug = findDeputySlug(law.author);
                  const content = (
                    <div className={`flex items-center gap-3 mb-6 p-3 rounded-2xl border transition-all duration-300 ${slug ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer' : 'bg-slate-50 border-slate-100/50'}`}>
                      <div className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center border transition-colors ${slug ? 'bg-white text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white' : 'bg-white text-slate-400 border-slate-100'}`}>
                        <UserCheck size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none mb-1">
                          {law.category === 'Projet de loi' ? 'Initiative' : 'Déposé par'}
                        </span>
                        <span className={`text-xs font-bold leading-none ${slug ? 'text-blue-700' : 'text-slate-700'}`}>
                          {law.author}
                        </span>
                      </div>
                    </div>
                  );

                  return slug ? (
                    <Link href={`/deputes/${slug}`} className="block">
                      {content}
                    </Link>
                  ) : content;
                })()}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Calendar size={14} />
                  <span>{law.context?.replace(/\[.*?\]\s*/, "") || "Dossier en cours"}</span>
                </div>
                <button 
                  onClick={() => setSelectedLaw(law)}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900 hover:text-blue-600 transition-colors"
                >
                  Détails du dossier <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <FileText className="mx-auto text-slate-300 w-16 h-16 mb-4" />
          <h3 className="text-xl font-bold text-slate-900">Aucun dossier trouvé</h3>
          <p className="text-slate-500">Essayez d'ajuster votre recherche.</p>
        </div>
      )}

      {/* MODAL OVERLAY */}
      <AnimatePresence>
        {selectedLaw && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLaw(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedLaw(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="overflow-y-auto p-8 md:p-12">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                    {selectedLaw.category || 'Législation'}
                  </span>
                  <span className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    <Calendar size={12} /> {selectedLaw.context?.replace(/\[.*?\]\s*/, "") || "En cours"}
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-8 leading-tight">
                  {selectedLaw.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="md:col-span-2 space-y-10">
                    {/* Summary Section */}
                    <section>
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText className="text-blue-500" size={20} /> Résumé de la loi
                      </h3>
                      <p className="text-slate-600 leading-relaxed text-lg italic bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        {selectedLaw.summary}
                      </p>
                    </section>

                    {/* Timeline Section */}
                    <section>
                      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <CheckCircle2 className="text-green-500" size={20} /> État d'avancement
                      </h3>
                      <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                        {selectedLaw.timeline ? (
                          // If we have a timeline string from the database
                          <div className="relative">
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                            <p className="text-slate-700 font-bold">{selectedLaw.timeline}</p>
                          </div>
                        ) : (
                          <div className="relative opacity-60">
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-200" />
                            <p className="text-slate-400 italic">Analyse du parcours législatif en cours...</p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Premium Section */}
                    {selectedLaw.content && (
                      <section className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-blue-900 text-white overflow-hidden shadow-xl">
                        <Zap className="absolute top-8 right-8 text-yellow-400 opacity-20 w-24 h-24 rotate-12" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-yellow-400 rounded-xl text-slate-900">
                              <Zap size={16} fill="currentColor" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.2em] text-yellow-400">Analyse Premium</span>
                          </div>

                          <h4 className="text-xl font-bold mb-6">Résumé détaillé & Chiffres clés</h4>
                          
                          <div className="space-y-6 text-blue-50/90 leading-relaxed whitespace-pre-wrap">
                            {selectedLaw.content}
                          </div>

                          <div className="mt-10 pt-10 border-t border-white/10 flex flex-wrap gap-4">
                            <Link 
                              href={selectedLaw.source_urls?.[0] || "#"} 
                              target="_blank"
                              className="px-6 py-3 bg-white text-slate-900 rounded-full font-bold text-sm hover:bg-yellow-400 transition-colors flex items-center gap-2"
                            >
                              Consulter le dossier officiel <ArrowRight size={16} />
                            </Link>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-8">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-4">
                        Initiateur du texte
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{selectedLaw.author || "Non spécifié"}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-tight">{selectedLaw.category}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                      <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                         Besoin d'aide ?
                      </h4>
                      <p className="text-xs text-blue-700/80 leading-relaxed">
                        Ce dossier est mis à jour quotidiennement par notre IA pour vous offrir une transparence totale sur le travail parlementaire.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
