"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import GlossaryText from "@/components/ui/GlossaryText";
import { MarkerHighlight } from "@/components/ui/marker-highlight";
import {
  SketchyCardBorder,
  SketchyBallotBox,
  SketchyMoneyBag,
  SketchyMegaphone,
  SketchyCircleCTA,
  SketchyUnderline,
  SketchyArrowDown
} from "@/components/ui/sketchy-doodles";

export default function HomeHero() {
  return (
    <div className="relative min-h-[auto] md:min-h-[45vh] flex flex-col items-center justify-center pt-8 pb-4 overflow-hidden w-full bg-white dark:bg-slate-900/10">
      {/* Subtle Grain Texture Overlay */}
      <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

      <main className="flex-1 relative z-10 w-full max-w-[1440px] mx-auto flex flex-col items-center justify-center mt-6">
        
        {/* Massive Typography Container (Restored to original size) */}
        <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center z-10 mt-4 mb-14 px-4">
          
          {/* Text Stack */}
          <div className="w-full max-w-6xl flex flex-row flex-wrap justify-center items-center gap-x-4 md:gap-x-6 gap-y-2 relative z-10">
            
            {/* LA POLITIQUE */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-[clamp(3rem,8vw,120px)] text-slate-900 dark:text-white leading-[0.85] tracking-tight m-0 p-0 uppercase"
              style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
            >
              La politique,
            </motion.h1>
            
            {/* C'EST */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[clamp(3rem,8vw,120px)] text-slate-900 dark:text-white leading-[0.85] tracking-tight m-0 p-0 uppercase"
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

        {/* Extra Compact Presentation Block below title */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full max-w-4xl mx-auto px-6 z-40 relative flex flex-col items-center"
        >
          {/* Intro sentence */}
          <div className="text-xs md:text-sm text-slate-900 dark:text-slate-50 font-staatliches tracking-wider text-center relative mb-1.5 max-w-xl leading-relaxed">
            La question n&apos;est pas de savoir si vous êtes{" "}
            <span className="relative inline-block text-slate-950 dark:text-white px-2">
              de droite ou de gauche
              <SketchyUnderline color="#f43f5e" />
            </span>
            , mais plutôt :
          </div>

          {/* Sketchy Arrow pointing down */}
          <div className="text-slate-400 dark:text-slate-500 mb-1 flex justify-center">
            <SketchyArrowDown color="currentColor" />
          </div>

          {/* 3 Extra-Interactive Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mb-4 relative">
            {/* Card 1: Qui vote quoi ? */}
            <motion.div
              whileHover={{ scale: 1.02, rotate: -0.5 }}
              transition={{ type: "spring", stiffness: 350, damping: 15 }}
              className="relative bg-slate-50/80 dark:bg-slate-900/30 p-2 md:py-2 md:px-3 rounded-2xl flex flex-col items-center text-center shadow-sm cursor-default border border-transparent dark:border-slate-800/30 min-h-[110px] md:min-h-[125px] text-slate-700 dark:text-slate-300"
            >
              <SketchyCardBorder color="currentColor" />
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 p-0">
                <SketchyBallotBox color="currentColor" />
              </div>
              <h3 className="text-sm md:text-base font-staatliches text-slate-900 dark:text-white uppercase tracking-wide mb-0.5">
                Qui vote quoi ?
              </h3>
              <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 leading-tight font-normal">
                <GlossaryText>
                  Suivez l&apos;activité législative et examinez le vote détaillé des députés et sénateurs sur chaque projet de loi.
                </GlossaryText>
              </p>
            </motion.div>

            {/* Card 2: L'argent public ? */}
            <motion.div
              whileHover={{ scale: 1.02, rotate: 0.5 }}
              transition={{ type: "spring", stiffness: 350, damping: 15 }}
              className="relative bg-slate-50/80 dark:bg-slate-900/30 p-2 md:py-2 md:px-3 rounded-2xl flex flex-col items-center text-center shadow-sm cursor-default border border-transparent dark:border-slate-800/30 min-h-[110px] md:min-h-[125px] text-slate-700 dark:text-slate-300"
            >
              <SketchyCardBorder color="currentColor" />
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 p-0">
                <SketchyMoneyBag color="currentColor" />
              </div>
              <h3 className="text-sm md:text-base font-staatliches text-slate-900 dark:text-white uppercase tracking-wide mb-0.5">
                L&apos;argent public ?
              </h3>
              <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 leading-tight font-normal">
                <GlossaryText>
                  Explorez en toute transparence où va l&apos;argent : le budget global, les dépenses de fonctionnement et la dette de votre commune.
                </GlossaryText>
              </p>
            </motion.div>

            {/* Card 3: Votre élu est-il honnête ? */}
            <motion.div
              whileHover={{ scale: 1.02, rotate: -0.3 }}
              transition={{ type: "spring", stiffness: 350, damping: 15 }}
              className="relative bg-slate-50/80 dark:bg-slate-900/30 p-2 md:py-2 md:px-3 rounded-2xl flex flex-col items-center text-center shadow-sm cursor-default border border-transparent dark:border-slate-800/30 min-h-[110px] md:min-h-[125px] text-slate-700 dark:text-slate-300"
            >
              <SketchyCardBorder color="currentColor" />
              <div className="text-slate-500 dark:text-slate-400 mb-0.5 p-0">
                <SketchyMegaphone color="currentColor" />
              </div>
              <h3 className="text-sm md:text-base font-staatliches text-slate-900 dark:text-white uppercase tracking-wide mb-0.5">
                Votre élu est sincère ?
              </h3>
              <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 leading-tight font-normal">
                <GlossaryText>
                  Contrôlez l&apos;intégrité de vos élus en confrontant leurs votes réels, leurs prises de parole et leurs promesses de campagne.
                </GlossaryText>
              </p>
            </motion.div>
          </div>

          {/* Outro text (Enhanced contrast and color-coded keywords) */}
          <div className="text-xs md:text-sm text-slate-900 dark:text-slate-100 font-staatliches tracking-wider max-w-xl text-center leading-relaxed mb-3">
            Nos outils permettent de <span className="text-blue-500 dark:text-blue-400">contrôler l&apos;activité des politiques</span> en temps réel, de <span className="text-rose-500 dark:text-rose-400">décrypter toutes les lois</span>, bref, de devenir un <span className="text-amber-500 dark:text-amber-400 font-bold">expert de la politique française</span>.
          </div>

          {/* Injonction / CTA */}
          <div className="relative inline-block py-0.5 mb-1">
            <span className="text-xs md:text-sm font-staatliches uppercase tracking-wider text-slate-900 dark:text-white px-4 relative z-10 select-none">
              Faites-vous votre propre avis !
            </span>
            <SketchyCircleCTA color="#f59e0b" />
          </div>
        </motion.div>

      </main>
    </div>
  );
}
