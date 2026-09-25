"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Newspaper, ArrowRight, Zap } from "lucide-react";
import DragScroller from "@/components/ui/DragScroller";

/**
 * La une du Journal officiel, repliée, qu'on ouvre d'un clic.
 *
 * Le sommaire d'une journée fait une centaine de lignes. Le déplier d'emblée
 * pose un mur de texte à qui vient pour autre chose, et prive l'abonné du seul
 * geste qui dise « ceci est à moi ». D'où cette couverture : elle tient en un
 * écran, annonce ce qu'il y a dedans — la date, le numéro, le nombre de textes
 * — et s'ouvre quand on le décide.
 *
 * Elle porte un BOUTON, pas une image cliquable : le clavier l'atteint, la barre
 * d'espace l'ouvre, et le libellé annonce ce qui va se passer. Le rail des
 * éditions précédentes vit EN DEHORS de ce bouton : imbriquer des boutons est
 * du HTML invalide, et les navigateurs y répondent en ignorant les clics
 * intérieurs — le rail aurait été décoratif.
 *
 * Le mouvement reste sous le seuil du tape-à-l'œil : une respiration lente, et
 * un reflet qui passe. Les deux s'effacent si le lecteur a demandé moins
 * d'animations — auquel cas la couverture reste parfaitement lisible, ce qui
 * est l'essentiel.
 */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function dateLongue(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const semaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getUTCDay()];
  return `${semaine} ${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}`;
}

function jourCourt(iso: string) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { jour: +m[3], mois: MOIS_COURT[+m[2] - 1] } : { jour: 0, mois: "" };
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

type EditionBreve = { date: string; num: string; text_count: number };

export default function JournalCouverture({
  date,
  num,
  textCount,
  editions,
  indexCourant,
  onOuvrir,
  onChoisir,
}: {
  date: string;
  num: string;
  textCount: number;
  /** Toutes les éditions conservées, de la plus récente à la plus ancienne. */
  editions: EditionBreve[];
  indexCourant: number;
  onOuvrir: () => void;
  /** Ouvre directement une autre édition, depuis le rail. */
  onChoisir: (index: number) => void;
}) {
  const reduce = useReducedMotion();
  // Toutes les autres éditions, en gardant leur rang d'origine. Écarter
  // bêtement la première aurait rendu la journée du jour inatteignable dès que
  // le lecteur avait choisi une autre date puis refermé la une.
  const autres = editions
    .map((e, i) => ({ e, i }))
    .filter(({ i }) => i !== indexCourant);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="group relative mb-10 overflow-hidden rounded-[2rem] border-2 border-fuchsia-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white shadow-2xl shadow-purple-950/40"
    >
      {/* Pli du papier : une ombre verticale au tiers, qui suggère la pliure. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 w-24 bg-gradient-to-r from-transparent via-black/25 to-transparent" />

      <motion.button
        type="button"
        onClick={onOuvrir}
        aria-label={`Ouvrir le Journal officiel du ${dateLongue(date)} — ${textCount} textes`}
        whileHover={reduce ? undefined : { y: -4, scale: 1.005 }}
        whileTap={reduce ? undefined : { scale: 0.99 }}
        className="relative block w-full p-6 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-fuchsia-400/40 sm:p-9"
      >
        {/* Respiration : un souffle lent, jamais un rebond. */}
        <motion.div
          animate={reduce ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Manchette. */}
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

          {/* Ce que l'abonnement donne, dit une fois et sans emphase. */}
          <p className="mt-4 max-w-xl text-[15px] font-bold leading-snug sm:text-base">
            <span className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
              Votre abonnement Pro ouvre l&apos;intégralité du Journal officiel,
              chaque matin dès sa parution.
            </span>
            <span className="mt-1 block text-[13px] font-medium text-white/55">
              Décrets, arrêtés, décisions, avis : chaque texte est expliqué en une
              phrase, classé par ministère, et renvoie à Légifrance.
            </span>
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-fuchsia-200 ring-1 ring-fuchsia-400/30">
            <Zap size={11} /> Mis à jour dès la parution
          </div>

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
      </motion.button>

      {/* Les éditions précédentes, hors du bouton. Elles remontent jusqu'au début
          de l'historique conservé : on peut redescendre jusqu'en août sans avoir
          à ouvrir d'abord la journée du jour. */}
      {autres.length > 0 && (
        <div className="relative border-t border-white/10 px-6 pb-5 pt-4 sm:px-9">
          <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Autres éditions — {editions.length} jours conservés, jusqu&apos;au{" "}
            {dateLongue(editions[editions.length - 1].date)}
          </p>
          <DragScroller ariaLabel="Autres éditions du Journal officiel" sombre className="gap-2 pb-2 pt-0 md:gap-2">
            {autres.map(({ e, i }) => {
              const d = jourCourt(e.date);
              return (
                <button
                  key={e.date}
                  type="button"
                  onClick={() => onChoisir(i)}
                  title={`${dateLongue(e.date)} — ${e.text_count} textes`}
                  className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-center text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  <span className="block font-staatliches text-lg leading-none tabular-nums">{d.jour}</span>
                  <span className="block text-[9px] font-black uppercase tracking-widest opacity-70">{d.mois}</span>
                </button>
              );
            })}
          </DragScroller>
        </div>
      )}
    </motion.div>
  );
}
