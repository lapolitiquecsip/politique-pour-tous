"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import GlossaryText from "@/components/ui/GlossaryText";

export default function HomeHero() {
  return (
    <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-slate-950 overflow-hidden group min-h-[50vh] flex items-center">
      {/* Institutional Decorative Background */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-blue-500 via-rose-500 to-amber-500 z-20" />
      
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

      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[80px] z-10" style={{ willChange: "filter" }} />
      <div className="absolute top-40 -left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] z-10" style={{ willChange: "filter" }} />
      
      <div className="container mx-auto max-w-6xl text-center relative z-20 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-none mb-6">
            <span className="block text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">La politique,</span>
            <span className="italic decoration-rose-500/30 underline-offset-8 uppercase">
              <span className="text-white">c'est </span>
              <span className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">s</span>
              <span className="text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]">i</span>
              <span className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">m</span>
              <span className="text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]">p</span>
              <span className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">l</span>
              <span className="text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]">e</span>
              <span className="text-white">.</span>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed font-bold italic tracking-tight drop-shadow-md">
            <GlossaryText>
              Comprendre la politique française n'a jamais été aussi accessible.
            </GlossaryText>
          </p>

          <div className="mt-10 flex items-center gap-2 text-white/40 font-black text-[10px] uppercase tracking-[0.3em]">
            <div className="w-8 h-px bg-blue-500" />
            <div className="w-8 h-px bg-rose-500" />
            <div className="w-8 h-px bg-amber-500" />
            <Landmark className="w-3 h-3 text-white" />
            Plateforme Citoyenne
            <div className="w-8 h-px bg-amber-500" />
            <div className="w-8 h-px bg-rose-500" />
            <div className="w-8 h-px bg-blue-500" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
