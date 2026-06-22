"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import LawsClient from "./LawsClient";

export default function LawsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section (Premium White Style) */}
      <div className="relative pt-24 pb-16 md:pt-40 md:pb-32 bg-white overflow-hidden">
        {/* Background Glowing Blobs (More Red) */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] -mr-64 -mt-64 z-0" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-red-500/10 rounded-full blur-[150px] -ml-80 -mb-80 z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[180px] z-0" />
        
        {/* Law-themed Icon (Faded Gavel) */}
        <div className="absolute top-1/2 right-[10%] -translate-y-1/2 z-0 opacity-[0.03] select-none pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-[500px] h-[500px] text-red-900 fill-current">
            <path d="M7 21q-.825 0-1.412-.587Q5 19.825 5 19V6q0-.825.588-1.412Q6.175 4 7 4h10q.825 0 1.413.588Q19 5.175 19 6v13q0 .825-.587 1.413Q17.825 21 17 21Zm0-2h10V6H7v13Zm2-10h6V7H9Zm0 4h6v-2H9Zm0 4h6v-2H9ZM7 19V6v13Z"/>
          </svg>
        </div>

        {/* Background Large Text (Faded) */}
        <div className="absolute inset-0 z-0 pointer-events-none flex flex-col justify-center items-center overflow-hidden select-none">
          <h2 className="text-[15rem] md:text-[25rem] font-black text-slate-50/80 leading-none uppercase tracking-tighter -rotate-6">
            LÉGISLATION
          </h2>
          <h2 className="text-[15rem] md:text-[25rem] font-black text-slate-50/80 leading-none uppercase tracking-tighter rotate-3 -mt-20 md:-mt-40">
            PARLEMENT
          </h2>
        </div>

        <div className="container mx-auto max-w-6xl text-center relative z-10 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            {/* Action Badge */}
            <div className="flex items-center gap-3 mb-10 px-6 py-2 bg-slate-50 border border-slate-100 rounded-full shadow-sm">
              <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Action Législative</span>
            </div>

            <h1 className="text-6xl md:text-[8.5rem] font-staatliches uppercase tracking-tight leading-none mb-10">
              <span className="text-slate-900 block md:inline">Tout sur les </span>
              <span className="italic bg-gradient-to-br from-red-600 via-red-500 to-rose-400 bg-clip-text text-transparent block md:inline pr-4">Lois</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium italic tracking-tight">
              Découvrez les lois qui façonnent la France, des grands débats de l'Assemblée aux décrets qui changent concrètement votre quotidien.
            </p>
          </motion.div>
        </div>
      </div>

      {/* 2. CONTENU INTERACTIF (CLIENT) - BOUGHT UP CLOSER */}
      <div className="mt-8">
        <LawsClient />
      </div>
    </div>
  );
}
