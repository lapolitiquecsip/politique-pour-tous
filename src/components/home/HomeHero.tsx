"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import GlossaryText from "@/components/ui/GlossaryText";

export default function HomeHero() {
  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center pt-16 pb-20 overflow-hidden w-full bg-slate-950">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>
      
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
                  textShadow: '1px 1px 0 #ffffff, 2px 2px 0 #ffffff, 3px 3px 0 #ffffff, 4px 4px 0 #ffffff, 5px 5px 0 #ffffff, 6px 6px 0 #ffffff, 7px 7px 0 #ffffff, 8px 8px 0 #ffffff'
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
                  textShadow: '1px 1px 0 #ffffff, 2px 2px 0 #ffffff, 3px 3px 0 #ffffff, 4px 4px 0 #ffffff, 5px 5px 0 #ffffff, 6px 6px 0 #ffffff, 7px 7px 0 #ffffff, 8px 8px 0 #ffffff'
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
                  textShadow: '1px 1px 0 #ffffff, 2px 2px 0 #ffffff, 3px 3px 0 #ffffff, 4px 4px 0 #ffffff, 5px 5px 0 #ffffff, 6px 6px 0 #ffffff, 7px 7px 0 #ffffff, 8px 8px 0 #ffffff'
                }}
              >
                simple.
              </motion.h1>
            </div>

          </div>

          {/* Absolute Overlays (Floating Bubbles) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            
            {/* Bubble 1 */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[5%] right-[5%] md:right-[15%] z-40 pointer-events-auto hidden sm:block"
            >
              <div className="bg-[#a855f7] text-white font-staatliches text-2xl md:text-4xl px-6 py-2 rounded-full border-2 border-white/50 rotate-[12deg] shadow-2xl hover:scale-105 transition-transform cursor-default">
                RÉPUBLIQUE
              </div>
            </motion.div>

            {/* Bubble 2 */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[25%] left-[2%] md:left-[10%] z-40 pointer-events-auto hidden sm:block"
            >
              <div className="bg-[#f59e0b] text-white font-staatliches text-2xl md:text-4xl px-6 py-2 rounded-full border-2 border-white/50 rotate-[-10deg] shadow-2xl hover:scale-105 transition-transform cursor-default">
                VOTE
              </div>
            </motion.div>
            
            {/* Bubble 3 */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-[5%] right-[10%] md:right-[20%] z-40 pointer-events-auto hidden sm:block"
            >
              <div className="bg-[#06b6d4] text-white font-staatliches text-xl md:text-3xl px-6 py-2 rounded-full border-2 border-white/50 rotate-[5deg] shadow-2xl hover:scale-105 transition-transform cursor-default">
                ASSEMBLÉE
              </div>
            </motion.div>

          </div>
        </div>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto leading-relaxed font-bold italic tracking-tight drop-shadow-md z-40 relative text-center px-4 mt-8"
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
