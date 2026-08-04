"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { TrendingUp, Users, Wallet, ExternalLink, Landmark, Coins } from "lucide-react";
import {
  DEBT_BASE_EUR, DEBT_BASE_DATE, DEBT_PER_SECOND, POPULATION, DEBT_RATIO_GDP, DEBT_SOURCE, DEBT_SOURCE_URL,
  DEBT_BY_PRESIDENT, DEBT_BY_PRESIDENT_NOTE, PUBLIC_SPENDING, GOVERNANCE,
} from "@/lib/data/publicFinance";

const eur0 = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
const fmtMd = (n: number) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " Md€";

// Dette extrapolée à l'instant t depuis la dernière donnée officielle INSEE.
function liveDebt(now: number) {
  const elapsedSec = (now - new Date(DEBT_BASE_DATE).getTime()) / 1000;
  return DEBT_BASE_EUR + DEBT_PER_SECOND * elapsedSec;
}

export default function PublicFinancePanel() {
  const [debt, setDebt] = useState(() => liveDebt(Date.now()));
  const raf = useRef<number | null>(null);
  useEffect(() => {
    let mounted = true;
    const tick = () => { if (!mounted) return; setDebt(liveDebt(Date.now())); raf.current = window.setTimeout(tick, 80) as unknown as number; };
    tick();
    return () => { mounted = false; if (raf.current) clearTimeout(raf.current); };
  }, []);

  const perHab = debt / POPULATION;
  const maxAdded = Math.max(...DEBT_BY_PRESIDENT.map(p => p.addedEur));

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <h2 className="font-staatliches text-3xl uppercase tracking-tight text-white md:text-4xl">
          Dette & <span className="text-amber-400">dépenses publiques</span>
        </h2>
        <p className="mt-1 text-slate-400">La situation des comptes de l'État, en direct et sourcée officiellement.</p>
      </div>

      {/* Compteur de dette en direct */}
      <div className="overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-slate-950 p-6 md:p-8">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rose-300">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /></span>
          Dette publique de la France · en direct
        </div>
        <p className="mt-3 font-staatliches text-4xl tabular-nums leading-none text-white md:text-6xl">{eur0(debt)}</p>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="text-2xl font-black tabular-nums text-rose-200">{eur0(perHab)}</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">par habitant</p>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-rose-200">{DEBT_RATIO_GDP.toLocaleString("fr-FR")} %</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">du PIB (fin 2025)</p>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-rose-200">+{Math.round(DEBT_PER_SECOND).toLocaleString("fr-FR")} €</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">par seconde</p>
          </div>
        </div>
        <a href={DEBT_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-start gap-1.5 text-[10px] leading-snug text-slate-500 hover:text-rose-300">
          <ExternalLink size={11} className="mt-0.5 shrink-0" /> {DEBT_SOURCE}
        </a>
      </div>

      {/* Hausse de la dette par président */}
      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70"><TrendingUp size={14} /> Hausse de la dette par président</p>
        <div className="mt-5 space-y-4">
          {DEBT_BY_PRESIDENT.map(p => (
            <div key={p.name}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-white">{p.name} <span className="ml-1 text-[11px] font-bold text-slate-400">{p.years}</span></span>
                <span className="text-sm font-black tabular-nums" style={{ color: p.color }}>+{(p.endPct - p.startPct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pts de PIB</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(p.addedEur / maxAdded) * 100}%`, background: p.color }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-bold tabular-nums text-slate-300">≈ +{fmtMd(p.addedEur)}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{p.startPct.toLocaleString("fr-FR")} % → {p.endPct.toLocaleString("fr-FR")} % du PIB</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] italic leading-snug text-slate-500">{DEBT_BY_PRESIDENT_NOTE} Source : INSEE.</p>
      </div>

      {/* Dépenses publiques + gouvernance */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent p-6">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-300"><Wallet size={14} /> Dépenses publiques</p>
          <p className="mt-3 font-staatliches text-4xl text-white">{PUBLIC_SPENDING.ratioGdp.toLocaleString("fr-FR")} %</p>
          <p className="text-sm text-slate-400">du PIB en 2025 — parmi les plus élevées de l'Union européenne (≈ {fmtMd(PUBLIC_SPENDING.approxEur)}).</p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.03] p-3">
            <Coins size={16} className="shrink-0 text-amber-300" />
            <p className="text-sm text-slate-300"><span className="font-black text-white">{fmtMd(PUBLIC_SPENDING.deficitEur)}</span> de déficit public en 2025</p>
          </div>
          <a href={PUBLIC_SPENDING.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-start gap-1.5 text-[10px] leading-snug text-slate-500 hover:text-amber-300">
            <ExternalLink size={11} className="mt-0.5 shrink-0" /> {PUBLIC_SPENDING.source}
          </a>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70"><Landmark size={14} /> État & fonction publique</p>
          <div className="mt-4 space-y-4">
            {GOVERNANCE.map((g, i) => (
              <div key={g.label} className="flex items-start gap-3 border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                  {i === 0 ? <Users size={16} /> : i === 1 ? <TrendingUp size={16} /> : <Landmark size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-black tabular-nums text-white">{g.value} <span className="text-sm font-bold text-slate-400">{g.label}</span></p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{g.sub}</p>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-300">
                    {g.year} · {g.source} <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
