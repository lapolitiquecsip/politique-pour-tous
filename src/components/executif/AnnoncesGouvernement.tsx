"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, ChevronDown, ExternalLink, Landmark, Megaphone, ShieldCheck, Users, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * « Ce que le gouvernement annonce » — en tête de la page Exécutif.
 *
 * Alimenté plusieurs fois par jour par la chaîne d'agents du dépôt backend
 * (executif-annonces.ts) : collecte presse et sources officielles, tri (une annonce =
 * un événement, quel que soit le nombre d'articles), analyse détaillée, vérification
 * contre les pages lues. Ici on n'affiche que ce qui a été analysé (publie = true).
 */
type Montant = { montant: string; objet: string; nature: string };
type Annonce = {
  id: string; titre: string; chapo: string | null; ministere: string | null; porteur: string | null; type: string | null;
  importance: number; date_annonce: string; montants: Montant[]; sources: { titre: string; url: string; media?: string }[];
  verifie: boolean; nb_sources: number; analyse_le: string | null;
  analyse_detail: {
    mesures?: { titre: string; detail: string }[]; concernes?: string; calendrier?: string; financement?: string; contexte?: string;
    reactions?: { qui: string; position: string }[]; zones_d_ombre?: string[]; suite?: string;
  } | null;
};

const TYPES: Record<string, string> = { budget: "Budget", plan: "Plan", reforme: "Réforme", mesure: "Mesure", projet_de_loi: "Projet de loi", decret: "Décret", nomination: "Nomination", international: "International", autre: "Annonce" };
const FILTRES: [string, string, (a: Annonce) => boolean][] = [
  ["tout", "Toutes", () => true],
  ["majeures", "Majeures", a => a.importance >= 4],
  ["argent", "Avec des montants", a => (a.montants || []).length > 0],
  ["reformes", "Réformes et projets de loi", a => ["reforme", "projet_de_loi", "plan"].includes(a.type || "")],
];
const jour = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
const ilYa = (d: string) => { const h = Math.round((Date.now() - new Date(d).getTime()) / 36e5); return h < 1 ? "il y a moins d'une heure" : h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`; };

export default function AnnoncesGouvernement() {
  const [annonces, setAnnonces] = useState<Annonce[] | null>(null);
  const [filtre, setFiltre] = useState("tout");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [visibles, setVisibles] = useState(4);

  useEffect(() => {
    supabase.from("executif_annonces")
      .select("id, titre, chapo, ministere, porteur, type, importance, date_annonce, montants, sources, verifie, nb_sources, analyse_le, analyse_detail")
      .gte("date_annonce", new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10))
      .order("date_annonce", { ascending: false }).order("importance", { ascending: false }).limit(80)
      .then(({ data }) => setAnnonces((data as Annonce[]) || []));
  }, []);

  // À la une : les annonces majeures de la semaine d'abord (la plus importante en tête), puis le fil daté.
  const liste = useMemo(() => {
    const semaine = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const une = (a: Annonce) => a.importance >= 4 && a.date_annonce >= semaine;
    return (annonces || []).filter(FILTRES.find(f => f[0] === filtre)![2])
      .sort((a, b) => Number(une(b)) - Number(une(a)) || (une(a) ? b.importance - a.importance : 0) || b.date_annonce.localeCompare(a.date_annonce) || b.importance - a.importance);
  }, [annonces, filtre]);
  const derniere = useMemo(() => (annonces || []).map(a => a.analyse_le).filter(Boolean).sort().pop() as string | undefined, [annonces]);

  if (annonces && !annonces.length) return null;   // tant que la chaîne n'a rien publié

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white md:p-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Megaphone size={22} /></span>{" "}
          <div className="min-w-0 flex-1">
            <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight md:text-4xl">Ce que le gouvernement annonce</h2>{" "}
            <p className="mt-1 text-sm text-white/80">Chaque mesure, plan ou budget annoncé par l&apos;exécutif, expliqué et chiffré à partir des sources officielles et de la presse.</p>
          </div>
        </div>{" "}
        {derniere && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
            Mis à jour {ilYa(derniere)} · plusieurs fois par jour
          </p>
        )}
      </div>{" "}

      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
        {FILTRES.map(([id, label]) => (
          <button key={id} type="button" onClick={() => { setFiltre(id); setVisibles(4); }} aria-pressed={filtre === id}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${filtre === id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>{" "}

      {!annonces ? (
        <div className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (
        <ul className="divide-y divide-border">
          {liste.slice(0, visibles).map(a => <Carte key={a.id} a={a} ouverte={ouverte === a.id} basculer={() => setOuverte(o => (o === a.id ? null : a.id))} />)}
          {!liste.length && <li className="p-6 text-center text-sm text-muted-foreground">Aucune annonce de ce type ces dernières semaines.</li>}
        </ul>
      )}{" "}
      {liste.length > visibles && (
        <button type="button" onClick={() => setVisibles(v => v + 6)} className="flex w-full items-center justify-center gap-2 border-t border-border py-3.5 text-sm font-bold text-foreground hover:bg-muted">
          Voir plus d&apos;annonces <ChevronDown size={16} />
        </button>
      )}
    </section>
  );
}

function Carte({ a, ouverte, basculer }: { a: Annonce; ouverte: boolean; basculer: () => void }) {
  const an = a.analyse_detail || {};
  const bloc = (Icone: typeof Users, titre: string, texte?: string) => texte ? (
    <div className="flex gap-3">
      <Icone size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
      <div><p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{titre}</p><p className="mt-0.5 text-sm leading-relaxed text-foreground">{texte}</p></div>
    </div>
  ) : null;
  return (
    <li id={`annonce-${a.id}`} className="scroll-mt-32 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-muted-foreground">
        <span className="capitalize">{jour(a.date_annonce)}</span>
        {a.ministere && <><span aria-hidden>·</span><span>{a.ministere}</span></>}
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-foreground">{TYPES[a.type || "autre"] || "Annonce"}</span>
        {a.importance >= 4 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Majeure</span>}
      </div>{" "}
      <h3 className="mt-1.5 text-[17px] font-bold leading-snug text-foreground md:text-lg">{a.titre}</h3>{" "}
      {a.chapo && <p className={`mt-1.5 text-sm leading-relaxed text-muted-foreground ${ouverte ? "" : "line-clamp-3 md:line-clamp-none"}`}>{a.chapo}</p>}{" "}
      {(a.montants || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {a.montants.slice(0, 4).map((m, i) => (
            <span key={i} title={m.nature || undefined} className={`${i >= 2 ? "hidden md:inline-flex" : "inline-flex"}  max-w-full items-center gap-1.5 rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[12px] text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-200`}>
              <Wallet size={13} className="shrink-0" /><strong className={m.montant.length <= 18 ? "shrink-0 whitespace-nowrap font-black" : "font-black"}>{m.montant}</strong><span className="truncate">{m.objet}{m.nature ? ` · ${m.nature}` : ""}</span>
            </span>
          ))}
        </div>
      )}{" "}
      <button type="button" onClick={basculer} aria-expanded={ouverte}
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider text-blue-700 hover:text-blue-600 dark:text-blue-300">
        {ouverte ? "Refermer l'analyse" : "Lire l'analyse détaillée"} <ChevronDown size={15} className={`transition-transform ${ouverte ? "rotate-180" : ""}`} />
      </button>{" "}

      {ouverte && (
        <div className="mt-4 space-y-5 rounded-2xl bg-muted/60 p-4 md:p-5">
          {!!an.mesures?.length && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Ce qui est annoncé</p>
              <ul className="mt-2 space-y-2.5">
                {an.mesures.map((m, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" /><span><strong className="font-bold">{m.titre}.</strong> {m.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}{" "}
          <div className="grid gap-4 md:grid-cols-2">
            {bloc(Users, "Qui est concerné", an.concernes)}
            {bloc(CalendarClock, "Calendrier", an.calendrier)}
            {bloc(Wallet, "Financement et texte nécessaire", an.financement)}
            {bloc(Landmark, "Pourquoi maintenant", an.contexte)}
          </div>{" "}
          {!!an.reactions?.length && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Réactions</p>
              <ul className="mt-2 space-y-1.5">{an.reactions.map((r, i) => <li key={i} className="text-sm leading-relaxed text-foreground"><strong className="font-bold">{r.qui} :</strong> {r.position}</li>)}</ul>
            </div>
          )}{" "}
          {!!an.zones_d_ombre?.length && (
            <div className="rounded-xl bg-amber-500/10 p-3.5 ring-1 ring-amber-500/20">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300"><AlertTriangle size={13} /> Ce qui reste flou</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">{an.zones_d_ombre.map((z, i) => <li key={i}>{z}</li>)}</ul>
            </div>
          )}{" "}
          {bloc(CalendarClock, "Et ensuite", an.suite)}{" "}
          {!!a.sources?.length && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Sources</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {a.sources.map(s => (
                  <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" title={s.titre}
                    className="inline-flex max-w-[260px] items-center gap-1 rounded-lg bg-card px-2 py-1 text-[12px] font-semibold text-foreground ring-1 ring-border hover:ring-blue-500/50">
                    <span className="truncate">{s.media || new URL(s.url).hostname.replace(/^www\./, "")}</span><ExternalLink size={11} className="shrink-0 opacity-60" /></a></li>
                ))}
              </ul>
            </div>
          )}{" "}
          {/* Refermer depuis le bas : l'analyse est longue, inutile de remonter à la main. */}
          <button type="button" onClick={() => { basculer(); setTimeout(() => document.getElementById(`annonce-${a.id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 60); }}
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-card text-[13px] font-black text-blue-700 ring-1 ring-border dark:text-blue-300">
            Refermer l&apos;analyse <ChevronDown size={15} className="rotate-180" />
          </button>{" "}
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <ShieldCheck size={13} className="mt-px shrink-0" />
            Analyse rédigée par une IA à partir des {a.nb_sources} articles et communiqués repérés{a.verifie ? ", puis relue par un second agent qui a retiré ce que les pages lues n'attestaient pas" : ""}. Vérifiez la source avant de citer.
          </p>
        </div>
      )}
    </li>
  );
}
