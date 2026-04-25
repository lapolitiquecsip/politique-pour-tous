"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import LawsClient from "./LawsClient";

export default function LawsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section (Compact 50vh style) */}
      <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-slate-950 overflow-hidden group">
        {/* Institutional Decorative Background */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-20" />
        
        {/* Hémicycle Filigree (Visual Element) */}
        <div className="absolute inset-0 z-0 opacity-[0.06] select-none pointer-events-none flex items-center justify-center overflow-hidden">
          <img 
            src="/hemicycle_line_art.png" 
            alt="" 
            className="w-full h-full object-cover md:object-contain scale-110 blur-[0.5px]" 
          />
          {/* Radial mask to focus text */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#020617_80%)]" />
        </div>

        {/* Subtle Grain Texture Overlay */}
        <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] z-10" />
        <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] z-10" />
        
        <div className="container mx-auto max-w-6xl text-center relative z-20 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-5xl md:text-[7rem] font-staatliches uppercase tracking-tight leading-none mb-6 flex flex-wrap justify-center gap-x-6">
              <div className="flex">
                <span style={{ color: '#8686AC', filter: 'drop-shadow(0 0 8px rgba(134, 134, 172, 0.4))' }}>T</span>
                <span style={{ color: '#60a5fa', filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.4))' }}>O</span>
                <span style={{ color: '#818cf8', filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.4))' }}>U</span>
                <span style={{ color: '#a78bfa', filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.4))' }}>T</span>
              </div>
              <div className="flex">
                <span style={{ color: '#93c5fd', filter: 'drop-shadow(0 0 8px rgba(147, 197, 253, 0.4))' }}>S</span>
                <span style={{ color: '#7dd3fc', filter: 'drop-shadow(0 0 8px rgba(125, 211, 252, 0.4))' }}>U</span>
                <span style={{ color: '#6366f1', filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))' }}>R</span>
              </div>
              <div className="flex">
                <span style={{ color: '#38bdf8', filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))' }}>L</span>
                <span style={{ color: '#60a5fa', filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.4))' }}>E</span>
                <span style={{ color: '#818cf8', filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.4))' }}>S</span>
              </div>
              <div className="flex italic underline decoration-rose-500/30 underline-offset-8">
                <span style={{ color: '#a78bfa', filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.4))' }}>L</span>
                <span style={{ color: '#93c5fd', filter: 'drop-shadow(0 0 8px rgba(147, 197, 253, 0.4))' }}>O</span>
                <span style={{ color: '#7dd3fc', filter: 'drop-shadow(0 0 8px rgba(125, 211, 252, 0.4))' }}>I</span>
                <span style={{ color: '#6366f1', filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))' }}>S</span>
              </div>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed font-bold italic tracking-tight drop-shadow-md">
              Comprendre les lois qui changent votre quotidien.
            </p>

            <div className="mt-10 flex items-center gap-2 text-blue-400/60 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">
              <div className="w-8 h-px bg-blue-500/30" />
              Expertise Légis
              <div className="w-8 h-px bg-blue-500/30" />
            </div>
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
