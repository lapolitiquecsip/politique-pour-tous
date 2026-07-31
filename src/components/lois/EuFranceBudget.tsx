"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowDownRight, ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

// France ↔ budget de l'UE : ce que la France verse, ce que l'UE dépense en France, le solde net,
// et la répartition des dépenses par grand programme. Donnée curée annuelle, source officielle.
// Série pluriannuelle (base HORS plan de relance, comparable) + le plan NextGenerationEU affiché à part.
const fmtMd = (n?: number | null) => n == null ? "—" : (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Md€";
const fmtSigned = (n: number) => (n < 0 ? "−" : "+") + fmtMd(Math.abs(n));

// Palette catégorielle (ordre fixe) pour les programmes.
const BAR = ["#f5c518", "#4ea1ff", "#34d399", "#a78bfa", "#fb7185", "#2dd4bf"];

type Row = {
  year: number;
  contribution_eur: number | null;
  spending_eur: number | null;
  breakdown?: Array<{ label: string; amount_eur: number; recovery?: boolean }>;
  source_url?: string;
  source_label?: string;
};

export default function EuFranceBudget() {
  const [series, setSeries] = useState<Row[] | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    api.getEuFranceBudgetSeries().then(d => { if (active) setSeries(d as Row[]); }).catch(() => setSeries(null));
    return () => { active = false; };
  }, []);

  if (series === undefined) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-yellow-400" /></div>;
  if (!series || series.length === 0) return null;

  const b = series[series.length - 1];              // année la plus récente
  const contrib = b.contribution_eur;
  const spend = b.spending_eur;                     // hors plan de relance
  const net = contrib != null && spend != null ? spend - contrib : null; // >0 = bénéficiaire net (hors plan)

  const allBreak = Array.isArray(b.breakdown) ? b.breakdown : [];
  const breakdown = allBreak.filter(x => !x.recovery);
  const recovery = allBreak.filter(x => x.recovery);
  const recoverySum = recovery.reduce((s, x) => s + (x.amount_eur || 0), 0);
  const maxAmt = Math.max(1, ...breakdown.map(x => x.amount_eur));
  // Solde AVEC le plan de relance (NextGenerationEU) : reversements structurels + plan − contribution.
  const netWithPlan = contrib != null && spend != null ? (spend + recoverySum - contrib) : null;

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-staatliches uppercase tracking-tight text-white md:text-4xl">
          La France & le <span className="text-yellow-400">budget de l'UE</span>
        </h2>
        <p className="mt-1 text-blue-200/70">Ce que la France verse à l'Union, ce que l'Union dépense en France, et à quoi ça sert — année {b.year} (hors plan de relance).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Contribution */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-300"><ArrowUpRight size={14} /> La France verse</div>
          <p className="mt-2 text-4xl font-staatliches text-white">{fmtMd(contrib)}</p>
          <p className="mt-1 text-sm text-blue-200/60">au budget de l'Union européenne</p>
        </div>
        {/* Dépenses */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-yellow-400/10 to-transparent p-6">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-yellow-300"><ArrowDownRight size={14} /> L'UE dépense en France</div>
          <p className="mt-2 text-4xl font-staatliches text-white">{fmtMd(spend)}</p>
          <p className="mt-1 text-sm text-blue-200/60">reversés sur le territoire français</p>
        </div>
        {/* Solde net (hors plan) */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="text-[11px] font-black uppercase tracking-widest text-blue-200/70">Solde net</div>
          <p className={`mt-2 text-4xl font-staatliches ${net != null && net < 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {net == null ? "—" : fmtSigned(net)}
          </p>
          <p className="mt-1 text-sm text-blue-200/60">{net != null && net < 0 ? "la France est contributrice nette" : "la France est bénéficiaire nette"}</p>
        </div>
      </div>

      {/* Plan de relance NextGenerationEU : exceptionnel (2021-2026), affiché à part pour ne pas fausser la série. */}
      {recoverySum > 0 && netWithPlan != null && (
        <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Sparkles size={16} /></span>
            <div>
              <p className="text-sm font-bold text-emerald-100">Avec le plan de relance <span className="whitespace-nowrap">NextGenerationEU</span> ({fmtSigned(recoverySum)})</p>
              <p className="text-sm text-emerald-200/70">plan exceptionnel 2021-2026 — en le comptant, la France est {netWithPlan < 0 ? "contributrice" : "bénéficiaire"} nette&nbsp;: <span className="font-black text-emerald-200">{fmtSigned(netWithPlan)}</span> en {b.year}.</p>
            </div>
          </div>
        </div>
      )}

      {/* Répartition : ce que l'UE finance en France (hors plan). */}
      {breakdown.length > 0 && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-yellow-400/90">Ce que l'UE finance en France</p>
          <div className="mt-4 space-y-3">
            {breakdown.slice().sort((a, c) => c.amount_eur - a.amount_eur).map((x, i) => (
              <div key={x.label} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm font-bold text-blue-100" title={x.label}>{x.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(x.amount_eur / maxAmt) * 100}%`, background: BAR[i % BAR.length] }} />
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-black tabular-nums text-white">{fmtMd(x.amount_eur)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Évolution pluriannuelle (base hors plan, comparable) — quand ≥ 2 années disponibles. */}
      {series.length > 1 && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-200/70">Évolution année par année <span className="text-blue-200/40">(hors plan de relance)</span></p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-blue-200/50">
                  <th className="pb-2 font-black">Année</th>
                  <th className="pb-2 text-right font-black text-blue-300">France verse</th>
                  <th className="pb-2 text-right font-black text-yellow-300">UE dépense</th>
                  <th className="pb-2 text-right font-black">Solde net</th>
                </tr>
              </thead>
              <tbody>
                {series.slice().reverse().map((r) => {
                  const n = r.contribution_eur != null && r.spending_eur != null ? r.spending_eur - r.contribution_eur : null;
                  return (
                    <tr key={r.year} className="border-t border-white/5">
                      <td className="py-2 font-staatliches text-lg text-white">{r.year}</td>
                      <td className="py-2 text-right tabular-nums text-blue-100">{fmtMd(r.contribution_eur)}</td>
                      <td className="py-2 text-right tabular-nums text-blue-100">{fmtMd(r.spending_eur)}</td>
                      <td className={`py-2 text-right font-black tabular-nums ${n != null && n < 0 ? "text-rose-300" : "text-emerald-300"}`}>{n == null ? "—" : fmtSigned(n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {b.source_url && (
        <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-300/70 hover:text-yellow-300">
          <ExternalLink size={12} /> {b.source_label || "Source officielle"}
        </a>
      )}
    </section>
  );
}
