"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Users, Info, ExternalLink } from "lucide-react";
import HemicycleVisual from "./HemicycleVisual";

interface LawDetailModalProps {
  law: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function LawDetailModal({ law, isOpen, onClose }: LawDetailModalProps) {
  if (!law) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex-1 pr-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {law.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Scrutin public n°{law.numero} — {new Date(law.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight italic tracking-tighter">
                  {law.objet}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-white rounded-full transition-all hover:shadow-lg border border-transparent hover:border-slate-100 group"
              >
                <X size={24} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-white">
              
              {/* Lexique / Aide (si besoin) */}
              {(law.objet.includes("Motion de Rejet") || law.objet.includes("Loi complète")) && (
                <div className="bg-slate-950 text-white p-6 rounded-[2.5rem] flex items-start gap-5 shadow-2xl border-t border-blue-500/30">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-blue-500/20">
                    <Info size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black mb-1 uppercase tracking-widest text-blue-400">Comprendre ce vote</p>
                    <p className="text-sm leading-relaxed text-slate-300 font-medium">
                      {law.objet.includes("Motion de Rejet") 
                        ? "Une 'Motion de Rejet' est un vote de procédure. Si elle est adoptée, le projet de loi est rejeté immédiatement, avant même que les députés ne commencent à en discuter le contenu."
                        : "Ce vote porte sur l'intégralité du projet de loi après les débats. C'est l'étape finale qui décide si le texte est adopté ou non."}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Main Visualization Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Visual Hémicycle (Left/Top) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-slate-900 rounded-full" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic">Répartition des sièges</h3>
                  </div>
                  <HemicycleVisual groups={law.group_results || []} />
                </div>

                {/* Global Stats (Right/Bottom) */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-emerald-600 rounded-full" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic">Bilan Global</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] text-center relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 w-full h-1.5 ${law.resultat?.includes('adopté') ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Résultat Final</p>
                        <p className={`text-4xl font-black italic tracking-tighter ${law.resultat?.includes('adopté') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {law.resultat}
                        </p>
                     </div>

                     <div className="grid grid-cols-3 gap-4">
                        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[2rem] text-center">
                           <p className="text-3xl font-black text-emerald-600 italic">{law.pour}</p>
                           <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mt-1">Pour</p>
                        </div>
                        <div className="bg-red-50/50 border border-red-100 p-6 rounded-[2rem] text-center">
                           <p className="text-3xl font-black text-red-600 italic">{law.contre}</p>
                           <p className="text-[9px] font-bold text-red-600/60 uppercase tracking-widest mt-1">Contre</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] text-center">
                           <p className="text-3xl font-black text-slate-400 italic">{law.abstention}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Abs</p>
                        </div>
                     </div>

                     {/* 3 Detail Boxes (Conditionally rendered) */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl flex items-center gap-3">
                           <CheckCircle2 size={18} className="text-emerald-500" />
                           <div>
                              <p className="text-[8px] font-black text-emerald-600/50 uppercase tracking-widest">Statut</p>
                              <p className="text-xs font-black text-slate-900">{law.status_detail || "En application"}</p>
                           </div>
                        </div>
                        {law.impact_detail && 
                         law.impact_detail !== "Population générale" && 
                         law.impact_detail !== "Impact global" && (
                          <div className="bg-blue-50/30 border border-blue-100/50 p-4 rounded-2xl flex items-center gap-3">
                            <Users size={18} className="text-blue-500" />
                            <div>
                              <p className="text-[8px] font-black text-blue-600/50 uppercase tracking-widest">Concernés</p>
                              <p className="text-xs font-black text-slate-900 truncate max-w-[100px]">{law.impact_detail}</p>
                            </div>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>

              {/* Vote Breakdown by Party */}
              {law.group_results && law.group_results.length > 0 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Vote par groupe politique</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {law.group_results.map((group: any) => {
                      const mapping: any = {
                        "PO845419": { name: "RN", color: "#0D2149" },
                        "PO845401": { name: "EPR", color: "#FFD600" },
                        "PO845407": { name: "LFI-NFP", color: "#CC2443" },
                        "PO845413": { name: "SOC", color: "#E1001A" },
                        "PO845425": { name: "DR", color: "#0066CC" },
                        "PO845439": { name: "DEM", color: "#FF9900" },
                        "PO845454": { name: "HOR", color: "#00A0E2" },
                        "PO845470": { name: "ÉCO", color: "#00B050" },
                        "PO845485": { name: "GDR", color: "#DD0000" },
                        "PO845514": { name: "LIOT", color: "#F5B000" },
                        "PO872880": { name: "UDR", color: "#004792" },
                      };
                      const info = mapping[group.group_id] || { name: group.group_id, color: "#94a3b8" };
                      const total = group.pour + group.contre + group.abstention;
                      if (total === 0) return null;

                      return (
                        <div key={group.group_id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                              <span className="font-black text-slate-900">{info.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{total} votants</span>
                          </div>
                          
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(group.pour / total) * 100}%` }} />
                            <div className="bg-red-500 h-full transition-all" style={{ width: `${(group.contre / total) * 100}%` }} />
                            <div className="bg-slate-400 h-full transition-all" style={{ width: `${(group.abstention / total) * 100}%` }} />
                          </div>

                          <div className="flex justify-between mt-2">
                             <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black text-slate-900">{group.pour}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="text-[9px] font-black text-slate-900">{group.contre}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span className="text-[9px] font-black text-slate-900">{group.abstention}</span>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Official Link */}
              <div className="pt-8 flex justify-center">
                 {law.dossier_url && (
                   <a 
                     href={law.dossier_url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center gap-3 px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all"
                   >
                     Consulter le dossier officiel AN
                     <ExternalLink size={16} />
                   </a>
                 )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
