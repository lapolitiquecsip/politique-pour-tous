"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Newspaper, ArrowRight } from "lucide-react";

/**
 * La une du Journal officiel, repliée, qu'on ouvre d'un clic.
 *
 * Le sommaire d'une journée fait une centaine de lignes. Le déplier d'emblée
 * pose un mur de texte à qui vient pour autre chose, et prive l'abonné du seul
 * geste qui dise « ceci est à moi ». D'où cette couverture : elle tient en un
 * écran, annonce ce qu'il y a dedans — la date, le numéro, le nombre de textes
 * — et s'ouvre quand on le décide.
 *
 * Elle est un BOUTON, pas une image cliquable : le clavier l'atteint, la barre
 * d'espace l'ouvre, et les lecteurs d'écran annoncent ce qui va se passer.
 *
 * Le mouvement reste sous le seuil du tape-à-l'œil : une respiration lente, et
 * un reflet qui passe. Les deux s'effacent si le lecteur a demandé moins
 * d'animations — auquel cas la couverture reste parfaitement lisible, ce qui
 * est l'essentiel.
 */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function dateLongue(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const semaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getUTCDay()];
  return `${semaine} ${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}`;
}

/** Fausses colonnes : la silhouette d'un journal, sans faire croire à du texte. */
function Colonnes() {
  return (
    <div aria-hidden className="mt-4 grid grid-cols-3 gap-3 opacity-25 sm:gap-4">
      {[0, 1, 2].map(c => (
        <div key={c} className="space-y-1.5">
          {[0, 1, 2, 3, 4, 5].map(l => (
            <div
              key={l}
              className="h-1 rounded-full bg-white/60"
              // Largeurs irrégulières : des barres toutes égales font grille,
              // pas colonne de journal.
              style={{ width: `${[100, 92, 97, 78, 95, 60][(l + c) % 6]}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function JournalCouverture({
  date,
  num,
  textCount,
  onOuvrir,
}: {
  date: string;
  num: string;
  textCount: number;
  onOuvrir: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onOuvrir}
      aria-label={`Ouvrir le Journal officiel du ${dateLongue(date)} — ${textCount} textes`}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={reduce ? undefined : { y: -6, rotateX: 3, rotateY: -2, scale: 1.015 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      className="group relative mb-10 block w-full overflow-hidden rounded-[2rem] border-2 border-fuchsia-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-6 text-left text-white shadow-2xl shadow-purple-950/40 transition-shadow hover:shadow-fuchsia-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-400/40 sm:p-9"
      style={{ transformPerspective: 1200 }}
    >
      {/* Respiration : un souffle lent, jamais un rebond. */}
      <motion.div
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Bandeau d'en-tête, comme la manchette d'un quotidien. */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
          <span>République française</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-2.5 py-1 text-white">
            <Newspaper size={11} /> Pro
          </span>
        </div>

        <div className="mt-3 h-px bg-white/20" />
        <div className="mt-[3px] h-px bg-white/10" />

        {/* Le titre, et le reflet qui le traverse. On superpose deux copies : la
            première porte la couleur, la seconde le reflet, découpé au texte par
            bg-clip-text. Un seul élément ne peut pas faire les deux. */}
        <h3 className="relative mt-5 select-none font-staatliches text-[2.7rem] uppercase leading-[0.85] tracking-tight sm:text-7xl">
          <span className="block">Journal</span>
          <span className="block text-fuchsia-300">Officiel</span>
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 block bg-gradient-to-r from-transparent via-white to-transparent bg-clip-text text-transparent"
              style={{ backgroundSize: "55% 100%", backgroundRepeat: "no-repeat" }}
              animate={{ backgroundPosition: ["-60% 0%", "160% 0%"] }}
              transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
            >
              <span className="block">Journal</span>
              <span className="block">Officiel</span>
            </motion.span>
          )}
        </h3>

        <div className="mt-5 h-px bg-white/20" />

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-white/85">{dateLongue(date)}</span>
          <span className="text-[11px] font-black uppercase tracking-widest text-white/35">n° {num}</span>
        </div>

        <Colonnes />

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 py-3 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-fuchsia-500/30 transition group-hover:brightness-110">
            Ouvrir l&apos;édition
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
          <span className="text-[13px] font-bold text-white/60">
            <strong className="font-staatliches text-2xl text-white">{textCount}</strong> textes publiés ce jour
          </span>
        </div>
      </motion.div>

      {/* Pli du papier : une ombre verticale au tiers, qui suggère la pliure. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 w-24 bg-gradient-to-r from-transparent via-black/25 to-transparent" />
    </motion.button>
  );
}
