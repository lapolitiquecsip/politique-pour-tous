"use client";

import { useState } from "react";
import { departmentPaths } from "@/lib/data/departmentPaths";
import { RN_2024_BY_DEPT, RN_2024_NATIONAL, RN_2024_SOURCE, RN_2024_SOURCE_URL } from "@/lib/data/rnLegislatives2024";
import { MLP_2022_BY_DEPT, MLP_2022_NATIONAL, MLP_2022_SOURCE, MLP_2022_SOURCE_URL } from "@/lib/data/presidentielle2022MLP";
import { ExternalLink } from "lucide-react";

type Band = { min: number; color: string; label: string };
type MapData = {
  key: string; tab: string; subtitle: string; national: number;
  data: Record<string, number>; source: string; sourceUrl: string; scale: Band[];
};

// Deux jeux : une seule carte, un sélecteur → page épurée.
const LEG_SCALE: Band[] = [
  { min: 45, color: "#7f1d1d", label: "≥ 45 %" }, { min: 40, color: "#b91c1c", label: "40–45 %" },
  { min: 35, color: "#dc2626", label: "35–40 %" }, { min: 30, color: "#ef4444", label: "30–35 %" },
  { min: 25, color: "#f87171", label: "25–30 %" }, { min: 0, color: "#fecaca", label: "< 25 %" },
];
const PRES_SCALE: Band[] = [
  { min: 55, color: "#7f1d1d", label: "≥ 55 %" }, { min: 50, color: "#b91c1c", label: "50–55 %" },
  { min: 45, color: "#dc2626", label: "45–50 %" }, { min: 40, color: "#ef4444", label: "40–45 %" },
  { min: 30, color: "#f87171", label: "30–40 %" }, { min: 0, color: "#fecaca", label: "< 30 %" },
];

const MAPS: MapData[] = [
  { key: "leg", tab: "Législatives 2024", subtitle: "Part des voix du RN et de ses alliés par département — 1er tour des législatives 2024", national: RN_2024_NATIONAL, data: RN_2024_BY_DEPT, source: RN_2024_SOURCE, sourceUrl: RN_2024_SOURCE_URL, scale: LEG_SCALE },
  { key: "pres", tab: "Présidentielle 2022", subtitle: "Score de Marine Le Pen par département — 2nd tour de la présidentielle 2022", national: MLP_2022_NATIONAL, data: MLP_2022_BY_DEPT, source: MLP_2022_SOURCE, sourceUrl: MLP_2022_SOURCE_URL, scale: PRES_SCALE },
];

const colorFor = (scale: Band[], v: number) => (scale.find(s => v >= s.min) || scale[scale.length - 1]).color;

function globalViewBox(data: Record<string, number>): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const code of Object.keys(data)) {
    const p = departmentPaths[code]; if (!p) continue;
    const [x, y, w, h] = p.viewBox.split(/\s+/).map(Number);
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w; if (y + h > maxY) maxY = y + h;
  }
  const pad = 6;
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
}

export default function FranceRnMap() {
  const [tab, setTab] = useState<"leg" | "pres">("leg");
  const [hover, setHover] = useState<{ code: string; v: number } | null>(null);
  const m = MAPS.find(x => x.key === tab)!;
  const vb = globalViewBox(m.data);
  const metro = Object.keys(m.data).filter(c => departmentPaths[c]);
  const top = Object.entries(m.data).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Où le RN a fait ses meilleurs scores</h2>
        {/* Sélecteur d'élection */}
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
          {MAPS.map(x => (
            <button key={x.key} onClick={() => { setTab(x.key as any); setHover(null); }}
              className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest transition ${tab === x.key ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {x.tab}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">{m.subtitle} (national : {m.national.toLocaleString("fr-FR")} %).</p>

      <div className="mt-4 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div className="relative">
          <svg viewBox={vb} className="h-auto w-full" role="img" aria-label="Carte des scores par département">
            {metro.map(code => {
              const v = m.data[code];
              return (
                <path key={code} d={departmentPaths[code].d} fill={colorFor(m.scale, v)} stroke="#ffffff" strokeWidth={0.5}
                  className="cursor-pointer transition-[fill,opacity] hover:opacity-80"
                  onMouseEnter={() => setHover({ code, v })} onMouseLeave={() => setHover(null)}>
                  <title>{`Département ${code} — ${v.toLocaleString("fr-FR")} %`}</title>
                </path>
              );
            })}
          </svg>
          {hover && (
            <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black text-white shadow-lg">
              Dép. {hover.code} · <span className="text-rose-300">{hover.v.toLocaleString("fr-FR")} %</span>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Part des voix</p>
          <div className="flex flex-col gap-1.5">
            {m.scale.map(s => (
              <div key={s.min} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3.5 w-6 rounded" style={{ background: s.color }} /> {s.label}
              </div>
            ))}
          </div>
          <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Départements en tête</p>
          <ol className="space-y-1.5">
            {top.map(([code, v], i) => (
              <li key={code} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-right font-black tabular-nums text-slate-400">{i + 1}</span>
                <span className="h-3 w-3 rounded-full" style={{ background: colorFor(m.scale, v) }} />
                <span className="font-bold text-slate-800">Dép. {code}</span>
                <span className="ml-auto font-black tabular-nums text-rose-700">{v.toLocaleString("fr-FR")} %</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-start gap-1.5 text-[11px] leading-snug text-slate-400 hover:text-rose-600">
        <ExternalLink size={11} className="mt-0.5 shrink-0" /> {m.source}
      </a>
    </div>
  );
}
