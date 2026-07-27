"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Landmark } from "lucide-react";
import { api } from "@/lib/api";

// Fil « Décisions de l'UE concernant la France » — communiqués OFFICIELS de la Commission
// européenne filtrés sur la France. Alimenté en continu (le flux officiel n'expose que les
// derniers communiqués ; la table s'enrichit chaque jour). 100 % source officielle, liée.
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];
const frDate = (d?: string | null) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
};

const CAT_COLOR: Record<string, string> = {
  "Aides d'État": "bg-amber-400/15 text-amber-300 border-amber-400/30",
  "Financement": "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  "Infractions": "bg-rose-400/15 text-rose-300 border-rose-400/30",
  "Numérique": "bg-sky-400/15 text-sky-300 border-sky-400/30",
  "Agriculture & pêche": "bg-lime-400/15 text-lime-300 border-lime-400/30",
  "Climat & énergie": "bg-teal-400/15 text-teal-300 border-teal-400/30",
  "Commerce & international": "bg-violet-400/15 text-violet-300 border-violet-400/30",
};
const catColor = (c?: string | null) => CAT_COLOR[c || ""] || "bg-yellow-400/15 text-yellow-300 border-yellow-400/30";

export default function EuFranceDecisionsFeed() {
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getEuFranceDecisions(30).then(d => { if (active) setItems(d as any[]); }).catch(() => setItems([]));
    return () => { active = false; };
  }, []);

  if (!items) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-yellow-400" /></div>;

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-staatliches uppercase tracking-tight text-white md:text-4xl">
          Décisions de l'UE <span className="text-yellow-400">concernant la France</span>
        </h2>
        <p className="mt-1 text-blue-200/70">Communiqués officiels de la Commission européenne qui concernent la France — mis à jour en continu depuis la source officielle.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-blue-200/70">
          Aucune décision concernant la France pour l'instant. Ce fil s'alimente automatiquement dès qu'une décision de la Commission concerne la France.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(d => (
            <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-yellow-400/40 hover:bg-white/[0.07] sm:flex-row sm:items-start sm:gap-5">
              <div className="flex shrink-0 items-center gap-2 sm:w-40 sm:flex-col sm:items-start">
                <span className="text-xs font-black uppercase tracking-widest text-yellow-400/90">{frDate(d.published_at)}</span>
                {d.category && <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${catColor(d.category)}`}>{d.category}</span>}
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
      )}
    </section>
  );
}
