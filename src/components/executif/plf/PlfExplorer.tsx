"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight, ArrowLeft, ArrowUpRight, BookOpen, ChevronDown, ExternalLink, FileText, Info, Layers, Minus, Scale, Sparkles,
} from "lucide-react";
import { ANNEES, PLF, PLF_VERIFIE_LE, NOTES_PERIMETRE, type Mission, type PlfAnnee } from "@/lib/data/plf";
import { libelleCourt, missionsDe, totalCP } from "@/lib/data/plf/missions";

type Niveau = "simple" | "detaille";
type Comparaison = null | PlfAnnee | "tout";

/* ------------------------------------------------------------------ formats */
const nf1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const mdM = (meur: number) => `${nf1(meur / 1e3)} Md€`;
const pct = (n: number) => `${nf1(n)} %`;
// signe explicite ; un écart qui s'arrondit à zéro s'affiche « 0,0 » (jamais « −0,0 »)
const signe = (n: number, f: (x: number) => string) => {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? f(0) : (r > 0 ? "+" : "−") + f(Math.abs(n));
};

const REF = 2027 as const;
// notes purement explicatives (pas un changement de périmètre)
const INFO = new Set(["remboursements-et-degrevements"]);
const AUTRES = (y: PlfAnnee) => ANNEES.filter((a) => a !== y);

/* ------------------------------------------------------------ données utiles */
function depensesSimples(a: PlfAnnee) {
  // Dépenses du budget général hors remboursements et dégrèvements d'impôts d'État (le total officiel
  // « dépenses du budget général ») : toutes les missions sauf R&D, + les dégrèvements d'impôts locaux.
  const ms = missionsDe(a);
  const rd = ms.find((m) => m.cle === "remboursements-et-degrevements");
  const locaux = rd?.programmes.find((p) => /locaux/i.test(p.programme))?.cp ?? 0;
  const lignes: { cle: string; label: string; cp: number }[] = [];
  for (const m of ms) {
    if (m.cle === "remboursements-et-degrevements") continue;
    if (m.cle === "engagements-financiers-de-l-etat") {
      // on isole les intérêts de la dette (comparables d'une année à l'autre) du reste des engagements
      const interets = m.programmes.filter((p) => /^Charge de la dette/i.test(p.programme)).reduce((s, p) => s + p.cp, 0);
      lignes.push({ cle: "interets-dette", label: "Intérêts de la dette", cp: interets });
      lignes.push({ cle: "autres-engagements", label: "Autres engagements financiers", cp: m.cp - interets });
      continue;
    }
    lignes.push({ cle: m.cle, label: libelleCourt(m), cp: m.cp });
  }
  lignes.push({ cle: "degrevements-locaux", label: "Dégrèvements d'impôts locaux", cp: locaux });
  return lignes.sort((x, y) => y.cp - x.cp);
}

function Delta({ v, f, inverse = false, small = false }: { v: number | null; f: (x: number) => string; inverse?: boolean; small?: boolean }) {
  if (v === null || Number.isNaN(v)) return <span className="text-muted-foreground">—</span>;
  const nul = Math.round(v * 10) === 0; // un écart qui s’arrondit à 0,0 est « stable »
  const hausse = v > 0;
  // inverse : une hausse est une dégradation (déficit, dette) → rouge
  const bon = inverse ? !hausse : hausse;
  const cls = nul ? "text-muted-foreground" : bon ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
  const Ic = nul ? Minus : hausse ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-black tabular-nums ${small ? "text-[11px]" : "text-xs"} ${cls}`}>
      <Ic size={small ? 11 : 13} />
      {nul ? "stable" : signe(v, f)}
    </span>
  );
}

/* ======================================================================= */
export default function PlfExplorer() {
  const [niveau, setNiveau] = useState<Niveau>("simple");
  const [comp, setComp] = useState<Comparaison>(null);
  const plf = PLF[REF];

  // Vue partageable : ?niveau=detaille&comparer=2026|2025|2024|tout
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = q.get("niveau") === "detaille" ? "detaille" : "simple";
    const c = q.get("comparer");
    setNiveau(n);
    if (c === "tout" && n === "detaille") setComp("tout");
    else if (c && ["2026", "2025", "2024"].includes(c)) setComp(Number(c) as PlfAnnee);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    if (niveau === "detaille") q.set("niveau", "detaille");
    if (comp !== null) q.set("comparer", String(comp));
    const url = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [niveau, comp]);

  const choixComp: { v: Comparaison; label: string }[] = [
    { v: null, label: "Aucune" },
    ...AUTRES(REF).map((a) => ({ v: a as Comparaison, label: `PLF ${a}` })),
    ...(niveau === "detaille" ? [{ v: "tout" as Comparaison, label: "Les 4 PLF" }] : []),
  ];
  const changerNiveau = (n: Niveau) => { setNiveau(n); if (n === "simple" && comp === "tout") setComp(2026); };

  return (
    <div className="mx-auto max-w-6xl overflow-x-clip px-4">
      <Link href="/executif" className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-orange-600">
        <ArrowLeft size={14} /> Exécutif
      </Link>

      {/* En-tête */}
      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            <Sparkles size={12} /> À la une
          </span>
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-left text-[10px] font-black uppercase leading-snug tracking-widest text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" /></span>
            {plf.statut}
          </span>
        </div>
        <h1 className="font-staatliches text-5xl uppercase leading-none tracking-tight text-foreground md:text-7xl">
          Budget 2027 : <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">le PLF décrypté</span>
        </h1>
        <p className="mt-3 max-w-3xl text-base text-muted-foreground md:text-lg">
          Le projet de loi de finances pour 2027 ({plf.numero}), déposé par le gouvernement {plf.premierMinistre.split(" ").pop()} le {plf.depot}. Deux niveaux de lecture, et la comparaison avec les PLF 2026, 2025 et 2024.
        </p>
      </header>

      {/* Commandes */}
      <div className="sticky top-16 z-20 -mx-4 mb-8 border-y border-border bg-background/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-2xl md:border md:bg-card md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:inline">Analyse</span>
            <div className="inline-flex rounded-xl border border-border bg-muted p-1" role="tablist" aria-label="Niveau d'analyse">
              {(["simple", "detaille"] as Niveau[]).map((n) => (
                <button key={n} role="tab" aria-selected={niveau === n} onClick={() => changerNiveau(n)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-black transition ${niveau === n ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {n === "simple" ? "Simple" : "Détaillée"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><Scale size={12} /> Comparer avec</span>
            {choixComp.map((c) => (
              <button key={String(c.v)} onClick={() => setComp(c.v)} aria-pressed={comp === c.v}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${comp === c.v ? "border-orange-600 bg-orange-600 text-white" : "border-border bg-card text-foreground hover:border-orange-400"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {comp !== null && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Comparaison de <b>projets initiaux</b> (textes déposés par le Gouvernement), en euros courants — pas des lois finalement votées.
          </p>
        )}
      </div>

      {niveau === "simple" ? <VueSimple comp={comp === "tout" ? null : comp} /> : <VueDetaillee comp={comp} />}

      <Sources />
    </div>
  );
}

/* ======================================================================= */
/* NIVEAU SIMPLE                                                           */
/* ======================================================================= */
function VueSimple({ comp }: { comp: PlfAnnee | null }) {
  const p = PLF[REF];
  const r = comp ? PLF[comp] : null;
  const dep = depensesSimples(REF);
  const depR = comp ? depensesSimples(comp) : [];
  const parCle = new Map(depR.map((d) => [d.cle, d.cp]));
  const TOP = 14;
  const top = dep.slice(0, TOP);
  const autres = dep.slice(TOP);
  const autresCp = autres.reduce((s, d) => s + d.cp, 0);
  const autresR = comp ? depR.filter((d) => !top.some((t) => t.cle === d.cle)).reduce((s, d) => s + d.cp, 0) : 0;
  const max = Math.max(...top.map((d) => d.cp), ...(comp ? top.map((d) => parCle.get(d.cle) ?? 0) : [0]));

  const chiffres = [
    { label: "Dépenses de l'État", v: p.etat.depensesNettes, rv: r?.etat.depensesNettes, f: (x: number) => `${nf1(x)} Md€`, inverse: false, neutre: true },
    { label: "Impôts encaissés (nets)", v: p.recettes.nettes / 1e3, rv: r ? r.recettes.nettes / 1e3 : undefined, f: (x: number) => `${nf1(x)} Md€`, inverse: false, neutre: true },
    { label: "Déficit de l'État", v: -p.etat.solde, rv: r ? -r.etat.solde : undefined, f: (x: number) => `${nf1(x)} Md€`, inverse: true },
    { label: "Déficit public visé", v: p.macro.deficit, rv: r?.macro.deficit, f: (x: number) => `${nf1(x)} % du PIB`, inverse: true },
    { label: "Dette publique", v: p.macro.dette, rv: r?.macro.dette, f: (x: number) => `${nf1(x)} % du PIB`, inverse: true },
  ];

  const recettes = (y: PlfAnnee) => {
    const x = PLF[y].recettes;
    const autres = x.brutes - x.ir - x.is - x.tva - x.energie;
    return [
      { k: "tva", label: "TVA", v: x.tva }, { k: "ir", label: "Impôt sur le revenu", v: x.ir },
      { k: "is", label: "Impôt sur les sociétés", v: x.is }, { k: "en", label: PLF[y].energieLibelle, v: x.energie },
      { k: "au", label: "Autres impôts", v: autres },
    ];
  };
  const rec = recettes(REF);
  const recR = comp ? recettes(comp) : [];
  const recMax = Math.max(...rec.map((x) => x.v), ...recR.map((x) => x.v));

  return (
    <div className="space-y-8">
      {/* 4 chiffres */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {chiffres.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-staatliches text-3xl leading-none text-foreground md:text-4xl">{c.f(c.v)}</p>
            {comp && c.rv !== undefined && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{comp} : {c.f(c.rv)}</span>
                {c.neutre
                  ? <span className="font-black tabular-nums text-foreground">{signe(c.v - c.rv, (x) => `${nf1(x)}`)}</span>
                  : <Delta v={c.v - c.rv} f={(x) => nf1(x)} inverse={c.inverse} />}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Où va l'argent */}
      <section className="rounded-3xl border border-border bg-card p-5 md:p-8">
        <h2 className="font-staatliches text-3xl uppercase tracking-tight text-foreground">Où va l’argent</h2>
        <p className="mb-5 text-sm text-muted-foreground">Crédits de paiement 2027, en milliards d’euros{comp ? ` — comparés au PLF ${comp}` : ""}.</p>
        <ul className="space-y-2.5">
          {top.map((d) => {
            const rv = comp ? parCle.get(d.cle) : undefined;
            return (
              <li key={d.cle}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-bold text-foreground">{d.label}</span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    {comp && <Delta v={rv !== undefined ? (d.cp - rv) / 1e9 : null} f={(x) => `${nf1(x)}`} small />}
                    <span className="font-black tabular-nums text-foreground">{nf1(d.cp / 1e9)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${(d.cp / max) * 100}%` }} />
                </div>
                {comp && (
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-transparent">
                    <div className="h-full rounded-full bg-slate-400/70 dark:bg-slate-500" style={{ width: `${((rv ?? 0) / max) * 100}%` }} />
                  </div>
                )}
              </li>
            );
          })}
          <li className="flex items-baseline justify-between border-t border-border pt-2.5 text-sm">
            <span className="font-bold text-muted-foreground">Autres missions ({autres.length})</span>
            <span className="flex items-baseline gap-2">
              {comp && <Delta v={(autresCp - autresR) / 1e9} f={(x) => nf1(x)} small />}
              <span className="font-black tabular-nums text-foreground">{nf1(autresCp / 1e9)}</span>
            </span>
          </li>
        </ul>
        {comp && <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-block h-1.5 w-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" /> 2027 <span className="ml-2 inline-block h-1.5 w-6 rounded-full bg-slate-400/70" /> {comp}</p>}
      </section>

      {/* D'où vient l'argent */}
      <section className="rounded-3xl border border-border bg-card p-5 md:p-8">
        <h2 className="font-staatliches text-3xl uppercase tracking-tight text-foreground">D’où vient l’argent</h2>
        <p className="mb-5 text-sm text-muted-foreground">Impôts perçus par l’État en 2027, avant remboursements, en milliards d’euros.</p>
        <ul className="space-y-2.5">
          {rec.map((x) => {
            const rv = recR.find((y) => y.k === x.k)?.v;
            return (
              <li key={x.k}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold text-foreground">{x.label}</span>
                  <span className="flex items-baseline gap-2">
                    {comp && <Delta v={rv !== undefined ? (x.v - rv) / 1e3 : null} f={(z) => nf1(z)} small />}
                    <span className="font-black tabular-nums text-foreground">{nf1(x.v / 1e3)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600" style={{ width: `${(x.v / recMax) * 100}%` }} />
                </div>
                {comp && rv !== undefined && (
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full"><div className="h-full rounded-full bg-slate-400/70 dark:bg-slate-500" style={{ width: `${(rv / recMax) * 100}%` }} /></div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Après {mdM(p.recettes.remboursements)} de remboursements d’impôts, il reste <b className="text-foreground">{mdM(p.recettes.nettes)}</b>.
        </p>
      </section>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <Layers size={18} className="mt-0.5 shrink-0" />
        <p>Pour les hypothèses, chaque mission en détail, les mesures phares et leurs articles, passez en <b>analyse détaillée</b>.</p>
      </div>
    </div>
  );
}

/* ======================================================================= */
/* NIVEAU DÉTAILLÉ                                                         */
/* ======================================================================= */
function Section({ titre, sous, children, id }: { titre: string; sous?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-border bg-card p-5 md:p-8">
      <h2 className="font-staatliches text-3xl uppercase tracking-tight text-foreground">{titre}</h2>
      {sous && <p className="mb-5 mt-0.5 text-sm text-muted-foreground">{sous}</p>}
      {children}
    </section>
  );
}

type Ligne = { label: string; get: (y: PlfAnnee) => number | null; f: (x: number) => string; inverse?: boolean; neutre?: boolean; note?: (y: PlfAnnee) => string | undefined; df?: (x: number) => string };

function TableauComparatif({ lignes, colonnes }: { lignes: Ligne[]; colonnes: PlfAnnee[] }) {
  const ref = colonnes[0];
  const cmp = colonnes.length === 2 ? colonnes[1] : colonnes.length === 4 ? colonnes[3] : null;
  return (
    <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <th className="py-2 pr-3">Indicateur</th>
            {colonnes.map((c) => <th key={c} className={`py-2 pr-3 text-right ${c === ref ? "text-orange-700 dark:text-orange-400" : ""}`}>PLF {c}</th>)}
            {cmp && <th className="py-2 text-right">Écart {cmp}→{ref}</th>}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const a = l.get(ref); const b = cmp ? l.get(cmp) : null;
            return (
              <tr key={l.label} className="border-b border-border/60 align-top">
                <td className="py-2.5 pr-3 font-semibold text-foreground">{l.label}</td>
                {colonnes.map((c) => {
                  const v = l.get(c); const n = l.note?.(c);
                  return (
                    <td key={c} className={`py-2.5 pr-3 text-right tabular-nums ${c === ref ? "font-black text-foreground" : "text-muted-foreground"}`}>
                      {v === null ? "—" : l.f(v)}
                      {n && <span className="block text-[10px] font-normal leading-tight text-muted-foreground">{n}</span>}
                    </td>
                  );
                })}
                {cmp && (
                  <td className="py-2.5 text-right">
                    {a === null || b === null ? "—" : l.neutre
                      ? <span className="text-xs font-black tabular-nums text-foreground">{signe(a - b, l.df ?? ((x) => nf1(x)))}</span>
                      : <Delta v={a - b} f={l.df ?? ((x) => nf1(x))} inverse={l.inverse} />}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VueDetaillee({ comp }: { comp: Comparaison }) {
  const colonnes: PlfAnnee[] = comp === "tout" ? [2027, 2026, 2025, 2024] : comp ? [REF, comp] : [REF];

  const macro: Ligne[] = [
    { label: "Croissance du PIB (hypothèse)", get: (y) => PLF[y].macro.croissance, f: pct, df: (x) => `${nf1(x)} pt` },
    { label: "Inflation (hypothèse)", get: (y) => PLF[y].macro.inflation, f: pct, neutre: true, df: (x) => `${nf1(x)} pt` },
    { label: "Déficit public visé", get: (y) => PLF[y].macro.deficit, f: (x) => `${nf1(x)} % du PIB`, inverse: true, df: (x) => `${nf1(x)} pt`, note: (y) => (PLF[y].macro.deficitNote ? "texte initial (5,0 % visés après amendements)" : undefined) },
    { label: "Déficit de l'année précédente (prévision du PLF)", get: (y) => PLF[y].macro.deficitAnneePrecedente.valeur, f: (x) => `${nf1(x)} % du PIB`, inverse: true, df: (x) => `${nf1(x)} pt`, note: (y) => `${PLF[y].macro.deficitAnneePrecedente.annee}${PLF[y].macro.deficitAnneePrecedente.note ? ` — ${PLF[y].macro.deficitAnneePrecedente.note}` : ""}` },
    { label: "Dette publique", get: (y) => PLF[y].macro.dette, f: (x) => `${nf1(x)} % du PIB`, inverse: true, df: (x) => `${nf1(x)} pt` },
    { label: "Dépense publique (hors crédits d'impôt)", get: (y) => PLF[y].macro.depensePublique, f: (x) => `${nf1(x)} % du PIB`, neutre: true, df: (x) => `${nf1(x)} pt`, note: (y) => (PLF[y].macro.depensePubliqueMd ? `${PLF[y].macro.depensePubliqueMd!.toLocaleString("fr-FR")} Md€` : undefined) },
    { label: "Prélèvements obligatoires", get: (y) => PLF[y].macro.prelevementsObligatoires, f: (x) => `${nf1(x)} % du PIB`, neutre: true, df: (x) => `${nf1(x)} pt` },
  ];
  const etat: Ligne[] = [
    { label: "Solde budgétaire de l'État", get: (y) => PLF[y].etat.solde, f: (x) => signe(x, (z) => `${nf1(z)} Md€`), df: (x) => `${nf1(x)} Md€`, note: (y) => (PLF[y].etat.soldeNote ? "texte initial" : undefined) },
    { label: "Dépenses du budget général (nettes)", get: (y) => PLF[y].etat.depensesNettes, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€` },
    { label: "dont charge de la dette (y c. SNCF Réseau)", get: (y) => PLF[y].etat.chargeDette, f: (x) => `${nf1(x)} Md€`, inverse: true, df: (x) => `${nf1(x)} Md€` },
    { label: "Périmètre des dépenses de l'État (norme)", get: (y) => PLF[y].etat.pde, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€`, note: () => "format de chaque PLF" },
    { label: "Crédits du budget général (bruts, CP)", get: (y) => totalCP(y) / 1e9, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€`, note: () => "y c. remboursements d'impôts" },
    { label: "Recettes fiscales nettes", get: (y) => PLF[y].recettes.nettes / 1e3, f: (x) => `${nf1(x)} Md€`, df: (x) => `${nf1(x)} Md€` },
    { label: "Recettes non fiscales", get: (y) => PLF[y].recettes.nonFiscales / 1e3, f: (x) => `${nf1(x)} Md€`, df: (x) => `${nf1(x)} Md€`, note: (y) => (y === 2027 ? "non-reconduction de 13 Md€ de recettes exceptionnelles 2026" : undefined) },
    { label: "Prélèvement sur recettes — Union européenne", get: (y) => PLF[y].recettes.psrUE / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€` },
    { label: "Prélèvements sur recettes — collectivités", get: (y) => PLF[y].recettes.psrCollectivites / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€`, note: (y) => (y === 2026 ? "dont +5,2 Md€ de périmètre (TVA des régions réintégrée dans la DGF)" : undefined) },
  ];
  const recettes: Ligne[] = [
    { label: "Taxe sur la valeur ajoutée (TVA)", get: (y) => PLF[y].recettes.tva / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€` },
    { label: "Impôt sur le revenu", get: (y) => PLF[y].recettes.ir / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€` },
    { label: "Impôt sur les sociétés", get: (y) => PLF[y].recettes.is / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€` },
    { label: "Énergie (part de l'État)", get: (y) => PLF[y].recettes.energie / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€`, note: (y) => PLF[y].energieLibelle },
    { label: "Recettes fiscales brutes", get: (y) => PLF[y].recettes.brutes / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€` },
    { label: "− Remboursements et dégrèvements", get: (y) => PLF[y].recettes.remboursements / 1e3, f: (x) => `${nf1(x)} Md€`, neutre: true, df: (x) => `${nf1(x)} Md€` },
    { label: "= Recettes fiscales nettes", get: (y) => PLF[y].recettes.nettes / 1e3, f: (x) => `${nf1(x)} Md€`, df: (x) => `${nf1(x)} Md€` },
  ];

  return (
    <div className="space-y-6">
      {/* Fiche d'identité */}
      <Section titre="Le texte" sous="Fiche d'identité de chaque projet de loi de finances.">
        <div className={`grid gap-4 ${colonnes.length > 2 ? "md:grid-cols-2 xl:grid-cols-4" : colonnes.length === 2 ? "md:grid-cols-2" : ""}`}>
          {colonnes.map((y) => {
            const x = PLF[y];
            return (
              <div key={y} className={`rounded-2xl border p-4 ${y === REF ? "border-orange-300 bg-orange-50/50 dark:border-orange-500/30 dark:bg-orange-500/5" : "border-border bg-muted/40"}`}>
                <p className="font-staatliches text-2xl leading-none text-foreground">PLF {y}</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div><dt className="inline font-bold text-foreground">Déposé : </dt><dd className="inline text-muted-foreground">{x.depot} ({x.numero}, {x.legislature})</dd></div>
                  <div><dt className="inline font-bold text-foreground">Gouvernement : </dt><dd className="inline text-muted-foreground">{x.premierMinistre}</dd></div>
                  <div><dt className="inline font-bold text-foreground">Ministres : </dt><dd className="inline text-muted-foreground">{x.ministres.join(" ; ")}</dd></div>
                  <div><dt className="inline font-bold text-foreground">Issue : </dt><dd className="inline text-muted-foreground">{x.issue}</dd></div>
                </dl>
                <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{x.contexte}</p>
                <a href={x.texteUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-700 hover:underline dark:text-orange-400"><FileText size={12} /> Texte déposé (PDF, Assemblée nationale)</a>
              </div>
            );
          })}
        </div>
      </Section>

      <Section titre="Hypothèses et objectifs" sous="Ensemble des administrations publiques (État, Sécurité sociale, collectivités), pour l'année du budget — article liminaire et rapport du texte.">
        <TableauComparatif lignes={macro} colonnes={colonnes} />
        <p className="mt-3 text-[11px] text-muted-foreground">Chaque PLF est évalué sur ses propres hypothèses, établies à l’automne précédant l’année concernée ; les comptes exécutés ont souvent divergé (ex. : déficit 2025 exécuté à 5,1 % selon le PLF 2027).</p>
      </Section>

      <Section titre="Le budget de l'État" sous="Solde, dépenses et recettes de l'État seul, en milliards d'euros.">
        <TableauComparatif lignes={etat} colonnes={colonnes} />
      </Section>

      <Section titre="L'effort annoncé" sous="Montant des économies et recettes nouvelles mis en avant pour l'année. Chaque gouvernement le calcule par rapport à sa propre évolution « tendancielle » : ces montants ne sont pas strictement comparables entre eux.">
        <div className={`grid gap-3 ${colonnes.length > 1 ? "md:grid-cols-2" : ""} ${colonnes.length > 2 ? "xl:grid-cols-4" : ""}`}>
          {colonnes.map((y) => {
            const e = PLF[y].effort;
            return (
              <div key={y} className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PLF {y}</p>
                <p className="mt-1 text-lg font-black text-foreground">{e.texte}</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${e.source === "texte" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                  {e.source === "texte" ? "Chiffré dans le texte du PLF" : "Annonce gouvernementale"}
                </span>
                {e.note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{e.note}</p>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section titre="Mesures phares" sous="Sélection des mesures les plus structurantes, telles que présentées dans le texte déposé (le Parlement a pu les modifier ensuite).">
        <div className={`grid gap-4 ${colonnes.length > 1 ? "md:grid-cols-2" : ""} ${colonnes.length > 2 ? "xl:grid-cols-4" : ""}`}>
          {colonnes.map((y) => (
            <div key={y}>
              {colonnes.length > 1 && <p className="mb-2 font-staatliches text-xl text-foreground">PLF {y}</p>}
              <ul className="space-y-2.5">
                {PLF[y].mesures.map((m) => (
                  <li key={m.titre} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="flex items-start justify-between gap-2 text-sm font-black text-foreground">
                      {m.titre}
                      {m.ref && <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-200">{m.ref}</span>}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <MissionsDetaillees colonnes={colonnes} />

      <Section titre="Recettes de l'État" sous="Évaluation des recettes du budget général, avant et après remboursements et dégrèvements.">
        <TableauComparatif lignes={recettes} colonnes={colonnes} />
        <p className="mt-3 text-[11px] text-muted-foreground">Montants bruts par impôt, avant remboursements. La ligne énergie s’intitule « TICPE » jusqu’en 2025 et « Accises sur les énergies » dans le PLF 2026 : à comparer avec prudence d’une année à l’autre.</p>
      </Section>
    </div>
  );
}

/* --------------------------------------------------------------- missions */
function MissionsDetaillees({ colonnes }: { colonnes: PlfAnnee[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [mode, setMode] = useState<"cp" | "ae">("cp");
  const ref = colonnes[0];
  const cmp = colonnes.length === 2 ? colonnes[1] : colonnes.length === 4 ? colonnes[3] : null;

  const lignes = useMemo(() => {
    const parAn = new Map(colonnes.map((y) => [y, new Map(missionsDe(y).map((m) => [m.cle, m]))]));
    const cles = new Set<string>();
    colonnes.forEach((y) => missionsDe(y).forEach((m) => cles.add(m.cle)));
    return [...cles].map((cle) => {
      const parY = colonnes.map((y) => parAn.get(y)!.get(cle) ?? null);
      const nom = (parAn.get(ref)!.get(cle) ?? parY.find(Boolean)!) as Mission;
      return { cle, nom, parY };
    }).sort((a, b) => (b.parY[0]?.[mode] ?? -1) - (a.parY[0]?.[mode] ?? -1) || (b.parY.find(Boolean)![mode] - a.parY.find(Boolean)![mode]));
  }, [colonnes, ref, mode]);

  return (
    <Section id="missions" titre="Toutes les missions" sous="État B de chaque PLF : crédits par mission, détaillés par programme (cliquez sur une ligne).">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(["cp", "ae"] as const).map((k) => (
            <button key={k} onClick={() => setMode(k)} className={`rounded-md px-3 py-1 font-black ${mode === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {k === "cp" ? "Crédits de paiement" : "Autorisations d'engagement"}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1 text-muted-foreground"><Info size={12} /> CP = ce qui sera payé dans l’année ; AE = engagements juridiques pris dans l’année (ex. : contrats pluriannuels).</span>
      </div>
      <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <th className="py-2 pr-3">Mission</th>
              {colonnes.map((c) => <th key={c} className={`py-2 pr-3 text-right ${c === ref ? "text-orange-700 dark:text-orange-400" : ""}`}>{c}</th>)}
              {cmp && <th className="py-2 pr-1 text-right">Écart {cmp}→{ref}</th>}
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ cle, nom, parY }) => {
              const a = parY[0]?.[mode] ?? null;
              const b = cmp ? parY[colonnes.indexOf(cmp)]?.[mode] ?? null : null;
              const note = NOTES_PERIMETRE[cle];
              const open = ouvert === cle;
              return (
                <Fragment key={cle}>
                  <tr onClick={() => setOuvert(open ? null : cle)} className="cursor-pointer border-b border-border/60 align-top hover:bg-muted/50">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-start gap-1.5 font-semibold text-foreground">
                        <ChevronDown size={14} className={`mt-0.5 shrink-0 transition ${open ? "rotate-180" : ""}`} />
                        {nom.mission}
                      </span>
                      {note && (INFO.has(cle)
                        ? <span className="ml-5 block text-[10px] leading-snug text-muted-foreground">ℹ {note}</span>
                        : <span className="ml-5 block text-[10px] leading-snug text-amber-800 dark:text-amber-300">⚠ {note}</span>)}
                    </td>
                    {parY.map((m, i) => (
                      <td key={i} className={`py-2.5 pr-3 text-right tabular-nums ${i === 0 ? "font-black text-foreground" : "text-muted-foreground"}`}>{m ? nf1(m[mode] / 1e9) : "—"}</td>
                    ))}
                    {cmp && (
                      <td className="py-2.5 pr-1 text-right">
                        {a === null ? <span className="text-[11px] text-muted-foreground">supprimée</span>
                          : b === null ? <span className="text-[11px] text-muted-foreground">nouvelle</span>
                          : <span className="inline-flex flex-col items-end"><span className="text-xs font-black tabular-nums text-foreground">{signe((a - b) / 1e9, nf1)}</span>{b > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">{signe(((a - b) / b) * 100, (x) => `${nf1(x)} %`)}</span>}</span>}
                      </td>
                    )}
                  </tr>
                  {open && <ProgrammesLignes cle={cle} colonnes={colonnes} mode={mode} avecEcart={!!cmp} cmp={cmp} />}
                </Fragment>
              );
            })}
            <tr className="border-t-2 border-border font-black">
              <td className="py-3 pr-3 text-foreground">Total budget général</td>
              {colonnes.map((c) => <td key={c} className="py-3 pr-3 text-right tabular-nums text-foreground">{nf1(missionsDe(c).reduce((s, m) => s + m[mode], 0) / 1e9)}</td>)}
              {cmp && <td className="py-3 pr-1 text-right text-xs tabular-nums text-foreground">{signe((missionsDe(ref).reduce((s, m) => s + m[mode], 0) - missionsDe(cmp).reduce((s, m) => s + m[mode], 0)) / 1e9, nf1)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Montants en milliards d’euros courants (le total inclut les remboursements et dégrèvements d’impôts). Une mission renommée est rapprochée de son équivalent ; ⚠ signale un changement de périmètre qui limite la comparaison.</p>
    </Section>
  );
}

function ProgrammesLignes({ cle, colonnes, mode, avecEcart, cmp }: { cle: string; colonnes: PlfAnnee[]; mode: "cp" | "ae"; avecEcart: boolean; cmp: PlfAnnee | null }) {
  const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 40);
  const parY = colonnes.map((y) => missionsDe(y).find((m) => m.cle === cle)?.programmes ?? []);
  const cles: { k: string; label: string }[] = [];
  parY.forEach((ps) => ps.forEach((p) => { const k = norm(p.programme); if (!cles.some((c) => c.k === k)) cles.push({ k, label: p.programme }); }));
  return (
    <>
      {cles.map(({ k, label }) => {
        const vals = parY.map((ps) => ps.find((p) => norm(p.programme) === k)?.[mode] ?? null);
        const a = vals[0]; const b = cmp ? vals[colonnes.indexOf(cmp)] : null;
        return (
          <tr key={k} className="border-b border-border/40 bg-muted/30 text-xs">
            <td className="py-1.5 pl-6 pr-3 text-muted-foreground">{label}</td>
            {vals.map((v, i) => <td key={i} className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{v === null ? "—" : nf1(v / 1e9)}</td>)}
            {avecEcart && <td className="py-1.5 pr-1 text-right tabular-nums text-muted-foreground">{a !== null && b !== null ? signe((a - b) / 1e9, nf1) : ""}</td>}
          </tr>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------- sources */
function Sources() {
  return (
    <section className="mt-10 rounded-3xl border border-border bg-muted/40 p-5 text-sm md:p-8">
      <h2 className="flex items-center gap-2 font-staatliches text-2xl uppercase tracking-tight text-foreground"><BookOpen size={20} /> Sources et méthode</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
        <li>Tous les chiffres proviennent du <b>texte intégral de chaque PLF déposé à l’Assemblée nationale</b> : rapport « Orientations générales et équilibre budgétaire », article liminaire, évaluation des recettes et état B (crédits par mission et programme).</li>
        <li>L’état B a été extrait automatiquement puis contrôlé à l’euro près (somme des programmes = mission, somme des missions = total du texte) ; pour 2024 et 2025, il est identique aux données ouvertes du ministère des Finances.</li>
        <li>On compare des <b>projets initiaux</b>, pas les lois votées : le Parlement modifie ensuite les montants, et le PLF 2025 n’a pas été adopté en l’état.</li>
        <li>Montants en euros courants, non corrigés de l’inflation. « Dépenses de l’État » = dépenses nettes du budget général (hors remboursements et dégrèvements d’impôts d’État).</li>
        <li>Les montants d’« effort » sont ceux mis en avant par chaque gouvernement ; ils sont signalés lorsqu’ils ne figurent pas tels quels dans le texte.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {ANNEES.map((y) => (
          <a key={y} href={PLF[y].texteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground hover:border-orange-400">
            <ExternalLink size={11} /> PLF {y} ({PLF[y].numero})
          </a>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Données vérifiées le {PLF_VERIFIE_LE}.</p>
    </section>
  );
}
