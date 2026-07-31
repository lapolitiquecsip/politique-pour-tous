"use client";

import { useState } from "react";
import { Landmark, ChevronDown } from "lucide-react";
import { resolveInstitutionalRole } from "@/lib/data/institutionalRoles";

// Bannière mise en avant quand un·e élu·e occupe une fonction institutionnelle (Président·e ou
// Vice-président·e d'une chambre, président·e de commission), avec l'explication des pouvoirs.
export default function InstitutionalRoleBanner({ fullName, bio }: { fullName: string; bio?: any }) {
  const role = resolveInstitutionalRole(fullName, bio);
  const [open, setOpen] = useState(false);
  if (!role) return null;

  return (
    <div className="rounded-[2rem] border border-amber-300/60 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-slate-900">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30"><Landmark size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Fonction institutionnelle{role.since ? ` · depuis ${role.since}` : ""}</p>
          <p className="text-lg font-black leading-tight text-slate-900 dark:text-white">{role.role}</p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-amber-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-4 border-t border-amber-200/60 pt-4 dark:border-amber-500/20">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-600">Ce que cela lui confère</p>
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-700 marker:text-amber-400 dark:text-slate-300">
            {role.powers.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
