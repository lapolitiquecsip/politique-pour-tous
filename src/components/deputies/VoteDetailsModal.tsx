
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Landmark, ExternalLink, Info, CheckCircle2, XCircle, MinusCircle, AlertCircle, Layers } from 'lucide-react';

interface VoteDetailsModalProps {
  vote: any;
  onClose: () => void;
}

const getVoteDisplay = (position: string) => {
  switch (position) {
    case 'POUR':
      return { label: 'POUR', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 };
    case 'CONTRE':
      return { label: 'CONTRE', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: XCircle };
    case 'ABSTENTION':
      return { label: 'ABSTENTION', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: MinusCircle };
    default:
      return { label: 'NON VOTANT', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10', icon: AlertCircle };
  }
};

const VoteDetailsModal: React.FC<VoteDetailsModalProps> = ({ vote, onClose }) => {
  if (!vote) return null;

  const s = vote.scrutins;
  const voteInfo = getVoteDisplay(vote.position);
  const dateStr = s?.date_scrutin 
    ? new Date(s.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date inconnue';

  const subVotes = vote.subVotes || [];
  const title = vote.cleanedTitle || s.objet;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto scrollbar-hide"
        >
          {/* Header Image/Pattern */}
          <div className="h-32 bg-gradient-to-r from-red-600 to-red-800 relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute -bottom-8 left-10 w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-lg">
              <Landmark className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="pt-12 pb-10 px-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Scrutin n°{s.numero} • {dateStr}
              </span>
              <span className="bg-blue-500/10 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">
                LOI
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              {title}
            </h2>

            <div className="space-y-8">
              {/* Summary Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Info className="w-4 h-4 text-red-500" />
                  </div>
                  <h3 className="font-bold text-lg">Résumé de la loi</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {s.summary || "L'explication simplifiée est en cours de génération par notre IA..."}
                </p>
              </div>

              {/* Why it matters */}
              {s.why_it_matters && (
                <div className="space-y-3 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-6 bg-red-500 rounded-full" />
                    L'enjeu principal
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {s.why_it_matters}
                  </p>
                </div>
              )}

              {/* Vote Info Card */}
              <div className={`p-6 rounded-3xl ${voteInfo.bg} flex items-center justify-between border border-transparent`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Position globale</span>
                  <div className={`flex items-center gap-2 ${voteInfo.color} font-black text-xl italic uppercase`}>
                    <voteInfo.icon className="w-6 h-6" />
                    {voteInfo.label}
                  </div>
                </div>
                {s.dossier_url && (
                  <a 
                    href={s.dossier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800"
                  >
                    Dossier Officiel <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Sub-votes breakdown */}
              {subVotes.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                     <Layers className="w-5 h-5 text-blue-500" />
                     <h3 className="font-bold text-lg">Détail par article</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subVotes.map((sv: any) => {
                      const svDisplay = getVoteDisplay(sv.position);
                      return (
                        <div key={sv.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                           <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Article {sv.articleLabel}</span>
                           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${svDisplay.bg} ${svDisplay.color} text-[10px] font-black`}>
                              <svDisplay.icon className="w-3 h-3" />
                              {svDisplay.label}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VoteDetailsModal;
