"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { ExternalLink, Plus } from "lucide-react";
import { CAMPAIGN_THEMES, type CampaignTheme } from "@/lib/data/campaignThemes";

// Onglet « Enjeux » : les grands thèmes de campagne, chacun avec des chiffres 100 % réels et
// sourcés (situation actuelle + évolution + perspective). Style éditorial aligné sur le site.
function ThemeIcon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as any)[name] || Icons.Circle;
  return <C className={className} />;
}

// Mini-graphe d'évolution (sparkline) : aire + ligne, avec 1ère et dernière valeurs annotées.
function Sparkline({ history, unit, betterWhen, accent }: {
  history: { year: number; value: number }[]; unit?: string; betterWhen?: "down" | "up"; accent: string;
}) {
  if (!history || history.length < 2) return null;
  const W = 132, H = 40, P = 5;
  const vals = history.map(h => h.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (history.length - 1);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const pts = history.map((h, i) => `${x(i)},${y(h.value)}`);
  const line = pts.join(" ");
  const area = `${x(0)},${H - P} ${line} ${x(history.length - 1)},${H - P}`;
  const first = history[0], last = history[history.length - 1];
  const rising = last.value >= first.value;
  const trendColor = !betterWhen ? "#94a3b8" : ((betterWhen === "down") === !rising) ? "#34d399" : "#fb7185";
  const gid = `sg-${accent.replace("#", "")}-${first.year}-${last.year}`;
  const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return (
    <div className="flex items-center gap-3">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline points={line} fill="none" stroke={accent} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        {history.map((h, i) => <circle key={h.year} cx={x(i)} cy={y(h.value)} r={i === history.length - 1 ? 3 : 1.6} fill={i === history.length - 1 ? trendColor : accent} />)}
      </svg>
      <div className="text-[11px] leading-tight text-slate-400">
        <div className="tabular-nums">{first.year} · {fmt(first.value)}</div>
        <div className="tabular-nums font-black" style={{ color: trendColor }}>{last.year} · {fmt(last.value)}{unit ? ` ${unit}` : ""}</div>
      </div>
    </div>
  );
}

function ThemeCard({ theme, index }: { theme: CampaignTheme; index: number }) {
  const [open, setOpen] = useState(false);
  const head = theme.stats[0];
  const num = String(index + 1).padStart(2, "0");
  return (
    <div
      className="group relative overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-sm transition-all hover:shadow-md"
      style={{
        // Fond teinté de la couleur du thème (dégradé doux, différent pour chaque ligne), sur blanc.
        background: `linear-gradient(120deg, ${theme.accent}22 0%, ${theme.accent}0d 40%, #ffffff 100%)`,
        boxShadow: open ? `inset 4px 0 0 ${theme.accent}` : `inset 4px 0 0 ${theme.accent}aa`,
      }}
    >
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-5 px-6 py-5 text-left sm:px-8">
        {/* Numéro d'ordre, ton éditorial */}
        <span className="hidden shrink-0 font-staatliches text-4xl leading-none text-slate-900/10 sm:block">{num}</span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1" style={{ backgroundColor: `${theme.accent}1f`, color: theme.accent, boxShadow: `inset 0 0 0 1px ${theme.accent}40` }}>
          <ThemeIcon name={theme.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-staatliches text-2xl uppercase leading-none tracking-wide text-slate-900 md:text-3xl">{theme.title}</h3>
          <p className="mt-1.5 text-sm text-slate-500">{theme.summary}</p>
        </div>
        {/* Chiffre phare, aligné à droite */}
        {head && (
          <div className="hidden shrink-0 text-right md:block">
            <div className="font-staatliches text-3xl leading-none tabular-nums" style={{ color: theme.accent }}>{head.value}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{head.label} · {head.year}</div>
          </div>
        )}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 ring-1 ring-slate-200 text-slate-400 transition-all group-hover:ring-slate-300" style={{ transform: open ? "rotate(45deg)" : "none" }}>
          <Plus className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div className="bg-white/60 px-6 pb-7 sm:px-8 sm:pl-24">
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {theme.stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-staatliches text-3xl leading-none tabular-nums text-slate-900">{s.value}</span>
                    <span className="text-sm font-bold text-slate-600">{s.label}</span>
                  </div>
                  {s.sub && <p className="mt-1 text-xs leading-snug text-slate-500">{s.sub}</p>}
                  <a
                    href={s.url} target="_blank" rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
                  >
                    {s.year} · {s.source} {s.url && <ExternalLink className="h-2.5 w-2.5" />}
                  </a>
                </div>
                {s.history && <div className="shrink-0"><Sparkline history={s.history} unit={s.unit} betterWhen={s.betterWhen} accent={theme.accent} /></div>}
              </div>
            ))}
          </div>
          {theme.perspective && (
            <div className="mt-5 flex gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <span className="mt-0.5 font-staatliches text-lg uppercase tracking-widest" style={{ color: theme.accent }}>À venir</span>
              <p className="text-sm leading-relaxed text-slate-600">{theme.perspective}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThemesView() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <div className="mb-8 text-center">
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-500">
          Les grands enjeux de la campagne, éclairés par des <span className="font-bold text-slate-800">données strictement officielles</span> — INSEE, RTE, COR, SSMSI, ministères, Commission européenne. Chaque chiffre est daté et sourcé. Dépliez un thème pour l'évolution et les sources.
        </p>
        <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>
      <div className="space-y-3">
        {CAMPAIGN_THEMES.map((t, i) => <ThemeCard key={t.slug} theme={t} index={i} />)}
      </div>
    </div>
  );
}
