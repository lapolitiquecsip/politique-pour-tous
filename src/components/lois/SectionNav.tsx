"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sommaire collant d'une page longue (Assemblée, Sénat) : une ligne de pastilles sous
 * l'en-tête du site, qui défile au doigt et suit la section en cours de lecture. Sur
 * téléphone, il remplace les six boutons empilés du hero : on sait toujours où l'on est,
 * et chaque partie est à un geste.
 */
export default function SectionNav({ items, accent = "bg-emerald-600" }: { items: { id: string; label: string }[]; accent?: string }) {
  const [actif, setActif] = useState(items[0]?.id);
  const barre = useRef<HTMLDivElement>(null);

  // La section dont le haut a passé le premier tiers de l'écran est la section en cours.
  useEffect(() => {
    const sections = items.map(i => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(entrees => {
      const visibles = entrees.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visibles[0]) setActif(visibles[0].target.id);
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
      <div ref={barre} className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden">
        {items.map(i => (
          <a key={i.id} href={`#${i.id}`} data-section={i.id} aria-current={actif === i.id ? "true" : undefined}
            className={`flex min-h-[40px] shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors ${actif === i.id ? `${accent} text-white shadow-sm` : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
