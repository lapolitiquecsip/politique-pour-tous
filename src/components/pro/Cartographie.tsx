"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Network, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Qui pèse sur ce sujet (Pro) : les parlementaires les plus actifs sur un sujet, d'après ce qu'ils
 * ont fait — interventions en séance, amendements déposés, amendements adoptés (Assemblée et
 * Sénat) — avec un score lisible (1 par intervention, 2 par amendement, 5 par amendement adopté),
 * le poids de chaque groupe, et leurs alliances : avec qui chacun cosigne ses amendements sur le
 * sujet. Tout est recalculé à la demande sur les données officielles (RPC cartographie_sujet).
 */

type Acteur = { chambre: "AN" | "SENAT"; slug: string; nom: string; groupe: string | null; interventions: number; questions: number; amendements: number; adoptes: number; score: number };
type Cosignature = { chambre: string; slug: string; groupe: string | null; cosignataires: string | null; sort: string | null };
const PERIODES: [string, string][] = [["90", "3 mois"], ["365", "12 mois"], ["", "Depuis 2024"]];
const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Cartographie() {
  const [saisie, setSaisie] = useState("");
  const [q, setQ] = useState("");
  const [periode, setPeriode] = useState("365");
  const [acteurs, setActeurs] = useState<Acteur[] | null>(null);
  const [cosig, setCosig] = useState<Cosignature[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQ(saisie.trim()), 600); return () => clearTimeout(t); }, [saisie]);

  useEffect(() => {
    if (q.length < 3) return;
    let actif = true;
    (async () => {
      setCharge(true); setErreur(false);
      const depuis = periode ? new Date(Date.now() - Number(periode) * 864e5).toISOString().slice(0, 10) : null;
      const [a, c] = await Promise.all([
        supabase.rpc("cartographie_sujet", { p_q: q, p_depuis: depuis, p_limite: 60 }),
        supabase.rpc("cosignatures_sujet", { p_q: q, p_depuis: depuis }),
      ]);
      if (!actif) return;
      if (a.error) { setErreur(true); setCharge(false); return; }
      setActeurs((a.data as Acteur[]) || []); setCosig((c.data as Cosignature[]) || []); setCharge(false);
    })();
    return () => { actif = false; };
  }, [q, periode]);

  // Poids de chaque groupe : somme des scores de ses membres.
  const groupes = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of acteurs || []) m.set(`${a.groupe || "—"}${a.chambre === "SENAT" ? " (Sénat)" : ""}`, (m.get(`${a.groupe || "—"}${a.chambre === "SENAT" ? " (Sénat)" : ""}`) || 0) + a.score);
    const total = [...m.values()].reduce((t, v) => t + v, 0) || 1;
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([g, v]) => ({ g, v, part: (v / total) * 100 }));
  }, [acteurs]);

  // Alliances : pour chacun des 15 premiers, les autres premiers qui cosignent ses amendements (nom de famille dans la liste).
  const allies = useMemo(() => {
    const tete = (acteurs || []).slice(0, 15);
    const famille = new Map(tete.map(a => [a.slug, plat(a.nom.split(" ").slice(1).join(" ") || a.nom)]));
    const out = new Map<string, { nom: string; n: number }[]>();
    for (const a of tete) {
      const compte = new Map<string, number>();
      for (const c of cosig.filter(x => x.slug === a.slug)) {
        const texte = plat(c.cosignataires || "");
        for (const b of tete) if (b.slug !== a.slug && famille.get(b.slug) && texte.includes(famille.get(b.slug)!)) compte.set(b.nom, (compte.get(b.nom) || 0) + 1);
      }
      out.set(a.slug, [...compte].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([nom, n]) => ({ nom, n })));
    }
    return out;
  }, [acteurs, cosig]);

  const max = acteurs?.[0]?.score || 1;

  return (
    <section className="rounded-[2rem] border border-border bg-card p-5 md:p-7">
      <h2 className="flex items-center gap-2 font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground"><Network size={22} className="text-violet-600" /> Qui pèse sur ce sujet</h2>{" "}
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Les parlementaires les plus actifs sur un sujet, d&apos;après leurs actes : interventions en séance, questions au Gouvernement, amendements déposés et adoptés.
        Score : 1 point par intervention ou question, 2 par amendement, 5 par amendement adopté. Puis le poids de chaque groupe, et qui cosigne avec qui.
      </p>{" "}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={saisie} onChange={e => setSaisie(e.target.value)} placeholder="Ex. : titre-restaurant, « logement social », éolien or photovoltaïque"
            className="w-full min-h-[46px] rounded-xl border border-border bg-background pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none" />
          {saisie && <button type="button" onClick={() => { setSaisie(""); setActeurs(null); }} aria-label="Effacer" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground"><X size={16} /></button>}
        </div>{" "}
        <div className="inline-flex shrink-0 gap-1 rounded-xl border border-border bg-background p-1">
          {PERIODES.map(([v, l]) => (
            <button key={v} type="button" onClick={() => setPeriode(v)} aria-pressed={periode === v}
              className={`min-h-[36px] rounded-lg px-3 text-[12px] font-bold transition ${periode === v ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>{" "}

      {q.length < 3 ? <p className="mt-6 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Tapez un sujet pour voir qui le porte au Parlement.</p>
        : charge ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-violet-600" /></div>
        : erreur ? <p className="mt-6 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">Le calcul n&apos;a pas abouti. Vérifiez la formulation et réessayez.</p>
        : acteurs && !acteurs.length ? <p className="mt-6 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Aucun parlementaire n&apos;a agi sur ce sujet pendant la période.</p>
        : acteurs && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <ol className="space-y-2">
            {acteurs.slice(0, 30).map((a, i) => {
              const al = allies.get(a.slug) || [];
              return (
                <li key={`${a.chambre}${a.slug}`} className="rounded-2xl border border-border bg-background p-3.5">
                  <div className="flex items-baseline gap-2">
                    <span className="w-6 shrink-0 text-center font-staatliches text-lg text-muted-foreground">{i + 1}</span>{" "}
                    <Link href={`/${a.chambre === "SENAT" ? "senateurs" : "deputes"}/${a.slug}`} className="min-w-0 truncate font-black text-foreground hover:underline">{a.nom}</Link>{" "}
                    <span className="truncate text-[12px] text-muted-foreground">{a.groupe}{a.chambre === "SENAT" ? " · Sénat" : ""}</span>{" "}
                    <span className="ml-auto shrink-0 font-black tabular-nums text-foreground">{a.score}</span>
                  </div>{" "}
                  {/* Barre : interventions, amendements, adoptés. */}
                  <div className="ml-8 mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(8, (a.score / max) * 100)}%` }} aria-hidden>
                    <span className="bg-amber-500" style={{ flex: a.interventions }} /><span className="bg-rose-400" style={{ flex: a.questions }} /><span className="bg-sky-500" style={{ flex: 2 * (a.amendements - a.adoptes) }} /><span className="bg-emerald-500" style={{ flex: 7 * a.adoptes }} />
                  </div>{" "}
                  <p className="ml-8 mt-1.5 text-[12px] text-muted-foreground">
                    {a.interventions} intervention{a.interventions > 1 ? "s" : ""} · {a.questions} question{a.questions > 1 ? "s" : ""} · {a.amendements} amendement{a.amendements > 1 ? "s" : ""} dont <strong className="text-emerald-700 dark:text-emerald-400">{a.adoptes} adopté{a.adoptes > 1 ? "s" : ""}</strong>
                    {al.length > 0 && <> · cosigne avec {al.map(x => `${x.nom} (${x.n})`).join(", ")}</>}
                  </p>
                </li>
              );
            })}
          </ol>{" "}
          <aside className="space-y-5">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Poids des groupes</h3>{" "}
              <ul className="mt-2 space-y-2">
                {groupes.map(g => (
                  <li key={g.g} className="text-[13px]">
                    <div className="flex justify-between gap-2"><span className="truncate font-bold text-foreground">{g.g}</span><span className="tabular-nums text-muted-foreground">{Math.round(g.part)} %</span></div>{" "}
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-violet-500" style={{ width: `${g.part}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>{" "}
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />interventions · <span className="mx-1 inline-block h-2 w-2 rounded-full bg-rose-400" />questions · <span className="mx-1 inline-block h-2 w-2 rounded-full bg-sky-500" />amendements · <span className="mx-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />adoptés.
              Interventions et questions : Assemblée seulement pour l&apos;instant ; au Sénat, les amendements.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
