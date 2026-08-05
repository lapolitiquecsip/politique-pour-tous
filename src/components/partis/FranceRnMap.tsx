"use client";

import { useState } from "react";
import { departmentPaths } from "@/lib/data/departmentPaths";
import { RN_2024_BY_DEPT, RN_2024_NATIONAL, RN_2024_SOURCE, RN_2024_SOURCE_URL } from "@/lib/data/rnLegislatives2024";
import { ExternalLink } from "lucide-react";

// Échelle de rouge par tranche de score (plus c'est foncé, plus le RN est haut).
const SCALE: { min: number; color: string; label: string }[] = [
  { min: 45, color: "#7f1d1d", label: "≥ 45 %" },
  { min: 40, color: "#b91c1c", label: "40–45 %" },
  { min: 35, color: "#dc2626", label: "35–40 %" },
  { min: 30, color: "#ef4444", label: "30–35 %" },
  { min: 25, color: "#f87171", label: "25–30 %" },
  { min: 0, color: "#fecaca", label: "< 25 %" },
];
const colorFor = (v: number) => (SCALE.find(s => v >= s.min) || SCALE[SCALE.length - 1]).color;

// viewBox global = union des viewBox de tous les départements métropolitains (repère partagé).
function globalViewBox(): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const code of Object.keys(RN_2024_BY_DEPT)) {
    const p = departmentPaths[code]; if (!p) continue;
    const [x, y, w, h] = p.viewBox.split(/\s+/).map(Number);
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w; if (y + h > maxY) maxY = y + h;
  }
  const pad = 6;
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
}

const DEPT_NAME: Record<string, string> = {}; // (optionnel) noms par code — le survol affiche code + %

export default function FranceRnMap() {
  const [hover, setHover] = useState<{ code: string; v: number } | null>(null);
  const vb = globalViewBox();
  // Métropole (les DOM sont listés à part car hors du repère métropolitain).
  const metro = Object.keys(RN_2024_BY_DEPT).filter(c => departmentPaths[c]);
  const top = Object.entries(RN_2024_BY_DEPT).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Où le RN a fait ses meilleurs scores</h2>
      <p className="mt-0.5 text-sm text-slate-500">Part des voix du RN et de ses alliés par département — 1er tour des législatives 2024 (national : {RN_2024_NATIONAL.toLocaleString("fr-FR")} %).</p>

      <div className="mt-4 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div className="relative">
          <svg viewBox={vb} className="h-auto w-full" role="img" aria-label="Carte des scores du RN par département">
            {metro.map(code => {
              const v = RN_2024_BY_DEPT[code];
              return (
                <path
                  key={code}
                  d={departmentPaths[code].d}
                  fill={colorFor(v)}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  className="cursor-pointer transition-[fill,opacity] hover:opacity-80"
                  onMouseEnter={() => setHover({ code, v })}
                  onMouseLeave={() => setHover(null)}
                >
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
          {/* Légende */}
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Part des voix RN</p>
          <div className="flex flex-col gap-1.5">
            {SCALE.map(s => (
              <div key={s.min} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3.5 w-6 rounded" style={{ background: s.color }} /> {s.label}
              </div>
            ))}
          </div>
          {/* Top départements */}
          <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Départements les plus RN</p>
          <ol className="space-y-1.5">
            {top.map(([code, v], i) => (
              <li key={code} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-right font-black tabular-nums text-slate-400">{i + 1}</span>
                <span className="h-3 w-3 rounded-full" style={{ background: colorFor(v) }} />
                <span className="font-bold text-slate-800">Dép. {code}</span>
                <span className="ml-auto font-black tabular-nums text-rose-700">{v.toLocaleString("fr-FR")} %</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <a href={RN_2024_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-start gap-1.5 text-[11px] leading-snug text-slate-400 hover:text-rose-600">
        <ExternalLink size={11} className="mt-0.5 shrink-0" /> {RN_2024_SOURCE}
      </a>
    </div>
  );
}
