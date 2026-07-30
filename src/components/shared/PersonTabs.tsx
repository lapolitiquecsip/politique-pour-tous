"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Vote, Landmark, Flag, Building2, Star, Users, MapPin, Layers, Layers3 } from "lucide-react";
import { api } from "@/lib/api";

// Fiche UNIFIÉE : barre d'onglets « fonctions » d'une même personne (Député · Premier ministre ·
// Candidat 2027 · Parti…). Collante en haut, elle rend la navigation entre les casquettes d'une
// personne fluide — toutes les infos restent accessibles, sans changer de « fiche ».
const ICON: Record<string, any> = {
  deputy: Vote, senator: Landmark, mep: Flag, minister: Building2,
  candidate: Star, party: Users, department: MapPin, mayor: MapPin,
};

export default function PersonTabs({ fullName, currentHref }: { fullName: string; currentHref: string }) {
  const [roles, setRoles] = useState<any[] | null>(null);

  useEffect(() => {
    let active = true;
    if (!fullName) return;
    api.getPersonRoles(fullName).then(r => { if (active) setRoles(r as any[]); }).catch(() => { if (active) setRoles([]); });
    return () => { active = false; };
  }, [fullName]);

  // Une seule fonction (ou aucune) → pas d'onglets à afficher.
  if (!roles || roles.length < 2) return null;

  const base = (h: string) => (h || "").split("?")[0].replace(/\/+$/, "");
  const cur = base(currentHref);

  return (
    <div className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="hidden shrink-0 items-center gap-1.5 pr-1 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:flex">
          <Layers3 size={13} /> Ses fonctions
        </span>
        {roles.map((r, i) => {
          const Icon = ICON[r.type] || Layers;
          const isActive = base(r.href) === cur;
          const cls = `group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition ${
            isActive
              ? "bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900"
              : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`;
          const inner = <><Icon size={14} className={isActive ? "" : "text-slate-400 group-hover:text-current"} /> {r.kind}</>;
          return isActive
            ? <span key={i} className={cls} aria-current="page">{inner}</span>
            : <Link key={i} href={r.href} className={cls} title={r.label}>{inner}</Link>;
        })}
      </div>
    </div>
  );
}
