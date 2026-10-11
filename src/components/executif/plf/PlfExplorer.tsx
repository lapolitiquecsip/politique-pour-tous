"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, Crown, ExternalLink, Eye, Lock, Scale, Sparkles } from "lucide-react";
import { ANNEES, PLF, PLF_VERIFIE_LE, type PlfAnnee } from "@/lib/data/plf";
import { libelleCourt, missionsDe } from "@/lib/data/plf/missions";
import { usePremium } from "@/lib/hooks/usePremium";
import PlfDetaille from "./PlfDetaille";
import { Delta, mdM, nf1 } from "./outils";

type Niveau = "simple" | "detaille";
const REF = 2027 as const;
const AUTRES: PlfAnnee[] = [2026, 2025, 2024];

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

/* ======================================================================= */
export default function PlfExplorer() {
  const [niveau, setNiveau] = useState<Niveau>("simple");
  const [compSimple, setCompSimple] = useState<PlfAnnee | null>(null);
  const [compDetail, setCompDetail] = useState<PlfAnnee[]>([2026, 2025]);
  const { isPremium, loading } = usePremium();
  const plf = PLF[REF];

  // Vue partageable : ?niveau=detaille&comparer=2026,2025
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n: Niveau = q.get("niveau") === "detaille" ? "detaille" : "simple";
    const c = (q.get("comparer") ?? "").split(",").map(Number).filter((x) => AUTRES.includes(x as PlfAnnee)) as PlfAnnee[];
    setNiveau(n);
    if (n === "simple") setCompSimple(c[0] ?? null);
    else if (q.has("comparer")) setCompDetail(c);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    if (niveau === "detaille") { q.set("niveau", "detaille"); q.set("comparer", compDetail.join(",")); }
    else if (compSimple) q.set("comparer", String(compSimple));
    window.history.replaceState(null, "", `${window.location.pathname}${q.toString() ? `?${q}` : ""}`);
  }, [niveau, compSimple, compDetail]);

  const basculer = (y: PlfAnnee) =>
    setCompDetail((c) => (c.includes(y) ? c.filter((x) => x !== y) : [...c, y].sort((a, b) => b - a)));

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
          Le projet de loi de finances pour 2027 ({plf.numero}), déposé par le gouvernement {plf.premierMinistre.split(" ").pop()} le {plf.depot}. Les grands chiffres en accès libre ; l’analyse complète, comparée aux budgets précédents, pour les abonnés.
        </p>
      </header>

      {/* Commandes : deux cartes de niveau + comparaison */}
      <div className="mb-8 rounded-3xl border border-border bg-card p-3 shadow-sm md:p-4">
        <div className="grid gap-3 md:grid-cols-2" role="tablist" aria-label="Niveau d’analyse">
          <button role="tab" aria-selected={niveau === "simple"} onClick={() => setNiveau("simple")}
            className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${niveau === "simple" ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10" : "border-transparent bg-muted hover:border-border"}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${niveau === "simple" ? "bg-orange-600 text-white" : "bg-card text-muted-foreground"}`}><Eye size={22} /></span>
            <span>
              <span className="block font-staatliches text-2xl leading-none text-foreground">Analyse simple</span>
              <span className="mt-1 block text-xs text-muted-foreground">Les dépenses, les recettes, le déficit. Sans jargon.</span>
            </span>
            <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">Gratuit</span>
          </button>
          <button role="tab" aria-selected={niveau === "detaille"} onClick={() => setNiveau("detaille")}
            className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${niveau === "detaille" ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10" : "border-transparent bg-muted hover:border-border"}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${niveau === "detaille" ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950" : "bg-card text-amber-600"}`}><Crown size={22} /></span>
            <span>
              <span className="block font-staatliches text-2xl leading-none text-foreground">Analyse détaillée</span>
              <span className="mt-1 block text-xs text-muted-foreground">12 chapitres : comptes publics, dette, chaque mission, les 89 articles.</span>
            </span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-950">
              {!loading && !isPremium && <Lock size={10} />} Premium · Pro
            </span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-muted/60 px-4 py-3">
          <span className="mr-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground"><Scale size={14} /> Comparer le PLF 2027 avec</span>
          {niveau === "simple" ? (
            <>
              <Pastille actif={compSimple === null} onClick={() => setCompSimple(null)}>Aucun</Pastille>
              {AUTRES.map((a) => <Pastille key={a} actif={compSimple === a} onClick={() => setCompSimple(a)}>PLF {a}</Pastille>)}
            </>
          ) : (
            <>
              {AUTRES.map((a) => <Pastille key={a} actif={compDetail.includes(a)} coche onClick={() => basculer(a)}>PLF {a}</Pastille>)}
              <span className="text-[11px] text-muted-foreground">(plusieurs choix possibles)</span>
            </>
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">
          On compare des <b>projets initiaux</b> (textes déposés par le Gouvernement), en euros courants — pas les lois finalement votées.
        </p>
      </div>

      {niveau === "simple"
        ? <VueSimple comp={compSimple} versDetail={() => { setNiveau("detaille"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        : loading
          ? <div className="h-96 animate-pulse rounded-3xl border border-border bg-card" aria-busy="true" />
          : isPremium
            ? <PlfDetaille comp={compDetail} />
            : <Verrou />}

      <Sources />
    </div>
  );
}

function Pastille({ actif, onClick, children, coche = false }: { actif: boolean; onClick: () => void; children: React.ReactNode; coche?: boolean }) {
  return (
    <button onClick={onClick} aria-pressed={actif}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${actif ? "border-orange-600 bg-orange-600 text-white shadow-sm" : "border-border bg-card text-foreground hover:border-orange-400"}`}>
      {coche && <span className={`flex h-4 w-4 items-center justify-center rounded border ${actif ? "border-white bg-white text-orange-600" : "border-slate-400"}`}>{actif && <Check size={12} strokeWidth={4} />}</span>}
      {children}
    </button>
  );
}

/* ======================================================================= */
/* VERROU PREMIUM : l'analyse détaillée montrée floutée, derrière l'offre   */
/* ======================================================================= */
function Verrou() {
  return (
    <div className="relative">
      {/* Aperçu réel, flouté et inerte : on voit ce qu'on obtiendrait, sans pouvoir le lire. */}
      <div aria-hidden inert className="pointer-events-none max-h-[1700px] select-none overflow-hidden blur-[7px] saturate-[0.85]">
        <PlfDetaille comp={[2026, 2025]} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />

      <div className="absolute inset-x-0 top-10 flex justify-center px-2">
        <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-amber-400/40 bg-[#0f1424] text-center shadow-2xl shadow-amber-900/30">
          <div className="h-1.5 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300" />
          <div className="px-6 py-9 md:px-10">
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#fde68a,#f59e0b_25%,transparent_45%,#fbbf24_70%,transparent_90%,#fde68a)] motion-safe:animate-[spin_5s_linear_infinite]" />
              <span className="absolute inset-[3px] rounded-full bg-[#0f1424]" />
              <Lock size={30} className="relative text-amber-300" strokeWidth={2.2} />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
              <Crown size={12} /> Réservé aux abonnés Premium et Pro
            </span>
            <h2 className="mt-4 font-staatliches text-4xl uppercase leading-none tracking-tight text-white md:text-5xl">Tout comprendre du budget 2027</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-300">
              L’analyse détaillée décortique le texte déposé à l’Assemblée, chiffre par chiffre, et le compare aux budgets 2026 et 2025.
            </p>
            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left">
              {[
                "12 chapitres : comptes publics, dette et emprunts, effort demandé, emplois",
                "Chaque mission et chaque programme, comparés au budget voté pour 2026",
                "Ce qui augmente, ce qui baisse, et pourquoi le déficit de l’État se creuse",
                "Les 89 articles du projet de loi, classés et résumés",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><Check size={12} strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/premium" className="group mt-8 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-8 py-4 font-staatliches text-2xl uppercase leading-none tracking-wide text-slate-950 shadow-[0_10px_40px_rgba(251,191,36,0.4)] transition hover:brightness-105 active:scale-[0.98]">
              Devenir Premium <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="mt-4 text-xs text-slate-400">
              Déjà abonné ? <Link href="/login" className="font-bold text-amber-300 hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================= */
/* NIVEAU SIMPLE                                                           */
/* ======================================================================= */
function VueSimple({ comp, versDetail }: { comp: PlfAnnee | null; versDetail: () => void }) {
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

  const chiffres: { label: string; v: number; rv?: number; f: (x: number) => string; sens: "bon" | "mauvais" | "neutre" }[] = [
    { label: "Dépenses de l’État", v: p.etat.depensesNettes, rv: r?.etat.depensesNettes, f: (x) => `${nf1(x)} Md€`, sens: "neutre" },
    { label: "Impôts encaissés (nets)", v: p.recettes.nettes / 1e3, rv: r ? r.recettes.nettes / 1e3 : undefined, f: (x) => `${nf1(x)} Md€`, sens: "bon" },
    { label: "Déficit de l’État", v: -p.etat.solde, rv: r ? -r.etat.solde : undefined, f: (x) => `${nf1(x)} Md€`, sens: "mauvais" },
    { label: "Déficit public visé", v: p.macro.deficit, rv: r?.macro.deficit, f: (x) => `${nf1(x)} % du PIB`, sens: "mauvais" },
    { label: "Dette publique", v: p.macro.dette, rv: r?.macro.dette, f: (x) => `${nf1(x)} % du PIB`, sens: "mauvais" },
  ];

  const recettes = (y: PlfAnnee) => {
    const x = PLF[y].recettes;
    return [
      { k: "tva", label: "TVA", v: x.tva }, { k: "ir", label: "Impôt sur le revenu", v: x.ir },
      { k: "is", label: "Impôt sur les sociétés", v: x.is }, { k: "en", label: PLF[y].energieLibelle, v: x.energie },
      { k: "au", label: "Autres impôts", v: x.brutes - x.ir - x.is - x.tva - x.energie },
    ];
  };
  const rec = recettes(REF);
  const recR = comp ? recettes(comp) : [];
  const recMax = Math.max(...rec.map((x) => x.v), ...recR.map((x) => x.v));

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {chiffres.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-staatliches text-3xl leading-none text-foreground md:text-4xl">{c.f(c.v)}</p>
            {comp && c.rv !== undefined && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{comp} : {c.f(c.rv)}</span>
                <Delta v={c.v - c.rv} sens={c.sens} />
              </p>
            )}
          </div>
        ))}
      </section>

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
                    {comp && <Delta v={rv !== undefined ? (d.cp - rv) / 1e9 : null} small />}
                    <span className="font-black tabular-nums text-foreground">{nf1(d.cp / 1e9)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${(d.cp / max) * 100}%` }} />
                </div>
                {comp && (
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full">
                    <div className="h-full rounded-full bg-slate-400/70 dark:bg-slate-500" style={{ width: `${((rv ?? 0) / max) * 100}%` }} />
                  </div>
                )}
              </li>
            );
          })}
          <li className="flex items-baseline justify-between border-t border-border pt-2.5 text-sm">
            <span className="font-bold text-muted-foreground">Autres missions ({autres.length})</span>
            <span className="flex items-baseline gap-2">
              {comp && <Delta v={(autresCp - autresR) / 1e9} small />}
              <span className="font-black tabular-nums text-foreground">{nf1(autresCp / 1e9)}</span>
            </span>
          </li>
        </ul>
        {comp && <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-block h-1.5 w-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" /> 2027 <span className="ml-2 inline-block h-1.5 w-6 rounded-full bg-slate-400/70" /> {comp}</p>}
      </section>

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
                    {comp && <Delta v={rv !== undefined ? (x.v - rv) / 1e3 : null} small />}
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

      {/* Invitation à l'analyse détaillée */}
      <button onClick={versDetail} className="group flex w-full flex-col items-start gap-4 rounded-3xl border border-amber-400/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 p-6 text-left text-white transition hover:border-amber-400 md:flex-row md:items-center md:p-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-slate-950"><Crown size={28} /></span>
        <span className="flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-300">Premium · Pro</span>
          <span className="mt-2 block font-staatliches text-3xl uppercase leading-none">Aller plus loin : l’analyse détaillée</span>
          <span className="mt-2 block text-sm text-slate-300">Hypothèses économiques, dette et emprunts, chaque mission face au budget voté pour 2026, mesures phares et les 89 articles du texte.</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-3 text-sm font-black text-slate-950">
          Voir l’analyse détaillée <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </span>
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- sources */
function Sources() {
  return (
    <section className="mt-10 rounded-3xl border border-border bg-muted/40 p-5 text-sm md:p-8">
      <h2 className="flex items-center gap-2 font-staatliches text-2xl uppercase tracking-tight text-foreground"><BookOpen size={20} /> Sources et méthode</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
        <li>Tous les chiffres proviennent du <b>texte intégral de chaque PLF déposé à l’Assemblée nationale</b> : rapport « Orientations générales et équilibre budgétaire », article liminaire, article d’équilibre, évaluation des recettes, état B et annexes.</li>
        <li>Les crédits par mission ont été extraits automatiquement puis contrôlés à l’euro près (somme des programmes = mission, somme des missions = total du texte) ; pour 2024 et 2025, ils sont identiques aux données ouvertes du ministère des Finances.</li>
        <li>On compare des <b>projets initiaux</b>, pas les lois votées : le Parlement modifie ensuite les montants, et le PLF 2025 n’a pas été adopté en l’état.</li>
        <li>Montants en euros courants, non corrigés de l’inflation. « Dépenses de l’État » = dépenses nettes du budget général (hors remboursements et dégrèvements d’impôts d’État).</li>
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
