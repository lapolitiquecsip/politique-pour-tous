"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sommaire collant d'une page longue (Assemblée, Sénat) : une ligne de pastilles sous
 * l'en-tête du site, qui défile au doigt et suit la section en cours de lecture. Sur
 * téléphone, il remplace les six boutons empilés du hero : on sait toujours où l'on est,
 * et chaque partie est à un geste.
 */
// extra : un bouton épinglé à droite, hors du défilement (ex. « Partis » sur la page Assemblée).
export default function SectionNav({ items, accent = "bg-emerald-600", extra }: { items: { id: string; label: string }[]; accent?: string; extra?: React.ReactNode }) {
  const [actif, setActif] = useState(items[0]?.id);
  const barre = useRef<HTMLDivElement>(null);

  // La section dont le haut a passé le premier tiers de l'écran est la section en cours.
  useEffect(() => {
    const sections = items.map(i => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    // L'observateur ne signale que les sections qui CHANGENT : on garde l'ensemble des visibles
    // et on retient la plus haute — sinon, sur grand écran où plusieurs sections courtes sont
    // visibles à la fois, la dernière arrivée l'emportait sur celle qu'on vient d'ouvrir.
    const visibles = new Set<HTMLElement>();
    const obs = new IntersectionObserver(entrees => {
      for (const e of entrees) {
        if (e.isIntersecting) visibles.add(e.target as HTMLElement);
        else visibles.delete(e.target as HTMLElement);
      }
      const premiere = [...visibles].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (premiere) setActif(premiere.id);
    }, { rootMargin: "-120px 0px -60% 0px" });
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [items]);

  // La pastille active reste visible dans la barre, sans faire bouger la page.
  useEffect(() => {
    const b = barre.current, el = b?.querySelector<HTMLElement>(`[data-section="${actif}"]`);
    if (b && el) b.scrollTo({ left: el.offsetLeft - b.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [actif]);

  return (
    <nav aria-label="Sommaire de la page" className="sticky top-16 z-30 border-b border-border bg-card/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center">
      <div ref={barre} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden">
        {items.map(i => (
          <a key={i.id} href={`#${i.id}`} data-section={i.id} aria-current={actif === i.id ? "true" : undefined}
            className={`flex min-h-[40px] shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors ${actif === i.id ? `${accent} text-white shadow-sm` : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {i.label}
          </a>
        ))}
      </div>
      {extra && <div className="shrink-0 border-l border-border py-2 pl-2 pr-3 dark:border-slate-800">{extra}</div>}
      </div>
    </nav>
  );
}
