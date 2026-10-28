"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { anGroupBySlug } from "@/lib/data/partyGroups";

/**
 * « Leurs votes à l'Assemblée » sur la fiche d'un parti : chaque scrutin, avec la position
 * de son groupe (majorité de ses votants) et le décompte. Par défaut les votes sur
 * l'ensemble d'un texte ; un onglet ouvre tous les scrutins, amendements compris.
 * Ancre #votes : le menu « Partis » de la page Assemblée y mène directement.
 */
type Vote = { id: string; date_scrutin: string; title: string | null; objet: string | null; resultat: string | null; group_results: any[]; dossier_id: string | null };
type Position = { cle: "pour" | "contre" | "abstention" | "partage" | "absent"; libelle: string; pour: number; contre: number; abstention: number };

const STYLES: Record<Position["cle"], string> = {
  pour: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-300",
  contre: "bg-rose-500/15 text-rose-800 ring-rose-500/30 dark:text-rose-300",
  abstention: "bg-slate-500/15 text-slate-700 ring-slate-500/30 dark:text-slate-300",
  partage: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  absent: "bg-muted text-muted-foreground ring-border",
};

function positionDuGroupe(v: Vote, po: string): Position {
  const g = (v.group_results || []).find((x: any) => x.group_id === po);
  const pour = g?.pour ?? 0, contre = g?.contre ?? 0, abstention = g?.abstention ?? 0, n = pour + contre + abstention;
  if (!n) return { cle: "absent", libelle: "N'a pas pris part", pour, contre, abstention };
  const max = Math.max(pour, contre, abstention);
  // Un groupe coupé (la position majoritaire réunit moins des deux tiers de ses votants) est dit partagé.
  if (max / n < 2 / 3) return { cle: "partage", libelle: "Partagé", pour, contre, abstention };
  return max === pour ? { cle: "pour", libelle: "Pour", pour, contre, abstention }
    : max === contre ? { cle: "contre", libelle: "Contre", pour, contre, abstention }
    : { cle: "abstention", libelle: "Abstention", pour, contre, abstention };
}

const sujet = (v: Vote) => {
  const t = (v.objet || v.title || "").replace(/^(sur )?l'ensemble (du |de la |de l'|des )?/i, "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const date = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function VotesDuGroupe({ slug }: { slug: string }) {
  const groupe = anGroupBySlug(slug);
  const [textes, setTextes] = useState(true);
  const [saisie, setSaisie] = useState("");
  const [recherche, setRecherche] = useState("");
  const [votes, setVotes] = useState<Vote[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [charge, setCharge] = useState(false);
  const vise = useRef(false);

  useEffect(() => { const t = setTimeout(() => setRecherche(saisie), 350); return () => clearTimeout(t); }, [saisie]);
  useEffect(() => { setPage(0); setVotes(null); }, [textes, recherche]);

  useEffect(() => {
    if (!groupe) return;
    let vivant = true;
    setCharge(true);
    api.getVotesDuGroupe({ page, textes, recherche }).then(r => {
      if (!vivant) return;
      setVotes(v => (page === 0 ? r.votes : [...(v || []), ...r.votes]) as Vote[]);
      setTotal(r.total); setCharge(false);
    });
    return () => { vivant = false; };
  }, [groupe, page, textes, recherche]);

  // Arrivée par le menu « Partis » (#votes) : la fiche se remplit en plusieurs temps, on se
  // recale sur la section une fois les votes affichés.
  useEffect(() => {
    if (vise.current || !votes?.length || window.location.hash !== "#votes") return;
    vise.current = true;
    for (const ms of [100, 900]) setTimeout(() => document.getElementById("votes")?.scrollIntoView({ block: "start" }), ms);
  }, [votes]);

  if (!groupe) return null;   // parti sans groupe à l'Assemblée

  // Bilan des votes affichés (sur les textes : la ligne de conduite du groupe).
  const positions = (votes || []).map(v => positionDuGroupe(v, groupe.po));
  const bilan = (["pour", "contre", "abstention", "partage"] as const).map(k => [k, positions.filter(p => p.cle === k).length] as const);

  return (
    <section id="votes" className="mt-12 scroll-mt-24">
      <h2 className="text-2xl font-staatliches uppercase text-foreground md:text-3xl">Leurs votes à l&apos;Assemblée</h2>{" "}
      <p className="mt-1 text-sm text-muted-foreground">
        La position du groupe <strong className="text-foreground">{groupe.name}</strong> sur chaque scrutin : celle de la majorité de ses députés votants.
      </p>{" "}

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Quels votes" className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/60 p-1 sm:w-[340px]">
          {([[true, "Sur les textes"], [false, "Tous (amendements)"]] as const).map(([v, l]) => (
            <button key={l} type="button" role="tab" aria-selected={textes === v} onClick={() => setTextes(v)}
              className={`min-h-[42px] rounded-xl px-2 text-[13px] font-bold transition ${textes === v ? "bg-card text-foreground shadow-sm dark:bg-slate-800" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>{" "}
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={saisie} onChange={e => setSaisie(e.target.value)} type="search" enterKeyHint="search" placeholder="Chercher un texte : retraites, budget, logement…"
            className="w-full min-h-[46px] rounded-2xl border border-border bg-card pl-10 pr-10 text-base text-foreground placeholder:text-muted-foreground focus:border-slate-400 focus:outline-none dark:bg-slate-900" />
          {saisie && <button type="button" onClick={() => setSaisie("")} aria-label="Effacer" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground"><X size={16} /></button>}
        </div>
      </div>{" "}

      {!!votes?.length && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
          <span><strong className="text-foreground">{total.toLocaleString("fr-FR")}</strong> scrutin{total > 1 ? "s" : ""}{recherche ? " correspondant" + (total > 1 ? "s" : "") : ""} · sur les {votes.length} affichés :</span>
          {bilan.filter(([, n]) => n).map(([k, n]) => (
            <span key={k} className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ${STYLES[k]}`}>{n} {k === "partage" ? "partagé" + (n > 1 ? "s" : "") : k}</span>
          ))}
        </div>
      )}{" "}

      {votes === null ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : !votes.length ? (
        <p className="mt-4 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Aucun scrutin ne correspond.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card dark:bg-slate-900">
          {votes.map((v, i) => {
            const p = positions[i];
            const adopte = /a adopté|adopté/i.test(v.resultat || "") && !/pas adopté/i.test(v.resultat || "");
            return (
              <li key={v.id} className="p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ring-1 ${STYLES[p.cle]}`}>{p.libelle}</span>
                  {p.cle !== "absent" && <span className="font-bold tabular-nums">{p.pour} pour · {p.contre} contre · {p.abstention} abst.</span>}
                  <span className="ml-auto">{date(v.date_scrutin)}</span>
                </div>{" "}
                <p className="mt-2 line-clamp-3 text-[15px] font-semibold leading-snug text-foreground">{sujet(v)}</p>{" "}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                  <span className={`font-bold ${adopte ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{adopte ? "Adopté par l'Assemblée" : "Rejeté par l'Assemblée"}</span>
                  {v.dossier_id && <Link href={`/lois/?dossier=${v.dossier_id}`} className="font-bold text-blue-700 hover:underline dark:text-blue-400">Voir le texte →</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}{" "}
      {votes && votes.length < total && (
        <button type="button" onClick={() => setPage(x => x + 1)} disabled={charge}
          className="mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-bold text-foreground hover:bg-muted disabled:opacity-60 dark:bg-slate-900">
          {charge ? <Loader2 size={16} className="animate-spin" /> : <>Voir plus de votes <ChevronDown size={16} /></>}
        </button>
      )}
    </section>
  );
}
