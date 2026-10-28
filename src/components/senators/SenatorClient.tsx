"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Map as MapIcon, Users, Lock, ChevronRight, X, Crown } from "lucide-react";
import FranceMap from "@/components/deputies/FranceMap";
import SenatorCard, { Senator } from "@/components/senators/SenatorCard";
import { usePremium } from "@/lib/hooks/usePremium";
import { supabase } from "@/lib/supabase";
import { getDepartmentName } from "@/lib/department-mapping";
import { getFullPartyName } from "@/lib/party-utils";

/**
 * Trouver son sénateur.
 *
 * Pour tous : la recherche (nom ou département) donne aussitôt les sénateurs trouvés, avec
 * le lien vers leur fiche — le parcours de base ne s'arrête jamais sur un écran verrouillé.
 * Pour les abonnés Premium : la carte interactive et la liste complète des 348 (choix de
 * l'offre, confirmé par l'user le 28/10/2026). Les autres voient un seul encart clair pour
 * les débloquer, à la place d'une carte verrouillée de 500 px et de fiches floutées sans bouton.
 */
const sansAccent = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, " ");

export default function SenatorClient() {
  const [senators, setSenators] = useState<Senator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [visible, setVisible] = useState(12); // pagination : évite d'afficher 348 cartes d'un coup
  const { isPremium } = usePremium() || { isPremium: false };

  useEffect(() => {
    // ⚠️ NE PAS faire select("*") : la table embarque de gros champs (biography, bio JSON) :
    // ~2 Mo pour 352 sénateurs. La liste n'affiche que ces 7 colonnes → ≈ 100 Ko.
    supabase.from("senators")
      .select("id, first_name, last_name, party, department, slug, photo_url")
      .neq("sitting", false)   // sénateurs en fonction seulement (les sortants gardent leur fiche)
      .order("last_name", { ascending: true })
      .then(({ data }) => { if (data) setSenators(data as Senator[]); setLoading(false); });
  }, []);

  const filteredSenators = useMemo(() => {
    const q = sansAccent(search).trim();
    const deptName = selectedDept ? sansAccent(getDepartmentName(selectedDept)) : "";
    return senators.filter(s => {
      const matchesSearch = !q || sansAccent(`${s.first_name} ${s.last_name}`).includes(q) || sansAccent(s.department || "").includes(q);
      const matchesDept = !deptName || sansAccent(s.department || "").includes(deptName);
      return matchesSearch && matchesDept;
    });
  }, [senators, search, selectedDept]);

  // Revenir au début de la pagination dès qu'un filtre change.
  useEffect(() => { setVisible(12); }, [search, selectedDept]);
  const recherche = search.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl space-y-5 lg:max-w-none">
      {/* Recherche : en premier, compacte, résultats immédiats. */}
      <div className="mx-auto max-w-xl">
        <label htmlFor="recherche-elu" className="sr-only">Rechercher un sénateur par nom ou département</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input id="recherche-elu" type="search" inputMode="search" enterKeyHint="search" autoComplete="off"
            placeholder="Nom ou département…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-12 text-base text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:bg-slate-900" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground"><X size={18} /></button>}
        </div>{" "}
        {selectedDept && (
          <button type="button" onClick={() => setSelectedDept(null)} className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-red-500/10 px-3 text-xs font-bold text-red-700 dark:text-red-300">
            {getDepartmentName(selectedDept)} <X size={13} />
          </button>
        )}
      </div>{" "}

      {recherche && (
        <div className="mx-auto max-w-xl">
          <p className="mb-2 text-[13px] font-bold text-muted-foreground">
            {loading ? "Recherche…" : filteredSenators.length ? `${filteredSenators.length} sénateur${filteredSenators.length > 1 ? "s" : ""} trouvé${filteredSenators.length > 1 ? "s" : ""}` : "Aucun sénateur ne correspond."}
          </p>
          <ul className="space-y-2">
            {filteredSenators.slice(0, 8).map(s => (
              <li key={s.id}>
                <Link href={`/senateurs/${s.slug}`} className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md active:scale-[0.99] dark:bg-slate-900">
                  {s.photo_url
                    ? <img src={s.photo_url} alt="" loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-xl object-cover object-top" />
                    : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white">{s.first_name[0]}{s.last_name[0]}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-foreground">{s.first_name} {s.last_name}</span>{" "}
                    <span className="block truncate text-xs text-muted-foreground">{getFullPartyName(s.party)} · {s.department}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
          {filteredSenators.length > 8 && isPremium && <p className="mt-2 text-center text-xs text-muted-foreground">Les autres résultats sont dans la liste ci-dessous.</p>}
        </div>
      )}{" "}

      {isPremium ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6">
            <h2 className="mb-4 flex items-center gap-3 text-lg font-bold">
              <MapIcon className="h-5 w-5 text-red-700 dark:text-red-400" /> Par département
            </h2>
            <FranceMap onDepartmentSelect={(deptName) => setSelectedDept(deptName)} selectedDepartment={selectedDept} />
          </div>{" "}
          <div>
            <h2 className="mb-4 flex items-center gap-3 px-1 text-lg font-bold">
              <Users className="h-5 w-5 text-red-700 dark:text-red-400" /> {filteredSenators.length} sénateurs
            </h2>
            <div className="grid grid-cols-1 gap-x-4 gap-y-16 pt-10 sm:grid-cols-2">
              {loading
                ? Array(4).fill(0).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-500/10" />)
                : filteredSenators.slice(0, visible).map(s => <SenatorCard key={s.id} senator={s} />)}
            </div>
            {!loading && visible < filteredSenators.length && (
              <button onClick={() => setVisible(v => v + 12)} className="mx-auto mt-10 flex min-h-[48px] items-center rounded-full bg-slate-900 px-8 font-black text-white transition hover:bg-red-600 dark:bg-white dark:text-slate-900">
                Voir plus de sénateurs ({filteredSenators.length - visible} restants)
              </button>
            )}
          </div>
        </div>
      ) : (
        // Un seul encart, sous la recherche : ce que Premium ouvre, et le bouton pour l'avoir.
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-5 shadow-sm dark:border-amber-500/30 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3" aria-hidden>
              {filteredSenators.slice(0, 4).map(s => (
                <span key={s.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-200 dark:border-slate-900">
                  {s.photo_url && <img src={s.photo_url} alt="" loading="lazy" className="h-full w-full object-cover object-top blur-[2px]" />}
                </span>
              ))}
            </div>{" "}
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300"><Lock size={13} /> Premium</p>
          </div>{" "}
          <h3 className="mt-3 text-lg font-black leading-snug text-foreground">Parcourez les {senators.length || 348} sénateurs, département par département</h3>{" "}
          <p className="mt-1 text-sm text-muted-foreground">La liste complète et la carte interactive du Sénat. La recherche par nom reste ouverte à tous.</p>{" "}
          <Link href="/premium" className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-[15px] font-black text-slate-950 shadow transition hover:brightness-105 active:scale-[0.99]">
            <Crown size={17} /> Débloquer avec Premium
          </Link>
        </div>
      )}
    </div>
  );
}
