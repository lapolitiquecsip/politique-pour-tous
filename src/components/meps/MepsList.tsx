"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";
import DragScroller from "@/components/ui/DragScroller";

// Groupes politiques du Parlement européen : code court → { couleur, nom lisible }.
export const EP_GROUPS: Record<string, { clr: string; name: string }> = {
  RE:    { clr: "bg-amber-500",   name: "Renew Europe (centristes/libéraux)" },
  PPE:   { clr: "bg-blue-600",    name: "Parti populaire européen (droite)" },
  SD:    { clr: "bg-rose-500",    name: "Sociaux-démocrates (S&D)" },
  VERTS: { clr: "bg-emerald-500", name: "Les Verts / ALE" },
  PFE:   { clr: "bg-slate-700",   name: "Patriotes pour l’Europe (droite radicale)" },
  ECR:   { clr: "bg-sky-700",     name: "Conservateurs et réformistes (ECR)" },
  GUE:   { clr: "bg-red-600",     name: "La Gauche (GUE/NGL)" },
  ESN:   { clr: "bg-indigo-800",  name: "Europe des nations souveraines" },
  NI:    { clr: "bg-slate-500",   name: "Non-inscrits" },
};
// Le sigle arrive de la base avec sa typographie d'origine (« PfE ») : on cherche toujours
// en majuscules, sinon le groupe retombe silencieusement sur les non-inscrits.
const grp = (c: string) => EP_GROUPS[(c || "NI").toUpperCase()] || EP_GROUPS.NI;

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
          className="w-full rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-900 py-3 pl-11 pr-4 text-sm text-foreground dark:text-white outline-none focus:border-sky-300"
        />
      </div>

      {/* Filtres par groupe — libellé lisible, plus seulement le code. */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setGroup(null)}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${group === null ? "bg-slate-900 text-white border-slate-900" : "bg-card dark:bg-slate-900 text-muted-foreground border-border dark:border-slate-700"}`}
        >
          Tous ({meps.length})
        </button>
        {groups.map(([g, n]) => (
          <button
            key={g}
            onClick={() => setGroup(group === g ? null : g)}
            title={grp(g).name}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${group === g ? "text-white border-transparent " + grp(g).clr : "bg-card dark:bg-slate-900 text-muted-foreground border-border dark:border-slate-700"}`}
          >
            <span className={`h-2 w-2 rounded-full ${group === g ? "bg-white/80" : grp(g).clr}`} />
            {g} ({n})
          </button>
        ))}
      </div>

      {/* Légende des groupes, pour lever l'ambiguïté des sigles. */}
      {group && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Info size={13} /> <strong>{group}</strong> — {grp(group).name}
        </p>
      )}

      {/* Un rail horizontal sur deux rangées, et non une grille qui descend.
          À quatre colonnes, les quatre-vingts eurodéputés occupaient vingt et une
          rangées : plusieurs écrans à faire défiler avant d'atteindre la suite de
          la page, sur téléphone comme sur ordinateur. Ici la rubrique tient en
          une hauteur fixe et se parcourt d'un geste.

          Le rail est en `flex` : on lui donne donc UN enfant, lui-même en
          grille à remplissage par colonnes. Poser `grid` sur la piste elle-même
          reviendrait à se battre avec son `flex` à coups de priorité CSS.

          La photo est à l'intérieur de la carte, et non plus débordante par le
          haut : entre deux rangées, un débordement recouvrirait la carte du
          dessus. */}
      <DragScroller ariaLabel="Les eurodéputés français" className="pt-2">
        <div className="grid grid-flow-col grid-rows-2 gap-4">
          {shown.map(m => {
            const g = grp(m.ep_group_code);
            return (
              <Link
                key={m.id}
                href={`/eurodeputes/${m.slug}`}
                className="group relative flex w-[9.5rem] shrink-0 flex-col items-center overflow-hidden rounded-2xl border border-border bg-card px-3 pb-4 pt-5 text-center transition hover:border-sky-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <span className={`absolute left-0 top-0 h-1 w-full ${g.clr} opacity-70`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.photo_url}
                  alt=""
                  loading="lazy"
                  className="h-16 w-16 rounded-full border-2 border-white object-cover object-top shadow-md transition group-hover:scale-105 dark:border-slate-800"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=0284c7&color=fff&size=160`; }}
                />
                <p className="mt-2 line-clamp-2 text-[13px] font-bold leading-tight text-foreground transition-colors group-hover:text-sky-600 dark:text-white">
                  {m.full_name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{m.national_party}</p>
                <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white ${g.clr}`}>
                  {m.ep_group_code}
                </span>
              </Link>
            );
          })}
        </div>
      </DragScroller>

      {shown.length === 0 && <p className="py-12 text-center text-sm italic text-slate-400">Aucun eurodéputé ne correspond.</p>}
    </div>
  );
}
