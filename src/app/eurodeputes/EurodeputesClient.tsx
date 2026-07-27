"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Star, MousePointerClick } from "lucide-react";

const GROUP_CLR: Record<string, string> = {
  RE: "bg-amber-500", PPE: "bg-blue-600", SD: "bg-rose-500", VERTS: "bg-emerald-500",
  PfE: "bg-slate-700", ECR: "bg-sky-700", GUE: "bg-red-600", ESN: "bg-indigo-800", NI: "bg-slate-500",
};

export default function EurodeputesClient({ meps }: { meps: any[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);

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

  return (
    <main className="pb-20">
      <div className="container mx-auto max-w-6xl px-4 mt-4 space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#003399] dark:text-[#8CA6E8]">
            <Star size={14} className="fill-[#FFCC00] text-[#FFCC00]" /> {meps.length} eurodéputés français
          </p>
          <p className="text-sm text-slate-500">Recherchez ou filtrez par groupe politique.</p>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#003399]/20 bg-[#003399]/[0.06] px-4 py-1.5 text-xs font-bold text-[#003399] dark:border-[#8CA6E8]/25 dark:bg-[#8CA6E8]/10 dark:text-[#8CA6E8]">
            <MousePointerClick size={14} /> Cliquez sur un eurodéputé pour voir toute son activité : ses votes par thème et sa présence.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un nom, un parti…"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-[#003399]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setGroup(null)}
            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${group === null ? "bg-[#003399] text-white border-[#003399]" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700"}`}
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

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {shown.map(m => (
            <Link
              key={m.id}
              href={`/eurodeputes/${m.slug}`}
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition hover:shadow-xl hover:-translate-y-1"
            >
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.photo_url}
                  alt={m.full_name}
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition group-hover:scale-105"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=003399&color=fff&size=256`; }}
                />
                <span className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white ${GROUP_CLR[m.ep_group_code] || "bg-slate-500"}`}>
                  {m.ep_group_code}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#003399] dark:group-hover:text-[#8CA6E8] transition-colors">{m.full_name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{m.national_party}</p>
              </div>
            </Link>
          ))}
        </div>
        {shown.length === 0 && <p className="py-12 text-center text-sm italic text-slate-400">Aucun eurodéputé ne correspond.</p>}
      </div>
    </main>
  );
}
