"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle, Banknote, BookOpen, Building2, ChevronDown, FileText, Gauge, Globe2, Info, Landmark, ListOrdered,
  PiggyBank, Receipt, Scale, Target, TrendingUp, Users,
} from "lucide-react";
import { PLF, NOTES_PERIMETRE, type Mission, type PlfAnnee } from "@/lib/data/plf";
import { lfiPrecedente, missionsDe, totalCP, totalLfiPrecedente } from "@/lib/data/plf/missions";
import {
  ALEAS_2027, ANNEE_2026, ARTICLES_2027, AUTRES_SECTEURS_2027, EMPLOIS_2027, PASSAGE_SOLDE, PLAN_2027, RESERVE_2027, SCENARIO_2027,
} from "@/lib/data/plf/dossier2027";
import { Delta, nf0, nf1, signe } from "./outils";

const REF = 2027 as const;
const INFO = new Set(["remboursements-et-degrevements"]);

const CHAPITRES = [
  { id: "essentiel", label: "L'essentiel", Ic: Target },
  { id: "texte", label: "Le texte", Ic: FileText },
  { id: "economie", label: "Scénario économique", Ic: TrendingUp },
  { id: "comptes", label: "Comptes publics", Ic: Gauge },
  { id: "etat", label: "Budget de l'État", Ic: Landmark },
  { id: "dette", label: "Dette & emprunts", Ic: Banknote },
  { id: "missions", label: "Dépenses", Ic: PiggyBank },
  { id: "recettes", label: "Recettes", Ic: Receipt },
  { id: "mesures", label: "Effort & mesures", Ic: Scale },
  { id: "emplois", label: "Emplois", Ic: Users },
  { id: "secteurs", label: "Sécu, collectivités, UE", Ic: Globe2 },
  { id: "articles", label: "Les 89 articles", Ic: ListOrdered },
] as const;

/* ------------------------------------------------------------------ briques */
function Chapitre({ id, n, titre, sous, children }: { id: string; n: number; titre: string; sous?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-36 rounded-3xl border border-border bg-card p-5 md:p-8">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 font-staatliches text-lg text-white">{n}</span>{" "}
        <div>
          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground">{titre}</h2>{" "}
          {sous && <p className="mt-1 text-sm text-muted-foreground">{sous}</p>}
        </div>
      </div>{" "}
      {children}
    </section>
  );
}

type Sens = "bon" | "mauvais" | "neutre";
type Ligne = {
  label: string; get: (y: PlfAnnee) => number | null; f: (x: number) => string; df?: (x: number) => string;
  sens?: Sens; note?: (y: PlfAnnee) => string | undefined; fort?: boolean;
};

/** Tableau : PLF 2027, puis pour chaque année comparée sa valeur et l'écart avec 2027. */
function Tableau({ lignes, comp, titreCol = "Indicateur" }: { lignes: Ligne[]; comp: PlfAnnee[]; titreCol?: string }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
      <table className="w-full text-sm" style={{ minWidth: 380 + comp.length * 190 }}>
        <thead>
          <tr className="border-b-2 border-border text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <th className="py-2 pr-3">{titreCol}</th>
            <th className="py-2 pr-3 text-right text-orange-700 dark:text-orange-400">PLF {REF}</th>
            {comp.map((c) => (
              <Fragment key={c}>
                <th className="border-l border-border/60 py-2 pl-3 pr-3 text-right">PLF {c}</th>
                <th className="py-2 pr-1 text-right">Écart</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const a = l.get(REF); const n = l.note?.(REF);
            return (
              <tr key={l.label} className={`border-b border-border/60 align-top ${l.fort ? "bg-amber-50/60 dark:bg-amber-500/5" : ""}`}>
                <td className={`py-2.5 pr-3 text-foreground ${l.fort ? "font-black" : "font-semibold"}`}>{l.label}</td>
                <td className="py-2.5 pr-3 text-right font-black tabular-nums text-foreground">
                  {a === null ? "—" : l.f(a)}{" "}
                  {n && <span className="block text-[10px] font-normal leading-tight text-muted-foreground">{n}</span>}
                </td>
                {comp.map((c) => {
                  const b = l.get(c); const nc = l.note?.(c);
                  return (
                    <Fragment key={c}>
                      <td className="border-l border-border/60 py-2.5 pl-3 pr-3 text-right tabular-nums text-muted-foreground">
                        {b === null ? "—" : l.f(b)}{" "}
                        {nc && <span className="block text-[10px] leading-tight">{nc}</span>}
                      </td>
                      <td className="py-2.5 pr-1 text-right">{a === null || b === null ? "—" : <Delta v={a - b} f={l.df ?? nf1} sens={l.sens ?? "neutre"} />}</td>
                    </Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground"><Info size={12} className="mt-0.5 shrink-0" />{" "}<span>{children}</span></p>
);
const Puces = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((t) => <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />{" "}{t}{" "}</li>)}
  </ul>
);

const md = (x: number) => `${nf1(x)} Md€`;
const pib = (x: number) => `${nf1(x)} % du PIB`;
const pt = (x: number) => `${nf1(x)} pt`;

/* ======================================================================= */
export default function PlfDetaille({ comp }: { comp: PlfAnnee[] }) {
  const p = PLF[REF];

  /* ---------- 1. l'essentiel ---------- */
  const mouvements = useMemo(() => {
    const l = missionsDe(REF)
      .filter((m) => m.cle !== "remboursements-et-degrevements")
      .map((m) => ({ m, lfi: lfiPrecedente(REF, m.cle) }))
      .filter((x) => x.lfi)
      .map((x) => ({ nom: x.m.mission, d: (x.m.cp - x.lfi!.cp) / 1e9, pc: x.lfi!.cp ? ((x.m.cp - x.lfi!.cp) / x.lfi!.cp) * 100 : 0 }));
    const tri = [...l].sort((a, b) => b.d - a.d);
    return { hausses: tri.slice(0, 5), baisses: tri.slice(-5).reverse() };
  }, []);

  const cartes: { label: string; get: (y: PlfAnnee) => number; vf: (x: number) => string; df: (x: number) => string; sens: Sens; aide: string }[] = [
    { label: "Déficit public visé", get: (y) => PLF[y].macro.deficit, vf: pib, df: pt, sens: "mauvais", aide: "État + Sécurité sociale + collectivités" },
    { label: "Dette publique", get: (y) => PLF[y].macro.dette, vf: pib, df: pt, sens: "mauvais", aide: "fin 2027, au sens de Maastricht" },
    { label: "Déficit de l'État", get: (y) => -PLF[y].etat.solde, vf: md, df: md, sens: "mauvais", aide: "solde budgétaire, hors FMI" },
    { label: "Charge de la dette", get: (y) => PLF[y].etat.chargeDette, vf: md, df: md, sens: "mauvais", aide: "intérêts payés par l'État" },
    { label: "Dette émise dans l'année", get: (y) => PLF[y].financement.emissions, vf: md, df: md, sens: "mauvais", aide: "moyen et long terme, nette des rachats" },
    { label: "Dépenses de l'État", get: (y) => PLF[y].etat.depensesNettes, vf: md, df: md, sens: "neutre", aide: "budget général, nettes" },
  ];

  /* ---------- lignes des tableaux ---------- */
  const hypotheses: Ligne[] = [
    { label: "Croissance du PIB", get: (y) => PLF[y].macro.croissance, f: (x) => `+${nf1(x)} %`, df: pt, sens: "bon" },
    { label: "Inflation", get: (y) => PLF[y].macro.inflation, f: (x) => `+${nf1(x)} %`, df: pt },
  ];
  const comptes: Ligne[] = [
    { label: "Solde public (déficit)", fort: true, get: (y) => -PLF[y].macro.deficit, f: (x) => `${signe(x)} % du PIB`, df: pt, sens: "bon", note: (y) => (PLF[y].macro.deficitNote ? "texte initial ; −5,0 % visés après amendements" : undefined) },
    { label: "dont solde structurel", get: (y) => PLF[y].apu.structurel, f: (x) => `${signe(x)} %`, df: pt, sens: "bon", note: () => "hors effets de la conjoncture" },
    { label: "dont solde conjoncturel", get: (y) => PLF[y].apu.conjoncturel, f: (x) => `${signe(x)} %`, df: pt, sens: "bon" },
    { label: "Rappel : déficit de l'année précédente", get: (y) => -PLF[y].macro.deficitAnneePrecedente.valeur, f: (x) => `${signe(x)} % du PIB`, df: pt, sens: "bon", note: (y) => `${PLF[y].macro.deficitAnneePrecedente.annee}, prévision du PLF` },
    { label: "Dette publique", fort: true, get: (y) => PLF[y].macro.dette, f: pib, df: pt, sens: "mauvais" },
    { label: "Dépense publique", get: (y) => PLF[y].macro.depensePublique, f: pib, df: pt, note: (y) => (PLF[y].macro.depensePubliqueMd ? `${nf0(PLF[y].macro.depensePubliqueMd!)} Md€` : undefined) },
    { label: "Évolution de la dépense en volume", get: (y) => PLF[y].apu.volume, f: (x) => `${signe(x)} %`, df: pt, note: () => "hors inflation" },
    { label: "Prélèvements obligatoires", get: (y) => PLF[y].macro.prelevementsObligatoires, f: pib, df: pt },
    { label: "Solde — État et organismes centraux", get: (y) => PLF[y].apu.soldeEtat, f: (x) => `${signe(x)} %`, df: pt, sens: "bon", note: (y) => (PLF[y].apu.depEtatMd ? `dépenses : ${nf0(PLF[y].apu.depEtatMd!)} Md€` : undefined) },
    { label: "Solde — collectivités locales", get: (y) => PLF[y].apu.soldeCollectivites, f: (x) => `${signe(x)} %`, df: pt, sens: "bon", note: (y) => (PLF[y].apu.depCollectivitesMd ? `dépenses : ${nf0(PLF[y].apu.depCollectivitesMd!)} Md€` : undefined) },
    { label: "Solde — Sécurité sociale", get: (y) => PLF[y].apu.soldeSecu, f: (x) => `${signe(x)} %`, df: pt, sens: "bon", note: (y) => (PLF[y].apu.depSecuMd ? `dépenses : ${nf0(PLF[y].apu.depSecuMd!)} Md€` : undefined) },
  ];
  const etat: Ligne[] = [
    { label: "Solde budgétaire de l'État", fort: true, get: (y) => PLF[y].etat.solde, f: (x) => `${signe(x)} Md€`, df: md, sens: "bon", note: (y) => (PLF[y].etat.soldeNote ? "texte initial" : undefined) },
    { label: "Dépenses du budget général (nettes)", get: (y) => PLF[y].etat.depensesNettes, f: md, df: md },
    { label: "dont charge de la dette", get: (y) => PLF[y].etat.chargeDette, f: md, df: md, sens: "mauvais", note: () => "y c. dette SNCF Réseau reprise" },
    { label: "Dépenses sous norme (périmètre des dépenses de l'État)", get: (y) => PLF[y].etat.pde, f: md, df: md, note: () => "format de chaque PLF" },
    { label: "Crédits bruts du budget général (CP)", get: (y) => totalCP(y) / 1e9, f: md, df: md, note: () => "y c. remboursements d'impôts" },
    { label: "Recettes fiscales nettes", get: (y) => PLF[y].recettes.nettes / 1e3, f: md, df: md, sens: "bon" },
    { label: "Recettes non fiscales", get: (y) => PLF[y].recettes.nonFiscales / 1e3, f: md, df: md, sens: "bon", note: (y) => (y === 2027 ? "13 Md€ exceptionnels de 2026 non reconduits" : undefined) },
    { label: "Versé à l'Union européenne", get: (y) => PLF[y].recettes.psrUE / 1e3, f: md, df: md, note: () => "prélèvement sur recettes" },
    { label: "Versé aux collectivités", get: (y) => PLF[y].recettes.psrCollectivites / 1e3, f: md, df: md, note: (y) => (y === 2026 ? "dont +5,2 Md€ de périmètre (TVA des régions)" : "prélèvements sur recettes") },
  ];
  const dette: Ligne[] = [
    { label: "Dette arrivant à échéance à rembourser", get: (y) => PLF[y].financement.amortissement, f: md, df: md, sens: "mauvais", note: () => "amortissement, moyen et long terme" },
    { label: "Déficit de l'année à financer", get: (y) => PLF[y].financement.deficit, f: md, df: md, sens: "mauvais" },
    { label: "Besoin de financement total", fort: true, get: (y) => PLF[y].financement.besoin, f: md, df: md, sens: "mauvais" },
    { label: "Dette émise (moyen et long terme)", fort: true, get: (y) => PLF[y].financement.emissions, f: md, df: md, sens: "mauvais", note: () => "nette des rachats" },
    { label: "Charge de la dette (intérêts)", get: (y) => PLF[y].etat.chargeDette, f: md, df: md, sens: "mauvais" },
    { label: "Charge de la dette / recettes fiscales nettes", get: (y) => (PLF[y].etat.chargeDette / (PLF[y].recettes.nettes / 1e3)) * 100, f: (x) => `${nf1(x)} %`, df: pt, sens: "mauvais", note: () => "calcul du site" },
  ];
  const recettes: Ligne[] = [
    { label: "TVA", get: (y) => PLF[y].recettes.tva / 1e3, f: md, df: md, sens: "bon" },
    { label: "Impôt sur le revenu", get: (y) => PLF[y].recettes.ir / 1e3, f: md, df: md, sens: "bon" },
    { label: "Impôt sur les sociétés", get: (y) => PLF[y].recettes.is / 1e3, f: md, df: md, sens: "bon" },
    { label: "Énergie (part de l'État)", get: (y) => PLF[y].recettes.energie / 1e3, f: md, df: md, sens: "bon", note: (y) => PLF[y].energieLibelle },
    { label: "Autres impôts", get: (y) => { const r = PLF[y].recettes; return (r.brutes - r.tva - r.ir - r.is - r.energie) / 1e3; }, f: md, df: md, sens: "bon" },
    { label: "Recettes fiscales brutes", get: (y) => PLF[y].recettes.brutes / 1e3, f: md, df: md, sens: "bon" },
    { label: "− Remboursements et dégrèvements", get: (y) => PLF[y].recettes.remboursements / 1e3, f: md, df: md },
    { label: "= Recettes fiscales nettes", fort: true, get: (y) => PLF[y].recettes.nettes / 1e3, f: md, df: md, sens: "bon" },
    { label: "Recettes non fiscales", get: (y) => PLF[y].recettes.nonFiscales / 1e3, f: md, df: md, sens: "bon" },
  ];
  const emplois: Ligne[] = [
    { label: "Plafond d'emplois de l'État", get: (y) => PLF[y].emplois, f: (x) => `${nf0(x)} ETPT`, df: (x) => nf0(x) },
  ];

  return (
    <div className="space-y-6">
      {/* Sommaire */}
      <nav aria-label="Chapitres" className="sticky top-16 z-10 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-2xl md:border">
        <ul className="flex w-max gap-1.5">
          {CHAPITRES.map(({ id, label, Ic }, i) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-orange-400 hover:text-orange-700 dark:hover:text-orange-400">
                <Ic size={13} className="text-orange-600 dark:text-orange-400" /> {" "}<span className="text-muted-foreground">{i + 1}.</span> {label}
              </a>{" "}
            </li>
          ))}
        </ul>
      </nav>{" "}

      {/* 1 — L'essentiel */}
      <Chapitre id="essentiel" n={1} titre="L'essentiel en un coup d'œil" sous={`Les six chiffres qui résument le PLF 2027${comp.length ? `, et leur écart avec ${comp.map((c) => `le PLF ${c}`).join(" et ")}` : ""}.`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cartes.map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.label}</p>{" "}
              <p className="mt-1 font-staatliches text-4xl leading-none text-foreground">{c.vf(c.get(REF))}</p>{" "}
              <p className="mt-1 text-[11px] text-muted-foreground">{c.aide}</p>{" "}
              {comp.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-border pt-2">
                  {comp.map((y) => (
                    <p key={y} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>vs PLF {y} <span className="tabular-nums">({c.vf(c.get(y))})</span></span>{" "}
                      <Delta v={c.get(REF) - c.get(y)} f={c.df} sens={c.sens} />{" "}
                    </p>
                  ))}
                </div>
              )}{" "}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {([["Ce qui augmente le plus", mouvements.hausses, "text-emerald-700 dark:text-emerald-400"], ["Ce qui baisse le plus", mouvements.baisses, "text-rose-700 dark:text-rose-400"]] as const).map(([titre, liste, cls]) => (
            <div key={titre} className="rounded-2xl border border-border p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{titre} — par rapport au budget voté pour 2026</p>{" "}
              <ul className="mt-2 space-y-1.5">
                {liste.map((x) => (
                  <li key={x.nom} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold text-foreground">{x.nom}</span>{" "}
                    <span className={`shrink-0 font-black tabular-nums ${cls}`}>{signe(x.d)} Md€ <span className="text-[11px] font-bold opacity-80">({signe(x.pc)} %)</span></span>{" "}
                  </li>
                ))}
              </ul>{" "}
            </div>
          ))}
        </div>
        <Note>Crédits de paiement du PLF 2027 comparés à la loi de finances initiale pour 2026 (hors remboursements d’impôts). Effort annoncé pour 2027 : <b className="text-foreground">{p.effort.texte}</b>.</Note>
      </Chapitre>

      {/* 2 — Le texte */}
      <Chapitre id="texte" n={2} titre="Le texte et son contexte" sous="Qui présente ce budget, dans quelle situation, et ce que sont devenus les précédents.">
        <div className={`grid gap-3 ${comp.length ? "md:grid-cols-2" : ""} ${comp.length >= 2 ? "xl:grid-cols-3" : ""} ${comp.length >= 3 ? "2xl:grid-cols-4" : ""}`}>
          {[REF, ...comp].map((y) => {
            const x = PLF[y as PlfAnnee];
            return (
              <div key={y} className={`rounded-2xl border p-4 ${y === REF ? "border-orange-300 bg-orange-50/50 dark:border-orange-500/30 dark:bg-orange-500/5" : "border-border bg-muted/40"}`}>
                <p className="font-staatliches text-2xl leading-none text-foreground">PLF {y}</p>{" "}
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div><dt className="inline font-bold text-foreground">Déposé : </dt><dd className="inline text-muted-foreground">{x.depot} ({x.numero})</dd></div>{" "}
                  <div><dt className="inline font-bold text-foreground">Premier ministre : </dt><dd className="inline text-muted-foreground">{x.premierMinistre}</dd></div>{" "}
                  <div><dt className="inline font-bold text-foreground">Ministres : </dt><dd className="inline text-muted-foreground">{x.ministres.join(" ; ")}</dd></div>{" "}
                  <div><dt className="inline font-bold text-foreground">Issue : </dt><dd className="inline text-muted-foreground">{x.issue}</dd></div>
                </dl>{" "}
                <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{x.contexte}</p>{" "}
                <a href={x.texteUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-700 hover:underline dark:text-orange-400"><FileText size={12} /> Texte déposé (PDF)</a>{" "}
              </div>
            );
          })}
        </div>
        <div className="mt-5 rounded-2xl border border-border p-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">D’où l’on part : l’année 2026 selon le PLF 2027</p>{" "}
          <Puces items={ANNEE_2026} />
        </div>
      </Chapitre>

      {/* 3 — Scénario économique */}
      <Chapitre id="economie" n={3} titre="Le scénario économique" sous="Les hypothèses sur lesquelles le budget est construit : si elles ne se réalisent pas, les recettes et le déficit dérapent.">
        <Tableau lignes={hypotheses} comp={comp} titreCol="Hypothèse pour l'année du budget" />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Détail du scénario 2027 (et estimation pour 2026)</p>{" "}
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground"><th className="py-1.5 text-left">Variable</th><th className="py-1.5 text-right">2026</th><th className="py-1.5 text-right text-orange-700 dark:text-orange-400">2027</th></tr></thead>
              <tbody>
                {SCENARIO_2027.map((s) => (
                  <tr key={s.label} className="border-b border-border/50"><td className="py-1.5 pr-2 font-semibold text-foreground">{s.label}</td><td className="py-1.5 text-right tabular-nums text-muted-foreground">{s.v2026}</td><td className="py-1.5 text-right font-black tabular-nums text-foreground">{s.v2027}</td></tr>
                ))}
              </tbody>
            </table>
          </div>{" "}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300"><AlertTriangle size={13} /> Les aléas reconnus par le texte</p>{" "}
            <Puces items={ALEAS_2027} />
          </div>
        </div>
      </Chapitre>

      {/* 4 — Comptes publics */}
      <Chapitre id="comptes" n={4} titre="Les comptes publics" sous="Article liminaire : l'ensemble des administrations publiques (État, Sécurité sociale, collectivités), en % du PIB.">
        <Tableau lignes={comptes} comp={comp} />
        <Note>Solde structurel : déficit qui subsisterait si l’économie tournait à son rythme normal ; c’est lui que surveillent les règles européennes. Chaque PLF est évalué sur ses propres prévisions ; l’exécution a souvent divergé (déficit 2025 exécuté : 5,1 % du PIB).</Note>
      </Chapitre>

      {/* 5 — Budget de l'État */}
      <Chapitre id="etat" n={5} titre="Le budget de l'État" sous="L'État seul : ce qu'il dépense, ce qu'il encaisse, et l'écart entre les deux.">
        <Tableau lignes={etat} comp={comp} />
        <div className={`mt-5 grid gap-4 ${comp.includes(2026) ? "lg:grid-cols-2" : ""}`}>
          {([2027, ...(comp.includes(2026) ? [2026] : [])] as (2027 | 2026)[]).map((y) => {
            const ps = PASSAGE_SOLDE[y];
            const max = Math.max(...ps.lignes.map((l) => Math.abs(l.v)));
            return (
              <div key={y} className="rounded-2xl border border-border p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pourquoi le solde {y === 2027 ? "se dégrade" : "s'améliorait"} — PLF {y}</p>{" "}
                <p className="mt-1 text-sm text-foreground">De <b className="tabular-nums">{signe(ps.depart)} Md€</b> ({ps.de}) à <b className="tabular-nums">{signe(ps.arrivee)} Md€</b>, soit <b className="tabular-nums">{signe(ps.arrivee - ps.depart)} Md€</b>.</p>{" "}
                <ul className="mt-3 space-y-2.5">
                  {ps.lignes.map((l) => (
                    <li key={l.label}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold text-foreground">{l.label}</span>{" "}
                        <span className={`font-black tabular-nums ${l.v >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{signe(l.v)} Md€</span>
                      </div>{" "}
                      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full ${l.v >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${(Math.abs(l.v) / max) * 100}%` }} /></div>{" "}
                      {l.detail && <p className="mt-1 text-[11px] text-muted-foreground">{l.detail}</p>}{" "}
                    </li>
                  ))}
                </ul>{" "}
              </div>
            );
          })}
        </div>
        <Note>Vert : améliore le solde ; rouge : le dégrade. {RESERVE_2027}</Note>
      </Chapitre>

      {/* 6 — Dette */}
      <Chapitre id="dette" n={6} titre="Dette et emprunts" sous="Article d'équilibre : ce que l'État doit trouver sur les marchés dans l'année, et ce que lui coûte sa dette.">
        <Tableau lignes={dette} comp={comp} />
        <Note>En 2027, l’État prévoit d’émettre {md(p.financement.emissions)} de dette à moyen et long terme : {md(p.financement.amortissement)} pour rembourser des emprunts arrivant à échéance et {md(p.financement.deficit)} pour financer le déficit de l’année.</Note>
      </Chapitre>

      {/* 7 — Missions */}
      <MissionsDetaillees comp={comp} />

      {/* 8 — Recettes */}
      <Chapitre id="recettes" n={8} titre="Les recettes de l'État" sous="Évaluation des recettes du budget général, par impôt.">
        <Tableau lignes={recettes} comp={comp} />
        <Note>Montants bruts par impôt, avant remboursements. La ligne énergie s’intitule « TICPE » jusqu’en 2025 et « Accises sur les énergies » dans le PLF 2026 : à comparer avec prudence.</Note>
      </Chapitre>

      {/* 9 — Effort & mesures */}
      <Chapitre id="mesures" n={9} titre="Effort annoncé et mesures phares" sous="Ce que le Gouvernement met en avant, tel qu'écrit dans le texte déposé (le Parlement peut le modifier).">
        <div className={`grid gap-3 ${comp.length ? "md:grid-cols-2" : ""} ${comp.length >= 2 ? "xl:grid-cols-3" : ""}`}>
          {[REF, ...comp].map((y) => {
            const e = PLF[y as PlfAnnee].effort;
            return (
              <div key={y} className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Effort — PLF {y}</p>{" "}
                <p className="mt-1 text-lg font-black leading-snug text-foreground">{e.texte}</p>{" "}
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${e.source === "texte" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                  {e.source === "texte" ? "Chiffré dans le texte" : "Annonce gouvernementale"}
                </span>{" "}
                {e.note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{e.note}</p>}{" "}
              </div>
            );
          })}
        </div>
        <Note>Chaque gouvernement calcule son « effort » par rapport à sa propre évolution tendancielle : ces montants ne sont pas strictement comparables.</Note>
        <div className={`mt-5 grid gap-4 ${comp.length ? "md:grid-cols-2" : ""} ${comp.length >= 2 ? "xl:grid-cols-3" : ""}`}>
          {[REF, ...comp].map((y) => (
            <div key={y}>
              <p className="mb-2 font-staatliches text-xl text-foreground">Mesures phares — PLF {y}</p>{" "}
              <ul className="space-y-2">
                {PLF[y as PlfAnnee].mesures.map((m) => (
                  <li key={m.titre} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="flex items-start justify-between gap-2 text-sm font-black text-foreground">
                      {m.titre}{" "}
                      {m.ref && <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-200">{m.ref}</span>}
                    </p>{" "}
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.detail}</p>{" "}
                  </li>
                ))}
              </ul>{" "}
            </div>
          ))}
        </div>
      </Chapitre>

      {/* 10 — Emplois */}
      <Chapitre id="emplois" n={10} titre="Emplois et fonction publique" sous="Plafond d'autorisation des emplois rémunérés par l'État (équivalents temps plein travaillé).">
        <Tableau lignes={emplois} comp={comp} />
        <div className="mt-4"><Puces items={EMPLOIS_2027} /></div>
      </Chapitre>

      {/* 11 — Autres secteurs */}
      <Chapitre id="secteurs" n={11} titre="Sécurité sociale, collectivités, Europe" sous="Ce que le PLF 2027 dit des autres acteurs de la dépense publique.">
        <div className="grid gap-3 md:grid-cols-2">
          {AUTRES_SECTEURS_2027.map((s) => (
            <div key={s.titre} className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 font-staatliches text-xl text-foreground"><Building2 size={16} className="text-orange-600" />{" "}{s.titre}</p>{" "}
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.texte}</p>{" "}
            </div>
          ))}
        </div>
      </Chapitre>

      {/* 12 — Articles */}
      <Articles />
    </div>
  );
}

/* --------------------------------------------------------------- missions */
function MissionsDetaillees({ comp }: { comp: PlfAnnee[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [mode, setMode] = useState<"cp" | "ae">("cp");
  const annees = useMemo(() => [REF, ...comp] as PlfAnnee[], [comp]);

  const lignes = useMemo(() => {
    const parAn = new Map(annees.map((y) => [y, new Map(missionsDe(y).map((m) => [m.cle, m]))]));
    const cles = new Set<string>();
    annees.forEach((y) => missionsDe(y).forEach((m) => cles.add(m.cle)));
    return [...cles].map((cle) => {
      const parY = annees.map((y) => parAn.get(y)!.get(cle) ?? null);
      return { cle, nom: parY.find(Boolean) as Mission, parY };
    }).sort((a, b) => (b.parY[0]?.[mode] ?? -1) - (a.parY[0]?.[mode] ?? -1) || b.nom[mode] - a.nom[mode]);
  }, [annees, mode]);

  const tot = (y: PlfAnnee) => missionsDe(y).reduce((s, m) => s + m[mode], 0);
  const totLfi = mode === "cp" ? totalLfiPrecedente(REF) : missionsDe(REF).reduce((s, m) => s + (lfiPrecedente(REF, m.cle)?.ae ?? 0), 0);
  const ecart = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

  const CelluleEcart = ({ a, b }: { a: number | null; b: number | null }) => {
    const d = ecart(a, b);
    if (a === null) return <span className="text-[11px] text-muted-foreground">supprimée</span>;
    if (b === null) return <span className="text-[11px] text-muted-foreground">nouvelle</span>;
    return (
      <span className="inline-flex flex-col items-end leading-tight">
        <span className="text-xs font-black tabular-nums text-foreground">{signe(d! / 1e9)}</span>{" "}
        {b > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">{signe((d! / b) * 100)} %</span>}
      </span>
    );
  };

  return (
    <Chapitre id="missions" n={7} titre="Les dépenses, mission par mission" sous="État B : les crédits de chaque politique publique. Cliquez sur une mission pour voir ses programmes.">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(["cp", "ae"] as const).map((k) => (
            <button key={k} onClick={() => setMode(k)} className={`rounded-md px-3 py-1 font-black ${mode === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {k === "cp" ? "Crédits de paiement" : "Autorisations d'engagement"}{" "}
            </button>
          ))}
        </div>{" "}
        <span className="flex items-center gap-1 text-muted-foreground"><Info size={12} /> CP : payé dans l’année. AE : engagements pris dans l’année (contrats pluriannuels).</span>
      </div>
      <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <table className="w-full text-sm" style={{ minWidth: 560 + comp.length * 150 }}>
          <thead>
            <tr className="border-b-2 border-border text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <th className="py-2 pr-3">Mission (Md€)</th>
              <th className="py-2 pr-3 text-right text-orange-700 dark:text-orange-400">PLF 2027</th>
              <th className="border-l border-border/60 py-2 pl-3 pr-3 text-right">Voté 2026</th>
              <th className="py-2 pr-1 text-right">Écart</th>
              {comp.map((c) => (
                <Fragment key={c}>
                  <th className="border-l border-border/60 py-2 pl-3 pr-3 text-right">PLF {c}</th>
                  <th className="py-2 pr-1 text-right">Écart</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ cle, nom, parY }) => {
              const a = parY[0]?.[mode] ?? null;
              const lfi = lfiPrecedente(REF, cle)?.[mode] ?? null;
              const note = NOTES_PERIMETRE[cle];
              const open = ouvert === cle;
              return (
                <Fragment key={cle}>
                  <tr onClick={() => setOuvert(open ? null : cle)} className="cursor-pointer border-b border-border/60 align-top hover:bg-muted/50">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-start gap-1.5 font-semibold text-foreground">
                        <ChevronDown size={14} className={`mt-0.5 shrink-0 transition ${open ? "rotate-180" : ""}`} />{" "}
                        {nom.mission}
                      </span>{" "}
                      {note && (INFO.has(cle)
                        ? <span className="ml-5 block text-[10px] leading-snug text-muted-foreground">ℹ {note}</span>
                        : <span className="ml-5 block text-[10px] leading-snug text-amber-800 dark:text-amber-300">⚠ {note}</span>)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-black tabular-nums text-foreground">{a === null ? "—" : nf1(a / 1e9)}</td>
                    <td className="border-l border-border/60 py-2.5 pl-3 pr-3 text-right tabular-nums text-muted-foreground">{lfi === null ? "—" : nf1(lfi / 1e9)}</td>
                    <td className="py-2.5 pr-1 text-right"><CelluleEcart a={a} b={lfi} /></td>
                    {comp.map((c, i) => {
                      const b = parY[i + 1]?.[mode] ?? null;
                      return (
                        <Fragment key={c}>
                          <td className="border-l border-border/60 py-2.5 pl-3 pr-3 text-right tabular-nums text-muted-foreground">{b === null ? "—" : nf1(b / 1e9)}</td>
                          <td className="py-2.5 pr-1 text-right"><CelluleEcart a={a} b={b} /></td>
                        </Fragment>
                      );
                    })}
                  </tr>
                  {open && <Programmes cle={cle} annees={annees} mode={mode} />}
                </Fragment>
              );
            })}
            <tr className="border-t-2 border-border font-black">
              <td className="py-3 pr-3 text-foreground">Total budget général</td>
              <td className="py-3 pr-3 text-right tabular-nums text-foreground">{nf1(tot(REF) / 1e9)}</td>
              <td className="border-l border-border/60 py-3 pl-3 pr-3 text-right tabular-nums text-muted-foreground">{nf1(totLfi / 1e9)}</td>
              <td className="py-3 pr-1 text-right text-xs tabular-nums text-foreground">{signe((tot(REF) - totLfi) / 1e9)}</td>
              {comp.map((c) => (
                <Fragment key={c}>
                  <td className="border-l border-border/60 py-3 pl-3 pr-3 text-right tabular-nums text-muted-foreground">{nf1(tot(c) / 1e9)}</td>
                  <td className="py-3 pr-1 text-right text-xs tabular-nums text-foreground">{signe((tot(REF) - tot(c)) / 1e9)}</td>
                </Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <Note>« Voté 2026 » : crédits de la loi de finances initiale pour 2026, tels que rappelés en annexe du PLF 2027 (hors fonds de concours) — c’est la base réelle de l’évolution proposée. Les colonnes « PLF » comparent des projets initiaux. Euros courants ; le total inclut les remboursements d’impôts. ⚠ : changement de périmètre qui limite la comparaison.</Note>
    </Chapitre>
  );
}

function Programmes({ cle, annees, mode }: { cle: string; annees: PlfAnnee[]; mode: "cp" | "ae" }) {
  const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 40);
  const parY = annees.map((y) => missionsDe(y).find((m) => m.cle === cle)?.programmes ?? []);
  const cles: { k: string; label: string }[] = [];
  parY.forEach((ps) => ps.forEach((p) => { const k = norm(p.programme); if (!cles.some((c) => c.k === k)) cles.push({ k, label: p.programme }); }));
  return (
    <>
      {cles.map(({ k, label }) => {
        const vals = parY.map((ps) => ps.find((p) => norm(p.programme) === k)?.[mode] ?? null);
        return (
          <tr key={k} className="border-b border-border/40 bg-muted/30 text-xs">
            <td className="py-1.5 pl-6 pr-3 text-muted-foreground">{label}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums text-foreground">{vals[0] === null ? "—" : nf1(vals[0] / 1e9)}</td>
            <td className="border-l border-border/40 py-1.5 pl-3 pr-3 text-right text-muted-foreground" colSpan={2}></td>
            {vals.slice(1).map((v, i) => (
              <Fragment key={i}>
                <td className="border-l border-border/40 py-1.5 pl-3 pr-3 text-right tabular-nums text-muted-foreground">{v === null ? "—" : nf1(v / 1e9)}</td>
                <td className="py-1.5 pr-1 text-right tabular-nums text-muted-foreground">{vals[0] !== null && v !== null ? signe((vals[0] - v) / 1e9) : ""}</td>
              </Fragment>
            ))}
          </tr>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------- articles */
function Articles() {
  const [ouvert, setOuvert] = useState<number | null>(0);
  return (
    <Chapitre id="articles" n={12} titre="Les 89 articles du texte" sous="Tout le contenu du projet de loi, dans l'ordre du texte déposé.">
      <div className="space-y-2">
        {PLAN_2027.map((g, i) => {
          const arts = ARTICLES_2027.filter((a) => a.n >= g.de && a.n <= g.a);
          const open = ouvert === i;
          return (
            <div key={g.titre} className="overflow-hidden rounded-2xl border border-border">
              <button onClick={() => setOuvert(open ? null : i)} className="flex w-full items-start justify-between gap-3 bg-muted/40 p-4 text-left hover:bg-muted">
                <span>
                  <span className="block font-staatliches text-xl leading-tight text-foreground">{g.titre}</span>{" "}
                  <span className="mt-0.5 block text-xs text-muted-foreground">{g.resume}</span>
                </span>{" "}
                <span className="flex shrink-0 items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  art. {g.de === g.a ? g.de : `${g.de}–${g.a}`} {" "}<ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
                </span>
              </button>{" "}
              {open && (
                <ol className="divide-y divide-border/60">
                  {arts.map((a) => (
                    <li key={a.n} className="flex gap-3 px-4 py-2 text-sm">
                      <span className="w-12 shrink-0 font-black tabular-nums text-orange-700 dark:text-orange-400">Art. {a.n}</span>{" "}
                      <span className="text-foreground">{a.titre}</span>{" "}
                    </li>
                  ))}
                </ol>
              )}{" "}
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><BookOpen size={12} /> Intitulés repris du sommaire du texte n° 3210 ; regroupement en six blocs proposé par le site.</p>
    </Chapitre>
  );
}
