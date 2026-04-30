
import React from 'react';
import { 
  BarChart3, 
  Users, 
  Trophy, 
  User,
  Medal
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

  // Extraire l'année d'élection de l'historique politique (Législature 17)
  const getElectionYear = () => {
    const assembleeEntry = deputy.political_history?.find(
      (h: any) => h.type === 'ASSEMBLEE' && h.legislature === '17'
    );
    if (assembleeEntry && assembleeEntry.startDate) {
      return new Date(assembleeEntry.startDate).getFullYear();
    }
    return 2024;
  };

  const electionYear = getElectionYear();

  return (
    <div className="bg-[#4a0418] rounded-[3.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden border border-white/5">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-900/20 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* 1. Key Performance Indicators */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-4xl font-staatliches uppercase tracking-tight leading-none">
              <span className="text-white">Performance</span> <span className="text-red-500 italic">Parlementaire</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] font-black text-red-300 uppercase tracking-[0.2em]">Taux de Participation</p>
                <span className="text-3xl font-black text-white italic">{participation}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${participation}%` }}
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] font-black text-red-300 uppercase tracking-[0.2em]">Loyauté au Groupe</p>
                <span className="text-3xl font-black text-white italic">{loyalty}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${loyalty}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Election Results */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-4xl font-staatliches uppercase tracking-tight leading-none">
              <span className="text-white">Résultats</span> <span className="text-red-500 italic">Élections {electionYear}</span>
            </h3>
          </div>

          {election ? (
            <div className="space-y-4">
              <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3">
                  <Medal className="w-8 h-8 text-red-500/20 group-hover:text-red-500/40 transition-colors" />
                </div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-[9px] font-black text-red-300 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                      Élu au {election.round === 1 ? '1er' : '2nd'} tour
                    </p>
                    <div className="flex items-baseline gap-3">
                      <h4 className="text-2xl font-bold text-white leading-tight">Performance Majoritaire</h4>
                      {election.candidates[0]?.party && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-red-600 text-white uppercase shadow-lg shadow-red-900/40">
                          {election.candidates[0].party}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-staatliches text-white italic leading-none">{election.candidates[0]?.percent}</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/20 rounded-[2.5rem] p-6 border border-white/5">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Principaux Adversaires</p>
                <div className="space-y-3">
                  {election.candidates.slice(1, 4).map((cand: any, i: number) => (
                    <div key={i} className="flex items-center justify-between group/cand">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-white/5 group-hover/cand:bg-red-600 transition-colors" />
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">{cand.name}</span>
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{cand.party || 'IND'}</span>
                        </div>
                      </div>
                      <span className="font-staatliches text-white/60 text-lg italic">{cand.percent}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center bg-black/20 rounded-[2.5rem] border border-dashed border-white/10 text-white/30">
              <Users className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">Données indisponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeputyStats;
