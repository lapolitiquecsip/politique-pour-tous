"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TrendingUp, Users, Wallet, ExternalLink, Landmark, Coins } from "lucide-react";
import { api } from "@/lib/api";
import {
  DEBT_BASE_EUR, DEBT_BASE_DATE, DEBT_PER_SECOND, POPULATION, DEBT_RATIO_GDP, DEBT_SOURCE, DEBT_SOURCE_URL,
  DEBT_BY_PRESIDENT, DEBT_BY_PRESIDENT_NOTE, PUBLIC_SPENDING, GOVERNANCE,
} from "@/lib/data/publicFinance";

const eur0 = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
const fmtMd = (n: number) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " Md€";
const liveDebt = (now: number) => DEBT_BASE_EUR + DEBT_PER_SECOND * ((now - new Date(DEBT_BASE_DATE).getTime()) / 1000);

// Avatar président : photo (Wikipédia) ou initiales en repli.
function PresAvatar({ name, photo, color }: { name: string; photo?: string; color: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  if (photo && !failed) return <img src={photo} alt={name} onError={() => setFailed(true)} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white" style={{ boxShadow: `0 0 0 2px ${color}55` }} />;
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ backgroundColor: color }}>{initials}</span>;
}

export default function PublicFinancePanel() {
  const [debt, setDebt] = useState(() => liveDebt(Date.now()));
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = () => { if (!mounted) return; setDebt(liveDebt(Date.now())); raf.current = window.setTimeout(tick, 100) as unknown as number; };
    tick();
    api.getPresidents().then((list: any[]) => { if (mounted) setPhotos(Object.fromEntries(list.map(p => [p.slug, p.photo_url]).filter(x => x[1]))); }).catch(() => {});
    return () => { mounted = false; if (raf.current) clearTimeout(raf.current); };
  }, []);

  const perHab = debt / POPULATION;
  const maxAdded = Math.max(...DEBT_BY_PRESIDENT.map(p => p.addedEur));

  return (
    <section className="mx-auto max-w-5xl px-4">
      <div className="mb-5">
        <h2 className="font-staatliches text-2xl uppercase tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Dette & <span className="text-rose-600">dépenses publiques</span>
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">La situation des comptes de l'État, en direct et sourcée (INSEE).</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Compteur de dette — carte claire, accent rouge */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-500/20 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" /></span>
            Dette publique · en direct
          </div>
          <p className="mt-1.5 font-staatliches text-3xl tabular-nums leading-none text-slate-900 dark:text-white md:text-4xl">{eur0(debt)}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <div><p className="text-lg font-black tabular-nums text-rose-700 dark:text-rose-300">{eur0(perHab)}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">par habitant</p></div>
            <div><p className="text-lg font-black tabular-nums text-rose-700 dark:text-rose-300">{DEBT_RATIO_GDP.toLocaleString("fr-FR")} %</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">du PIB (2025)</p></div>
            <div><p className="text-lg font-black tabular-nums text-rose-700 dark:text-rose-300">+{Math.round(DEBT_PER_SECOND).toLocaleString("fr-FR")} €</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">par seconde</p></div>
          </div>
          <a href={DEBT_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-600"><ExternalLink size={10} /> Extrapolé de la dernière donnée officielle INSEE (fin 2025)</a>
        </div>

        {/* Dépenses publiques */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 dark:border-amber-500/20 dark:bg-amber-950/10">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600"><Wallet size={13} /> Dépenses publiques</p>
          <p className="mt-1.5 font-staatliches text-3xl text-slate-900 dark:text-white md:text-4xl">{PUBLIC_SPENDING.ratioGdp.toLocaleString("fr-FR")} %</p>
          <p className="text-sm text-slate-500">du PIB en 2025 (≈ {fmtMd(PUBLIC_SPENDING.approxEur)}) — parmi les plus élevées de l'UE.</p>
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white/70 p-2.5 dark:bg-white/[0.03]">
            <Coins size={15} className="shrink-0 text-amber-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-black text-slate-900 dark:text-white">{fmtMd(PUBLIC_SPENDING.deficitEur)}</span> de déficit public (2025)</p>
          </div>
        </div>
      </div>

      {/* Hausse de la dette par président */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500"><TrendingUp size={13} /> Hausse de la dette par président</p>
        <div className="mt-4 space-y-3.5">
          {DEBT_BY_PRESIDENT.map(p => (
            <div key={p.slug}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Link href={`/presidents/${p.slug}`} className="group flex items-center gap-2.5">
                  <PresAvatar name={p.name} photo={photos[p.slug]} color={p.color} />
                  <span className="text-sm font-black text-slate-900 group-hover:underline dark:text-white" style={{ textDecorationColor: p.color }}>{p.name}</span>
                  <span className="text-[11px] font-bold text-slate-400">{p.years}</span>
                </Link>
                <span className="text-right text-sm font-black tabular-nums" style={{ color: p.color }}>+{(p.endPct - p.startPct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pts&nbsp;·&nbsp;≈&nbsp;+{fmtMd(p.addedEur)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${(p.addedEur / maxAdded) * 100}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] italic leading-snug text-slate-400">{DEBT_BY_PRESIDENT_NOTE}</p>
      </div>

      {/* État & fonction publique */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {GOVERNANCE.map((g, i) => (
          <div key={g.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15">
              {i === 0 ? <Users size={15} /> : i === 1 ? <TrendingUp size={15} /> : <Landmark size={15} />}
            </span>
            <p className="mt-2 text-xl font-black tabular-nums text-slate-900 dark:text-white">{g.value}</p>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{g.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{g.sub}</p>
            <a href={g.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600">{g.year} · {g.source} <ExternalLink size={9} /></a>
          </div>
        ))}
      </div>
    </section>
  );
}
