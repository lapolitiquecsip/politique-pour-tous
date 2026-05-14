"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, UserCheck, Info, ExternalLink, ChevronLeft, ChevronRight, FileText, Zap, ArrowRight, Calendar, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import HemicycleVisual from "./HemicycleVisual";
import VoteHemicycle from "./VoteHemicycle";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";

interface UniversalLawModalProps {
  law: any;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export default function UniversalLawModal({ law, isOpen, onClose, onNext, onPrevious }: UniversalLawModalProps) {
  const { isPremium, userId } = usePremium();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !law || !userId || !isPremium) return;
    
    const checkSaved = async () => {
      const savedItems = await api.getUserSavedItems(userId);
      const itemType = law.pour !== undefined ? 'scrutin' : 'law';
      const found = savedItems.find((item: any) => item.item_id === law.id.toString() && item.item_type === itemType);
      setIsSaved(!!found);
    };
    
    checkSaved();
  }, [isOpen, law, userId, isPremium]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && onNext) onNext();
      if (e.key === "ArrowLeft" && onPrevious) onPrevious();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onNext, onPrevious, onClose]);

  const handleToggleSave = async () => {
    if (!userId || !law || !isPremium) return;
    setSaving(true);
    const itemType = law.pour !== undefined ? 'scrutin' : 'law';
    
    try {
      if (isSaved) {
        await api.unsaveItem(userId, law.id.toString(), itemType);
        setIsSaved(false);
      } else {
        await api.saveItem(userId, law.id.toString(), itemType);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Erreur toggle save:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!law) return null;

  // Determine if it's a Voted Law (Scrutin) or a Proposal (Law)
  const isScrutin = law.pour !== undefined && law.contre !== undefined;
  const isProposal = !isScrutin;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-[105]"
          >
            {/* Top Buttons (Close & Save) */}
            <div className="absolute top-6 right-6 flex items-center gap-3 z-[110]">
              {isPremium && (
                <button
                  onClick={handleToggleSave}
                  disabled={saving}
                  className={`p-2.5 rounded-full transition-all flex items-center gap-2 group shadow-sm ${
                    isSaved 
                      ? "bg-amber-100 text-amber-600 hover:bg-amber-200" 
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                  title={isSaved ? "Retirer des favoris" : "Enregistrer dans mes favoris"}
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isSaved ? (
                    <BookmarkCheck size={18} className="fill-current" />
                  ) : (
                    <Bookmark size={18} />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">
                    {isSaved ? "Enregistré" : "Enregistrer"}
                  </span>
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {isScrutin ? (
                // --- VOTED LAW (SCRUTIN) UI ---
                <div className="p-8 md:p-12">
                   <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 -mx-12 -mt-12 mb-12">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                          {law.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Scrutin public n°{law.numero} — {new Date(law.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight italic tracking-tighter">
                        {law.objet}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <div className="lg:col-span-7 space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-slate-900 rounded-full" />
                        <h3 className="text-xl font-black uppercase tracking-tighter italic">Répartition des sièges</h3>
                      </div>
                      <div className="bg-slate-50/50 rounded-[2rem] p-4 border border-slate-100">
                        <HemicycleVisual groups={law.group_results || []} />
                      </div>

                      {law.summary && (
                         <section className="pt-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                              <Info className="text-blue-500" size={20} /> Résumé du scrutin
                            </h3>
                            <p className="text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">
                              {law.summary}
                            </p>
                         </section>
                      )}

                      {law.why_it_matters && (() => {
                        const parts = law.why_it_matters.split('|||DETAILED|||');
                        const whyItMatters = parts[0];
                        const detailedSummary = parts[1];
                        return (
                          <>
                            {whyItMatters && (
                              <section className="pt-4">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <FileText className="text-blue-500" size={20} /> Pourquoi c'est important ?
                                </h3>
                                <p className="text-slate-600 leading-relaxed bg-blue-50/50 p-6 rounded-3xl border border-blue-100 italic">
                                  {whyItMatters}
                                </p>
                              </section>
                            )}
                            
                            {detailedSummary && (
                              <section className="mt-8">
                                {!isPremium ? (
                                  <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-slate-950 border border-white/5 shadow-2xl">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                                        <Zap size={24} fill="currentColor" />
                                      </div>
                                      <div>
                                        <span className="text-2xl font-staatliches tracking-wider uppercase bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent block">Analyse détaillée</span>
                                        <span className="text-[10px] font-black uppercase text-amber-500/60 tracking-widest">Réservé aux membres Premium</span>
                                      </div>
                                    </div>
                                    <Link 
                                      href="/premium"
                                      className="px-6 py-3 bg-gradient-to-r from-amber-200 to-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                    >
                                      Débloquer
                                    </Link>
                                  </div>
                                ) : (
                                  <div className="relative p-8 md:p-12 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl border border-white/5">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                                    
                                    <div className="relative z-10">
                                      <div className="flex items-center gap-3 mb-10">
                                        <div className="p-3 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-2xl text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                                          <Zap size={24} fill="currentColor" />
                                        </div>
                                        <h4 className="text-4xl font-staatliches tracking-wider uppercase bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">Analyse détaillée</h4>
                                      </div>
                                      
                                      <div className="space-y-8">
                                        <div className="prose prose-invert max-w-none">
                                          <div className="text-amber-50/90 leading-relaxed text-lg whitespace-pre-wrap font-medium">
                                            {detailedSummary}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </section>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="lg:col-span-5 space-y-8">
                       <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] text-center relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1.5 ${law.resultat?.includes('adopté') ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Résultat Final</p>
                        <p className={`text-2xl font-black italic tracking-tighter ${law.resultat?.includes('adopté') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {law.resultat}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <VoteHemicycle pour={law.pour} contre={law.contre} abstention={law.abstention} />
                        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                           <div className="text-center">
                              <p className="text-xl font-black text-emerald-600 leading-none">{law.pour}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Pour</p>
                           </div>
                           <div className="text-center border-x border-slate-100">
                              <p className="text-xl font-black text-red-600 leading-none">{law.contre}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Contre</p>
                           </div>
                           <div className="text-center">
                              <p className="text-xl font-black text-slate-400 leading-none">{law.abstention}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Abs</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // --- PROPOSAL / BILL (LAW) UI ---
                <div className="p-8 md:p-12">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                      {law.category || 'Législation'}
                    </span>
                    <span className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                      <Calendar size={12} /> {law.context?.replace(/\[.*?\]\s*/, "") || "En cours"}
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-12 leading-tight">
                    {law.title}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-12">
                      <section>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <FileText className="text-blue-500" size={20} /> Résumé de la loi
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-lg italic bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          {law.summary}
                        </p>
                      </section>

                      <section>
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <CheckCircle2 className="text-green-500" size={20} /> État d'avancement
                        </h3>
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                          {law.timeline && law.timeline !== "Analyse du parcours législatif en cours..." ? (
                            <div className="relative">
                              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-green-100 shadow-sm" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-wider text-green-600 mb-1">Dernière étape franchie</span>
                                <p className="text-slate-900 font-bold text-lg leading-tight">{law.timeline}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-200" />
                              <p className="text-slate-400 italic">Mise à jour en cours par nos services...</p>
                            </div>
                          )}
                        </div>
                      </section>

                      {law.content && (
                        <section className="mt-8">
                          {!isPremium ? (
                            <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-slate-950 border border-white/5 shadow-2xl">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                                  <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                  <span className="text-2xl font-staatliches tracking-wider uppercase bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent block">Analyse détaillée</span>
                                  <span className="text-[10px] font-black uppercase text-amber-500/60 tracking-widest">Réservé aux membres Premium</span>
                                </div>
                              </div>
                              <Link 
                                href="/premium"
                                className="px-6 py-3 bg-gradient-to-r from-amber-200 to-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                              >
                                Débloquer
                              </Link>
                            </div>
                          ) : (
                            <div className="relative p-8 md:p-12 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl border border-white/5">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                              
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-10">
                                  <div className="p-3 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-2xl text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                                    <Zap size={24} fill="currentColor" />
                                  </div>
                                  <h4 className="text-4xl font-staatliches tracking-wider uppercase bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">Analyse détaillée</h4>
                                </div>
                                
                                <div className="space-y-8">
                                  <div className="prose prose-invert max-w-none">
                                    <div className="text-amber-50/90 leading-relaxed text-lg whitespace-pre-wrap font-medium">
                                      {(() => {
                                        let formatted = law.content.replace(
                                          /(\d+(?:[.,]\d+)?%?|\d+\s?€)/g, 
                                          '<span class="bg-amber-400/30 text-amber-200 px-1 rounded font-black border-b-2 border-amber-400/50">$1</span>'
                                        );

                                        formatted = formatted.replace(
                                          /(^|\n)(CONTEXTE\s?:|MESURES PROPOSÉES\s?:|MESURES PROPOSÉES|CONTEXTE)(\s|$)/gi,
                                          '$1<span class="block text-2xl font-black text-white mt-12 mb-6 font-staatliches tracking-wider uppercase bg-white/5 py-3 px-6 rounded-2xl border-l-4 border-amber-400">$2</span>'
                                        );

                                        formatted = formatted.replace(
                                          /(\n(?:\s+)?[-•\d]\s)/g,
                                          '<br/>$1'
                                        );

                                        return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
                                      })()}
                                    </div>
                                  </div>

                                  <div className="pt-10 border-t border-white/10 flex flex-wrap gap-4">
                                    <a 
                                      href={law.source_urls?.[0] || "#"} 
                                      target="_blank"
                                      className="px-10 py-5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-2xl shadow-amber-900/20"
                                    >
                                      Consulter le dossier officiel <ArrowRight size={18} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </section>
                      )}
                    </div>

                    <div className="space-y-8">
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-6">
                          Initiateur du texte
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                            <UserCheck size={20} />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900 leading-tight">{law.author || "Non spécifié"}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-tight font-black mt-1">{law.category}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 bg-slate-950 text-white rounded-[2.5rem] border border-white/5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                          <CheckCircle2 size={20} />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          Ce dossier est <span className="text-white font-bold underline decoration-blue-500 underline-offset-4">mis à jour automatiquement</span> par notre intelligence artificielle.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
