"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Row = { variable: string; sub_field: string; year: number; value: number; unit: string | null; label: string | null; odd: string | null };

// Catalogue des variables retenues : libellé lisible + thème + unité.
const CATALOG: Record<string, { label: string; theme: string; unit: string }> = {
  esper_vie: { label: "Espérance de vie", theme: "Santé", unit: "ans" },
  taux_chom_bit: { label: "Taux de chômage", theme: "Emploi", unit: "%" },
  bas_niveau_francais: { label: "6ᵉ en difficulté — français", theme: "Éducation", unit: "%" },
  bas_niveau_maths: { label: "6ᵉ en difficulté — maths", theme: "Éducation", unit: "%" },
  nb_maires_femme: { label: "Femmes maires (nombre)", theme: "Égalité F/H", unit: "" },
  part_maires_femme: { label: "Part de femmes maires", theme: "Égalité F/H", unit: "%" },
  agribio_nbexp: { label: "Exploitations bio", theme: "Agriculture", unit: "" },
  agribio_surf: { label: "Surface agriculture bio", theme: "Agriculture", unit: "ha" },
  part_agribio_surf: { label: "Part surface bio", theme: "Agriculture", unit: "%" },
  conso_fin_ener: { label: "Consommation d'énergie", theme: "Énergie", unit: "GWh" },
  puissance_inst: { label: "Puissance renouvelable", theme: "Énergie", unit: "MW" },
  log_hlm_tot: { label: "Logements sociaux", theme: "Logement", unit: "" },
  part_pls: { label: "Part de logements sociaux", theme: "Logement", unit: "%" },
  nb_vacant_pls: { label: "Logements sociaux vacants", theme: "Logement", unit: "" },
  infrac_tx_usagstup: { label: "Usages de stupéfiants", theme: "Sécurité", unit: "‰" },
  infrac_tx_traficstup: { label: "Trafics de stupéfiants", theme: "Sécurité", unit: "‰" },
  ElectionPres_T1_votants: { label: "Votants présidentielle 2022 (T1)", theme: "Démocratie", unit: "" },
  qualair_PM10: { label: "Qualité de l'air — PM10", theme: "Air", unit: "" },
  qualair_PM25: { label: "Qualité de l'air — PM2,5", theme: "Air", unit: "" },
  qualair_NO2: { label: "Qualité de l'air — NO₂", theme: "Air", unit: "" },
  qualair_O3: { label: "Qualité de l'air — O₃", theme: "Air", unit: "" },
  qualair_SO2: { label: "Qualité de l'air — SO₂", theme: "Air", unit: "" },
};
const ORDER = Object.keys(CATALOG);

export default function ItddSection({ level, code }: { level: "region" | "department" | "commune"; code: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [variable, setVariable] = useState("");
  const [sub, setSub] = useState("");

  useEffect(() => {
    let active = true;
    api.getItddIndicators(level, code).then(d => { if (active) setRows(d as Row[]); }).catch(() => setRows([]));
    return () => { active = false; };
  }, [level, code]);

  const variables = useMemo(() => {
    if (!rows) return [];
    const present = new Set(rows.map(r => r.variable));
    return ORDER.filter(v => present.has(v));
  }, [rows]);

  useEffect(() => { if (variables.length && !variables.includes(variable)) setVariable(variables[0]); }, [variables, variable]);

  const subFields = useMemo(() => {
    if (!rows || !variable) return [];
    return [...new Set(rows.filter(r => r.variable === variable).map(r => r.sub_field))];
  }, [rows, variable]);
  useEffect(() => { if (subFields.length && !subFields.includes(sub)) setSub(subFields[0]); }, [subFields, sub]);

  const series = useMemo(() => {
    if (!rows || !variable) return [];
    return rows.filter(r => r.variable === variable && r.sub_field === sub)
      .map(r => ({ year: r.year, value: Number(r.value) }))
      .sort((a, b) => a.year - b.year);
  }, [rows, variable, sub]);

  if (rows === null) return <p className="mt-3 text-sm text-slate-400">Chargement des indicateurs…</p>;
  if (variables.length === 0) return <p className="mt-3 text-sm text-slate-500">Aucun indicateur de développement durable disponible pour ce territoire.</p>;

  const unit = CATALOG[variable]?.unit || (rows.find(r => r.variable === variable)?.unit ?? "");
  const fmt = (v: number) =>
    (unit === "%" || unit === "‰" || unit === "ans")
      ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`
      : `${Math.round(v).toLocaleString("fr-FR")}${unit ? " " + unit : ""}`;

  // Regroupe le sélecteur par thème.
  const byTheme = new Map<string, string[]>();
  for (const v of variables) {
    const t = CATALOG[v].theme;
    if (!byTheme.has(t)) byTheme.set(t, []);
    byTheme.get(t)!.push(v);
  }

  const last = series[series.length - 1];

  // Graphique (si plusieurs points).
  let chart = null;
  if (series.length > 1) {
    const W = 600, H = 220, padL = 46, padR = 16, padT = 14, padB = 26;
    const vals = series.map(p => p.value);
    const y0 = Math.min(0, ...vals), y1 = Math.max(...vals), span = (y1 - y0) || 1;
    const x = (i: number) => padL + (W - padL - padR) * (i / (series.length - 1));
    const y = (v: number) => padT + (H - padT - padB) * (1 - (v - y0) / span);
    const line = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const area = `${line} L${x(series.length - 1).toFixed(1)},${y(y0).toFixed(1)} L${x(0).toFixed(1)},${y(y0).toFixed(1)} Z`;
    chart = (
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        <defs><linearGradient id="itddArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" /><stop offset="100%" stopColor="#16a34a" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map(t => { const v = y0 + span * t, yy = y(v); return (<g key={t}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e2e8f0" /><text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(v).toLocaleString("fr-FR")}</text></g>); })}
        <path d={area} fill="url(#itddArea)" />
        <path d={line} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((p, i) => (<g key={p.year}><circle cx={x(i)} cy={y(p.value)} r={i === series.length - 1 ? 4.5 : 2.5} fill={i === series.length - 1 ? "#dc2626" : "#16a34a"} />{(i % 2 === 0 || i === series.length - 1) && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.year}</text>}</g>))}
      </svg>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={variable} onChange={e => setVariable(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
          {[...byTheme.entries()].map(([theme, vars]) => (
            <optgroup key={theme} label={theme}>
              {vars.map(v => <option key={v} value={v}>{CATALOG[v].label}</option>)}
            </optgroup>
          ))}
        </select>
        {subFields.length > 1 && (
          <div className="inline-flex flex-wrap gap-1">
            {subFields.map(s => (
              <button key={s} onClick={() => setSub(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${sub === s ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {s || "total"}
              </button>
            ))}
          </div>
        )}
      </div>

      {last && (
        <div className="mt-4 flex items-end gap-3">
          <span className="text-4xl font-black text-slate-900">{fmt(last.value)}</span>
          <span className="mb-1 text-sm font-bold text-slate-400">en {last.year}</span>
        </div>
      )}

      {chart}
      <p className="mt-1 text-right text-[10px] text-slate-400">Source : Insee/SDES — Indicateurs territoriaux de développement durable</p>
    </div>
  );
}
