"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Calendar, Users, Info, ExternalLink } from "lucide-react";
import VoteHemicycle from "./VoteHemicycle";

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
            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-start">
              <div className="flex-1 pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    {law.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Scrutin n°{law.numero}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight italic">
                  {law.objet}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              
              {/* 3 Detail Boxes (from user screenshot) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[2rem] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Statut</p>
                    <p className="text-lg font-black text-slate-900 leading-none">{law.status_detail || "En application"}</p>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[2rem] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest">Entrée en vigueur</p>
                    <p className="text-lg font-black text-slate-900 leading-none">{law.entry_date_detail || "Prochainement"}</p>
                  </div>
                </div>

                {law.impact_detail && 
                 law.impact_detail !== "Population générale" && 
                 law.impact_detail !== "Impact global" && (
                  <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">Concernés</p>
                      <p className="text-lg font-black text-slate-900 leading-none">{law.impact_detail}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Vote Breakdown */}
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-slate-900 rounded-full" />
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Détail du vote</h3>
                </div>

                <div className="flex flex-col lg:flex-row items-center gap-12 bg-slate-50/50 rounded-[2.5rem] p-10">
                  <div className="w-full lg:w-1/2 flex justify-center">
                    <div className="scale-125 origin-center">
                      <VoteHemicycle 
                        pour={law.pour || 0} 
                        contre={law.contre || 0} 
                        abstention={law.abstention || 0}
                        showLabels={false}
                      />
                    </div>
                  </div>
                  
                  <div className="w-full lg:w-1/2 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                       <div className="text-center">
                          <p className="text-4xl font-black text-emerald-600">{law.pour}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pour</p>
                       </div>
                       <div className="text-center border-x border-slate-200">
                          <p className="text-4xl font-black text-red-600">{law.contre}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contre</p>
                       </div>
                       <div className="text-center">
                          <p className="text-4xl font-black text-slate-400">{law.abstention}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abstention</p>
                       </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-200">
                       <div className="flex items-center gap-2 text-slate-500 mb-2">
                          <Info size={16} />
                          <span className="text-xs font-medium italic">Résultat final : {law.resultat}</span>
                       </div>
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
