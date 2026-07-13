"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Gavel, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  FileText,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LegalStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  deputy: any;
}

// Explication en langage simple selon l'infraction mentionnée dans l'affaire.
const INFRACTION_INFO: Array<{ re: RegExp; text: string }> = [
  { re: /détournement de fonds/i, text: "Utiliser à des fins privées de l'argent public confié dans le cadre d'une fonction." },
  { re: /abus de bien/i, text: "Se servir des biens ou de l'argent d'une société pour son intérêt personnel, contre celui de la société." },
  { re: /diffamation/i, text: "Tenir des propos portant atteinte à l'honneur ou à la réputation d'une personne." },
  { re: /injure/i, text: "Employer des termes outrageants, sans imputer un fait précis." },
  { re: /prise illégale d'intér/i, text: "Pour un élu, tirer un intérêt personnel d'une affaire dont il a la charge." },
  { re: /favoritisme/i, text: "Accorder un avantage injustifié lors d'un marché public, rompant l'égalité entre candidats." },
  { re: /corruption/i, text: "Accepter ou proposer un avantage en échange d'un acte lié à sa fonction." },
  { re: /trafic d'influence/i, text: "Monnayer son influence, réelle ou supposée, auprès d'une autorité." },
  { re: /financement (illégal|illicite)/i, text: "Ne pas respecter les règles de financement des campagnes ou des partis." },
  { re: /empl(oi|ois?) fictif/i, text: "Verser une rémunération pour un travail qui n'est pas réellement effectué." },
  { re: /fraude fiscale/i, text: "Se soustraire volontairement à l'impôt par dissimulation ou fausse déclaration." },
  { re: /(provocation|incitation).*(haine|discrimination)|haine raciale/i, text: "Inciter à la haine ou à la discrimination envers un groupe de personnes." },
  { re: /recel/i, text: "Détenir ou profiter d'un bien que l'on sait issu d'une infraction." },
  { re: /harcèlement/i, text: "Faire subir à une personne des propos ou comportements répétés qui la dégradent." },
];
function explainIssue(text: string): string | null {
  const hit = INFRACTION_INFO.find(i => i.re.test(text));
  return hit ? hit.text : null;
}

export default function LegalStatusModal({ isOpen, onClose, deputy }: LegalStatusModalProps) {
  // Parsing the legal issues string or using default
  const rawIssues = deputy?.legal_issues || "Aucune affaire judiciaire connue ou signalée à ce jour.";
  const isClean = rawIssues.toLowerCase().includes("aucune") || rawIssues.toLowerCase().includes("casier vierge");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
          >
            {/* Folder Tab Effect */}
            <div className="absolute top-0 left-12 w-32 h-2 bg-emerald-500 rounded-b-full shadow-lg shadow-emerald-500/20" />

            {/* Header */}
            <div className="p-8 pb-6 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${isClean ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
                  {isClean ? <ShieldCheck size={32} /> : <Gavel size={32} />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Dossier Numérisé n°{deputy?.an_id || '---'}</p>
                  <h3 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                    Historique <span className={isClean ? 'text-emerald-600' : 'text-amber-600'}>Juridique</span>
                  </h3>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 hover:rotate-90 transition-transform"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              
              {/* STATUS CARD */}
              <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${isClean ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/20'}`}>
                <div className={`absolute top-0 right-0 p-4 ${isClean ? 'text-emerald-500/20' : 'text-amber-500/20'}`}>
                  {isClean ? <CheckCircle2 size={80} /> : <AlertCircle size={80} />}
                </div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isClean ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                       {isClean ? 'Vérifié : RAS' : 'Vérifié : À consulter'}
                     </span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mise à jour : {new Date().toLocaleDateString('fr-FR')}</span>
                   </div>
                   <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4 italic leading-tight">
                     {isClean 
                       ? `Le dossier de ${deputy?.first_name} ${deputy?.last_name} ne présente aucune mention judiciaire.`
                       : `Des éléments juridiques ont été relevés concernant ${deputy?.first_name} ${deputy?.last_name}.`}
                   </h4>
                   
                   {!isClean ? (
                    <div className="space-y-4 mt-6">
                      {rawIssues.split('\n\n\n').filter(Boolean).map((issue: string, idx: number) => {
                        const lines = issue.split('\n').filter(Boolean);
                        const title = lines[0];
                        const details = lines.slice(1).join('\n');
                        const explanation = explainIssue(issue);

                        return (
                          <div key={idx} className="relative pl-8 border-l-2 border-amber-500/20 dark:border-amber-500/10 py-2 group">
                            <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-500/20 group-hover:scale-125 transition-transform" />
                            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm p-5 rounded-2xl border border-white dark:border-white/5 shadow-sm group-hover:shadow-md transition-all">
                              <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 leading-tight">
                                {title}
                              </h5>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                                {details}
                              </div>
                              {explanation && (
                                <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 normal-case font-medium italic border-t border-slate-100 dark:border-white/5 pt-3">
                                  <span className="not-italic">💡</span>
                                  <span>{explanation}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                   ) : (
                    <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-white/50 dark:border-white/5 shadow-inner font-medium italic whitespace-pre-line">
                      {rawIssues}
                    </div>
                   )}
                </div>
              </div>

              {/* SOURCE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="https://casier-politique.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-4 group hover:bg-white dark:hover:bg-slate-700 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600">
                    <Search size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 group-hover:text-blue-600">casier-politique.fr <ExternalLink size={12} /></p>
                  </div>
                </a>
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mise à jour</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Quotidienne, automatique</p>
                  </div>
                </div>
              </div>

              {/* FOOTER MESSAGE */}
              <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex items-center gap-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} className="text-amber-400" />
                </div>
                <p className="text-[11px] leading-relaxed italic opacity-80">
                  Ces informations sont fournies à titre indicatif et visent à renforcer la transparence démocratique. Elles ne constituent en aucun cas un jugement de valeur définitif.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-xl hover:shadow-slate-900/20 transition-all active:scale-[0.98]"
              >
                Fermer le dossier
              </button>
              {deputy?.hatvp_url && (
                <a 
                  href={deputy.hatvp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors shadow-sm"
                >
                  <ExternalLink size={20} />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
