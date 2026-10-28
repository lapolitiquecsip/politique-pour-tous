"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronRight, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { AN_GROUPS_ORDERED } from "@/lib/data/partyGroups";

/**
 * Bouton « Partis » du sommaire de la page Assemblée : ouvre la liste des groupes, de gauche
 * à droite, avec leurs sièges. Chaque ligne mène à la fiche du parti, directement sur ses
 * votes à l'Assemblée (#votes). Feuille glissée du bas sur téléphone, fenêtre au centre
 * sur ordinateur.
 */
type Parti = { slug: string; nom: string; court: string; couleur: string; sieges: number | null; logo?: string | null };

export default function PartisMenu() {
  const [ouvert, setOuvert] = useState(false);
  const [partis, setPartis] = useState<Parti[] | null>(null);

  // Verrou de défilement sur le seul booléen « ouvert » : le relancer à chaque arrivée de
  // données remontait la page en haut (même piège que DossierModal).
  useEffect(() => {
    if (!ouvert) return;
    lockScroll();
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    window.addEventListener("keydown", echap);
    return () => { window.removeEventListener("keydown", echap); unlockScroll(); };
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert || partis) return;
    api.getParties().then((rows: any[]) => {
      const parSlug = new Map((rows || []).map((r: any) => [r.slug, r]));
      setPartis(AN_GROUPS_ORDERED.map(g => {
        const r: any = parSlug.get(g.slug);
        return { slug: g.slug, nom: g.name, court: g.short, couleur: r?.color || g.color, sieges: r?.effectif ?? null, logo: r?.logo_url || null };
      }));
    }).catch(() => setPartis([]));
  }, [ouvert, partis]);

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} aria-haspopup="dialog"
        className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-50 px-3.5 text-[13px] font-black text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Users size={15} /> Partis
      </button>{" "}
      {/* Portail vers <body> : la barre collante a un flou d'arrière-plan, qui fait d'elle le
          repère des éléments « fixed » — rendu dedans, le menu était confiné à ses 52 px. */}
      {ouvert && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Les partis à l'Assemblée">
          <button type="button" aria-label="Fermer" onClick={() => setOuvert(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
          <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-card shadow-2xl dark:bg-slate-900 md:max-w-lg md:rounded-[2rem]">
            <div className="flex items-start gap-3 border-b border-border p-5 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground">Les partis à l&apos;Assemblée</h2>{" "}
                <p className="mt-1 text-[13px] text-muted-foreground">Touchez un parti pour voir tous les votes de son groupe, texte par texte.</p>
              </div>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground hover:bg-slate-200 dark:hover:bg-slate-800"><X size={20} /></button>
            </div>{" "}
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {(partis || AN_GROUPS_ORDERED.map(g => ({ slug: g.slug, nom: g.name, court: g.short, couleur: g.color, sieges: null }))).map(p => (
                <li key={p.slug}>
                  <Link href={`/partis/${p.slug}#votes`} onClick={() => setOuvert(false)}
                    className="flex min-h-[60px] items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-muted active:scale-[0.99]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white" style={{ background: p.couleur }}>{p.court}</span>{" "}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-foreground">{p.nom}</span>{" "}
                      {p.sieges != null && <span className="block text-[12px] text-muted-foreground">{p.sieges} député{p.sieges > 1 ? "s" : ""}</span>}
                    </span>{" "}
                    <span className="hidden text-[12px] font-bold text-emerald-700 dark:text-emerald-400 sm:inline">Ses votes</span>
                    <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
