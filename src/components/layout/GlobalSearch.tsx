"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Vote, Landmark, Flag, Building2, Star, Users, MapPin, FileText, X } from "lucide-react";
import { api } from "@/lib/api";
import { DEPARTMENTS, REGIONS } from "@/lib/data/territories";

// Moteur de recherche GLOBAL : élus, partis, territoires (communes/départements/régions) et
// textes de loi. Un nom d'élu ou de territoire mène à sa fiche complète, où qu'elle soit.
const ICON: Record<string, any> = {
  deputy: Vote, senator: Landmark, mep: Flag, minister: Building2, candidate: Star,
  party: Users, commune: MapPin, department: MapPin, region: MapPin, law: FileText,
};
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Item = { label: string; sub?: string; href: string; type: string };
type Group = { category: string; items: Item[] };

export default function GlobalSearch({ variant = "desktop", onNavigate }: { variant?: "desktop" | "mobile"; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Départements / régions : match instantané depuis les listes statiques.
  const localTerritories = useMemo<Item[]>(() => {
    const s = norm(q);
    if (s.length < 2) return [];
    const dep = (DEPARTMENTS as any[]).filter(d => norm(d.name).includes(s)).slice(0, 4)
      .map(d => ({ label: d.name, sub: "Département", href: `/local?code=${d.id}&type=department`, type: "department" }));
    const reg = (REGIONS as any[]).filter(r => norm(r.name).includes(s)).slice(0, 3)
      .map(r => ({ label: r.name, sub: "Région", href: `/local?code=${r.id}&type=region`, type: "region" }));
    return [...reg, ...dep];
  }, [q]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = (await api.globalSearch(s)) as Group[];
        // Fusionne les territoires locaux (dép./régions) dans la catégorie Territoires.
        const merged = [...res];
        if (localTerritories.length) {
          const ter = merged.find(g => g.category === "Territoires");
          if (ter) ter.items = [...localTerritories, ...ter.items];
          else merged.splice(1, 0, { category: "Territoires", items: localTerritories });
        }
        setGroups(merged);
      } catch { setGroups([]); }
      finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [q, localTerritories]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => { setOpen(false); setQ(""); onNavigate?.(); router.push(href); };
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div ref={box} className={`relative ${variant === "desktop" ? "w-64 xl:w-80" : "w-full"}`}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoFocus={variant === "mobile"}
          placeholder="Rechercher un élu, un territoire, une loi…"
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        {q && (
          <button onClick={() => { setQ(""); setGroups([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={14} />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {loading && total === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Recherche…</div>
          ) : total === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">Aucun résultat pour « {q} ».</div>
          ) : (
            groups.map(g => (
              <div key={g.category} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{g.category}</p>
                {g.items.map((it, i) => {
                  const Icon = ICON[it.type] || Search;
                  return (
                    <button key={g.category + i} onClick={() => go(it.href)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{it.label}</span>
                        {it.sub && <span className="block truncate text-[11px] text-slate-400">{it.sub}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
