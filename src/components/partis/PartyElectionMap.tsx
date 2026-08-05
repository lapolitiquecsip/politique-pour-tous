"use client";

import { useMemo, useState } from "react";
import { departmentPaths } from "@/lib/data/departmentPaths";
import { DEPARTMENTS } from "@/lib/data/territories";
import maps from "@/lib/data/partyElectionMaps.json";
import { ExternalLink } from "lucide-react";

type Serie = { national: number; dept: Record<string, number> };
type PartyMaps = Partial<Record<"leg" | "euro" | "pres", Serie>>;

// Ordre d'affichage + libellés + sources OFFICIELLES par élection.
const ELECTIONS: { key: "leg" | "euro" | "pres"; tab: string; subtitle: (n: number) => string; source: string; url: string }[] = [
  { key: "leg", tab: "Législatives 2024", subtitle: n => `Score par département — 1er tour des législatives 2024 (national : ${n.toLocaleString("fr-FR")} %)`, source: "Ministère de l'Intérieur — 1er tour des législatives 2024 (data.gouv.fr).", url: "https://www.data.gouv.fr/datasets/elections-legislatives-des-30-juin-et-7-juillet-2024-resultats-definitifs-du-1er-tour" },
  { key: "euro", tab: "Européennes 2024", subtitle: n => `Score de la liste par département — élections européennes 2024 (national : ${n.toLocaleString("fr-FR")} %)`, source: "Ministère de l'Intérieur — résultats définitifs des européennes 2024 (data.gouv.fr).", url: "https://www.data.gouv.fr/datasets/resultats-des-elections-europeennes-du-9-juin-2024" },
  { key: "pres", tab: "Présidentielle 2022", subtitle: n => `Score du candidat par département — 1er tour de la présidentielle 2022 (national : ${n.toLocaleString("fr-FR")} %)`, source: "Ministère de l'Intérieur — 1er tour de la présidentielle 2022 (data.gouv.fr).", url: "https://www.data.gouv.fr/datasets/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour" },
];

const DEPT_NAME: Record<string, string> = Object.fromEntries((DEPARTMENTS as any[]).map(d => [d.id, d.name]));
const deptLabel = (c: string) => DEPT_NAME[c] || `Dép. ${c}`;

function hexRgba(hex: string, a: number) {
  const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
const OPAS = [0.18, 0.34, 0.5, 0.66, 0.82, 1];

export default function PartyElectionMap({ slug, color, name }: { slug: string; color: string; name: string }) {
  const pm = (maps as Record<string, PartyMaps>)[slug] || {};
  const available = ELECTIONS.filter(e => pm[e.key]?.dept && Object.keys(pm[e.key]!.dept).length > 5);
  const [tabKey, setTabKey] = useState<"leg" | "euro" | "pres">(available[0]?.key || "leg");
  const [hover, setHover] = useState<{ code: string; v: number } | null>(null);

  const el = available.find(e => e.key === tabKey) || available[0];
  const serie = el ? pm[el.key]! : null;

  // Bandes de couleur (6) calculées sur l'étendue des scores, en teintes du parti.
  const bands = useMemo(() => {
    if (!serie) return [];
    const vals = Object.values(serie.dept);
    const min = Math.floor(Math.min(...vals)), max = Math.ceil(Math.max(...vals));
    const step = Math.max(1, (max - min) / 6);
    return OPAS.map((op, i) => {
      const lo = Math.round(min + step * i), hi = i === 5 ? max : Math.round(min + step * (i + 1));
      return { min: lo, max: hi, color: hexRgba(color, op), label: i === 5 ? `≥ ${lo} %` : `${lo}–${hi} %` };
    }).reverse();
  }, [serie, color]);
  const colorFor = (v: number) => (bands.find(b => v >= b.min) || bands[bands.length - 1])?.color || hexRgba(color, 0.3);

  const vb = useMemo(() => {
    if (!serie) return "0 0 100 100";
    let a = Infinity, b = Infinity, X = -Infinity, Y = -Infinity;
    for (const code of Object.keys(serie.dept)) { const p = departmentPaths[code]; if (!p) continue; const [x, y, w, h] = p.viewBox.split(/\s+/).map(Number); a = Math.min(a, x); b = Math.min(b, y); X = Math.max(X, x + w); Y = Math.max(Y, y + h); }
    return `${a - 6} ${b - 6} ${X - a + 12} ${Y - b + 12}`;
  }, [serie]);

  if (!el || !serie) return null;
  const metro = Object.keys(serie.dept).filter(c => departmentPaths[c]);
  const top = Object.entries(serie.dept).sort((x, y) => y[1] - x[1]).slice(0, 5);

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Ses meilleurs scores par département</h2>
        {available.length > 1 && (
          <div className="inline-flex flex-wrap rounded-full border border-slate-200 bg-slate-50 p-1">
            {available.map(e => (
              <button key={e.key} onClick={() => { setTabKey(e.key); setHover(null); }}
                style={tabKey === e.key ? { background: color } : undefined}
                className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest transition ${tabKey === e.key ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {e.tab}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">{el.subtitle(serie.national)}.</p>

      <div className="mt-4 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div className="relative">
          <svg viewBox={vb} className="h-auto w-full" role="img" aria-label={`Carte des scores de ${name} par département`}>
            {metro.map(code => {
              const v = serie.dept[code];
              return (
                <path key={code} d={departmentPaths[code].d} fill={colorFor(v)} stroke="#ffffff" strokeWidth={0.5}
                  className="cursor-pointer transition-[fill,opacity] hover:opacity-80"
                  onMouseEnter={() => setHover({ code, v })} onMouseLeave={() => setHover(null)}>
                  <title>{`${deptLabel(code)} — ${v.toLocaleString("fr-FR")} %`}</title>
                </path>
              );
            })}
          </svg>
          {hover && (
            <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black text-white shadow-lg">
              {deptLabel(hover.code)} · <span style={{ color }}>{hover.v.toLocaleString("fr-FR")} %</span>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Part des voix</p>
          <div className="flex flex-col gap-1.5">
            {bands.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3.5 w-6 rounded ring-1 ring-black/5" style={{ background: s.color }} /> {s.label}
              </div>
            ))}
          </div>
          <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Départements en tête</p>
          <ol className="space-y-1.5">
            {top.map(([code, v], i) => (
              <li key={code} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-right font-black tabular-nums text-slate-400">{i + 1}</span>
                <span className="h-3 w-3 rounded-full" style={{ background: colorFor(v) }} />
                <span className="font-bold text-slate-800">{deptLabel(code)}</span>
                <span className="ml-auto font-black tabular-nums" style={{ color }}>{v.toLocaleString("fr-FR")} %</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <a href={el.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-start gap-1.5 text-[11px] leading-snug text-slate-400 hover:text-slate-700">
        <ExternalLink size={11} className="mt-0.5 shrink-0" /> {el.source}
      </a>
    </div>
  );
}
