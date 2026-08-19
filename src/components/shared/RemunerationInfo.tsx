"use client";

import { Wallet, ExternalLink, Info } from "lucide-react";
import {
  PARLIAMENTARY_INDEMNITY, mayorIndemnity, fmtEurMonth,
  MAYOR_INDEMNITY_SOURCE, MAYOR_INDEMNITY_SOURCE_URL,
} from "@/lib/data/remuneration";

// Encart « Rémunération » d'un élu. Parlementaire : indemnité fixe officielle. Maire : indemnité
// de fonction calculée AUTOMATIQUEMENT depuis la population (barème légal), donc toujours à jour.
export default function RemunerationInfo({
  mode, population, className = "",
}: { mode: "parlementaire" | "maire"; population?: number | null; className?: string }) {
  if (mode === "maire") {
    const r = mayorIndemnity(population);
    if (!r) return null;
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-950/20 ${className}`}>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
          <Wallet size={13} /> Rémunération du maire
        </div>
        <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">{fmtEurMonth(r.gross)} <span className="text-sm font-bold text-slate-400">brut</span></p>
        <p className="mt-0.5 text-[11px] font-bold text-slate-500">Indemnité de fonction maximale ({r.rate.toLocaleString("fr-FR")} % de l'indice brut 1027), selon la population.</p>
        <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-slate-400">
          <Info size={11} className="mt-0.5 shrink-0" /> {MAYOR_INDEMNITY_SOURCE}
        </p>
        <a href={MAYOR_INDEMNITY_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700">
          Source officielle <ExternalLink size={9} />
        </a>
      </div>
    );
  }
  const p = PARLIAMENTARY_INDEMNITY;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40 ${className}`}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <Wallet size={13} /> Rémunération
      </div>
      <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">{fmtEurMonth(p.gross)} <span className="text-sm font-bold text-slate-400">brut</span></p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-500">Indemnité parlementaire (base {fmtEurMonth(p.base)} + résidence + fonction) — env. {fmtEurMonth(p.net)} net avant impôt.</p>
      <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-slate-400">
        <Info size={11} className="mt-0.5 shrink-0" /> Identique pour tous les députés et sénateurs, constante depuis {p.since}.
      </p>
      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
        Source officielle <ExternalLink size={9} />
      </a>
    </div>
  );
}
