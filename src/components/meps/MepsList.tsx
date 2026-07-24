"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";

// Groupes politiques du Parlement européen : code court → { couleur, nom lisible }.
export const EP_GROUPS: Record<string, { clr: string; name: string }> = {
  RE:    { clr: "bg-amber-500",   name: "Renew Europe (centristes/libéraux)" },
  PPE:   { clr: "bg-blue-600",    name: "Parti populaire européen (droite)" },
  SD:    { clr: "bg-rose-500",    name: "Sociaux-démocrates (S&D)" },
  VERTS: { clr: "bg-emerald-500", name: "Les Verts / ALE" },
  PfE:   { clr: "bg-slate-700",   name: "Patriotes pour l’Europe (droite radicale)" },
  ECR:   { clr: "bg-sky-700",     name: "Conservateurs et réformistes (ECR)" },
  GUE:   { clr: "bg-red-600",     name: "La Gauche (GUE/NGL)" },
  ESN:   { clr: "bg-indigo-800",  name: "Europe des nations souveraines" },
  NI:    { clr: "bg-slate-500",   name: "Non-inscrits" },
};
const grp = (c: string) => EP_GROUPS[c] || EP_GROUPS.NI;

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

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>;

  return (
    <div className="space-y-6">
      <p className="text-center text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
        {meps.length} eurodéputés français • Parlement européen
      </p>

      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Rechercher un nom, un parti…"
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-300"
        />
      </div>

      {/* Filtres par groupe — libellé lisible, plus seulement le code. */}
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
            title={grp(g).name}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${group === g ? "text-white border-transparent " + grp(g).clr : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700"}`}
          >
            <span className={`h-2 w-2 rounded-full ${group === g ? "bg-white/80" : grp(g).clr}`} />
            {g} ({n})
          </button>
        ))}
      </div>

      {/* Légende des groupes, pour lever l'ambiguïté des sigles. */}
      {group && (
        <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Info size={13} /> <strong>{group}</strong> — {grp(group).name}
        </p>
      )}

      {/* Grille de cartes compactes (avatar circulaire, comme les sénateurs). */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 pt-4">
        {shown.map(m => {
          const g = grp(m.ep_group_code);
          const initials = `${(m.first_name?.[0] || "")}${(m.last_name?.[0] || "")}`.toUpperCase();
          return (
            <Link
              key={m.id}
              href={`/eurodeputes/${m.slug}`}
              className="group relative flex flex-col items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-14 pb-5 text-center transition hover:shadow-lg hover:border-sky-300"
            >
              <div className={`absolute top-0 left-0 h-1 w-full rounded-t-2xl ${g.clr} opacity-70`} />
              <div className="absolute -top-9">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.photo_url}
                  alt={m.full_name}
                  loading="lazy"
                  className="h-20 w-20 rounded-full object-cover object-top border-4 border-white dark:border-slate-900 shadow-md transition group-hover:scale-105"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=0284c7&color=fff&size=160`; }}
                />
              </div>
              <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white line-clamp-2 group-hover:text-sky-600 transition-colors">{m.full_name}</p>
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{m.national_party}</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white ${g.clr}`}>
                {m.ep_group_code}
              </span>
            </Link>
          );
        })}
      </div>
      {shown.length === 0 && <p className="py-12 text-center text-sm italic text-slate-400">Aucun eurodéputé ne correspond.</p>}
    </div>
  );
}
