"use client";

import { useEffect, useState } from "react";
import { BarChart3, Newspaper, Tv, Radio } from "lucide-react";
import SondagesPanel from "./SondagesPanel";
import PressePanel from "./PressePanel";
import ArcomPanel from "./ArcomPanel";
import CandidateSocialTracker from "../CandidateSocialTracker";

type Candidat = { id: string; slug: string; full_name: string; party: string | null; photo_url: string | null };

const SECTIONS = [
  { id: "sondages", label: "Sondages", Icone: BarChart3 },
  { id: "presse", label: "Presse", Icone: Newspaper },
  { id: "temps-de-parole", label: "Télé & radio", Icone: Tv },
  { id: "veille", label: "Réseaux sociaux", Icone: Radio },
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
      <nav className="sticky z-30 mb-8 border-b border-border bg-background/85 backdrop-blur-md" style={{ top: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {SECTIONS.map(({ id, label, Icone }) => (
            <a key={id} href={`#${id}`}
              onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", `#${id}`); }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition ${actif === id ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icone size={13} /> {label}
            </a>
          ))}
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
