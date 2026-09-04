"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { anGroupBySlug } from "@/lib/data/partyGroups";
import { CheckCircle2, XCircle, Minus, Vote, Info } from "lucide-react";

type Stance = { issue: string; title: string; category: string; pour: number; contre: number; abst: number; total: number };

// Position dominante du groupe sur un enjeu, à partir de ses votes solennels.
function dominant(s: Stance): { key: "pour" | "contre" | "mitige"; label: string; cls: string; Icon: typeof CheckCircle2 } {
  if (s.pour > s.contre && s.pour >= s.abst) return { key: "pour", label: "Plutôt pour", cls: "text-emerald-700 bg-emerald-50 ring-emerald-200", Icon: CheckCircle2 };
  if (s.contre > s.pour && s.contre >= s.abst) return { key: "contre", label: "Plutôt contre", cls: "text-rose-700 bg-rose-50 ring-rose-200", Icon: XCircle };
  return { key: "mitige", label: "Position partagée", cls: "text-amber-700 bg-amber-50 ring-amber-200", Icon: Minus };
}

// Comment le GROUPE d'un parti vote, ENJEU par enjeu — agrégé sur les votes solennels (« sur
// l'ensemble » d'un texte) tagués par thème. Rendu null si le parti n'a pas de groupe à l'AN.
export default function PartyScorecard({ partySlug, color }: { partySlug: string; color: string }) {
  const group = anGroupBySlug(partySlug);
  const [stances, setStances] = useState<Stance[] | null>(null);

  useEffect(() => {
    if (!group) { setStances(null); return; }
    let active = true;
    (async () => {
      const [votes, issues] = await Promise.all([api.getKeyVotes(), api.getIssues()]);
      const meta = new Map<string, { title: string; category: string }>((issues as any[]).map(i => [i.slug, { title: i.title, category: i.category }]));
      const agg = new Map<string, { pour: number; contre: number; abst: number; total: number }>();
      for (const v of votes as any[]) {
        const g = v.groups.find((x: any) => x.po === group.po);
        if (!g || g.total === 0) continue;
        const pos: "pour" | "contre" | "abst" = g.pour > g.contre ? "pour" : g.contre > g.pour ? "contre" : "abst";
        for (const iss of v.issues) {
          const a = agg.get(iss) || { pour: 0, contre: 0, abst: 0, total: 0 };
          a[pos]++; a.total++; agg.set(iss, a);
        }
      }
      const out: Stance[] = [];
      for (const [iss, a] of agg) { const m = meta.get(iss); if (m && a.total >= 2) out.push({ issue: iss, title: m.title, category: m.category, ...a }); }
      out.sort((x, y) => y.total - x.total);
      if (active) setStances(out);
    })();
    return () => { active = false; };
  }, [group?.po]);

  if (!group || !stances || stances.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="mb-1 text-2xl font-staatliches uppercase text-slate-900">Comment ce groupe vote, par enjeu</h2>
      <p className="mb-6 flex items-start gap-1.5 text-sm text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        Position du groupe <span className="font-bold" style={{ color }}>{group.short}</span> à l&apos;Assemblée, agrégée sur les <b>votes solennels</b> (adoption d&apos;un texte) tagués par thème.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {stances.map(s => {
          const d = dominant(s);
          const pct = (n: number) => (s.total ? Math.round((n / s.total) * 100) : 0);
          return (
            <div key={s.issue} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.category}</p>
                  <h3 className="text-base font-black text-slate-900">{s.title}</h3>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ${d.cls}`}>
                  <d.Icon size={12} /> {d.label}
                </span>
              </div>
              {/* Barre empilée pour / abstention / contre */}
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                <span className="bg-emerald-500" style={{ width: `${pct(s.pour)}%` }} />
                <span className="bg-slate-300" style={{ width: `${pct(s.abst)}%` }} />
                <span className="bg-rose-500" style={{ width: `${pct(s.contre)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
                <span className="text-emerald-600">Pour {s.pour}</span>
                {s.abst > 0 && <span className="text-slate-400">Abst. {s.abst}</span>}
                <span className="text-rose-600">Contre {s.contre}</span>
                <span className="ml-auto text-slate-400">{s.total} vote{s.total > 1 ? "s" : ""} clé{s.total > 1 ? "s" : ""}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] italic text-slate-400">
        Votes « sur l&apos;ensemble » d&apos;un texte à l&apos;Assemblée nationale (open data officiel). Un vote peut relever de plusieurs enjeux.
      </p>
    </section>
  );
}
