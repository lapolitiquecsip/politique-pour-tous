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
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            {/* Close Button (Fixed) */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-[60] p-3 bg-white/80 backdrop-blur-md hover:bg-white rounded-full transition-all shadow-lg border border-slate-100 group"
            >
              <X size={24} className="text-slate-400 group-hover:text-red-500 transition-colors" />
            </button>

            {/* Content Body (Scrolling) */}
            <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
              
              {/* 1. HERO VISUALIZATION (THE HEMICYCLE) */}
              <div className="bg-slate-50/50 p-8 pt-12 border-b border-slate-100">
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="flex flex-col items-center text-center space-y-2 mb-4">
                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-500/20">
                      {law.category}
                    </span>
                    <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
                      Scrutin public n°{law.numero} — {new Date(law.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>
                  </div>
                  
                  <HemicycleVisual groups={law.group_results || []} />
                </div>
              </div>

              {/* 2. THE TITLE & GLOBAL STATS SECTION */}
              <div className="p-8 md:p-12 space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  
                  {/* Left: The Law Subject */}
                  <div className="lg:col-span-7 space-y-6">
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] italic tracking-tighter">
                      {law.objet}
                    </h1>
                    
                    {/* Lexique / Aide */}
                    {(law.objet.includes("Motion de Rejet") || law.objet.includes("Loi complète")) && (
                      <div className="bg-slate-950 text-white p-6 rounded-[2.5rem] flex items-start gap-5 shadow-2xl border-t border-blue-500/30">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                          <Info size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-black mb-1 uppercase tracking-widest text-blue-400">Décryptage</p>
                          <p className="text-sm leading-relaxed text-slate-300 font-medium">
                            {law.objet.includes("Motion de Rejet") 
                              ? "Une 'Motion de Rejet' est un vote de procédure. Si elle est adoptée, le projet de loi est rejeté immédiatement, avant même que les députés ne commencent à en discuter le contenu."
                              : "Ce vote porte sur l'intégralité du projet de loi après les débats. C'est l'étape finale qui décide si le texte est adopté ou non."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Detailed Breakdown */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-950 text-white p-8 rounded-[2.5rem] text-center relative overflow-hidden shadow-2xl">
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${law.resultat?.includes('adopté') ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Résultat Final</p>
                      <p className={`text-4xl font-black italic tracking-tighter ${law.resultat?.includes('adopté') ? 'text-emerald-400' : 'text-red-400'}`}>
                        {law.resultat}
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {law.group_results && law.group_results.map((group: any) => {
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
                          <div key={group.group_id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                                <span className="text-[11px] font-black text-slate-900">{info.name}</span>
                              </div>
                              <div className="flex gap-2">
                                 <span className="text-[11px] font-black text-emerald-600">{group.pour} <span className="text-[8px] font-bold text-slate-300">P</span></span>
                                 <span className="text-[11px] font-black text-red-600">{group.contre} <span className="text-[8px] font-bold text-slate-300">C</span></span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 h-full" style={{ width: `${(group.pour / total) * 100}%` }} />
                              <div className="bg-red-500 h-full" style={{ width: `${(group.contre / total) * 100}%` }} />
                              <div className="bg-slate-400 h-full" style={{ width: `${(group.abstention / total) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Global Summary */}
                    <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-100">
                       <div className="text-center">
                          <p className="text-2xl font-black text-emerald-600 leading-none">{law.pour}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pour</p>
                       </div>
                       <div className="text-center border-x border-slate-100">
                          <p className="text-2xl font-black text-red-600 leading-none">{law.contre}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Contre</p>
                       </div>
                       <div className="text-center">
                          <p className="text-2xl font-black text-slate-400 leading-none">{law.abstention}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Abs</p>
                       </div>
                    </div>

                    <div className="pt-6">
                       {law.dossier_url && (
                         <a 
                           href={law.dossier_url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center justify-center gap-3 w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 hover:text-white transition-all"
                         >
                           Dossier Officiel AN
                           <ExternalLink size={14} />
                         </a>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
