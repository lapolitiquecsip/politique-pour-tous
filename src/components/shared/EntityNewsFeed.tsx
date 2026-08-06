"use client";

import { useEffect, useState } from "react";
import { Newspaper, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

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

  useEffect(() => {
    let active = true;
    api.getEntityFeed(entityType, entityId, 12)
      .then(d => { if (active) setItems(d as FeedItem[]); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [entityType, entityId]);

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
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map(it => (
                <li key={it.id}>
                  <a href={it.url} target="_blank" rel="noopener noreferrer"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{it.news_type || "actualité"}</span>
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
          )}
        </div>
      )}
    </section>
  );
}
