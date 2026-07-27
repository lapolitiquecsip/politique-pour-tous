"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

// France ↔ budget de l'UE : ce que la France verse, ce que l'UE dépense en France, le solde net,
// et la répartition des dépenses par grand programme. Donnée curée annuelle, source officielle.
const fmtMd = (n?: number | null) => n == null ? "—" : (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Md€";

// Palette catégorielle (ordre fixe) pour les programmes.
const BAR = ["#f5c518", "#4ea1ff", "#34d399", "#a78bfa", "#fb7185", "#2dd4bf"];

export default function EuFranceBudget() {
  const [b, setB] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    api.getEuFranceBudget().then(d => { if (active) setB(d); }).catch(() => setB(null));
    return () => { active = false; };
  }, []);

  if (b === undefined) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-yellow-400" /></div>;
  if (!b) return null;

  const contrib = b.contribution_eur as number | null;
  const spend = b.spending_eur as number | null;
  const net = contrib != null && spend != null ? spend - contrib : null; // >0 = bénéficiaire net
  const breakdown: Array<{ label: string; amount_eur: number }> = Array.isArray(b.breakdown) ? b.breakdown : [];
  const maxAmt = Math.max(1, ...breakdown.map(x => x.amount_eur));

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-staatliches uppercase tracking-tight text-white md:text-4xl">
          La France & le <span className="text-yellow-400">budget de l'UE</span>
        </h2>
        <p className="mt-1 text-blue-200/70">Ce que la France verse à l'Union, ce que l'Union dépense en France, et à quoi ça sert — année {b.year}.</p>
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
        {/* Solde net */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="text-[11px] font-black uppercase tracking-widest text-blue-200/70">Solde net</div>
          <p className={`mt-2 text-4xl font-staatliches ${net != null && net < 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {net == null ? "—" : (net < 0 ? "−" : "+") + fmtMd(Math.abs(net))}
          </p>
          <p className="mt-1 text-sm text-blue-200/60">{net != null && net < 0 ? "la France est contributrice nette" : "la France est bénéficiaire nette"}</p>
        </div>
      </div>

      {/* Répartition : ce que l'UE finance en France. */}
      {breakdown.length > 0 && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-yellow-400/90">Ce que l'UE finance en France</p>
          <div className="mt-4 space-y-3">
            {breakdown.slice().sort((a, b) => b.amount_eur - a.amount_eur).map((x, i) => (
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

      {b.source_url && (
        <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-300/70 hover:text-yellow-300">
          <ExternalLink size={12} /> {b.source_label || "Source officielle"}
        </a>
      )}
    </section>
  );
}
