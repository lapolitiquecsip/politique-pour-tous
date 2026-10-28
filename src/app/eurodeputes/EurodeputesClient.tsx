"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Star, X, ChevronDown } from "lucide-react";

// Dégradé par groupe (vraies teintes des groupes du Parlement européen) pour des badges modernes.
// Les clés sont écrites en majuscules et la recherche normalise le code : la base livre le
// sigle avec sa typographie d'origine (« PfE »), et une clé « PFE » faisait retomber le
// plus gros groupe français sur le gris des non-inscrits, sans nom ni orientation.
const GROUP_GRAD: Record<string, [string, string]> = {
  RE:    ["#F5B301", "#E08A00"],  // Renew — or/ambre
  PPE:   ["#3B82F6", "#1D4ED8"],  // PPE — bleu
  SD:    ["#F0426B", "#C81E4E"],  // S&D — rouge social
  VERTS: ["#3EAA35", "#237A1E"],  // Verts/ALE — vert
  PFE:   ["#334155", "#0F172A"],  // Patriotes pour l'Europe — ardoise
  ECR:   ["#2563EB", "#0C2E6E"],  // ECR — bleu profond
  GUE:   ["#E5342A", "#A21B14"],  // La Gauche — rouge vif
  ESN:   ["#4338CA", "#312E81"],  // ESN — indigo
  NI:    ["#94A3B8", "#64748B"],  // Non-inscrits — gris
};
/** Normalise le sigle avant toute recherche : « PfE » et « PFE » désignent le même groupe. */
const cle = (code?: string | null) => (code || "NI").toUpperCase();
const grad = (code: string): [string, string] => GROUP_GRAD[cle(code)] || GROUP_GRAD.NI;

// Nom complet + orientation de chaque groupe (pour expliquer les abréviations à l'utilisateur).
const GROUP_NAME: Record<string, string> = {
  RE: "Renew Europe — centristes & libéraux",
  PPE: "Parti populaire européen — droite & centre-droit",
  SD: "Sociaux-démocrates (S&D) — centre-gauche",
  VERTS: "Les Verts / ALE — écologistes",
  PFE: "Patriotes pour l'Europe — droite nationaliste",
  ECR: "Conservateurs & Réformistes (ECR) — droite souverainiste",
  GUE: "La Gauche (GUE/NGL) — gauche radicale",
  ESN: "L'Europe des Nations souveraines — extrême droite",
  NI: "Non-inscrits — sans groupe",
};
const groupName = (code: string) => GROUP_NAME[cle(code)] || code;

/**
 * Les 81 eurodéputés français. Parcours mobile (28/10/2026) : la recherche d'abord, les
 * groupes en une ligne de pastilles qui défile au doigt (le nom complet du groupe choisi
 * s'affiche dessous, et « Que signifient ces sigles ? » les explique tous), puis 12
 * eurodéputés et « Voir les autres » — au lieu de onze lignes de groupes et de 81 photos
 * d'un coup, une dizaine d'écrans à faire défiler.
 */
const PAR_PAGE = 12;

export default function EurodeputesClient({ meps }: { meps: any[] }) {
  const [q, setQ] = useState("");
  // Pré-filtre par groupe si l'URL le précise (ex. clic sur un secteur de l'hémicycle → ?group=CODE).
  const [group, setGroup] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("group"));
  const [limite, setLimite] = useState(PAR_PAGE);

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
  useEffect(() => { setLimite(PAR_PAGE); }, [q, group]);

  return (
    <div className="pb-12">
      <div className="container mx-auto max-w-6xl space-y-5 px-4 pt-8 md:pt-10">
        <div className="text-center">
          <h2 className="font-staatliches text-4xl uppercase leading-none tracking-tight text-[#003399] dark:text-white md:text-6xl">
            Trouvez votre <span className="text-[#FFCC00]">eurodéputé</span>
          </h2>{" "}
          <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            <Star size={14} className="mr-1 inline fill-[#FFCC00] text-[#FFCC00]" />{meps.length} eurodéputés français. Ouvrez une fiche pour voir ses votes par thème et sa présence.
          </p>
        </div>{" "}

        <div className="relative mx-auto max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input id="recherche-elu" type="search" inputMode="search" enterKeyHint="search" autoComplete="off"
            value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher un eurodéputé par nom ou parti"
            placeholder="Nom ou parti…"
            className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-12 text-base text-foreground shadow-sm outline-none focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground"><X size={18} /></button>}
        </div>{" "}

        {/* Groupes : une ligne qui défile au doigt (retour à la ligne sur ordinateur). */}
        <div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrer par groupe">
            <button type="button" onClick={() => setGroup(null)} aria-pressed={group === null}
              className={`flex min-h-[40px] shrink-0 items-center rounded-full border px-4 text-[13px] font-black transition ${group === null ? "border-[#003399] bg-[#003399] text-white shadow" : "border-border bg-card text-muted-foreground dark:border-slate-700 dark:bg-slate-900"}`}>
              Tous · {meps.length}
            </button>
            {groups.map(([g, n]) => {
              const actif = group === g;
              return (
                <button key={g} type="button" onClick={() => setGroup(actif ? null : g)} aria-pressed={actif} title={groupName(g)}
                  style={actif ? { background: `linear-gradient(135deg, ${grad(g)[0]}, ${grad(g)[1]})` } : undefined}
                  className={`flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-black transition ${actif ? "border-transparent text-white shadow" : "border-border bg-card text-foreground dark:border-slate-700 dark:bg-slate-900"}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: actif ? "rgba(255,255,255,0.9)" : grad(g)[0] }} />
                  {g} <span className={actif ? "text-white/75" : "text-muted-foreground"}>{n}</span>
                </button>
              );
            })}
          </div>{" "}
          <div className="mt-2 text-center text-[13px] text-muted-foreground">
            {group ? <span><strong className="text-foreground">{group}</strong> : {groupName(group)}</span> : (
              <details className="inline-block text-left">
                <summary className="cursor-pointer text-center font-bold text-[#003399] dark:text-[#8CA6E8]">Que signifient ces sigles ?</summary>
                <ul className="mt-2 space-y-1">
                  {groups.map(([g]) => <li key={g}><strong className="text-foreground">{g}</strong> : {groupName(g)}</li>)}
                </ul>
              </details>
            )}
          </div>
        </div>{" "}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {shown.slice(0, limite).map(m => {
            const g = grad(m.ep_group_code);
            return (
            <Link
              key={m.id}
              href={`/eurodeputes/${m.slug}`}
              // Carte teintée de la couleur du groupe (bordure + fond dégradé du groupe).
              style={{ borderColor: `${g[0]}80`, background: `linear-gradient(180deg, ${g[0]}10 0%, ${g[0]}1f 62%, ${g[0]}33 100%)` }}
              className="group overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.photo_url}
                  alt={m.full_name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top transition group-hover:scale-105"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=003399&color=fff&size=256`; }}
                />
                <span
                  title={groupName(m.ep_group_code)}
                  className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg ring-1 ring-white/40"
                  style={{ background: `linear-gradient(135deg, ${grad(m.ep_group_code)[0]}, ${grad(m.ep_group_code)[1]})` }}
                >
                  {m.ep_group_code}
                </span>
              </div>{" "}
              <div className="p-2.5 md:p-3">
                {/* Nom TOUJOURS lisible (blanc en sombre) : la couleur du groupe reste sur le badge. */}
                <p className="text-[13px] font-bold leading-tight text-foreground dark:text-white line-clamp-2 md:text-sm">{m.full_name}</p>{" "}
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground dark:text-slate-300 line-clamp-1">{m.national_party}</p>
              </div>{" "}
            </Link>
            );
          })}
        </div>{" "}
        {shown.length === 0 && <p className="py-12 text-center text-sm italic text-slate-400">Aucun eurodéputé ne correspond.</p>}
        {shown.length > limite && (
          <button type="button" onClick={() => setLimite(l => l + 24)}
            className="mx-auto flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-[#003399]/30 bg-card text-[15px] font-black text-[#003399] transition hover:bg-[#003399]/5 dark:bg-slate-900 dark:text-[#8CA6E8]">
            Voir {Math.min(24, shown.length - limite)} autres eurodéputés <ChevronDown size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
