"use client";

import { motion } from "framer-motion";
import { MarkerHighlight } from "@/components/ui/marker-highlight";
import HomeCardArt from "@/components/home/HomeCardArt";
import Link from "next/link";

const MotionLink = motion(Link);

// Chaque carte renvoie vers la page correspondante du site.
const CARDS = [
  { art: "vote" as const, title: "Qui vote quoi ?", text: "Le vote détaillé des députés et sénateurs sur chaque loi.", href: "/deputes" },
  { art: "money" as const, title: "L'argent public ?", text: "Le budget, les dépenses et la dette de votre commune, département et région.", href: "/local" },
  { art: "sincere" as const, title: "Votre élu est sincère ?", text: "Ses votes, ses prises de parole et ses promesses, confrontés.", href: "/deputes" },
];

export default function HomeHero() {
  return (
    <div className="relative flex flex-col items-center justify-center pt-8 pb-4 w-full bg-white dark:bg-slate-900/10">
      <main className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center px-4 mt-6">

        {/* Titre */}
        <div className="w-full flex flex-row flex-wrap justify-center items-center gap-x-4 md:gap-x-6 gap-y-2 text-center mb-8">
          {["La politique,", "c'est"].map((word, i) => (
            <motion.h1
              key={word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="text-[clamp(3rem,8vw,120px)] text-slate-900 dark:text-white leading-[0.85] tracking-tight m-0 uppercase"
              style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
            >
              {word}
            </motion.h1>
          ))}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[clamp(3.5rem,9vw,140px)] leading-[0.85] tracking-tight m-0 uppercase"
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

        {/* Sous-titre épuré */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-xl text-center text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-10"
        >
          Contrôlez l'activité des politiques et décryptez les lois, en temps réel.
        </motion.p>

        {/* 3 cartes minimalistes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-10">
          {CARDS.map((card, i) => (
            <MotionLink
              key={card.title}
              href={card.href}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group flex flex-col items-center text-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/40 px-5 pt-5 pb-7 transition-shadow hover:border-slate-300 hover:shadow-lg dark:hover:border-slate-700"
            >
              <div className="w-full overflow-hidden rounded-xl">
                <div className="aspect-[320/150] w-full transition-transform duration-500 group-hover:scale-[1.04]">
                  <HomeCardArt kind={card.art} />
                </div>
              </div>
              <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">{card.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{card.text}</p>
            </MotionLink>
          ))}
        </div>

        {/* Accroche finale sobre */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-xs md:text-sm font-staatliches uppercase tracking-[0.15em] text-slate-900 dark:text-white mb-2"
        >
          Faites-vous votre propre avis
        </motion.p>
      </main>
    </div>
  );
}
