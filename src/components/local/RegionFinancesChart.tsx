"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { TrendingUp } from "lucide-react";

type Row = { year: number; indicator: string; montant_millions: number | null; euros_par_habitant: number | null };

const INDICATORS = [
  { code: "epargne_brute", label: "Épargne brute", unit: "€/hab", hint: "Ce que la région met de côté chaque année pour investir et rembourser sa dette. Plus c'est haut, mieux c'est." },
  { code: "encours_dette", label: "Encours de dette", unit: "€/hab", hint: "Dette totale rapportée à l'habitant." },
  { code: "capacite_desendettement", label: "Capacité de désendettement", unit: "ans", hint: "Nombre d'années pour rembourser la dette avec l'épargne. Sous 8-10 ans = sain." },
  { code: "depenses_fonctionnement", label: "Dépenses de fonctionnement", unit: "€/hab", hint: "Dépenses courantes (personnel, gestion)." },
  { code: "depenses_investissement", label: "Dépenses d'investissement", unit: "€/hab", hint: "Investissements (équipements, travaux)." },
  { code: "depenses_totales", label: "Dépenses totales", unit: "€/hab", hint: "Ensemble des dépenses." },
];

function format(value: number, unit: string) {
  if (unit === "ans") return `${value.toFixed(1)} ans`;
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

export default function RegionFinancesChart({ regionCode }: { regionCode: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [indicator, setIndicator] = useState("epargne_brute");

  useEffect(() => {
    let active = true;
    api.getRegionFinances(regionCode).then(d => { if (active) setRows(d as Row[]); }).catch(() => setRows([]));
    return () => { active = false; };
  }, [regionCode]);

  const series = useMemo(() => {
    if (!rows) return [];
    if (indicator === "capacite_desendettement") {
      const dette = new Map<number, number>(), ep = new Map<number, number>();
      for (const r of rows) {
        if (r.indicator === "encours_dette" && r.montant_millions != null) dette.set(r.year, r.montant_millions);
        if (r.indicator === "epargne_brute" && r.montant_millions != null) ep.set(r.year, r.montant_millions);
      }
      const pts: { year: number; value: number }[] = [];
      for (const [year, d] of [...dette.entries()].sort((a, b) => a[0] - b[0])) {
        const e = ep.get(year);
        if (e && e > 0) pts.push({ year, value: d / e });
      }
      return pts;
    }
    const m = new Map<number, number>();
    for (const r of rows) if (r.indicator === indicator && r.euros_par_habitant != null) m.set(r.year, r.euros_par_habitant);
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([year, value]) => ({ year, value }));
  }, [rows, indicator]);

  const meta = INDICATORS.find(i => i.code === indicator)!;

  if (rows === null) return <p className="mt-3 text-sm text-slate-400">Chargement des finances…</p>;
  if (series.length === 0) return <p className="mt-3 text-sm text-slate-500">Données financières indisponibles pour cette région.</p>;

  // Géométrie du graphique
  const W = 600, H = 240, padL = 46, padR = 16, padT = 16, padB = 30;
  const values = series.map(p => p.value);
  const y0 = Math.min(0, ...values);
  const y1 = Math.max(...values);
  const span = (y1 - y0) || 1;
  const x = (i: number) => padL + (W - padL - padR) * (i / (series.length - 1 || 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - y0) / span);
  const line = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)},${y(y0).toFixed(1)} L${x(0).toFixed(1)},${y(y0).toFixed(1)} Z`;
  const first = series[0], last = series[series.length - 1];
  const trendUp = last.value >= first.value;

  return (
    <div>
      {/* Sélecteur d'indicateur */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={indicator}
          onChange={e => setIndicator(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {INDICATORS.map(i => <option key={i.code} value={i.code}>{i.label}</option>)}
        </select>
        <span className="text-xs text-slate-400">{meta.hint}</span>
      </div>

      {/* Valeur la plus récente + tendance */}
      <div className="mt-4 flex items-end gap-3">
        <span className="text-4xl font-black text-slate-900">{format(last.value, meta.unit)}</span>
        <span className={`mb-1 inline-flex items-center gap-1 text-sm font-bold ${trendUp ? "text-emerald-600" : "text-red-600"}`}>
          <TrendingUp size={16} className={trendUp ? "" : "rotate-180"} />
          {trendUp ? "+" : ""}{format(last.value - first.value, meta.unit)} depuis {first.year}
        </span>
      </div>

      {/* Graphique */}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Évolution ${meta.label}`}>
        <defs>
          <linearGradient id="finArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Lignes de repère + labels Y */}
        {[0, 0.5, 1].map(t => {
          const val = y0 + span * t;
          const yy = y(val);
          return (
            <g key={t}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(val).toLocaleString("fr-FR")}</text>
            </g>
          );
        })}
        {/* Aire + ligne */}
        <path d={area} fill="url(#finArea)" />
        <path d={line} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Points + labels X (une année sur deux) */}
        {series.map((p, i) => (
          <g key={p.year}>
            <circle cx={x(i)} cy={y(p.value)} r={i === series.length - 1 ? 4.5 : 2.5} fill={i === series.length - 1 ? "#dc2626" : "#2563eb"} />
            {(i % 2 === 0 || i === series.length - 1) && (
              <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.year}</text>
            )}
          </g>
        ))}
      </svg>
      <p className="mt-1 text-right text-[10px] text-slate-400">Source : OFGL · budget principal · {meta.unit === "ans" ? "années" : "euros par habitant"}</p>
    </div>
  );
}
