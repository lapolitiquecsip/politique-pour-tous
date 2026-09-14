"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * Flèche animée posée entre deux cartes d'un rail horizontal, sur mobile.
 *
 * Elle remplace une consigne écrite (« faites glisser ») : le mouvement suggère le geste
 * sans demander de lire. Positionnée en absolu et rendue insensible aux clics, elle ne
 * gêne ni le défilement ni l'appui sur les cartes qu'elle chevauche.
 *
 * Disparaît dès que la disposition passe en grille (sm), et ne bouge pas si le système
 * demande des animations réduites.
 */
export default function SwipeArrow({ color = "#3b82f6" }: { color?: string }) {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-1 top-1/2 z-10 -translate-y-1/2 sm:hidden"
    >
      <motion.span
        className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg"
        style={{ backgroundColor: color }}
        animate={reduce ? undefined : { x: [0, 7, 0], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronRight size={20} strokeWidth={3} />
      </motion.span>
    </div>
  );
}
