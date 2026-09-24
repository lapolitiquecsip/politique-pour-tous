"use client";

import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { ExternalLink, Plus } from "lucide-react";
import { CAMPAIGN_THEMES, type CampaignTheme, type ThemeStat } from "@/lib/data/campaignThemes";
import { api } from "@/lib/api";

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
        <span className="hidden shrink-0 font-staatliches text-4xl leading-none text-foreground/10 sm:block">{num}</span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1" style={{ backgroundColor: `${theme.accent}1f`, color: theme.accent, boxShadow: `inset 0 0 0 1px ${theme.accent}40` }}>
          <ThemeIcon name={theme.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-staatliches text-2xl uppercase leading-none tracking-wide text-foreground md:text-3xl">{theme.title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{theme.summary}</p>
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
          <div className="divide-y divide-slate-200 border-t border-border">
            {theme.stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-staatliches text-3xl leading-none tabular-nums text-foreground">{s.value}</span>
                    <span className="text-sm font-bold text-muted-foreground">{s.label}</span>
                  </div>
                  {s.sub && <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.sub}</p>}
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
            <div className="mt-5 flex gap-3 rounded-xl bg-muted p-4 ring-1 ring-slate-100">
              <span className="mt-0.5 font-staatliches text-lg uppercase tracking-widest" style={{ color: theme.accent }}>À venir</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{theme.perspective}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Une ligne de la table `indicators`, telle que la renvoie l'API. */
type LiveIndicator = {
  code: string; theme: string; label: string; sub: string | null;
  value: number; unit: string | null; period_label: string | null;
  history: { period: string; value: number }[] | null;
  source: string; source_url: string | null; published_at: string | null;
  better_when: "up" | "down" | null; sort_order: number;
};

/** « 2026-Q2 » → 2026 : la courbe existante raisonne en années. */
const yearOf = (period: string) => Number(String(period).slice(0, 4));

/**
 * Convertit un indicateur vivant au format attendu par les cartes existantes.
 * On garde exactement la même forme que les chiffres écrits à la main, si bien que le
 * rendu n'a pas à savoir d'où vient la donnée.
 */
function toStat(i: LiveIndicator): ThemeStat {
  const unit = i.unit ?? "";
  const fmt = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`.trim();
  // La courbe attend un point par année : on garde la dernière valeur de chaque année.
  const byYear = new Map<number, number>();
  for (const h of i.history ?? []) byYear.set(yearOf(h.period), h.value);
  return {
    label: i.label,
    value: fmt(i.value),
    sub: i.sub ?? undefined,
    year: i.period_label ?? "",
    source: i.source,
    url: i.source_url ?? undefined,
    unit,
    betterWhen: i.better_when ?? undefined,
    history: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, value]) => ({ year, value })),
  };
}

export default function ThemesView() {
  const [live, setLive] = useState<LiveIndicator[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getIndicators()
      .then(rows => { if (active) setLive(rows as LiveIndicator[]); })
      .catch(() => { if (active) setLive([]); });
    return () => { active = false; };
  }, []);

  /**
   * Les indicateurs relevés automatiquement REMPLACENT ceux écrits à la main, thème par
   * thème. Un thème sans indicateur en base garde ses chiffres d'origine : la bascule se
   * fait donc thème par thème, à mesure qu'on en automatise, sans jamais vider une carte.
   */
  const themes = useMemo(() => {
    if (!live?.length) return CAMPAIGN_THEMES;
    const byTheme = new Map<string, LiveIndicator[]>();
    for (const i of live) byTheme.set(i.theme, [...(byTheme.get(i.theme) ?? []), i]);
    return CAMPAIGN_THEMES.map(t => {
      const rows = byTheme.get(t.slug);
      if (!rows?.length) return t;
      return { ...t, stats: rows.sort((a, b) => a.sort_order - b.sort_order).map(toStat) };
    });
  }, [live]);

  // Date de publication la plus récente parmi les sources : preuve de fraîcheur.
  const freshest = useMemo(() => {
    const dates = (live ?? []).map(i => i.published_at).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }, [live]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <div className="mb-8 text-center">
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Les grands enjeux de la campagne, éclairés par des <span className="font-bold text-foreground">données strictement officielles</span> — INSEE, RTE, COR, SSMSI, ministères, Commission européenne. Chaque chiffre est daté et sourcé. Dépliez un thème pour l&apos;évolution et les sources.
        </p>
        {freshest && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Dernière publication officielle reprise : {new Date(freshest).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>
      <div className="space-y-3">
        {themes.map((t, i) => <ThemeCard key={t.slug} theme={t} index={i} />)}
      </div>
    </div>
  );
}
