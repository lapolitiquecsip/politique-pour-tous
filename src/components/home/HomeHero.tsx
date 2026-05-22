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
          {/* Static, playful layout replacing the gravity engine */}
          <div className="flex flex-col items-center justify-center w-full mt-8 mb-16 px-4 relative z-30">
            {/* Main Title Block */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-4xl sm:text-6xl md:text-8xl font-staatliches uppercase tracking-tight bg-white text-slate-900 rounded-full px-8 md:px-12 py-4 md:py-6 drop-shadow-[0_15px_30px_rgba(255,255,255,0.2)] border-4 border-slate-200 z-30 mb-10 text-center"
            >
              La politique, c'est simple
            </motion.div>

            {/* Colorful scattered words using flex-wrap */}
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 max-w-5xl">
              {[
                { text: "Démocratie", color: "bg-rose-500 border-rose-400", rotate: "-rotate-2" },
                { text: "Assemblée", color: "bg-blue-500 border-blue-400", rotate: "rotate-3" },
                { text: "Citoyen", color: "bg-emerald-500 border-emerald-400", rotate: "-rotate-3" },
                { text: "Vote", color: "bg-amber-500 border-amber-400", rotate: "rotate-6" },
                { text: "République", color: "bg-purple-500 border-purple-400", rotate: "-rotate-6" },
                { text: "Sénat", color: "bg-indigo-500 border-indigo-400", rotate: "rotate-2" },
                { text: "Loi", color: "bg-cyan-500 border-cyan-400", rotate: "-rotate-2" },
              ].map((word, i) => (
                <motion.div
                  key={word.text}
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  whileHover={{ scale: 1.05, rotate: 0 }}
                  className={`text-xl sm:text-2xl md:text-4xl font-staatliches uppercase tracking-tight text-white rounded-full px-6 md:px-8 py-3 md:py-4 drop-shadow-xl border-2 ${word.color} ${word.rotate} cursor-default`}
                >
                  {word.text}
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed font-bold italic tracking-tight drop-shadow-md z-40 relative">
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
