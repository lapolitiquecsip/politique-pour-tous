"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";

// « Autres fonctions » : met en avant les rôles qu'un·e élu·e exerce EN PARALLÈLE de son
// mandat (ex. eurodéputé ET président d'un parti), avec un lien vers chaque fiche liée.
// Interconnecte le site en croisant le nom entre partis, gouvernement, candidats, etc.
export default function ParallelRoles({ fullName, selfHref }: { fullName: string; selfHref: string }) {
  const [roles, setRoles] = useState<{ label: string; kind: string; href: string }[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getParallelRoles(fullName, selfHref).then(r => { if (active) setRoles(r as any); }).catch(() => { if (active) setRoles([]); });
    return () => { active = false; };
  }, [fullName, selfHref]);

  if (!roles || roles.length === 0) return null;

  return (
    <section className="rounded-[2.5rem] border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900 p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"><Layers size={18} /></span>
        <h3 className="font-staatliches text-2xl uppercase tracking-tight text-slate-900 dark:text-white">Toutes ses fonctions</h3>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Cette personne exerce ou a exercé plusieurs fonctions — retrouvez chacune d'elles ici, sans changer de fiche.</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {roles.map((r, i) => (
          <Link key={i} href={r.href}
            className="group flex items-center gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 transition hover:border-indigo-400 hover:shadow-md dark:border-indigo-800/60 dark:bg-slate-900">
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-500">{r.kind}</span>
              <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{r.label}</span>
            </div>
            <ArrowUpRight size={16} className="shrink-0 text-indigo-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
