"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Sparkles, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

type Item = {
  id: string; pacte: string | null; theme: string | null; engagement: string;
  source_url: string; status: string | null; justification: string | null; ai_generated: boolean;
};

// Libellés et couleurs des statuts. « non_evaluable » est assumé : c'est ce que le modèle
// répond quand il n'a pas de connaissance fiable — mieux vaut l'afficher que de trancher.
const STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  tenu:          { label: "Tenu",          chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  en_cours:      { label: "En cours",      chip: "bg-blue-50 text-blue-700 border-blue-200",          dot: "bg-blue-500" },
  partiel:       { label: "Partiel",       chip: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  abandonne:     { label: "Abandonné",     chip: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500" },
  non_evaluable: { label: "Non évaluable", chip: "bg-slate-100 text-slate-500 border-slate-200",      dot: "bg-slate-400" },
};

const ORDER = ["tenu", "en_cours", "partiel", "abandonne", "non_evaluable"];

export default function ProgramSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getPresidentialProgram(2022)
      .then(d => { if (active) setItems(d as Item[]); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.status || "non_evaluable"] = (c[i.status || "non_evaluable"] || 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(
    () => (filter ? items.filter(i => (i.status || "non_evaluable") === filter) : items),
    [items, filter]
  );

  if (items.length === 0) return null;
  const sourceUrl = items[0]?.source_url;

  return (
    <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 space-y-6">
      <div>
        <p className="text-amber-600 font-black text-xs uppercase tracking-widest mb-2">Élection 2022</p>
        <h2 className="text-3xl md:text-4xl font-staatliches uppercase tracking-tight text-slate-900">
          Le <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500">programme</span> et son avancement
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {items.length} engagements tirés du programme officiel « Avec Vous ». Cliquez pour voir le détail.
        </p>
      </div>

      {/* Avertissement : le lecteur doit pouvoir distinguer le fait de l'appréciation. */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-[11px] leading-relaxed text-amber-900">
          <strong>Les engagements sont des faits</strong>, repris du programme officiel de campagne.
          <strong> L'état d'avancement est une évaluation générée par une IA</strong> — elle peut être
          incomplète ou contestable, et ne remplace pas votre jugement. Les engagements marqués
          « non évaluable » sont ceux pour lesquels le modèle n'a pas de certitude.
        </p>
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${filter === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
        >
          Tous ({items.length})
        </button>
        {ORDER.filter(s => counts[s]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? null : s)}
            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${filter === s ? STATUS[s].chip + " ring-2 ring-offset-1 ring-slate-300" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
          >
            {STATUS[s].label} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Liste des engagements */}
      <div className="space-y-2">
        {shown.map(i => {
          const st = STATUS[i.status || "non_evaluable"];
          const isOpen = open === i.id;
          return (
            <div key={i.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i.id)}
                className="w-full flex items-start gap-3 p-4 text-left transition hover:bg-slate-50"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                <span className="min-w-0 flex-1">
                  {i.theme && <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">{i.theme}</span>}
                  <span className="mt-0.5 block text-sm font-bold leading-snug text-slate-900">{i.engagement}</span>
                </span>
                <span className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${st.chip}`}>
                  {st.label}
                </span>
                <ChevronDown size={16} className={`mt-1 shrink-0 text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 bg-white px-4 py-4 space-y-3">
                  {i.justification ? (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                        <Sparkles size={11} /> Évaluation générée par IA
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{i.justification}</p>
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">Aucune évaluation disponible pour cet engagement.</p>
                  )}
                  <a
                    href={i.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-600 transition-colors"
                  >
                    Programme officiel 2022 <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400/80 italic border-t border-slate-100 pt-4 flex items-start gap-1.5">
        <ClipboardList size={12} className="mt-0.5 shrink-0" />
        <span>
          Engagements : programme officiel « Emmanuel Macron — Avec Vous » (2022), document de campagne
          {sourceUrl && <> — <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">source</a></>}.
          Avancement : évaluation générée par IA, non vérifiée par un humain.
        </span>
      </p>
    </section>
  );
}
