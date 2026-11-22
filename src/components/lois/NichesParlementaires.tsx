"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Check, ChevronDown, Clock, ExternalLink, FileText, Hourglass, Landmark, Lock,
  Megaphone, ScrollText, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Undo2, X, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { mesurerAction } from "@/lib/mesure";
import { AN_GROUPS } from "@/lib/data/partyGroups";

/**
 * « À la une » de la page Assemblée (22/11/2026) : les niches parlementaires.
 *
 * Données : table niches_parlementaires, écrite chaque jour par le script backend
 * niches-parlementaires.ts à partir de l'agenda et des dossiers officiels de l'Assemblée
 * (groupe déduit des auteurs des textes, sort de chaque texte lu dans son dossier).
 * L'analyse détaillée (niches_analyses) n'est lisible qu'avec un abonnement Premium ou Pro :
 * les autres voient sa forme, ses compteurs et les questions auxquelles elle répond.
 */

type Texte = {
  ordre: number; ref: string | null; titre: string; objet: string; auteur: string | null; auteur_groupe: string | null;
  statut: string; statut_libelle: string; vote_ref: string | null; pour: number | null; contre: number | null;
  abstention: number | null; dossier_id: string | null; url: string | null;
};
type Niche = { jour: string; session: string; groupe: string; textes: Texte[] };
type AnalyseTexte = { titre: string; ce_que_ca_change: string; pour_qui: string; arguments_pour: string[]; arguments_contre: string[]; vote: string; et_ensuite: string };
type Analyse = { en_bref: string; strategie: string; deroulement: string; textes: AnalyseTexte[]; a_retenir: string[] };
type Apercu = { textes: number; arguments: number; par_texte: { pour: number; contre: number }[]; verifie: boolean; mots: number } | null;

const GROUPE: Record<string, { nom: string; court: string; couleur: string }> = Object.fromEntries([
  ...AN_GROUPS.map(g => [g.short === "LFI" ? "LFI-NFP" : g.short, { nom: g.name.replace(/ \(LFI-NFP\)$/, ""), court: g.short, couleur: g.color }]),
  ["NI", { nom: "Non-inscrits", court: "NI", couleur: "#64748b" }],
]);
const groupe = (code: string | null) => (code && GROUPE[code]) || { nom: code || "", court: code || "", couleur: "#64748b" };

const STATUT: Record<string, { label: string; Icone: LucideIcon; ton: string; barre: string }> = {
  adoptee: { label: "Adoptée", Icone: Check, ton: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300", barre: "bg-emerald-500" },
  rejetee: { label: "Rejetée", Icone: X, ton: "bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300", barre: "bg-rose-500" },
  non_achevee: { label: "Interrompue à minuit", Icone: Clock, ton: "bg-amber-500/10 text-amber-800 ring-amber-500/30 dark:text-amber-300", barre: "bg-amber-400" },
  retiree: { label: "Retirée par son auteur", Icone: Undo2, ton: "bg-violet-500/10 text-violet-700 ring-violet-500/30 dark:text-violet-300", barre: "bg-violet-400" },
  non_examinee: { label: "Pas examinée, faute de temps", Icone: Hourglass, ton: "bg-slate-500/10 text-slate-600 ring-slate-400/30 dark:text-slate-300", barre: "bg-slate-300 dark:bg-slate-600" },
  sans_vote: { label: "Pas de vote ce jour-là", Icone: Hourglass, ton: "bg-slate-500/10 text-slate-600 ring-slate-400/30 dark:text-slate-300", barre: "bg-slate-300 dark:bg-slate-600" },
  en_attente: { label: "Résultat en cours de publication", Icone: Clock, ton: "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-300", barre: "bg-sky-300" },
  a_venir: { label: "À l'ordre du jour", Icone: CalendarDays, ton: "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-300", barre: "bg-sky-300" },
};
const statut = (s: string) => STATUT[s] || STATUT.sans_vote;

const aujourdhui = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
const dateLongue = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const dateCourte = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const EXPLICATIONS: { Icone: LucideIcon; titre: string; texte: string }[] = [
  { Icone: CalendarDays, titre: "Un jour par mois",
    texte: "La Constitution (article 48) réserve un jour de séance par mois aux groupes d'opposition et aux groupes minoritaires. À l'Assemblée, c'est un jeudi, et chaque groupe a le sien à tour de rôle." },
  { Icone: Megaphone, titre: "Le groupe choisit tout",
    texte: "Ce jour-là, ce n'est pas le Gouvernement qui fixe le programme : le groupe inscrit ses propres propositions de loi. C'est sa vitrine — ses idées, mises au vote." },
  { Icone: Clock, titre: "La course contre minuit",
    texte: "Les débats s'arrêtent à minuit. Un texte qui n'est pas voté à temps tombe. Ses adversaires peuvent donc multiplier les amendements pour faire durer : c'est l'obstruction. Le groupe peut alors retirer un texte pour sauver les suivants." },
  { Icone: Landmark, titre: "Voté ne veut pas dire loi",
    texte: "Un texte adopté doit encore passer au Sénat, qui peut le modifier : c'est la « navette ». Il ne devient loi qu'une fois voté dans les mêmes termes par les deux chambres, puis promulgué." },
];

export default function NichesParlementaires() {
  const [niches, setNiches] = useState<Niche[] | null>(null);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [saison, setSaison] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    api.getNiches().then(n => { if (actif) setNiches(n as Niche[]); });
    return () => { actif = false; };
  }, []);

  const auj = aujourdhui();
  const derniere = useMemo(() => [...(niches || [])].reverse().find(n => n.jour <= auj) || null, [niches, auj]);
  const prochaine = useMemo(() => (niches || []).find(n => n.jour > auj) || null, [niches, auj]);
  const saisons = useMemo(() => [...new Set((niches || []).map(n => n.session))].sort().reverse(), [niches]);
  const saisonVue = saison || derniere?.session || prochaine?.session || saisons[0];
  const listees = (niches || []).filter(n => n.session === saisonVue);
  const niche = (niches || []).find(n => n.jour === (choisie || derniere?.jour || prochaine?.jour)) || null;

  if (!niches?.length || !niche) return null;

  return (
    <div className="relative overflow-hidden border-y border-border bg-gradient-to-b from-slate-50 to-card dark:from-slate-900/60 dark:to-slate-950">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">

        {/* En-tête */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
            À la une
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Assemblée nationale · session {saisonVue}</span>
        </div>
        <h2 className="font-staatliches text-[2.6rem] uppercase leading-[0.9] tracking-tight text-foreground dark:text-white md:text-6xl">
          Les niches <span className="text-emerald-600 dark:text-emerald-400">parlementaires</span>
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 md:text-lg">
          Un jeudi par mois, un groupe d&apos;opposition ou minoritaire prend les commandes de l&apos;Assemblée et met ses propres idées au vote.
          Voici ce qu&apos;il en fait — et ce qu&apos;il en reste à minuit.
        </p>

        {/* C'est quoi ? — défile à l'horizontale sur téléphone, grille sur ordinateur */}
        <div className="mt-7">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">C&apos;est quoi, une niche ?</p>
          <ol className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
            {EXPLICATIONS.map(({ Icone, titre, texte }, i) => (
              <li key={titre} className="relative w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:w-[46%] md:w-auto">
                <span aria-hidden className="absolute -right-1 -top-3 font-staatliches text-7xl leading-none text-slate-900/[0.05] dark:text-white/[0.06]">{i + 1}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md"><Icone size={19} /></span>
                <h3 className="mt-3 text-[15px] font-black leading-snug text-foreground dark:text-white">{titre}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground dark:text-slate-400">{texte}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Prochaine niche */}
        {prochaine && prochaine.jour !== niche.jour && (
          <button type="button" onClick={() => setChoisie(prochaine.jour)}
            className="group mt-5 flex w-full items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-3.5 text-left transition hover:border-sky-300 dark:border-sky-900/50 dark:bg-sky-950/30 md:p-4">
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-200 dark:bg-slate-900 dark:text-sky-300 dark:ring-sky-900">
              <span className="text-[15px] font-black leading-none">{new Date(`${prochaine.jour}T12:00:00`).getDate()}</span>
              <span className="text-[9px] font-bold uppercase">{new Date(`${prochaine.jour}T12:00:00`).toLocaleDateString("fr-FR", { month: "short" })}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">Prochaine niche</span>
              <span className="block text-[14px] font-bold text-foreground dark:text-white">{groupe(prochaine.groupe).nom} · {prochaine.textes.length} textes au programme</span>
            </span>
            <ArrowRight size={17} className="shrink-0 text-sky-600 transition group-hover:translate-x-0.5" />
          </button>
        )}

        {/* La saison : une pastille par niche */}
        <div className="mt-6">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Les niches de la session</p>
            {saisons.length > 1 && (
              <div className="flex gap-1 rounded-full bg-muted p-1 text-[11px] font-bold">
                {saisons.map(s => (
                  <button key={s} type="button" onClick={() => setSaison(s)}
                    className={`rounded-full px-2.5 py-1 transition ${s === saisonVue ? "bg-card text-foreground shadow-sm dark:bg-slate-800 dark:text-white" : "text-muted-foreground hover:text-foreground"}`}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {listees.map(n => {
              const g = groupe(n.groupe), actif = n.jour === niche.jour, avenir = n.jour > auj;
              const adoptes = n.textes.filter(t => t.statut === "adoptee").length;
              return (
                <button key={n.jour} type="button" onClick={() => setChoisie(n.jour)} aria-pressed={actif}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${actif ? "border-transparent bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900" : "border-border bg-card hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"}`}>
                  <span className="h-8 w-1.5 rounded-full" style={{ background: g.couleur }} />
                  <span>
                    <span className="block text-[13px] font-black leading-tight">{g.court}</span>
                    <span className={`block text-[11px] leading-tight ${actif ? "opacity-80" : "text-muted-foreground"}`}>
                      {dateCourte(n.jour)} · {avenir ? "à venir" : `${adoptes}/${n.textes.length} adoptés`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <FicheNiche key={niche.jour} niche={niche} />
      </div>
    </div>
  );
}

/* ─────────────────────────── Une niche : résultats et textes ─────────────────────────── */

const LIEN_TEXTE = "mt-0.5 hidden shrink-0 items-center gap-1 self-start rounded-full border border-border px-3 py-1 text-[12px] font-bold text-foreground transition hover:border-slate-400 dark:border-slate-700 dark:text-white sm:inline-flex";

function FicheNiche({ niche }: { niche: Niche }) {
  const g = groupe(niche.groupe);
  const avenir = niche.jour > aujourdhui();
  const compte = (s: string[]) => niche.textes.filter(t => s.includes(t.statut)).length;
  const tableau = [
    { n: compte(["adoptee"]), label: "adoptés", ton: "text-emerald-600 dark:text-emerald-400" },
    { n: compte(["rejetee"]), label: "rejetés", ton: "text-rose-600 dark:text-rose-400" },
    { n: compte(["non_achevee", "retiree"]), label: "interrompus ou retirés", ton: "text-amber-600 dark:text-amber-400" },
    { n: compte(["non_examinee", "sans_vote"]), label: "jamais examinés", ton: "text-slate-500 dark:text-slate-400" },
  ].filter(x => x.n > 0);

  return (
    <article className="mt-5 overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="relative p-5 md:p-7" style={{ background: `linear-gradient(135deg, ${g.couleur}1f, transparent 65%)` }}>
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: g.couleur }} />
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{dateLongue(niche.jour)}</p>
        <h3 className="mt-1 text-2xl font-black leading-tight text-foreground dark:text-white md:text-3xl">
          La niche du groupe <span style={{ color: g.couleur }} className="dark:brightness-150">{g.nom}</span>
        </h3>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {niche.textes.length} textes inscrits à l&apos;ordre du jour{avenir ? ", dans l'ordre où ils seront appelés." : "."}
        </p>

        {!avenir && (
          <>
            <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              {niche.textes.map(t => <span key={t.ordre} className={`h-full flex-1 border-r border-card last:border-0 ${statut(t.statut).barre}`} />)}
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {tableau.map(x => (
                <div key={x.label} className="flex items-baseline gap-1.5">
                  <dt className={`font-staatliches text-3xl leading-none ${x.ton}`}>{x.n}</dt>
                  <dd className="text-[13px] font-semibold text-muted-foreground">{x.label}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </header>

      <ol className="divide-y divide-border dark:divide-slate-800">
        {niche.textes.map(t => {
          const s = statut(t.statut), ga = t.auteur_groupe ? groupe(t.auteur_groupe) : null;
          const total = (t.pour || 0) + (t.contre || 0);
          return (
            <li key={t.ordre} className="flex gap-3 px-5 py-4 md:px-7">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-black text-muted-foreground">{t.ordre}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-snug text-foreground dark:text-white">{t.titre}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px]">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ring-1 ring-inset ${s.ton}`}>
                    <s.Icone size={12} strokeWidth={2.6} /> {t.statut === "adoptee" && /sans modification/i.test(t.statut_libelle) ? "Adoptée définitivement" : s.label}
                  </span>
                  {t.auteur && (
                    <span className="text-muted-foreground">
                      par {t.auteur}{ga ? <> · <span className="font-bold" style={{ color: ga.couleur }}>{ga.court}</span></> : null}
                    </span>
                  )}
                  {!t.auteur && <span className="text-muted-foreground">texte venu du Sénat</span>}
                </div>
                {total > 0 && (
                  <div className="mt-2 max-w-sm">
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className="bg-emerald-500" style={{ width: `${(100 * (t.pour || 0)) / total}%` }} />
                      <span className="bg-rose-500" style={{ width: `${(100 * (t.contre || 0)) / total}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{t.pour} pour · {t.contre} contre{t.abstention ? ` · ${t.abstention} abstentions` : ""}</p>
                  </div>
                )}
              </div>
              {t.dossier_id ? (
                <Link href={`/lois/?dossier=${t.dossier_id}`} className={LIEN_TEXTE}>Le texte <ArrowRight size={13} /></Link>
              ) : t.url ? (
                <a href={t.url} target="_blank" rel="noopener noreferrer" className={LIEN_TEXTE}>Le texte <ExternalLink size={12} /></a>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="border-t border-border p-4 dark:border-slate-800 md:p-6">
        <AnalyseNiche niche={niche} />
      </div>
    </article>
  );
}

/* ─────────────────────────── L'analyse : abonnés / verrou ─────────────────────────── */

function AnalyseNiche({ niche }: { niche: Niche }) {
  const { isPremium, loading } = usePremium();
  const [lu, setLu] = useState<{ jour: string; data: Awaited<ReturnType<typeof api.getNicheAnalyse>> } | null>(null);
  const [vu, setVu] = useState<{ jour: string; apercu: Apercu } | null>(null);

  useEffect(() => {
    if (loading) return;
    let actif = true;
    if (isPremium) api.getNicheAnalyse(niche.jour).then(d => { if (actif) setLu({ jour: niche.jour, data: d }); });
    else api.getNicheApercu(niche.jour).then(a => { if (actif) setVu({ jour: niche.jour, apercu: a }); });
    return () => { actif = false; };
  }, [niche.jour, isPremium, loading]);

  if (loading) return <div className="h-40 animate-pulse rounded-3xl bg-amber-400/10" />;
  if (!isPremium) return <Verrou niche={niche} apercu={vu?.jour === niche.jour ? vu.apercu : null} />;
  const data = lu?.jour === niche.jour ? lu.data : undefined;
  if (data === undefined) return <div className="h-40 animate-pulse rounded-3xl bg-amber-400/10" />;
  if (!data) {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-amber-400/30 bg-amber-400/[0.06] p-5">
        <Sparkles className="mt-0.5 shrink-0 text-amber-500" size={18} />
        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          <strong className="text-foreground dark:text-white">Analyse détaillée en préparation.</strong> Elle est rédigée à partir des textes eux-mêmes,
          des débats en séance et des votes de chaque groupe, et paraît ici dès qu&apos;elle est prête
          {niche.jour <= aujourdhui() ? " (les résultats officiels arrivent dans les jours qui suivent la niche)" : ""}.
        </p>
      </div>
    );
  }
  return <AnalyseComplete niche={niche} a={data.analyse as Analyse} sources={data.sources} verifie={data.verifie} />;
}

/** Les questions auxquelles répond l'analyse, tirées des résultats publics : ce qu'on ne lit pas encore. */
function questions(niche: Niche): string[] {
  const g = groupe(niche.groupe);
  const q: string[] = [];
  const retirees = niche.textes.filter(t => t.statut === "retiree");
  const coupee = niche.textes.find(t => t.statut === "non_achevee");
  const rejetees = niche.textes.filter(t => t.statut === "rejetee");
  const serree = niche.textes.filter(t => t.pour != null && t.contre != null && t.contre > 0).sort((a, b) => Math.abs(a.pour! - a.contre!) - Math.abs(b.pour! - b.contre!))[0];
  if (niche.jour > aujourdhui()) {
    q.push(`Pourquoi le groupe ${g.court} a choisi ces ${niche.textes.length} textes, et ce que chacun changerait concrètement`);
    q.push("Les arguments qui s'opposent déjà, texte par texte");
  } else {
    if (retirees.length) q.push(`Pourquoi le groupe ${g.court} a retiré ${retirees.length > 1 ? `${retirees.length} de ses propres textes` : "l'un de ses propres textes"} en pleine séance`);
    if (coupee) q.push(`Ce qui a empêché « ${coupee.titre.length > 70 ? `${coupee.titre.slice(0, 68)}…` : coupee.titre} » d'aller au bout avant minuit`);
    if (rejetees.length) q.push(`Qui a fait tomber ${rejetees.length > 1 ? `${rejetees.length} textes` : "le texte rejeté"}, et avec quels arguments`);
    if (serree) q.push(`Le vote le plus serré : qui a voté quoi, groupe par groupe`);
  }
  q.push("Ce que chaque texte change pour vous, en clair");
  q.push("Et maintenant ? Sénat, deuxième lecture ou retour à la case départ");
  return q.slice(0, 4);
}

function Verrou({ niche, apercu }: { niche: Niche; apercu: Apercu }) {
  const vu = useRef(false);
  useEffect(() => {
    if (vu.current) return;
    vu.current = true;
    void mesurerAction("niche_verrou_vu");
  }, []);
  const lignes = niche.textes.slice(0, 3);
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-amber-400/40 bg-[#0d1222] shadow-[0_20px_60px_-20px_rgba(251,191,36,0.35)]">
      <div className="relative px-5 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            <Lock size={11} /> Premium & Pro
          </span>
          {apercu && <span className="text-[11px] font-semibold text-slate-400">{apercu.mots.toLocaleString("fr-FR")} mots · {apercu.arguments} arguments attribués{apercu.verifie ? " · vérifiée" : ""}</span>}
        </div>
        <h4 className="mt-3 font-staatliches text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">L&apos;analyse complète de cette niche</h4>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-slate-300">
          Ce que les résultats ne disent pas : les coulisses de la journée, texte par texte, à partir des textes officiels, des débats en séance et des votes de chaque groupe.
        </p>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {questions(niche).map(q => (
            <li key={q} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[13px] font-semibold leading-snug text-slate-100">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><Lock size={11} strokeWidth={2.6} /></span>
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* Aperçu de la forme : les vrais titres, le contenu flouté (aucun texte réel derrière le flou). */}
      <div className="relative mt-5 px-5 md:px-8" aria-hidden>
        <div className="space-y-2.5">
          {lignes.map((t, i) => {
            const c = apercu?.par_texte?.[t.ordre - 1];
            return (
              <div key={t.ordre} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-[13px] font-bold text-white/90">{t.ordre}. {t.titre}</p>
                <div className="mt-2 select-none space-y-1.5 blur-[5px]">
                  <div className="h-2.5 w-[92%] rounded-full bg-slate-300/30" />
                  <div className="h-2.5 w-[78%] rounded-full bg-slate-300/30" />
                  {i === 0 && <div className="h-2.5 w-[85%] rounded-full bg-slate-300/30" />}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                  {/* Un compteur à zéro n'est pas affiché : on ne promet pas des arguments qui n'existent pas. */}
                  {(!c || c.pour > 0) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-300"><ThumbsUp size={11} /> {c ? `${c.pour} argument${c.pour > 1 ? "s" : ""} pour` : "Les arguments pour"}</span>}
                  {(!c || c.contre > 0) && <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/15 px-2 py-0.5 text-rose-300"><ThumbsDown size={11} /> {c ? `${c.contre} argument${c.contre > 1 ? "s" : ""} contre` : "Les arguments contre"}</span>}
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-slate-300"><ScrollText size={11} /> Ce que ça change</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0d1222] to-transparent" />
      </div>

      <div className="relative flex flex-col items-center px-5 pb-8 pt-2 text-center md:px-8">
        {niche.textes.length > 3 && <p className="mb-4 text-[12px] font-semibold text-slate-400">+ {niche.textes.length - 3} autres textes analysés de la même façon</p>}
        <Link href="/premium" onClick={() => { void mesurerAction("niche_verrou_clic"); }}
          className="sword-shine group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-7 py-3.5 font-staatliches text-xl uppercase leading-none tracking-wide text-slate-950 shadow-[0_10px_36px_rgba(251,191,36,0.4)] transition hover:brightness-105 active:scale-[0.98]">
          Lire l&apos;analyse <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="mt-3 text-[12px] font-semibold text-amber-200/90">Essai gratuit 7 jours · sans engagement</p>
        <Link href="/login/?suite=/deputes/%23niches" className="mt-2 text-[12px] text-slate-400 underline underline-offset-4 hover:text-slate-200">Déjà membre ? Se connecter</Link>
      </div>
    </div>
  );
}

function Bloc({ Icone, titre, children }: { Icone: LucideIcon; titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h5 className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"><Icone size={14} /> {titre}</h5>
      {children}
    </section>
  );
}

const paragraphes = (t: string) => t.split(/\n+/).filter(Boolean).map((p, i) => <p key={i} className="mt-2 first:mt-0 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{p}</p>);

function AnalyseComplete({ niche, a, sources, verifie }: { niche: Niche; a: Analyse; sources: { titre: string; url: string }[]; verifie: boolean }) {
  const [ouvert, setOuvert] = useState<number | null>(0);
  return (
    <div className="rounded-[1.75rem] border border-amber-400/40 bg-gradient-to-b from-amber-400/[0.07] to-transparent p-5 md:p-7">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">
          <Sparkles size={11} /> Analyse détaillée
        </span>
        {verifie && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck size={13} /> Relue et vérifiée sur les sources</span>}
      </div>

      {a.en_bref && <p className="text-[16px] font-semibold leading-relaxed text-foreground dark:text-white md:text-[17px]">{a.en_bref}</p>}

      {a.strategie && <Bloc Icone={Megaphone} titre="Pourquoi ces textes">{paragraphes(a.strategie)}</Bloc>}
      {a.deroulement && <Bloc Icone={Clock} titre={niche.jour > aujourdhui() ? "Ce qu'il faudra regarder" : "Le déroulé de la journée"}>{paragraphes(a.deroulement)}</Bloc>}

      <Bloc Icone={FileText} titre="Texte par texte">
        <div className="space-y-2">
          {a.textes.map((t, i) => {
            const ligne = niche.textes[i];
            const s = statut(ligne?.statut || "");
            const open = ouvert === i;
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card dark:border-slate-800 dark:bg-slate-900">
                <button type="button" onClick={() => setOuvert(open ? null : i)} aria-expanded={open}
                  className="flex w-full items-start gap-3 p-4 text-left">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold leading-snug text-foreground dark:text-white">{ligne?.titre || t.titre}</span>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${s.ton}`}><s.Icone size={11} /> {s.label}</span>
                  </span>
                  <ChevronDown size={18} className={`mt-1 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="space-y-4 border-t border-border px-4 pb-5 pt-4 dark:border-slate-800">
                    {t.ce_que_ca_change && <div><p className="mb-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Ce que ça change</p>{paragraphes(t.ce_que_ca_change)}</div>}
                    {t.pour_qui && <div><p className="mb-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Qui est concerné</p>{paragraphes(t.pour_qui)}</div>}
                    {(t.arguments_pour.length > 0 || t.arguments_contre.length > 0) && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-emerald-500/[0.07] p-3.5">
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400"><ThumbsUp size={12} /> Pour</p>
                          {t.arguments_pour.length ? <ul className="space-y-2">{t.arguments_pour.map((x, k) => <li key={k} className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">{x}</li>)}</ul>
                            : <p className="text-[13px] text-muted-foreground">Pas d&apos;argument exprimé dans les sources.</p>}
                        </div>
                        <div className="rounded-xl bg-rose-500/[0.07] p-3.5">
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400"><ThumbsDown size={12} /> Contre</p>
                          {t.arguments_contre.length ? <ul className="space-y-2">{t.arguments_contre.map((x, k) => <li key={k} className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">{x}</li>)}</ul>
                            : <p className="text-[13px] text-muted-foreground">Pas d&apos;argument exprimé dans les sources.</p>}
                        </div>
                      </div>
                    )}
                    {t.vote && <div><p className="mb-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Le vote</p>{paragraphes(t.vote)}</div>}
                    {t.et_ensuite && <div><p className="mb-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Et maintenant ?</p>{paragraphes(t.et_ensuite)}</div>}
                    {ligne?.dossier_id && (
                      <Link href={`/lois/?dossier=${ligne.dossier_id}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-foreground underline underline-offset-4 dark:text-white">
                        Toute la fiche du texte <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Bloc>

      {a.a_retenir?.length > 0 && (
        <Bloc Icone={Check} titre="À retenir">
          <ul className="space-y-2">
            {a.a_retenir.map((x, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300"><Check size={10} strokeWidth={3} /></span>{x}
              </li>
            ))}
          </ul>
        </Bloc>
      )}

      {sources?.length > 0 && (
        <details className="mt-6 text-[12px] text-muted-foreground">
          <summary className="cursor-pointer font-bold">Sources ({sources.length})</summary>
          <ul className="mt-2 space-y-1">
            {sources.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{s.titre}</a></li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
