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
          <div className="w-full max-w-3xl flex flex-col relative z-10 space-y-4 md:space-y-6">
            
            {/* LA POLITIQUE */}
            <div className="self-start relative z-30">
              <motion.h1 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="text-[clamp(3.5rem,10vw,120px)] leading-[0.85] tracking-tight m-0 p-0 uppercase"
                style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
              >
                <MarkerHighlight 
                  highlight="La politique," 
                  markerColor="#f43f5e" 
                  baseColor="#0f172a" 
                  highlightedTextColor="#ffffff" 
                  delay={0.2} 
                />
              </motion.h1>
            </div>
            
            {/* C'EST */}
            <div className="self-center relative z-20">
              <motion.h1 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.1, type: "spring" }}
                className="text-[clamp(4rem,12vw,150px)] leading-[0.85] tracking-tight m-0 p-0 uppercase"
                style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
              >
                <MarkerHighlight 
                  highlight="c'est" 
                  markerColor="#10b981" 
                  baseColor="#0f172a" 
                  highlightedTextColor="#ffffff" 
                  delay={0.4} 
                />
              </motion.h1>
            </div>
            
            {/* SIMPLE */}
            <div className="self-end relative z-10">
              <motion.h1 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                className="text-[clamp(4.5rem,14vw,180px)] leading-[0.85] tracking-tight m-0 p-0 uppercase"
                style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
              >
                <MarkerHighlight 
                  highlight="simple." 
                  markerColor="#3b82f6" 
                  baseColor="#0f172a" 
                  highlightedTextColor="#ffffff" 
                  delay={0.6} 
                />
              </motion.h1>
            </div>

          </div>


        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed font-bold italic tracking-tight z-40 relative text-center px-4"
        >
            <GlossaryText>
              Comprendre la politique française n'a jamais été aussi accessible.
            </GlossaryText>
        </motion.div>

      </main>
    </div>
  );
}
