"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { upcomingElections, Election } from '@/data/electionsData';
import { Building2, User, Users, Globe, Info, Calendar, ChevronRight, X, LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Building2,
  User,
  Users,
  Globe,
};

const colorMap: Record<string, { bg: string, text: string, accent: string, gradient: string }> = {
  indigo: { 
    bg: 'bg-indigo-50', 
    text: 'text-indigo-600', 
    accent: 'bg-indigo-600',
    gradient: 'from-indigo-600 to-indigo-400'
  },
  blue: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-600', 
    accent: 'bg-blue-600',
    gradient: 'from-blue-600 to-blue-400'
  },
  red: { 
    bg: 'bg-red-50', 
    text: 'text-red-600', 
    accent: 'bg-red-600',
    gradient: 'from-red-600 to-red-400'
  },
  'blue-800': { 
    bg: 'bg-blue-50', 
    text: 'text-blue-800', 
    accent: 'bg-blue-800',
    gradient: 'from-blue-800 to-blue-600'
  },
};

export default function ElectionsBanner() {
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-staatliches uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" /> Prochaines Échéances Électorales
          </h2>
          <p className="text-sm text-slate-500 font-medium italic mt-1">
            Restez informé sur les moments clés de la démocratie française.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {upcomingElections.map((election, index) => {
          const Icon = iconMap[election.icon];
          const colors = colorMap[election.color] || colorMap.blue;
          return (
            <motion.div
              key={election.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedElection(election)}
              className="relative group cursor-pointer"
            >
              <div className="h-full p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all overflow-hidden">
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.05] group-hover:scale-150 transition-transform duration-500 ${colors.accent}`} />
                
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block">
                    {election.type}
                  </span>
                  
                  <h3 className="text-lg font-staatliches uppercase leading-none mb-2 text-slate-900">
                    {election.date}
                  </h3>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {election.description}
                  </p>
                  
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    Comment ça marche ? <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal for Details */}
      <AnimatePresence>
        {selectedElection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setSelectedElection(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors z-20"
              >
                <X size={20} />
              </button>

              {/* Header Gradient */}
              <div className={`h-32 bg-gradient-to-br ${colorMap[selectedElection.color]?.gradient || colorMap.blue.gradient} flex items-center justify-center`}>
                <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  {React.createElement(iconMap[selectedElection.icon], { size: 40 })}
                </div>
              </div>

              <div className="p-8">
                <div className="mb-6">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 block">
                    Focus sur les {selectedElection.type}
                  </span>
                  <h2 className="text-3xl font-staatliches uppercase leading-tight text-slate-900">
                    {selectedElection.title}
                  </h2>
                  <div className="h-1 w-12 bg-blue-600 mt-2 rounded-full" />
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                      <Calendar size={14} /> Échéance
                    </h4>
                    <p className="text-lg font-bold text-slate-800">{selectedElection.date}</p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                      <Info size={14} /> Fonctionnement
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {selectedElection.howItWorks}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedElection(null)}
                  className="w-full mt-8 py-4 bg-slate-900 text-white font-staatliches uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-colors"
                >
                  J&apos;ai compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
