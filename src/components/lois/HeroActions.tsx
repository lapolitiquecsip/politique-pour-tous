"use client";

import { ArrowRight, Search } from "lucide-react";

/**
 * Les actions du hero d'une chambre : la principale (trouver son élu) descend jusqu'à la
 * recherche et y place le curseur, le clavier s'ouvre — un seul geste ; la seconde mène
 * aux derniers votes.
 */
export default function HeroActions({ actions }: { actions: { label: string; href: string; focus?: string }[] }) {
  const aller = (e: React.MouseEvent, href: string, focus?: string) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    // Vers le champ lui-même quand il y en a un : posé sous le sommaire collant, il reste
    // visible au-dessus du clavier, même sur un petit écran.
    const champ = focus ? document.getElementById(focus) : null;
    if (champ) window.scrollTo({ top: champ.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
    else document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    // Le champ prend le focus une fois arrivé : sans attendre, le clavier ouvrirait sur le hero.
    if (focus) setTimeout(() => document.getElementById(focus)?.focus({ preventScroll: true }), 650);
  };
  return (
    <div className="mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center">
      {actions.map((a, i) => (
        <a key={a.href} href={a.href} onClick={e => aller(e, a.href, a.focus)}
          className={i === 0
            ? "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 text-[15px] font-black text-slate-950 shadow-lg shadow-black/30 transition hover:bg-slate-100 active:scale-[0.98]"
            : "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 text-[15px] font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"}>
          {i === 0 && <Search size={18} />}{a.label}{i > 0 && <ArrowRight size={17} />}
        </a>
      ))}
    </div>
  );
}
