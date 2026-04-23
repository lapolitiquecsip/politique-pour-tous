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
            className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-100"
          >
            {/* 1. STICKY TOP HEADER (HEMICYCLE) */}
            <div className="relative z-50 bg-white border-b border-slate-100 shadow-sm">
               <div className="p-6 md:p-8 flex flex-col items-center">
                  <div className="flex justify-between items-center w-full mb-6">
                    <div className="flex flex-col">
                       <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg w-fit mb-2">
                         {law.category}
                       </span>
                       <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         Scrutin n°{law.numero} — {new Date(law.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </h2>
                    </div>
                    <button 
                      onClick={onClose}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 group"
                    >
                      <X size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                  
                  <div className="w-full max-w-3xl">
                    <HemicycleVisual groups={law.group_results || []} />
                  </div>
               </div>
            </div>

            {/* 2. SCROLLING CONTENT BODY */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar p-8 md:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
                
                {/* Left: Law Information */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="space-y-4">
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight italic tracking-tighter">
                      {law.objet}
                    </h1>
                  </div>

                  {/* Lexique / Aide */}
                  {(law.objet.includes("Motion de Rejet") || law.objet.includes("Loi complète")) && (
                    <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] flex items-start gap-6 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-blue-500/20">
                        <Info size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-black mb-1 uppercase tracking-widest text-blue-600">Comprendre ce vote</p>
                        <p className="text-sm leading-relaxed text-slate-600 font-medium">
                          {law.objet.includes("Motion de Rejet") 
                            ? "Une 'Motion de Rejet' est un vote de procédure. Si elle est adoptée, le projet de loi est rejeté immédiatement, avant même que les députés ne commencent à en discuter le contenu."
                            : "Ce vote porte sur l'intégralité du projet de loi après les débats. C'est l'étape finale qui décide si le texte est adopté ou non."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Official Link */}
                  <div className="flex items-center gap-4">
                     {law.dossier_url && (
                       <a 
                         href={law.dossier_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-3 px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-950/10"
                       >
                         Consulter le dossier officiel
                         <ExternalLink size={14} />
                       </a>
                     )}
                  </div>
                </div>

                {/* Right: Detailed Stats */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Result Card */}
                  <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] text-center shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${law.resultat?.includes('adopté') ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Résultat du scrutin</p>
                    <p className={`text-3xl font-black italic tracking-tighter ${law.resultat?.includes('adopté') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {law.resultat}
                    </p>
                  </div>

                  {/* Party Breakdown List */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 space-y-3 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Répartition par parti</p>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                          <div key={group.group_id} className="group/party">
                            <div className="flex justify-between items-center mb-2 px-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{info.name}</span>
                              </div>
                              <div className="flex gap-2">
                                 <span className="text-[10px] font-black text-emerald-600">{group.pour} P</span>
                                 <span className="text-[10px] font-black text-red-600">{group.contre} C</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 h-full" style={{ width: `${(group.pour / total) * 100}%` }} />
                              <div className="bg-red-500 h-full" style={{ width: `${(group.contre / total) * 100}%` }} />
                              <div className="bg-slate-400 h-full" style={{ width: `${(group.abstention / total) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-xl">
                    <div className="grid grid-cols-3 gap-4">
                       <div className="text-center">
                          <p className="text-2xl font-black text-emerald-400 leading-none">{law.pour}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2">Pour</p>
                       </div>
                       <div className="text-center border-x border-white/10">
                          <p className="text-2xl font-black text-red-400 leading-none">{law.contre}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2">Contre</p>
                       </div>
                       <div className="text-center">
                          <p className="text-2xl font-black text-slate-400 leading-none">{law.abstention}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2">Abs</p>
                       </div>
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
