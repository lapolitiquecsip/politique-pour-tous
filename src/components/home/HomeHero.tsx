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
          <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-none mb-6 flex flex-col items-start">
            <span className="block text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              La{" "}
              <span className="relative inline-block px-4 py-2">
                <span className="inline-flex">
                  {(() => {
                    const colors = ["#90D5FF", "#57B9FF", "#77B1D4", "#a5c9e1"]; // Replaced dark #517891 with a slightly lighter #a5c9e1 for better visibility
                    return "politique,".split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ y: 20, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        style={{ color: colors[i % colors.length] }}
                        transition={{ 
                          delay: 0.5 + i * 0.05, 
                          type: "spring",
                          stiffness: 300,
                          damping: 15
                        }}
                      >
                        {char}
                      </motion.span>
                    ));
                  })()}
                </span>
                {/* Hand-drawn rough circle SVG */}
                <svg
                  viewBox="0 0 300 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute inset-0 w-full h-full text-rose-500/60 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)] pointer-events-none -rotate-2 -translate-y-1 scale-125"
                >
                  <path 
                    d="M15,50 C15,20 80,8 150,8 C220,8 285,20 285,50 C285,80 220,92 150,92 C80,92 15,80 15,50 Z" 
                    className="animate-[dash_2s_ease-out_forwards]"
                    style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
                  />
                  <style>{`
                    @keyframes dash {
                      to { strokeDashoffset: 0; }
                    }
                  `}</style>
                </svg>
              </span>
            </span>
            <span className="italic uppercase flex items-center flex-wrap">
              <span className="text-white mr-4">c'est </span>
              <span className="relative inline-block text-white">
                simple.
                {/* Multi-tone green underline */}
                <div 
                  className="absolute -bottom-1 left-0 w-full h-[6px] md:h-[8px] rounded-full"
                  style={{ 
                    background: 'linear-gradient(to right, #2E6F40, #CFFFDC, #68BA7F, #253D2C)',
                    filter: 'drop-shadow(0 0 5px rgba(46, 111, 64, 0.4))'
                  }}
                />
              </span>
              
              {/* Cluster of hand-drawn neon stars */}
              <div className="relative inline-block ml-6 align-middle">
                {/* Initial Yellow Star */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 12 }}
                  transition={{ delay: 1, type: "spring", stiffness: 200 }}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#4ade80" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-10 h-10 md:w-14 md:h-14 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>

                {/* Small Red Voting Envelope (Above Left) */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 0.8, opacity: 1, rotate: -10 }}
                  transition={{ delay: 1.3, type: "spring" }}
                  className="absolute -top-6 -left-6"
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#ef4444" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </motion.div>


              </div>
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
