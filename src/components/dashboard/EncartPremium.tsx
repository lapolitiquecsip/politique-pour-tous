"use client";

import Link from "next/link";
import { Lock, Check, ArrowRight } from "lucide-react";

/**
 * Une fonctionnalité réservée, montrée plutôt que cachée.
 *
 * Derrière : un aperçu flouté de ce que le membre obtiendrait, pour qu'il voie la
 * chose avant qu'on la lui vende. Devant : un cadenas doré dont l'anneau tourne
 * lentement, le nom de la fonctionnalité, trois bénéfices concrets et un seul
 * bouton. L'animation se coupe pour qui a demandé moins de mouvement.
 */
export type OffreVerrou = "premium" | "pro";

export default function EncartPremium({
  offre = "premium", titre, texte, benefices, apercu,
}: {
  offre?: OffreVerrou;
  titre: string;
  texte: string;
  benefices: string[];
  /** Lignes factices de l'aperçu flouté (titres plausibles de la fonctionnalité). */
  apercu: string[];
}) {
  const pro = offre === "pro";
  return (
    // data-offre="pro" repeint la palette dorée en violet (globals.css) : l'offre Pro
    // a sa couleur, le doré reste celle du Premium.
    <div data-offre={pro ? "pro" : undefined} className="relative col-span-full overflow-hidden rounded-[2.5rem] border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.07] via-white/[0.02] to-transparent">
      {/* L'aperçu flouté, en fond */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none p-8 opacity-90 blur-[5px]">
        <div className="grid gap-4 md:grid-cols-2">
          {apercu.map((ligne, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <div className="mb-3 h-2.5 w-20 rounded-full bg-amber-300/40" />
              <p className="text-base font-bold text-white/80">{ligne}</p>
              <div className="mt-3 h-2 w-3/4 rounded-full bg-white/15" />
              <div className="mt-2 h-2 w-1/2 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1020]/20 via-[#0b1020]/60 to-[#0b1020]/85" />

      {/* Le propos, au premier plan */}
      <div className="relative flex flex-col items-center px-6 py-14 text-center md:py-16">
        {/* Cadenas : un anneau conique doré tourne derrière une pastille sombre. */}
        <div className="relative mb-7 flex h-20 w-20 items-center justify-center">
          <span className={`absolute inset-0 rounded-full motion-safe:animate-[spin_5s_linear_infinite] ${pro
            ? "bg-[conic-gradient(from_0deg,#f0abfc,#a855f7_25%,transparent_45%,#c084fc_70%,transparent_90%,#f0abfc)]"
            : "bg-[conic-gradient(from_0deg,#fde68a,#f59e0b_25%,transparent_45%,#fbbf24_70%,transparent_90%,#fde68a)]"}`} />
          <span className="absolute inset-[3px] rounded-full bg-[#0f1424]" />
          <span className="absolute inset-0 rounded-full shadow-[0_0_40px_rgb(var(--lueur-offre)/0.45)] motion-safe:animate-pulse" />
          <Lock size={30} className={`relative text-amber-300 ${pro ? "drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]" : "drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"}`} strokeWidth={2.2} />
        </div>

        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
          Réservé aux membres {pro ? "Pro" : "Premium"}
        </span>
        <h3 className="font-staatliches text-4xl uppercase leading-none tracking-tight text-white md:text-5xl">{titre}</h3>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-300">{texte}</p>

        <ul className="mt-6 grid gap-2 text-left">
          {benefices.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-slate-200">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                <Check size={12} strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <Link
          href="/premium"
          className={`sword-shine group mt-9 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-8 py-4 font-staatliches text-2xl uppercase leading-none tracking-wide ${pro ? "text-white" : "text-slate-950"} shadow-[0_10px_40px_rgb(var(--lueur-offre)/0.4)] transition hover:brightness-105 active:scale-[0.98]`}
        >
          {pro ? "Passer au Pro" : "Devenir Premium"}
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <Link href="/premium" className="mt-4 text-[11px] font-bold uppercase tracking-widest text-white/45 transition hover:text-white">
          Comparer les offres
        </Link>
      </div>
    </div>
  );
}
