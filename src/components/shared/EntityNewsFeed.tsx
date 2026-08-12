"use client";

import { useEffect, useMemo, useState } from "react";
import { Newspaper, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

// Libellés lisibles des types d'actu (badges + puces de filtre).
const TYPE_LABEL: Record<string, string> = {
  decret: "Décrets", annonce: "Annonces", mesure: "Mesures", decision: "Décisions",
  budget: "Budget", nomination: "Nominations", lancement: "Lancements", bilan: "Bilans",
  travaux: "Travaux", projet: "Projets", conseil_municipal: "Conseil municipal",
  evenement: "Événements", equipement: "Équipements", arrete: "Arrêtés", actualite: "Autres",
};
const typeLabel = (t: string | null) => (t && TYPE_LABEL[t]) || "Autres";

type FeedItem = {
  id: string;
  source_name: string;
  url: string;
  title: string;
  summary: string | null;
  news_type: string | null;
  published_at: string | null;
};

const fmt = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Fil d'actualité générique d'une entité (ministère, département…). Sources gratuites résumées
// par IA (titre + résumé court + lien). Masqué tant qu'il n'y a pas d'actu.
export default function EntityNewsFeed({
  entityType, entityId, defaultOpen = false,
}: { entityType: string; entityId: string; defaultOpen?: boolean }) {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState<string | null>(null); // null = tous les types

  useEffect(() => {
    let active = true;
    api.getEntityFeed(entityType, entityId, 40)
      .then(d => { if (active) setItems(d as FeedItem[]); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [entityType, entityId]);

  // Types présents (avec compte), pour les puces de filtre.
  const types = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items || []) { const k = it.news_type || "actualite"; c[k] = (c[k] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [items]);
  const visible = useMemo(() => (items || []).filter(it => !filter || (it.news_type || "actualite") === filter), [items, filter]);

  // Rien à afficher (pas encore d'actu) → on ne pollue pas la fiche.
  if (items !== null && items.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-800/40"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-md">
            <Newspaper size={20} />
          </span>
          <div>
            <h2 className="text-2xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">Fil d'actualité</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {items === null ? "Chargement…" : `${items.length} actualité${items.length > 1 ? "s" : ""} récente${items.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform dark:bg-slate-800 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={18} />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          {items === null ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : (
            <>
            {types.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {[["", items.length] as [string, number], ...types].map(([t, n]) => {
                  const active = (filter || "") === t;
                  return (
                    <button key={t || "all"} onClick={() => setFilter(t || null)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition border ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-blue-400"}`}>
                      {t ? typeLabel(t) : "Tout"} <span className="opacity-60">· {n}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visible.map(it => (
                <li key={it.id}>
                  <a href={it.url} target="_blank" rel="noopener noreferrer"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{typeLabel(it.news_type)}</span>
                      <span className="text-[10px] font-bold text-slate-400">{fmt(it.published_at)}</span>
                    </div>
                    <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{it.title}</p>
                    {it.summary && <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{it.summary}</p>}
                    <span className="mt-auto pt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <ExternalLink size={11} /> {it.source_name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
