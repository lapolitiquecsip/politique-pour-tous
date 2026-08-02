"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { ExternalLink, ChevronDown } from "lucide-react";
import { CAMPAIGN_THEMES, type CampaignTheme } from "@/lib/data/campaignThemes";

// Onglet « Enjeux » de la présidentielle : les grands thèmes de campagne, chacun avec
// des chiffres 100 % réels et sourcés (situation actuelle + perspective). Cartes cliquables
// façon tableau de bord, dans le même esprit que la page candidats.
function ThemeIcon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as any)[name] || Icons.Circle;
  return <C className={className} />;
}

function ThemeCard({ theme }: { theme: CampaignTheme }) {
  const [open, setOpen] = useState(false);
  const head = theme.stats[0];
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition-all hover:border-white/20"
      style={{ boxShadow: open ? `inset 0 0 0 1px ${theme.accent}33` : undefined }}
    >
      <button onClick={() => setOpen(o => !o)} className="flex items-start gap-4 p-6 text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${theme.accent}22`, color: theme.accent }}>
          <ThemeIcon name={theme.icon} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-staatliches text-2xl uppercase leading-none tracking-wide text-white">{theme.title}</h3>
          <p className="mt-1.5 text-sm text-white/50">{theme.summary}</p>
          {/* Chiffre phare toujours visible */}
          {head && (
            <p className="mt-3 text-sm text-white/70">
              <span className="text-2xl font-black tabular-nums" style={{ color: theme.accent }}>{head.value}</span>
              <span className="ml-2 text-white/50">· {head.label} <span className="text-white/30">({head.year})</span></span>
            </p>
          )}
        </div>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-white/5 p-6 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {theme.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.03] p-4">
                <p className="text-2xl font-black tabular-nums text-white">{s.value}</p>
                <p className="mt-0.5 text-sm font-bold text-white/80">{s.label}</p>
                {s.sub && <p className="mt-1 text-xs leading-snug text-white/50">{s.sub}</p>}
                <p className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30">
                  {s.year} · {s.source}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-white/60" style={{ color: theme.accent }}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
              </div>
            ))}
          </div>
          {theme.perspective && (
            <div className="mt-4 rounded-2xl border-l-2 p-4" style={{ borderColor: theme.accent, backgroundColor: `${theme.accent}10` }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.accent }}>Perspective</p>
              <p className="mt-1 text-sm text-white/70">{theme.perspective}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThemesView() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
        <p className="text-sm text-white/60">
          Les grands enjeux de la campagne, éclairés par des <span className="font-bold text-white">données 100 % officielles et sourcées</span> (INSEE, RTE, COR, ministères, Commission européenne). Cliquez sur un thème pour le détail et les sources.
        </p>
      </div>
      <div className="grid gap-4">
        {CAMPAIGN_THEMES.map((t) => <ThemeCard key={t.slug} theme={t} />)}
      </div>
    </div>
  );
}
