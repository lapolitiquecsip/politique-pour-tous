"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import GlossaryText from "@/components/ui/GlossaryText";
import { Gravity, MatterBody } from "@/components/ui/gravity";

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
          {/* The physics gravity simulation */}
          <div className="w-full h-[400px] md:h-[500px] relative mt-8 mb-12">
            <Gravity returnToOriginal gravity={{ x: 0, y: 0 }} className="absolute inset-0 z-30">
              
              {/* Main Title Block */}
              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="50%"
                y="45%"
                angle={-2}
              >
                <div className="text-4xl sm:text-6xl md:text-8xl font-staatliches uppercase tracking-tight bg-white text-slate-900 rounded-full hover:cursor-grab active:cursor-grabbing px-10 py-6 drop-shadow-[0_15px_30px_rgba(255,255,255,0.2)] border-4 border-slate-200">
                  La politique, c'est simple
                </div>
              </MatterBody>

              {/* Other words */}
              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="15%"
                y="15%"
                angle={-12}
              >
                <div className="text-2xl sm:text-3xl md:text-5xl font-staatliches uppercase tracking-tight bg-rose-500 text-white rounded-[2rem] hover:cursor-grab active:cursor-grabbing px-8 py-4 drop-shadow-xl border-2 border-rose-400">
                  Démocratie
                </div>
              </MatterBody>
              
              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="85%"
                y="20%"
                angle={8}
              >
                <div className="text-2xl sm:text-3xl md:text-5xl font-staatliches uppercase tracking-tight bg-blue-500 text-white rounded-[2rem] hover:cursor-grab active:cursor-grabbing px-8 py-4 drop-shadow-xl border-2 border-blue-400">
                  Assemblée
                </div>
              </MatterBody>

              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="15%"
                y="80%"
                angle={15}
              >
                <div className="text-2xl sm:text-3xl md:text-5xl font-staatliches uppercase tracking-tight bg-emerald-500 text-white rounded-[2rem] hover:cursor-grab active:cursor-grabbing px-8 py-4 drop-shadow-xl border-2 border-emerald-400">
                  Citoyen
                </div>
              </MatterBody>

              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="85%"
                y="75%"
                angle={-10}
              >
                <div className="text-2xl sm:text-3xl md:text-5xl font-staatliches uppercase tracking-tight bg-amber-500 text-white rounded-[2rem] hover:cursor-grab active:cursor-grabbing px-8 py-4 drop-shadow-xl border-2 border-amber-400">
                  Vote
                </div>
              </MatterBody>

              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="35%"
                y="85%"
                angle={-5}
              >
                <div className="text-2xl sm:text-3xl md:text-5xl font-staatliches uppercase tracking-tight bg-purple-500 text-white rounded-[2rem] hover:cursor-grab active:cursor-grabbing px-8 py-4 drop-shadow-xl border-2 border-purple-400">
                  République
                </div>
              </MatterBody>
              
              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="65%"
                y="85%"
                angle={6}
              >
                <div className="text-2xl sm:text-3xl md:text-5xl font-staatliches uppercase tracking-tight bg-indigo-500 text-white rounded-[2rem] hover:cursor-grab active:cursor-grabbing px-8 py-4 drop-shadow-xl border-2 border-indigo-400">
                  Sénat
                </div>
              </MatterBody>
              
              <MatterBody
                matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
                x="50%"
                y="10%"
                angle={0}
              >
                <div className="text-2xl sm:text-3xl md:text-5xl font-staatliches uppercase tracking-tight bg-cyan-500 text-white rounded-[2rem] hover:cursor-grab active:cursor-grabbing px-8 py-4 drop-shadow-xl border-2 border-cyan-400">
                  Loi
                </div>
              </MatterBody>
            </Gravity>
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
