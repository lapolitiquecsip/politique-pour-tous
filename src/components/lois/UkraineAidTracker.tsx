"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, Shield, Landmark, HeartPulse, Info } from "lucide-react";
import aid from "@/lib/data/ukraine-aid.json";

// Aide de la France à l'Ukraine, comparée aux autres donateurs. Chiffres 100 % issus du
// Ukraine Support Tracker de l'Institut de Kiel (LA référence mondiale, seule à consolider
// l'aide par pays et par type). Mise à jour automatique à chaque publication de l'Institut
// (voir scripts/update-ukraine-aid.py + le workflow dédié). Le détail « à quoi ça sert » est
// curé à partir de sources officielles (Ministère des Armées).

const TYPES = [
  { key: "military", label: "Militaire", color: "#4ea1ff", Icon: Shield },
  { key: "financial", label: "Financier", color: "#f5c518", Icon: Landmark },
  { key: "humanitarian", label: "Humanitaire", color: "#34d399", Icon: HeartPulse },
] as const;

const md = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// « À quoi ont servi les milliards français » — curé, sourcé (Ministère des Armées / AFT / Kiel).
const FRANCE_USAGE = [
  {
    key: "military", amount: aid.france.military,
    items: [
      "Canons CAESAR de 155 mm et obus d'artillerie",
      "Défense sol-air : systèmes SAMP/T (avec l'Italie) et Crotale",
      "Avions de chasse Mirage 2000-5 et missiles de croisière SCALP",
      "Blindés (AMX-10 RC, VAB) et véhicules",
      "Formation de milliers de soldats ukrainiens en France (brigade « Anne de Kyiv »)",
    ],
  },
  {
    key: "financial", amount: aid.france.financial,
    items: [
      "Soutien budgétaire à l'État ukrainien (prêts et dons)",
      "Contributions aux mécanismes européens (Facilité pour l'Ukraine)",
      "Garanties et financements de projets d'infrastructure",
    ],
  },
  {
    key: "humanitarian", amount: aid.france.humanitarian,
    items: [
      "Aide médicale et matériel d'urgence",
      "Générateurs face aux frappes sur le réseau électrique",
      "Déminage, soutien aux réfugiés et à la reconstruction",
    ],
  },
] as const;

export default function UkraineAidTracker() {
  const [open, setOpen] = useState(false);
  const donors = aid.donors as any[];
  const max = Math.max(...donors.map(d => d.total));

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFCC00]/15 text-2xl">🇺🇦</span>
        <div>
          <h2 className="text-3xl font-staatliches uppercase tracking-tight text-white md:text-4xl">
            L'aide de la France à <span className="text-[#FFCC00]">l'Ukraine</span>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-blue-200/70">
            Combien la France a donné, à quoi ça sert, et comment elle se situe face aux autres pays — depuis le début de la guerre (février 2022).
          </p>
        </div>
      </div>

      {/* Chiffre France + répartition */}
      <div className="mt-6 grid gap-3 md:grid-cols-[1.1fr_1.4fr]">
        <div className="rounded-3xl border border-[#FFCC00]/25 bg-gradient-to-br from-[#FFCC00]/10 to-transparent p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-200/60">Total donné par la France</p>
          <p className="mt-1 font-staatliches text-5xl text-white">{md(aid.france.total)} <span className="text-2xl text-blue-200/70">Md€</span></p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-blue-100">
            {aid.france.rank}ᵉ donateur mondial
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-200/60">Répartition</p>
          <div className="mt-3 space-y-3">
            {TYPES.map(({ key, label, color, Icon }) => {
              const v = (aid.france as any)[key] as number;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs font-bold text-blue-100"><Icon size={13} style={{ color }} /> {label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${(v / aid.france.total) * 100}%`, background: color }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-black tabular-nums text-white">{md(v)} Md€</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparaison des donateurs (barres empilées par type) */}
      <div className="mt-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-black uppercase tracking-widest text-white">La France face aux autres</p>
          <div className="flex flex-wrap gap-3">
            {TYPES.map(({ label, color }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-200/80">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} /> {label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          {donors.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className={`w-28 shrink-0 truncate text-xs ${d.isFrance ? "font-black text-[#FFCC00]" : "font-bold text-blue-100/90"}`}>{d.name}</span>
              <div className="flex-1">
                <div className={`flex h-4 overflow-hidden rounded-full bg-white/5 ${d.isFrance ? "ring-2 ring-[#FFCC00]/60" : ""}`} style={{ width: `${Math.max((d.total / max) * 100, 2)}%` }}>
                  {TYPES.map(({ key, color, label }) => (
                    <div key={key} title={`${label} : ${md(d[key])} Md€`} style={{ width: `${(d[key] / d.total) * 100}%`, background: color }} />
                  ))}
                </div>
              </div>
              <span className={`w-16 shrink-0 text-right text-xs tabular-nums ${d.isFrance ? "font-black text-[#FFCC00]" : "font-bold text-white"}`}>{md(d.total)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 text-[11px] leading-snug text-blue-200/60">
          <Info size={13} className="mt-0.5 shrink-0" />
          Aide bilatérale <strong className="font-bold text-blue-100">allouée</strong> (effectivement engagée), cumulée depuis janvier 2022. « Union européenne » = aide des institutions de l'UE, en plus de celle des États membres.
        </p>
      </div>

      {/* À quoi ont servi les milliards français */}
      <div className="mt-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-4 text-left" aria-expanded={open}>
          <p className="text-sm font-black uppercase tracking-widest text-white">À quoi ont servi les {md(aid.france.total)} milliards français ?</p>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-blue-100 transition-transform ${open ? "rotate-180" : ""}`}><ChevronDown size={18} /></span>
        </button>
        {open && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {FRANCE_USAGE.map((u) => {
              const t = TYPES.find(x => x.key === u.key)!;
              return (
                <div key={u.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest" style={{ color: t.color }}><t.Icon size={14} /> {t.label}</span>
                    <span className="text-sm font-black tabular-nums text-white">{md(u.amount)} Md€</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {u.items.map((it, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-snug text-blue-100/90">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: t.color }} /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        {open && (
          <p className="mt-3 text-[11px] italic leading-snug text-blue-200/50">
            Détail des livraisons : sources officielles (Ministère des Armées). Les montants par type proviennent de l'Institut de Kiel.
          </p>
        )}
      </div>

      {/* Source */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-blue-200/50">
          Source : <strong className="text-blue-100/80">{aid.source}</strong> · {aid.release} · données au {new Date(aid.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · actualisé automatiquement à chaque publication de l'Institut.
        </p>
        <a href={aid.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-blue-100 transition hover:bg-white/10">
          Vérifier la source <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
