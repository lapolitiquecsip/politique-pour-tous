"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Une section lourde (carte, grilles, carrousel) présentée d'abord en une carte courte :
 * un titre, une phrase, un bouton. Le contenu n'est monté qu'à l'ouverture — la page reste
 * légère et le parcours aéré. S'ouvre seule quand on arrive par son ancre (#id).
 */
export default function SectionRepliable({ id, badge, titre, texte, libelle, children }: {
  id: string; badge?: ReactNode; titre: ReactNode; texte: ReactNode; libelle: string; children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    const verifier = () => { if (window.location.hash === `#${id}`) setOuvert(true); };
    verifier();
    window.addEventListener("hashchange", verifier);
    return () => window.removeEventListener("hashchange", verifier);
  }, [id]);

  return (
    <section id={id} className="scroll-mt-32">
      {ouvert ? children : (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-slate-50 via-white to-red-50/40 p-5 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 md:p-7">
            {badge}
            <h2 className="mt-2 font-staatliches text-2xl uppercase leading-tight tracking-tight text-foreground md:text-4xl">{titre}</h2>{" "}
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{texte}</p>{" "}
            <button type="button" onClick={() => setOuvert(true)} aria-expanded={false}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-[15px] font-black text-white transition hover:bg-red-600 active:scale-[0.99] dark:bg-white dark:text-slate-950 sm:w-auto">
              {libelle} <ChevronDown size={17} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
