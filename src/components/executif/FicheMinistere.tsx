"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, CircleDollarSign, ExternalLink, FileText, Gauge, Landmark, MessageSquareText, Newspaper, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Fiche complète d'un ministère. Budget, emplois, résultats et questions viennent de la table
// ministere_fiches, remplie chaque semaine par python/fiches_ministeres.py (backend) à partir des
// seuls textes officiels, sans IA. Actualités et Journal officiel : table entity_feed.

type Prog = { nom: string; ae: number | null; cp: number | null };
type Annee = { statut: "propose" | "vote" | "depense"; ae: number; cp: number; programmes: Prog[]; complet?: boolean };
type Titre = { code: number; titre: string; vote: number; propose: number };
type Budget = { ministere: string; annees: Record<string, Annee>; titres: Record<string, Titre[]> };
type Emplois = {
  annee_plf: number; vote?: number; propose?: number; operateurs?: Record<string, number>;
  realise?: { annee: number; realise?: number; plafond?: number; realise_precedent?: number; masse_salariale?: { prevu_meur?: number; realise_meur?: number } };
};
type Indicateur = {
  programme: string; objectif: string; indicateur: string; sous_indicateur: string | null; unite: string | null;
  realise: Record<string, string | null>; cible: string | null; atteinte: string | null; public?: string | null;
};
type Performance = { annee: number; source: string; indicateurs: Indicateur[] };
type Questions = {
  depuis: string; total: number; repondues: number; delai_median_jours: number | null; repondues_sous_2_mois: number;
  en_attente: number; en_attente_plus_2_mois: number; recentes: { date: string; objet: string | null; url: string | null; reponse: string | null }[];
};
type Source = { titre: string; url: string; dossier?: string };
type Ligne = { rubrique: string; donnees: unknown; sources: Source[]; maj_le: string };
type Actu = { id: string; url: string; title: string; summary: string | null; news_type: string | null; published_at: string | null; media: string | null; source_name: string | null; recoupement: string | null };

const euros = (n: number) =>
  Math.abs(n) >= 1e9 ? `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md€`
  : `${Math.round(n / 1e6).toLocaleString("fr-FR")} M€`;
const nombre = (n: number) => n.toLocaleString("fr-FR");
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
const pct = (a: number, b: number) => {
  const v = ((a - b) / b) * 100;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
};
const STATUT: Record<Annee["statut"], string> = { depense: "Dépensé", vote: "Voté", propose: "Proposé" };
const STATUT_LONG: Record<Annee["statut"], string> = {
  depense: "réellement dépensé (comptes de l'État)", vote: "voté par le Parlement (loi de finances)", propose: "proposé par le Gouvernement (projet de loi de finances, en débat)",
};

function Carte({ icone, titre, children, id }: { icone: ReactNode; titre: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">{icone}</div>
        <h3 className="font-staatliches text-2xl uppercase tracking-wider text-foreground">{titre}</h3>
      </div>
      {children}
    </section>
  );
}

function Sources({ sources, maj, mention = "Chiffres lus dans les documents officiels et vérifiés par leurs propres totaux, sans IA." }: { sources: Source[]; maj?: string; mention?: string }) {
  if (!sources.length) return null;
  return (
    <p className="mt-5 text-[11.5px] leading-relaxed text-muted-foreground">
      Source{sources.length > 1 ? "s" : ""} :{" "}
      {sources.map((s, i) => (
        <span key={s.url}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-foreground">{s.titre}</a></span>
      ))}
      . {mention}{maj && ` Relevé le ${date(maj)}.`}
    </p>
  );
}

function Chiffre({ valeur, legende, detail }: { valeur: string; legende: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-2xl font-black leading-tight text-foreground sm:text-3xl">{valeur}</p>
      <p className="mt-1 text-[12px] font-bold leading-snug text-foreground">{legende}</p>
      {detail && <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{detail}</p>}
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────────────

function BlocBudget({ b, sources, maj }: { b: Budget; sources: Source[]; maj: string }) {
  const ans = Object.keys(b.annees).sort();
  const [an, setAn] = useState(ans[ans.length - 1]);
  const cur = b.annees[an];
  const propose = ans.map(a => b.annees[a]).find(a => a.statut === "propose");
  const vote = ans.map(a => b.annees[a]).find(a => a.statut === "vote");
  const max = Math.max(...cur.programmes.map(p => p.cp ?? 0), 1);
  const natures = useMemo(() => {
    const m = new Map<number, { titre: string; vote: number; propose: number }>();
    for (const liste of Object.values(b.titres)) for (const t of liste) {
      const x = m.get(t.code) ?? { titre: t.titre, vote: 0, propose: 0 };
      x.vote += t.vote; x.propose += t.propose; m.set(t.code, x);
    }
    return [...m.entries()].sort((a, c) => a[0] - c[0]).map(([, v]) => v).filter(v => v.propose || v.vote);
  }, [b.titres]);
  const totalNat = natures.reduce((s, n) => s + n.propose, 0) || 1;
  const absents = propose && vote ? propose.programmes.filter(p => !vote.programmes.some(v => v.nom === p.nom)).map(p => p.nom) : [];
  const anPropose = ans.find(a => b.annees[a].statut === "propose");
  const anVote = ans.find(a => b.annees[a].statut === "vote");

  return (
    <Carte icone={<CircleDollarSign size={20} />} titre="Budget du ministère" id="budget">
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        Crédits de paiement (ce qui peut réellement être payé dans l&apos;année) de tous les programmes du ministère, budget de l&apos;État.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {ans.map(a => (
          <button key={a} type="button" role="tab" aria-selected={a === an} onClick={() => setAn(a)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${a === an ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {a} · {STATUT[b.annees[a].statut]}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <p className="text-4xl font-black text-foreground">{euros(cur.cp)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {an} : {STATUT_LONG[cur.statut]}
          {cur.statut === "propose" && vote && anVote && <> · {pct(cur.cp, vote.cp)} par rapport au budget voté pour {anVote} ({euros(vote.cp)})</>}
        </p>
      </div>
      <div className="mt-6 space-y-3.5">
        {[...cur.programmes].sort((x, y) => (y.cp ?? 0) - (x.cp ?? 0)).map(p => (
          <div key={p.nom}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium leading-tight text-foreground">{p.nom}</span>
              <span className="whitespace-nowrap text-right font-black text-foreground">
                {p.cp == null ? "—" : p.cp === 0 && p.ae ? <>0 €<span className="block text-[11px] font-bold text-muted-foreground">{euros(p.ae)} engagés</span></> : euros(p.cp)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(((p.cp ?? 0) / max) * 100, 1)}%` }} />
            </div>
          </div>
        ))}
      </div>
      {cur.statut === "vote" && absents.length > 0 && (
        <p className="mt-3 text-[12px] text-muted-foreground">Absent du budget voté pour {an} : {absents.join(", ")}.</p>
      )}
      {natures.length > 0 && anPropose && anVote && (
        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Où va l&apos;argent en {anPropose} — par nature de dépense</p>
          <div className="space-y-3">
            {natures.map(n => (
              <div key={n.titre}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-foreground">{n.titre.replace(/^Dépenses d[’'e]\s?/i, "").replace(/^./, c => c.toUpperCase())}</span>
                  <span className="whitespace-nowrap font-black text-foreground">{euros(n.propose)} <span className="text-[11px] font-bold text-muted-foreground">({n.vote ? pct(n.propose, n.vote) : "nouveau"} / {anVote})</span></span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max((n.propose / totalNat) * 100, 1)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-muted-foreground">Intervention : subventions, contributions aux organisations internationales, aide au développement versée à des tiers.</p>
        </div>
      )}
      <Sources sources={sources} maj={maj} />
    </Carte>
  );
}

// ── Emplois ────────────────────────────────────────────────────────────────────────

function BlocEmplois({ e, sources, maj }: { e: Emplois; sources: Source[]; maj: string }) {
  const r = e.realise;
  const ops = Object.entries(e.operateurs ?? {});
  return (
    <Carte icone={<Users size={20} />} titre="Effectifs" id="effectifs">
      <div className="grid gap-3 sm:grid-cols-3">
        {e.propose != null && <Chiffre valeur={nombre(e.propose)} legende={`agents prévus en ${e.annee_plf}`} detail={e.vote != null ? `${e.vote < e.propose ? "+" : "−"}${nombre(Math.abs(e.propose - e.vote))} par rapport aux ${nombre(e.vote)} votés pour ${e.annee_plf - 1}` : undefined} />}
        {r?.realise != null && <Chiffre valeur={nombre(r.realise)} legende={`agents réellement employés en ${r.annee}`} detail={r.plafond != null ? `pour ${nombre(r.plafond)} autorisés${r.realise_precedent != null ? ` · ${nombre(r.realise_precedent)} en ${r.annee - 1}` : ""}` : undefined} />}
        {r?.masse_salariale?.realise_meur != null && <Chiffre valeur={`${nombre(r.masse_salariale.realise_meur)} M€`} legende={`de dépenses de personnel en ${r.annee}`} detail={r.masse_salariale.prevu_meur != null ? `pour ${nombre(r.masse_salariale.prevu_meur)} M€ prévus, pensions comprises` : undefined} />}
      </div>
      {ops.length > 0 && (
        <p className="mt-4 text-[13.5px] leading-relaxed text-foreground">
          S&apos;y ajoutent <strong>{nombre(ops.reduce((s, [, v]) => s + v, 0))} emplois</strong> dans les opérateurs financés par le ministère ({ops.map(([p, v]) => `${p} : ${nombre(v)}`).join(" ; ")}), plafond prévu pour {e.annee_plf}.
        </p>
      )}
      <p className="mt-3 text-[11.5px] text-muted-foreground">En équivalents temps plein travaillé (ETPT) : un agent à mi-temps toute l&apos;année compte pour 0,5.</p>
      <Sources sources={sources} maj={maj} />
    </Carte>
  );
}

// ── Résultats (indicateurs de performance) ─────────────────────────────────────────

const ATTEINTE: Record<string, { label: string; cls: string }> = {
  "cible atteinte": { label: "Objectif atteint", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" },
  "amélioration": { label: "En progrès", cls: "bg-sky-500/15 text-sky-800 dark:text-sky-300" },
  "absence amélioration": { label: "Pas de progrès", cls: "bg-rose-500/15 text-rose-800 dark:text-rose-300" },
};
const unite = (u: string | null) => (!u || /^nb$/i.test(u) ? "" : u === "%" ? " %" : u === "jours" ? " jours" : ` ${u}`);
const valeur = (v: string | null | undefined, u: string | null) => (v == null || /^\s*-?\s*$/.test(v) || /sans objet|^na$/i.test(v) ? "—" : `${v}${unite(u)}`);
// Les services rendus aux usagers d'abord (passeports, visas…), puis ce qui concerne tous les citoyens.
const RANG_PUBLIC: Record<string, number> = { Usager: 0, Citoyen: 1, Contribuable: 2 };

function BlocPerformance({ p, sources, maj }: { p: Performance; sources: Source[]; maj: string }) {
  const [filtre, setFiltre] = useState<string>("tous");
  const [tout, setTout] = useState(false);
  const an = String(p.annee);
  const utiles = p.indicateurs.filter(i => i.atteinte && ATTEINTE[i.atteinte] && i.realise[an] && !/sans objet/i.test(i.realise[an] ?? ""))
    .map((i, k) => ({ i, k })).sort((a, b) => (RANG_PUBLIC[a.i.public ?? ""] ?? 3) - (RANG_PUBLIC[b.i.public ?? ""] ?? 3) || a.k - b.k).map(x => x.i);
  const compte = (k: string) => utiles.filter(i => i.atteinte === k).length;
  const liste = utiles.filter(i => filtre === "tous" || i.atteinte === filtre);
  const vus = tout ? liste : liste.slice(0, 8);
  return (
    <Carte icone={<Gauge size={20} />} titre={`Résultats ${p.annee}`} id="resultats">
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        Chaque année, le ministère rend compte au Parlement d&apos;objectifs chiffrés. Ce qu&apos;il a obtenu en {p.annee}, face à la cible qu&apos;il s&apos;était fixée.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[["tous", `Tous (${utiles.length})`], ["cible atteinte", `Atteints (${compte("cible atteinte")})`], ["amélioration", `En progrès (${compte("amélioration")})`], ["absence amélioration", `Sans progrès (${compte("absence amélioration")})`]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setFiltre(k); setTout(false); }}
            className={`rounded-full px-3 py-1.5 text-[12px] font-black ${filtre === k ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      <ul className="mt-5 divide-y divide-border">
        {vus.map((i, k) => (
          <li key={k} className="py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-snug text-foreground">{i.sous_indicateur || i.indicateur}</p>
                {i.sous_indicateur && i.sous_indicateur !== i.indicateur && <p className="mt-0.5 text-[12px] text-muted-foreground">{i.indicateur}</p>}
              </div>
              <span className={`shrink-0 self-start rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide ${ATTEINTE[i.atteinte!].cls}`}>{ATTEINTE[i.atteinte!].label}</span>
            </div>
            <p className="mt-1.5 text-[13px] text-foreground">
              <strong>{valeur(i.realise[an], i.unite)}</strong> en {an}
              <span className="text-muted-foreground"> · cible {valeur(i.cible, i.unite)}{i.realise[String(p.annee - 1)] && !/sans objet/i.test(i.realise[String(p.annee - 1)] ?? "") ? ` · ${valeur(i.realise[String(p.annee - 1)], i.unite)} en ${p.annee - 1}` : ""}</span>
            </p>
          </li>
        ))}
      </ul>
      {liste.length > 8 && (
        <button type="button" onClick={() => setTout(!tout)} className="mt-2 text-[12px] font-black uppercase tracking-widest text-amber-700 hover:underline dark:text-amber-400">
          {tout ? "Réduire" : `Voir les ${liste.length} indicateurs`}
        </button>
      )}
      <Sources sources={sources} maj={maj} mention="Indicateurs publiés par Bercy, repris tels quels, sans IA." />
    </Carte>
  );
}

// ── Questions écrites ──────────────────────────────────────────────────────────────

function BlocQuestions({ q, sources, maj }: { q: Questions; sources: Source[]; maj: string }) {
  const depuis = new Date(q.depuis).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return (
    <Carte icone={<MessageSquareText size={20} />} titre="Questions des députés au ministre" id="questions">
      <div className="grid gap-3 sm:grid-cols-3">
        <Chiffre valeur={`${Math.round((q.repondues / q.total) * 100)} %`} legende="des questions écrites ont reçu une réponse" detail={`${nombre(q.repondues)} sur ${nombre(q.total)} depuis ${depuis}`} />
        {q.delai_median_jours != null && <Chiffre valeur={`${q.delai_median_jours} jours`} legende="délai médian de réponse" detail={`${Math.round((q.repondues_sous_2_mois / Math.max(q.repondues, 1)) * 100)} % des réponses dans le délai de 2 mois prévu par le règlement de l'Assemblée`} />}
        <Chiffre valeur={nombre(q.en_attente_plus_2_mois)} legende="questions sans réponse depuis plus de 2 mois" detail={`${nombre(q.en_attente)} en attente au total`} />
      </div>
      {q.recentes.length > 0 && (
        <>
          <p className="mb-2 mt-6 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Dernières questions posées</p>
          <ul className="divide-y divide-border">
            {q.recentes.map((r, k) => (
              <li key={k} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-medium text-foreground hover:underline">{r.objet || "Question écrite"}</a> : <span className="text-[13.5px] text-foreground">{r.objet}</span>}
                <span className="shrink-0 text-[12px] text-muted-foreground">{date(r.date)} · {r.reponse ? `réponse le ${date(r.reponse)}` : "sans réponse"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-[11.5px] text-muted-foreground">Questions écrites adressées au ministre et à ses ministres délégués (Assemblée nationale).</p>
      <Sources sources={sources} maj={maj} mention="Calculs faits sur les questions publiées par l'Assemblée, sans IA." />
    </Carte>
  );
}

// ── Actualités et Journal officiel ─────────────────────────────────────────────────

// « Publication de … » au JO = entrée en vigueur en France d'un accord ou d'une décision internationale.
const categorieJO = (t: string) =>
  /nomination|cessation de fonctions|nomm[ée]/i.test(t) ? "Nominations"
  : /^publication|accord|convention|avenant|protocole|r[ée]solution|trait[ée]/i.test(t) ? "Accords internationaux"
  : "Décrets et arrêtés";

function BlocActualites({ actus }: { actus: Actu[] }) {
  return (
    <Carte icone={<Newspaper size={20} />} titre="Actualité du ministère" id="actualites">
      {actus.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted px-4 py-8 text-center text-sm italic text-muted-foreground">Aucune actualité relevée ces derniers jours. Le fil se met à jour chaque soir.</p>
      ) : (
        <ul className="divide-y divide-border">
          {actus.map(a => (
            <li key={a.id} className="py-3">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="group block">
                <p className="text-[14.5px] font-bold leading-snug text-foreground group-hover:underline">{a.title} <ExternalLink size={11} className="inline opacity-50" /></p>
                {a.summary && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{a.summary}</p>}
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {date(a.published_at)}{(a.media || a.source_name) && ` · ${a.media || (a.source_name?.startsWith("Ministre") || a.source_name?.startsWith("Google News") ? "Presse" : a.source_name)}`}
                  {a.recoupement === "unique" && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Un seul média</span>}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  );
}

function BlocJournalOfficiel({ textes }: { textes: Actu[] }) {
  const groupes = useMemo(() => {
    const m = new Map<string, Actu[]>();
    for (const t of textes) { const c = categorieJO(t.title); m.set(c, [...(m.get(c) ?? []), t]); }
    return ["Décrets et arrêtés", "Accords internationaux", "Nominations"].filter(c => m.has(c)).map(c => [c, m.get(c)!] as const);
  }, [textes]);
  const [cat, setCat] = useState<string | null>(null);
  const [tout, setTout] = useState(false);
  if (!groupes.length) return null;
  const actif = cat ?? groupes[0][0];
  const liste = groupes.find(g => g[0] === actif)?.[1] ?? [];
  const vus = tout ? liste : liste.slice(0, 8);
  return (
    <Carte icone={<FileText size={20} />} titre="Nouvelles mesures au Journal officiel" id="mesures">
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">Les textes publiés au Journal officiel par le ministère (reconnus à leur code NOR), du plus récent au plus ancien.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {groupes.map(([c, l]) => (
          <button key={c} type="button" onClick={() => { setCat(c); setTout(false); }}
            className={`rounded-full px-3 py-1.5 text-[12px] font-black ${actif === c ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{c} ({l.length})</button>
        ))}
      </div>
      <ul className="mt-4 divide-y divide-border">
        {vus.map(t => (
          <li key={t.id} className="py-2.5">
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="group block">
              <p className="text-[13.5px] font-medium leading-snug text-foreground group-hover:underline">{t.title}</p>
              {t.summary && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">{t.summary}</p>}
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{date(t.published_at)} · Journal officiel</p>
            </a>
          </li>
        ))}
      </ul>
      {liste.length > 8 && (
        <button type="button" onClick={() => setTout(!tout)} className="mt-2 text-[12px] font-black uppercase tracking-widest text-amber-700 hover:underline dark:text-amber-400">
          {tout ? "Réduire" : `Voir les ${liste.length} textes`}
        </button>
      )}
    </Carte>
  );
}

// ── Assemblage ─────────────────────────────────────────────────────────────────────

export default function FicheMinistere({ slug, secours }: { slug: string; secours?: ReactNode }) {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [actus, setActus] = useState<Actu[]>([]);
  const [jo, setJo] = useState<Actu[]>([]);

  useEffect(() => {
    let actif = true;
    const champs = "id, url, title, summary, news_type, published_at, media, source_name, recoupement";
    supabase.from("ministere_fiches").select("rubrique, donnees, sources, maj_le").eq("slug", slug)
      .then(({ data }) => { if (actif) setLignes((data as Ligne[]) || []); });
    supabase.from("entity_feed").select(champs).eq("entity_type", "ministry").eq("entity_id", slug).neq("source_kind", "jorf")
      .order("published_at", { ascending: false, nullsFirst: false }).limit(10)
      .then(({ data }) => { if (actif) setActus((data as Actu[]) || []); });
    supabase.from("entity_feed").select(champs).eq("entity_type", "ministry").eq("entity_id", slug).eq("source_kind", "jorf")
      .order("published_at", { ascending: false, nullsFirst: false }).limit(120)
      .then(({ data }) => { if (actif) setJo((data as Actu[]) || []); });
    return () => { actif = false; };
  }, [slug]);

  const r = (k: string) => lignes?.find(l => l.rubrique === k);
  const budget = r("budget"), emplois = r("emplois"), perf = r("performance"), questions = r("questions");
  const b = budget?.donnees as Budget | undefined;
  const e = emplois?.donnees as Emplois | undefined;
  const q = questions?.donnees as Questions | undefined;
  const anPropose = b && Object.keys(b.annees).find(a => b.annees[a].statut === "propose");
  const anDepense = b && Object.keys(b.annees).find(a => b.annees[a].statut === "depense");

  const sommaire = [
    b && ["#budget", "Budget"], e && ["#effectifs", "Effectifs"], perf && ["#resultats", "Résultats"],
    ["#actualites", "Actualité"], jo.length > 0 && ["#mesures", "Journal officiel"], q && ["#questions", "Questions des députés"],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="space-y-8">
      {(b || e || q) && (
        <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground"><Landmark size={14} /> L&apos;essentiel en chiffres</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {b && anPropose && <Chiffre valeur={euros(b.annees[anPropose].cp)} legende={`de budget proposé pour ${anPropose}`} detail="projet de loi de finances, en débat au Parlement" />}
            {b && anDepense && <Chiffre valeur={euros(b.annees[anDepense].cp)} legende={`réellement dépensés en ${anDepense}`} detail="comptes de l'État" />}
            {e?.propose != null && <Chiffre valeur={nombre(e.propose)} legende={`agents prévus en ${e.annee_plf}`} detail={e.realise?.realise != null ? `${nombre(e.realise.realise)} réellement employés en ${e.realise.annee}` : undefined} />}
            {q && <Chiffre valeur={`${q.delai_median_jours ?? "—"} jours`} legende="pour répondre à un député (médiane)" detail={`${Math.round((q.repondues / q.total) * 100)} % de réponses`} />}
          </div>
          {sommaire.length > 1 && (
            <nav className="mt-5 flex flex-wrap gap-2" aria-label="Sommaire de la fiche">
              {sommaire.map(([h, l]) => <a key={h} href={h} className="rounded-full bg-muted px-3 py-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground">{l}</a>)}
            </nav>
          )}
        </section>
      )}
      <BlocActualites actus={actus} />
      {b ? <BlocBudget b={b} sources={budget!.sources} maj={budget!.maj_le} /> : lignes && secours}
      {e && <BlocEmplois e={e} sources={emplois!.sources} maj={emplois!.maj_le} />}
      {perf && <BlocPerformance p={perf.donnees as Performance} sources={perf.sources} maj={perf.maj_le} />}
      <BlocJournalOfficiel textes={jo} />
      {q && <BlocQuestions q={q} sources={questions!.sources} maj={questions!.maj_le} />}
      {lignes && !b && !e && !q && (
        <p className="flex items-center gap-2 text-[12px] text-muted-foreground"><BookOpen size={14} /> Budget détaillé, effectifs et résultats de ce ministère : bientôt.</p>
      )}
    </div>
  );
}
