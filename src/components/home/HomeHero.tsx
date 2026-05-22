"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import GlossaryText from "@/components/ui/GlossaryText";

export default function HomeHero() {
  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center pt-16 pb-20 overflow-hidden w-full bg-white">
      {/* Subtle Grain Texture Overlay */}
      <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

      <main className="flex-1 relative z-10 w-full max-w-[1440px] mx-auto flex flex-col items-center justify-center mt-12 md:mt-24">
        
        {/* Massive Typography Container */}
        <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center z-10 mt-4 mb-16 px-4">
          
          {/* Text Stack */}
          <div className="w-full flex flex-col items-center relative z-10 space-y-1 md:space-y-2">
            
            {/* LA POLITIQUE */}
            <div className="w-full flex justify-start pl-[2%] md:pl-[10%] relative z-30">
              <motion.h1 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="text-[clamp(3rem,9vw,120px)] font-black leading-[0.85] tracking-tighter text-[#f43f5e] m-0 p-0 uppercase"
                style={{ 
                  fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #0f172a, 2px 2px 0 #0f172a, 3px 3px 0 #0f172a, 4px 4px 0 #0f172a, 5px 5px 0 #0f172a, 6px 6px 0 #0f172a, 7px 7px 0 #0f172a, 8px 8px 0 #0f172a'
                }}
              >
                La politique,
              </motion.h1>
            </div>
            
            {/* C'EST */}
            <div className="w-full flex justify-center relative z-20">
              <motion.h1 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.1, type: "spring" }}
                className="text-[clamp(3.5rem,11vw,150px)] font-black leading-[0.85] tracking-tighter text-[#10b981] m-0 p-0 uppercase"
                style={{ 
                  fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #0f172a, 2px 2px 0 #0f172a, 3px 3px 0 #0f172a, 4px 4px 0 #0f172a, 5px 5px 0 #0f172a, 6px 6px 0 #0f172a, 7px 7px 0 #0f172a, 8px 8px 0 #0f172a'
                }}
              >
                c'est
              </motion.h1>
            </div>
            
            {/* SIMPLE */}
            <div className="w-full flex justify-end pr-[2%] md:pr-[10%] relative z-10">
              <motion.h1 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                className="text-[clamp(4rem,13vw,180px)] font-black leading-[0.85] tracking-tighter text-[#3b82f6] m-0 p-0 uppercase"
                style={{ 
                  fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif',
                  textShadow: '1px 1px 0 #0f172a, 2px 2px 0 #0f172a, 3px 3px 0 #0f172a, 4px 4px 0 #0f172a, 5px 5px 0 #0f172a, 6px 6px 0 #0f172a, 7px 7px 0 #0f172a, 8px 8px 0 #0f172a'
                }}
              >
                simple.
              </motion.h1>
            </div>

          </div>


        </div>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-xl md:text-2xl text-slate-700 max-w-2xl mx-auto leading-relaxed font-bold italic tracking-tight z-40 relative text-center px-4 mt-8"
        >
            <GlossaryText>
              Comprendre la politique française n'a jamais été aussi accessible.
            </GlossaryText>
            <br />
            Explorez les lois, suivez vos élus et décryptez le budget de l'État en toute simplicité.
        </motion.p>

      </main>
    </div>
  );
}
