"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const GROUP_CLR: Record<string, string> = {
  RE: "bg-amber-500", PPE: "bg-blue-600", SD: "bg-rose-500", VERTS: "bg-emerald-500",
  PfE: "bg-slate-700", ECR: "bg-sky-700", GUE: "bg-red-600", ESN: "bg-indigo-800", NI: "bg-slate-500",
};

/**
 * Liste des eurodéputés français : recherche + filtre par groupe + grille de fiches.
 * Se suffit à elle-même (récupère ses données), pour être embarquée dans l'onglet
 * « Votes des élus » comme dans la page /eurodeputes.
 */
export default function MepsList({ meps: initial }: { meps?: any[] }) {
  const [meps, setMeps] = useState<any[]>(initial || []);
  const [loading, setLoading] = useState(!initial);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let active = true;
    api.getMeps().then(d => { if (active) { setMeps(d as any[]); setLoading(false); } }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [initial]);

  const groups = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of meps) c[m.ep_group_code || "NI"] = (c[m.ep_group_code || "NI"] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [meps]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return meps.filter(m => {
      if (group && (m.ep_group_code || "NI") !== group) return false;
      if (!s) return true;
      return (m.full_name || "").toLowerCase().includes(s) || (m.national_party || "").toLowerCase().includes(s);
    });
  }, [meps, q, group]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
        {meps.length} eurodéputés français • Parlement européen
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un nom, un parti…"
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-300"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setGroup(null)}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${group === null ? "bg-slate-900 text-white border-slate-900" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700"}`}
        >
          Tous ({meps.length})
        </button>
        {groups.map(([g, n]) => (
          <button
            key={g}
            onClick={() => setGroup(group === g ? null : g)}
            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${group === g ? "text-white border-transparent " + (GROUP_CLR[g] || "bg-slate-500") : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700"}`}
          >
            {g} ({n})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {shown.map(m => (
          <Link
            key={m.id}
            href={`/eurodeputes/${m.slug}`}
            className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition hover:shadow-xl hover:-translate-y-1"
          >
            <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.photo_url}
                alt={m.full_name}
                loading="lazy"
                className="h-full w-full object-cover object-top transition group-hover:scale-105"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=0284c7&color=fff&size=256`; }}
              />
              <span className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white ${GROUP_CLR[m.ep_group_code] || "bg-slate-500"}`}>
                {m.ep_group_code}
              </span>
            </div>
            <div className="p-3">
              <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white line-clamp-2 group-hover:text-sky-600 transition-colors">{m.full_name}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{m.national_party}</p>
            </div>
          </Link>
        ))}
      </div>
      {shown.length === 0 && <p className="py-12 text-center text-sm italic text-slate-400">Aucun eurodéputé ne correspond.</p>}
    </div>
  );
}
