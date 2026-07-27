"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, Landmark } from "lucide-react";
import { api } from "@/lib/api";

// Fil « Décisions & législation de l'UE concernant la France » — actes juridiques officiels
// (EUR-Lex) : arrêts CJUE visant la France, décisions Commission/Conseil adressées à la France,
// et directives/règlements européens qui s'appliquent en France. 100 % source officielle, liée.
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];
const frDate = (d?: string | null) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
};

const CAT_COLOR: Record<string, string> = {
  "Justice (CJUE)": "bg-indigo-400/15 text-indigo-300 border-indigo-400/30",
  "Directive (UE)": "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  "Règlement (UE)": "bg-sky-400/15 text-sky-300 border-sky-400/30",
  "Aides d'État": "bg-amber-400/15 text-amber-300 border-amber-400/30",
  "Budget & finances": "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  "Concentrations": "bg-slate-400/15 text-slate-300 border-slate-400/30",
  "Infractions": "bg-rose-400/15 text-rose-300 border-rose-400/30",
  "Numérique": "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  "Agriculture & pêche": "bg-lime-400/15 text-lime-300 border-lime-400/30",
  "Climat & énergie": "bg-teal-400/15 text-teal-300 border-teal-400/30",
  "Commerce & international": "bg-violet-400/15 text-violet-300 border-violet-400/30",
};
const catColor = (c?: string | null) => CAT_COLOR[c || ""] || "bg-yellow-400/15 text-yellow-300 border-yellow-400/30";
// La législation UE s'applique dans tous les États membres, France comprise.
const APPLIES_FR = new Set(["Directive (UE)", "Règlement (UE)"]);

export default function EuFranceDecisionsFeed() {
  const [items, setItems] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<string>("Tout");
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    let active = true;
    api.getEuFranceDecisions(150).then(d => { if (active) setItems(d as any[]); }).catch(() => setItems([]));
    return () => { active = false; };
  }, []);

  const cats = useMemo(() => {
    if (!items) return [];
    const c = new Map<string, number>();
    for (const it of items) c.set(it.category, (c.get(it.category) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = useMemo(() => {
    if (!items) return [];
    const f = filter === "Tout" ? items : items.filter(i => i.category === filter);
    return f.slice(0, limit);
  }, [items, filter, limit]);

  if (!items) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-yellow-400" /></div>;

  const totalFiltered = filter === "Tout" ? items.length : items.filter(i => i.category === filter).length;

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-staatliches uppercase tracking-tight text-white md:text-4xl">
          Décisions & lois de l'UE <span className="text-yellow-400">concernant la France</span>
        </h2>
        <p className="mt-1 text-blue-200/70">Arrêts de la Cour de justice visant la France, décisions de la Commission et du Conseil, et directives &amp; règlements européens qui s'appliquent en France — depuis les bases officielles EUR-Lex. Mise à jour automatique.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-blue-200/70">
          Ce fil s'alimente automatiquement depuis les bases officielles de l'UE.
        </div>
      ) : (
        <>
          {/* Filtre par type. */}
          <div className="mb-5 flex flex-wrap gap-2">
            {[["Tout", items.length] as [string, number], ...cats].map(([c, n]) => (
              <button key={c} onClick={() => { setFilter(c); setLimit(20); }}
                className={`rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${filter === c ? "border-yellow-400 bg-yellow-400 text-blue-950" : "border-white/15 bg-white/5 text-blue-100 hover:border-yellow-400/40"}`}>
                {c} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visible.map(d => (
              <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-yellow-400/40 hover:bg-white/[0.07] sm:flex-row sm:items-start sm:gap-5">
                <div className="flex shrink-0 items-center gap-2 sm:w-44 sm:flex-col sm:items-start">
                  <span className="text-xs font-black uppercase tracking-widest text-yellow-400/90">{frDate(d.published_at)}</span>
                  {d.category && <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${catColor(d.category)}`}>{d.category}</span>}
                  {APPLIES_FR.has(d.category) && <span className="text-[9px] font-black uppercase tracking-wider text-blue-300/60">s'applique en France</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-snug text-white transition-colors group-hover:text-yellow-300">{d.title}</h3>
                  {d.summary && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-blue-100/70">{d.summary}</p>}
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-300/70">
                    <Landmark size={12} /> {d.institution} <ExternalLink size={11} className="ml-1" />
                  </span>
                </div>
              </a>
            ))}
          </div>

          {limit < totalFiltered && (
            <div className="mt-6 text-center">
              <button onClick={() => setLimit(l => l + 20)} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-blue-100 transition hover:border-yellow-400/50 hover:text-yellow-300">
                Voir plus ({totalFiltered - limit})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
