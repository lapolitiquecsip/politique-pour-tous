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
    <section className="rounded-[2.5rem] border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="text-indigo-600" size={18} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Autres fonctions</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.map((r, i) => (
          <Link key={i} href={r.href}
            className="group inline-flex items-center gap-2 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-4 py-2.5 transition hover:border-indigo-400 hover:shadow-md">
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">{r.kind}</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{r.label}</span>
            <ArrowUpRight size={14} className="text-indigo-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Link>
        ))}
      </div>
    </section>
  );
}
