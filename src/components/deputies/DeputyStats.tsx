
import React from 'react';
import { 
  BarChart3, 
  Users, 
  Trophy, 
  History, 
  ArrowUpRight,
  User,
  Medal,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DeputyStatsProps {
  deputy: any;
}

const DeputyStats: React.FC<DeputyStatsProps> = ({ deputy }) => {
  if (!deputy) return null;

  const participation = deputy.participation_rate || 0;
  const loyalty = deputy.group_loyalty || 0;
  const election = deputy.election_score;
  const history = deputy.political_history || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Key Performance Indicators */}
      <motion.div 
        whileHover={{ y: -4 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Performance Parlementaire</h3>
        </div>

        <div className="space-y-8">
          {/* Participation Rate */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Taux de Participation</p>
              <span className="text-2xl font-black text-blue-600">{participation}%</span>
            </div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${participation}%` }}
                className="h-full bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>

          {/* Group Loyalty */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loyauté au Groupe</p>
              <span className="text-2xl font-black text-emerald-600">{loyalty}%</span>
            </div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${loyalty}%` }}
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Election Results */}
      <motion.div 
        whileHover={{ y: -4 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Résultats Élections 2024</h3>
        </div>

        {election ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-3xl bg-amber-500/5 border border-amber-500/10">
               <div className="flex items-center gap-3">
                 <Medal className="w-5 h-5 text-amber-500" />
                 <div>
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Élu au {election.round}er tour</p>
                   <p className="font-bold text-slate-900 dark:text-white">Performance Majoritaire</p>
                 </div>
               </div>
               <span className="text-xl font-black text-slate-900 dark:text-white">
                 {election.candidates[0]?.percent}
               </span>
            </div>

            <div className="space-y-2 mt-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Principaux Adversaires</p>
               {election.candidates.slice(1, 4).map((cand: any, i: number) => (
                 <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{cand.name}</span>
                    <span className="font-bold text-slate-400">{cand.percent}</span>
                 </div>
               ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-10">
            <Users className="w-10 h-10 mb-2" />
            <p className="text-sm font-bold uppercase tracking-widest">Données indisponibles</p>
          </div>
        )}
      </motion.div>

      {/* 3. Political Career History (Full Width) */}
      <motion.div 
        whileHover={{ y: -4 }}
        className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Carrière Politique</h3>
        </div>

        <div className="relative">
          {/* Vertical line for timeline */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800" />
          
          <div className="space-y-8 relative z-10">
            {history.length > 0 ? (
              history.slice(0, 5).map((mandate: any, i: number) => (
                <div key={i} className="flex items-start gap-6 pl-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-slate-900 shadow-sm ${
                    mandate.endDate ? 'bg-slate-200 dark:bg-slate-700' : 'bg-red-500 shadow-lg shadow-red-500/20'
                  }`}>
                    <Calendar className={`w-3 h-3 ${mandate.endDate ? 'text-slate-500' : 'text-white'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {mandate.startDate.split('-')[0]} {mandate.endDate ? `- ${mandate.endDate.split('-')[0]}` : '(Actuel)'}
                      </span>
                      {mandate.legislature && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                          Législature {mandate.legislature}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-lg">{mandate.label}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <Users className="w-3.5 h-3.5" />
                      {mandate.type}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="pl-14 py-4 text-slate-400 italic">
                Aucun historique de mandat enregistré.
              </div>
            )}
          </div>
        </div>

        {/* Decorative corner */}
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
};

export default DeputyStats;
