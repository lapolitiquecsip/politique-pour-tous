"use client";

import { useEffect, useState } from "react";
import { BarChart3, Newspaper, Tv, Radio } from "lucide-react";
import SondagesPanel from "./SondagesPanel";
import PressePanel from "./PressePanel";
import ArcomPanel from "./ArcomPanel";
import CandidateSocialTracker from "../CandidateSocialTracker";

type Candidat = { id: string; slug: string; full_name: string; party: string | null; photo_url: string | null };

// Chaque onglet prend, actif, la couleur de sa section (titres et graphiques).
const SECTIONS = [
  { id: "sondages", label: "Sondages", Icone: BarChart3, actif: "from-indigo-500 to-blue-600 shadow-indigo-500/30" },
  { id: "presse", label: "Presse", Icone: Newspaper, actif: "from-amber-500 to-orange-600 shadow-orange-500/30" },
  { id: "temps-de-parole", label: "Télé & radio", Icone: Tv, actif: "from-sky-500 to-cyan-600 shadow-sky-500/30" },
  { id: "veille", label: "Réseaux sociaux", Icone: Radio, actif: "from-fuchsia-500 to-purple-600 shadow-fuchsia-500/30" },
] as const;

/**
 * Onglet « Dynamiques » de la présidentielle : sondages (ouverts à tous), puis la
 * veille médiatique réservée au Pro — presse, temps de parole Arcom, réseaux sociaux.
 */
export default function DynamiquesView({ candidates }: { candidates: Candidat[] }) {
  const [actif, setActif] = useState<string>("sondages");

  // Section visible → onglet surligné dans la barre de navigation.
  useEffect(() => {
    // L'observateur ne signale que les changements : on garde l'état de chaque section,
    // sinon une section restée visible pendant le chargement n'était jamais retenue.
    const visibles = new Set<string>();
    const obs = new IntersectionObserver(entrees => {
      for (const e of entrees) { if (e.isIntersecting) visibles.add(e.target.id); else visibles.delete(e.target.id); }
      const premiere = SECTIONS.find(s => visibles.has(s.id));
      if (premiere) setActif(premiere.id);
    }, { rootMargin: "-30% 0px -60% 0px" });
    for (const s of SECTIONS) { const el = document.getElementById(s.id); if (el) obs.observe(el); }
    return () => obs.disconnect();
  }, []);

  return (
    <div className="pb-24">
      {/* Barre de sections : pastille flottante, centrée, collée sous l'en-tête du site. */}
      <nav aria-label="Sections de l'onglet" className="pointer-events-none sticky z-30 mb-10 px-4" style={{ top: "calc(env(safe-area-inset-top, 0px) + 4.75rem)" }}>
        <div className="pointer-events-auto mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card/80 p-1.5 shadow-xl shadow-slate-900/[0.07] backdrop-blur-xl [scrollbar-width:none] dark:shadow-black/40">
          {SECTIONS.map(({ id, label, Icone, actif: teinte }, i) => {
            const on = actif === id;
            return (
              <a key={id} href={`#${id}`} aria-current={on ? "true" : undefined}
                onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", `#${id}`); }}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold transition-all duration-300 ${on ? `bg-gradient-to-r ${teinte} text-white shadow-lg` : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <span className={`hidden text-[10px] font-black tabular-nums sm:inline ${on ? "text-white/70" : "text-muted-foreground/70"}`}>0{i + 1}</span>
                <Icone size={15} className={on ? "" : "transition-transform group-hover:scale-110"} />
                {label}
              </a>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl space-y-16 px-4">
        <SondagesPanel candidats={candidates} />
        <PressePanel candidats={candidates} />
        <ArcomPanel candidats={candidates} />
      </div>
      <div className="mt-16">
        <CandidateSocialTracker candidates={candidates} />
      </div>
    </div>
  );
}
