"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import GlossaryText from "@/components/ui/GlossaryText";
import { MarkerHighlight } from "@/components/ui/marker-highlight";

export default function HomeHero() {
  return (
    <div className="relative min-h-[50vh] flex flex-col items-center justify-center pt-8 pb-12 overflow-hidden w-full bg-white">
      {/* Subtle Grain Texture Overlay */}
      <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

      <main className="flex-1 relative z-10 w-full max-w-[1440px] mx-auto flex flex-col items-center justify-center mt-8">
        
        {/* Massive Typography Container */}
        <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center z-10 mt-4 mb-16 px-4">
          
          {/* Text Stack */}
          <div className="w-full max-w-6xl flex flex-row flex-wrap justify-center items-center gap-x-4 md:gap-x-6 gap-y-2 relative z-10">
            
            {/* LA POLITIQUE */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-[clamp(3rem,8vw,120px)] text-slate-900 leading-[0.85] tracking-tight m-0 p-0 uppercase"
              style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
            >
              La politique,
            </motion.h1>
            
            {/* C'EST */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[clamp(3rem,8vw,120px)] text-slate-900 leading-[0.85] tracking-tight m-0 p-0 uppercase"
              style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
            >
              c'est
            </motion.h1>
            
            {/* SIMPLE */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-[clamp(3.5rem,9vw,140px)] leading-[0.85] tracking-tight m-0 p-0 uppercase"
              style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
            >
              <MarkerHighlight 
                highlight="simple." 
                markerColor="#3b82f6" 
                colorList={["#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"]}
                baseColor="#0f172a" 
                highlightedTextColor="#ffffff" 
                delay={0.4} 
              />
            </motion.h1>

          </div>


        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium tracking-tight z-40 relative text-center px-4"
        >
            <GlossaryText>
              Décryptez la politique française simplement et sans jargon. Suivez en direct les votes de vos députés et sénateurs, accédez aux résumés clairs des projets de loi en cours d'examen, et vérifiez la réalisation des promesses de l'exécutif.
            </GlossaryText>
        </motion.div>

      </main>
    </div>
  );
}
