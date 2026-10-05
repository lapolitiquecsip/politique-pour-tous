"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Courbes à plusieurs séries, tracées à la main en SVG : axes, quadrillage, points
 * bruts en transparence, étiquettes de fin de courbe qui ne se chevauchent pas, et
 * lecture au survol (ou au doigt) de toutes les valeurs à une date.
 */

export type Serie = {
  id: string; label: string; couleur: string;
  points: { x: number; y: number }[];
  bruts?: { x: number; y: number }[];
};

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Catmull-Rom → courbes de Bézier : un tracé lissé qui passe par chaque point. */
function chemin(p: { x: number; y: number }[]) {
  if (p.length < 2) return "";
  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    const c1x = b.x + (c.x - a.x) / 6, c1y = b.y + (c.y - a.y) / 6;
    const c2x = c.x - (e.x - b.x) / 6, c2y = c.y - (e.y - b.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }
  return d;
}

export default function CourbeMulti({
  series, debut, fin, hauteur = 320, unite = " %", decimales = 1, yMin = 0, focus, onFocus, pasJour = false,
}: {
  series: Serie[]; debut: number; fin: number; hauteur?: number; unite?: string; decimales?: number; yMin?: number;
  focus?: string | null; onFocus?: (id: string | null) => void; pasJour?: boolean;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(760);
  const [survol, setSurvol] = useState<number | null>(null);

  useEffect(() => {
    const el = boite.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargeur(Math.max(300, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const etroit = largeur < 560;
  const M = { g: 34, d: etroit ? 70 : 128, h: 14, b: 28 };
  const L = largeur - M.g - M.d, H = hauteur - M.h - M.b;

  const yMax = useMemo(() => {
    const m = Math.max(5, ...series.flatMap(s => [...s.points, ...(s.bruts || [])].map(p => p.y)));
    const pas = m > 60 ? 20 : m > 30 ? 10 : 5;
    return Math.ceil((m + 1) / pas) * pas;
  }, [series]);
  const pasY = yMax > 60 ? 20 : yMax > 30 ? 10 : 5;
  const X = (x: number) => M.g + ((x - debut) / Math.max(1, fin - debut)) * L;
  const Y = (y: number) => M.h + H - ((y - yMin) / Math.max(1, yMax - yMin)) * H;

  // Graduations : un repère par mois (ou par semaine sur une courte période).
  const ticks = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    const d = new Date(debut);
    if (pasJour) {
      for (let x = debut; x <= fin; x += 86400000 * Math.max(1, Math.round((fin - debut) / 86400000 / 6))) {
        const j = new Date(x); out.push({ x, label: `${j.getDate()} ${MOIS[j.getMonth()]}` });
      }
      return out;
    }
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const total = (fin - debut) / (30 * 86400000);
    const saut = total > 14 ? 3 : total > 7 ? 2 : 1;
    for (let i = 0; m.getTime() <= fin; i++, m.setUTCMonth(m.getUTCMonth() + 1)) {
      if (i % saut) continue;
      out.push({ x: m.getTime(), label: m.getUTCMonth() === 0 ? String(m.getUTCFullYear()) : MOIS[m.getUTCMonth()] });
    }
    return out;
  }, [debut, fin, pasJour]);

  // Étiquettes de fin : écartées d'au moins 15 px, dans l'ordre des courbes.
  const etiquettes = useMemo(() => {
    const e = series.filter(s => s.points.length).map(s => {
      const p = s.points[s.points.length - 1];
      return { s, y0: Y(p.y), y: Y(p.y), v: p.y };
    }).sort((a, b) => a.y0 - b.y0);
    const ecart = 15;
    for (let i = 1; i < e.length; i++) if (e[i].y - e[i - 1].y < ecart) e[i].y = e[i - 1].y + ecart;
    const bas = M.h + H;
    for (let i = e.length - 1; i >= 0; i--) {
      if (e[i].y > bas) e[i].y = bas;
      if (i < e.length - 1 && e[i + 1].y - e[i].y < ecart) e[i].y = e[i + 1].y - ecart;
    }
    return e;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, largeur, yMax]);

  const lecture = useMemo(() => {
    if (survol == null) return null;
    const vals = series.map(s => {
      let best: { x: number; y: number } | null = null, dist = Infinity;
      for (const p of s.points) { const d = Math.abs(p.x - survol); if (d < dist) { dist = d; best = p; } }
      return best && dist < 6 * 86400000 ? { s, v: best.y, x: best.x } : null;
    }).filter(Boolean) as { s: Serie; v: number; x: number }[];
    return vals.sort((a, b) => b.v - a.v);
  }, [survol, series]);

  const deplacer = (clientX: number) => {
    const r = boite.current?.getBoundingClientRect(); if (!r) return;
    const px = clientX - r.left;
    if (px < M.g || px > M.g + L) { setSurvol(null); return; }
    setSurvol(debut + ((px - M.g) / L) * (fin - debut));
  };

  const fmt = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: decimales })}${unite}`;
  const xSurvol = survol != null ? X(survol) : null;

  return (
    <div ref={boite} className="relative w-full select-none touch-pan-y"
      onMouseMove={e => deplacer(e.clientX)} onMouseLeave={() => setSurvol(null)}
      onTouchStart={e => deplacer(e.touches[0].clientX)} onTouchMove={e => deplacer(e.touches[0].clientX)} onTouchEnd={() => setSurvol(null)}>
      <svg width={largeur} height={hauteur} className="block overflow-visible" role="img" aria-label="Évolution dans le temps">
        {/* Quadrillage horizontal */}
        {Array.from({ length: Math.floor((yMax - yMin) / pasY) + 1 }, (_, i) => yMin + i * pasY).map(v => (
          <g key={v}>
            <line x1={M.g} x2={M.g + L} y1={Y(v)} y2={Y(v)} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray={v === yMin ? undefined : "3 4"} />
            <text x={M.g - 8} y={Y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[10px] font-bold tabular-nums">{v}</text>
          </g>
        ))}
        {ticks.map(tk => (
          <text key={tk.x} x={X(tk.x)} y={hauteur - 8} textAnchor="middle" className="fill-muted-foreground text-[10px] font-bold uppercase">{tk.label}</text>
        ))}

        {/* Points bruts (chaque sondage), puis les courbes lissées */}
        {series.map(s => (s.bruts || []).map((p, i) => (
          <circle key={`${s.id}b${i}`} cx={X(p.x)} cy={Y(p.y)} r={2.4} fill={s.couleur}
            opacity={focus && focus !== s.id ? 0.06 : 0.28} />
        )))}
        {series.map(s => (
          <path key={s.id} d={chemin(s.points.map(p => ({ x: X(p.x), y: Y(p.y) })))} fill="none" stroke={s.couleur}
            strokeWidth={focus === s.id ? 3.6 : 2.6} strokeLinecap="round" strokeLinejoin="round"
            opacity={focus && focus !== s.id ? 0.15 : 1} className="transition-opacity" />
        ))}

        {/* Étiquettes de fin de courbe */}
        {etiquettes.map(e => {
          const p = e.s.points[e.s.points.length - 1];
          return (
            <g key={e.s.id} opacity={focus && focus !== e.s.id ? 0.25 : 1} className="cursor-pointer"
              onMouseEnter={() => onFocus?.(e.s.id)} onMouseLeave={() => onFocus?.(null)}>
              <circle cx={X(p.x)} cy={e.y0} r={3.6} fill={e.s.couleur} className="stroke-white dark:stroke-slate-950" strokeWidth={1.5} />
              <line x1={X(p.x) + 4} x2={M.g + L + 8} y1={e.y0} y2={e.y} stroke={e.s.couleur} strokeWidth={1} opacity={0.5} />
              <text x={M.g + L + 11} y={e.y + 4} className="fill-foreground text-[11px] font-black">
                <tspan fill={e.s.couleur}>●</tspan> {etroit ? fmt(e.v) : <>{e.s.label} <tspan className="fill-muted-foreground font-bold">{fmt(e.v)}</tspan></>}
              </text>
            </g>
          );
        })}

        {/* Lecture au survol */}
        {xSurvol != null && (
          <g pointerEvents="none">
            <line x1={xSurvol} x2={xSurvol} y1={M.h} y2={M.h + H} className="stroke-slate-400 dark:stroke-slate-500" strokeDasharray="2 3" />
            {lecture?.map(l => <circle key={l.s.id} cx={X(l.x)} cy={Y(l.v)} r={4} fill={l.s.couleur} className="stroke-white dark:stroke-slate-950" strokeWidth={1.5} />)}
          </g>
        )}
      </svg>

      {xSurvol != null && lecture && lecture.length > 0 && (
        <div className="pointer-events-none absolute top-2 z-10 w-48 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur"
          style={{ left: Math.min(Math.max(8, xSurvol + 14), largeur - 200) }}>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {new Date(survol!).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {lecture.slice(0, 10).map(l => (
            <p key={l.s.id} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.s.couleur }} />
              <span className="min-w-0 flex-1 truncate font-bold text-foreground">{l.s.label}</span>
              <span className="font-black tabular-nums text-foreground">{fmt(l.v)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
