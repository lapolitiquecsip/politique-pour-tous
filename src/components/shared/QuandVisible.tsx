"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Ne monte son contenu (et donc ses requêtes) qu'à l'approche de l'écran, et après ce qui
 * passe avant lui (30/10/2026).
 *
 * Sur une fiche d'élu, une quinzaine de requêtes partaient ensemble à l'ouverture — autres
 * fonctions de la personne, classements d'activité… — et les votes, ce qu'on vient voir,
 * attendaient leur tour derrière elles (≈ 3 s chacune sur une connexion mobile). Les blocs
 * secondaires attendent d'être à moins de `marge` pixels de l'écran ET que `apres` soit vrai
 * (les votes arrivés) — au plus `delaiMax` ms, pour ne jamais rester vides.
 */
export default function QuandVisible({ children, marge = 400, hauteur = 1, apres = true, delaiMax = 4000 }: {
  children: ReactNode; marge?: number; hauteur?: number; apres?: boolean; delaiMax?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [libre, setLibre] = useState(apres);
  useEffect(() => { if (apres) setLibre(true); }, [apres]);
  useEffect(() => { if (libre) return; const t = setTimeout(() => setLibre(true), delaiMax); return () => clearTimeout(t); }, [libre, delaiMax]);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { setVisible(true); obs.disconnect(); } }, { rootMargin: `${marge}px 0px` });
    obs.observe(el);
    return () => obs.disconnect();
  }, [marge, visible]);
  return visible && libre ? <>{children}</> : <div ref={ref} aria-hidden style={{ minHeight: hauteur }} />;
}
