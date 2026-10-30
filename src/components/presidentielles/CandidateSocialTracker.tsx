"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2, Radio, Download, ChevronDown, TrendingUp, TrendingDown, AlertTriangle, ExternalLink,
  Minus, Eye, Users2, Clapperboard, ShieldCheck, Heart, MessageCircle, Repeat2, Flame, Rocket, Target, Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { EnTete, ZonePro } from "./dynamiques/VerrouPro";
import { vignetteWikimedia } from "@/lib/wikimedia";
import {
  computeMetrics, sumMetric, compact, signed, bilanPublications, tauxEngagement, courbeConstante,
  interactions, PLATFORM_META, SOURCES,
  type Metrics, type Platform, type SocialAccount, type SocialPost, type Snapshot,
} from "@/lib/socialStats";

type Candidate = {
  id: string;
  slug: string;
  full_name: string;
  party: string | null;
  photo_url: string | null;
};

type Scope = "all" | "official" | "support";
type Period = 7 | 30;
type Tri = "audience" | "croissance" | "vues" | "interactions" | "engagement" | "publications";

const TRIS: [Tri, string][] = [
  ["audience", "Audience"], ["croissance", "Progression"], ["vues", "Vues"],
  ["interactions", "Interactions"], ["engagement", "Engagement"], ["publications", "Publications"],
];
const PLATEFORMES: Platform[] = ["x", "instagram", "tiktok", "youtube", "bluesky"];

const nombre = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("fr-FR"));
const pourcent = (n: number | null | undefined, signe = false) =>
  n == null ? "—" : `${signe && n > 0 ? "+" : ""}${n.toLocaleString("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: Math.abs(n) < 10 ? 2 : 1 })} %`;
const jourCourt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="h-8 w-24" />;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const monte = points[points.length - 1] >= points[0];
  const d = points.map((v, i) => `${(i / (points.length - 1)) * 96},${30 - ((v - min) / span) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24 overflow-visible" role="img" aria-label="Évolution de l'audience à périmètre constant">
      <polyline points={d} fill="none" stroke={monte ? "#059669" : "#e11d48"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-300"><Minus size={14} /></span>;
  if (value > 0) return <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><TrendingUp size={14} /> {signed(value)}</span>;
  if (value < 0) return <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400"><TrendingDown size={14} /> {signed(value)}</span>;
  return <span className="flex items-center gap-1 text-muted-foreground"><Minus size={14} /> 0</span>;
}

function Masked({ children, isPro }: { children: React.ReactNode; isPro: boolean }) {
  if (isPro) return <>{children}</>;
  return <span className="select-none blur-[5px]" aria-hidden>{children}</span>;
}

/* ── Une ligne par compte : chiffre exact, source et date ── */
function AccountRow({ m, posts, period, isPro }: { m: Metrics; posts: SocialPost[]; period: Period; isPro: boolean }) {
  const meta = PLATFORM_META[m.account.platform];
  const delta = period === 7 ? m.followersDelta7 : m.followersDelta30;
  const bilan = bilanPublications(posts, period);
  const taux = tauxEngagement([{ followers: m.followers, posts: bilan.liste }]);
  return (
    <div className="border-t border-border py-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />{" "}
        <span className="text-[13px] font-bold text-foreground">{meta.label}</span>{" "}
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${m.account.kind === "official" ? "bg-slate-100 text-muted-foreground dark:bg-slate-800 dark:text-slate-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"}`}>
          {m.account.kind === "official" ? "Officiel" : "Soutien"}
        </span>{" "}
        {m.account.url
          ? <a href={m.account.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-[12px] text-muted-foreground hover:underline">{m.account.handle} <ExternalLink size={10} /></a>
          : <span className="text-[12px] text-muted-foreground">{m.account.handle}</span>}{" "}
        {m.anomalie && <span title="Saut de plus de 10 % d'un jour à l'autre, écarté de la progression" className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Variation à vérifier</span>}{" "}
        {m.status === "stale" && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Relevé d&apos;il y a {m.staleDays} j</span>}
      </div>{" "}
      {m.status === "unavailable" ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground"><AlertTriangle size={12} /> Pas encore de relevé : aucun chiffre plutôt qu&apos;un chiffre faux.</p>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
            {[
              ["Abonnés", <Masked key="a" isPro={isPro}>{nombre(m.followers)}</Masked>],
              [`Sur ${period} j`, <Masked key="d" isPro={isPro}><Trend value={delta} /></Masked>],
              [`Publications ${period} j`, <Masked key="p" isPro={isPro}>{bilan.nb || "—"}</Masked>],
              ["Vues des publications", <Masked key="v" isPro={isPro}>{compact(bilan.vues)}</Masked>],
              ["Engagement", <Masked key="e" isPro={isPro}>{pourcent(taux)}</Masked>],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{k}</dt>{" "}
                <dd className="text-[13px] font-bold tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>{" "}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Source : {SOURCES[m.latest?.source ?? ""] ?? m.latest?.source} · relevé du {m.latest ? jourCourt(m.latest.captured_on) : "—"}
          </p>
        </>
      )}
    </div>
  );
}

/* ── Une publication, avec ses chiffres et le lien pour vérifier ── */
function Publication({ p, nom, isPro }: { p: SocialPost; nom?: string; isPro: boolean }) {
  const meta = PLATFORM_META[p.platform];
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-border bg-background p-3.5 transition hover:border-fuchsia-300">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />{" "}
        <span className="font-bold text-foreground">{nom ? `${nom} · ` : ""}{meta.label}</span>{" "}
        <span>{jourCourt(p.publie_le)}</span>{" "}
        <ExternalLink size={10} className="ml-auto" />
      </span>{" "}
      <span className="mt-1.5 line-clamp-2 block text-[13px] leading-snug text-foreground">{p.texte || "(publication sans texte)"}</span>{" "}
      <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold tabular-nums text-muted-foreground">
        {p.vues != null && <span className="flex items-center gap-1 text-fuchsia-700 dark:text-fuchsia-400"><Eye size={12} /> <Masked isPro={isPro}>{compact(p.vues)}</Masked></span>}{" "}
        {p.likes != null && <span className="flex items-center gap-1"><Heart size={12} /> <Masked isPro={isPro}>{compact(p.likes)}</Masked></span>}{" "}
        {p.commentaires != null && <span className="flex items-center gap-1"><MessageCircle size={12} /> <Masked isPro={isPro}>{compact(p.commentaires)}</Masked></span>}{" "}
        {p.partages != null && <span className="flex items-center gap-1"><Repeat2 size={12} /> <Masked isPro={isPro}>{compact(p.partages)}</Masked></span>}
      </span>
    </a>
  );
}

/* ── Fait marquant de la période, calculé sur les chiffres affichés ── */
function Fait({ Icone, titre, nom, valeur, detail, isPro }: { Icone: typeof Flame; titre: string; nom?: string; valeur?: string; detail?: string; isPro: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-400"><Icone size={13} /> {titre}</span>{" "}
      {nom ? (
        <>
          <span className="mt-2 block truncate text-[15px] font-black text-foreground">{nom}</span>{" "}
          <span className="block text-xl font-black tabular-nums text-foreground"><Masked isPro={isPro}>{valeur}</Masked></span>{" "}
          {detail && <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{detail}</span>}
        </>
      ) : <span className="mt-2 block text-[12px] text-muted-foreground">Il faut encore quelques relevés pour le dire sans se tromper.</span>}
    </div>
  );
}

/* ═══════════════════════════════ Composant ═══════════════════════════════ */
export default function CandidateSocialTracker({ candidates }: { candidates: Candidate[] }) {
  const { isPro } = usePremium();
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [period, setPeriod] = useState<Period>(7);
  // Par défaut on ne compte QUE les comptes personnels.
  //
  // Un compte de parti est rattaché à plusieurs candidats (le PS l'est à Faure, Brun et
  // Guedj) : le additionner à l'audience de chacun donne un classement faux, où un
  // candidat à 2 300 abonnés apparaît devant un candidat qui en a 40 000 en propre.
  const [scope, setScope] = useState<Scope>("official");
  const [plateforme, setPlateforme] = useState<Platform | "toutes">("toutes");
  const [tri, setTri] = useState<Tri>("audience");
  const [openId, setOpenId] = useState<string | null>(null);
  const [methode, setMethode] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const accs = await api.getCandidateSocialAccounts() as SocialAccount[];
      if (!active) return;
      setAccounts(accs);
      if (!accs.length) return;
      const ids = accs.map(a => a.id);
      const [snaps, pubs] = await Promise.all([
        api.getCandidateSocialSnapshots(ids, 40) as Promise<Snapshot[]>,
        api.getCandidateSocialPosts(ids) as Promise<SocialPost[]>,
      ]);
      if (active) { setSnapshots(snaps); setPosts(pubs); }
    })().catch(() => { if (active) setAccounts([]); });
    return () => { active = false; };
  }, []);

  const postsParCompte = useMemo(() => {
    const m = new Map<string, SocialPost[]>();
    for (const p of posts) m.set(p.account_id, [...(m.get(p.account_id) ?? []), p]);
    return m;
  }, [posts]);

  const rows = useMemo(() => {
    if (!accounts?.length) return [];
    const kept = accounts.filter(a => (scope === "all" || a.kind === scope) && (plateforme === "toutes" || a.platform === plateforme));
    const byCandidate = new Map<string, Metrics[]>();
    for (const acc of kept) byCandidate.set(acc.candidate_id, [...(byCandidate.get(acc.candidate_id) ?? []), computeMetrics(acc, snapshots)]);

    const lignes = candidates.map(c => {
      const metrics = byCandidate.get(c.id) ?? [];
      if (!metrics.length) return null;
      // Périmètre constant : seuls les comptes mesurés aux deux dates, sans saut suspect.
      const comparables = metrics.filter(m => !m.anomalie && (period === 7 ? m.followersDelta7 : m.followersDelta30) != null);
      const gain = comparables.reduce((t, m) => t + ((period === 7 ? m.followersDelta7 : m.followersDelta30) ?? 0), 0);
      const base = comparables.reduce((t, m) => t + ((period === 7 ? m.followersRef7 : m.followersRef30) ?? 0), 0);
      const parCompte = metrics.map(m => ({ followers: m.followers, posts: bilanPublications(postsParCompte.get(m.account.id) ?? [], period).liste }));
      const bilan = bilanPublications(parCompte.flatMap(x => x.posts), period);
      return {
        candidate: c,
        metrics: metrics.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)),
        followers: sumMetric(metrics, "followers"),
        gain: comparables.length ? gain : null,
        croissance: comparables.length && base ? (gain / base) * 100 : null,
        nbComparables: comparables.length,
        pubs: bilan.liste,
        publications: bilan.nb,
        vues: bilan.vues,
        interactions: bilan.interactions,
        engagement: tauxEngagement(parCompte),
        mesures: metrics.filter(m => m.status !== "unavailable").length,
        plateformes: [...new Set(metrics.map(m => m.account.platform))],
        spark: courbeConstante(metrics, snapshots),
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    const valeur = (r: (typeof lignes)[number]) => ({
      audience: r.followers, croissance: r.croissance, vues: r.vues,
      interactions: r.interactions, engagement: r.engagement, publications: r.publications,
    })[tri];
    return lignes.sort((a, b) => (valeur(b) ?? -Infinity) - (valeur(a) ?? -Infinity) || (b.followers ?? 0) - (a.followers ?? 0));
  }, [accounts, snapshots, postsParCompte, candidates, scope, plateforme, period, tri]);

  const nomDe = useMemo(() => new Map(candidates.map(c => [c.id, c.full_name])), [candidates]);

  /* Vérifications : ce qui a été relevé, quand, et ce qui manque. */
  const controle = useMemo(() => {
    const tous = rows.flatMap(r => r.metrics);
    return {
      comptes: tous.length,
      frais: tous.filter(m => m.status === "ok" && m.staleDays != null && m.staleDays <= 1).length,
      manquants: tous.filter(m => m.status === "unavailable").length,
      anomalies: tous.filter(m => m.anomalie).length,
      dernier: snapshots.filter(s => s.status === "ok").reduce((d, s) => (s.captured_on > d ? s.captured_on : d), ""),
      debutPosts: posts.reduce((d, p) => (!d || p.releve_le < d ? p.releve_le : d), ""),
    };
  }, [rows, snapshots, posts]);

  /* Faits marquants : uniquement des chiffres présents dans le tableau. */
  const faits = useMemo(() => {
    const max = <T,>(l: T[], f: (x: T) => number | null | undefined) =>
      l.reduce<T | null>((b, x) => ((f(x) ?? -Infinity) > ((b ? f(b) : null) ?? -Infinity) ? x : b), null);
    const toutes = rows.flatMap(r => r.pubs);
    return {
      progression: max(rows.filter(r => (r.gain ?? 0) > 0 && (r.followers ?? 0) >= 5000), r => r.croissance),
      engage: max(rows.filter(r => r.pubs.length >= 3 && (r.followers ?? 0) >= 5000), r => r.engagement),
      actif: max(rows.filter(r => r.publications > 0), r => r.publications),
      virale: max(toutes.filter(p => p.vues != null), p => p.vues) ?? max(toutes, interactions),
    };
  }, [rows]);

  const top = useMemo(
    () => rows.flatMap(r => r.pubs).sort((a, b) => (b.vues ?? 0) - (a.vues ?? 0) || interactions(b) - interactions(a)).slice(0, 10),
    [rows],
  );

  const exportCsv = () => {
    if (!rows.length) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Candidat", "Parti", "Plateforme", "Compte", "Type", "Abonnés", `Abonnés +/- ${period}j`, `Publications ${period}j`, `Vues des publications ${period}j`, `Interactions ${period}j`, "Engagement %", "Source", "Variation à vérifier", "Dernier relevé", "Lien"];
    const lines: string[] = [];
    for (const r of rows) {
      for (const m of r.metrics) {
        const bilan = bilanPublications(postsParCompte.get(m.account.id) ?? [], period);
        const taux = tauxEngagement([{ followers: m.followers, posts: bilan.liste }]);
        lines.push([
          r.candidate.full_name, r.candidate.party ?? "", PLATFORM_META[m.account.platform].label, m.account.handle,
          m.account.kind === "official" ? "Officiel" : "Soutien", m.followers ?? "",
          period === 7 ? m.followersDelta7 ?? "" : m.followersDelta30 ?? "", bilan.nb, bilan.vues ?? "", bilan.interactions ?? "",
          taux == null ? "" : taux.toFixed(2).replace(".", ","), SOURCES[m.latest?.source ?? ""] ?? m.latest?.source ?? "",
          m.anomalie ? "oui" : "", m.latest?.captured_on ?? "", m.account.url ?? "",
        ].map(esc).join(";"));
      }
    }
    const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veille-reseaux-candidats-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const bouton = (actif: boolean) => `shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${actif ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div id="veille" className="mx-auto max-w-6xl scroll-mt-36 px-4 pb-24">
      <EnTete numero="04" rubrique="Réseaux sociaux" pro titre="Dynamiques" accent="réseaux sociaux" degrade="from-fuchsia-500 to-purple-600"
        chapeau={<>X, Instagram, TikTok, YouTube et Bluesky : l&apos;audience exacte de chaque candidat, sa progression, ce qu&apos;il publie
          et ce que ses publications font réellement. Chaque chiffre indique sa source et sa date, et chaque publication renvoie à l&apos;original.</>}
        actions={isPro && rows.length > 0 ? (
          <button onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm transition hover:border-slate-400 hover:text-foreground">
            <Download size={13} /> Export CSV
          </button>
        ) : undefined} />{" "}

      <ZonePro titre="La veille réseaux sociaux" points={["Audience exacte sur X, Instagram, TikTok, YouTube et Bluesky", "Vues, j'aime et partages réels de chaque publication", "Taux d'engagement, top des publications, export CSV"]}>
      {accounts === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-fuchsia-500" /></div>
      ) : !accounts.length ? (
        <div className="rounded-3xl border border-dashed border-border py-14 text-center">
          <Radio size={28} className="mx-auto mb-3 text-slate-300" />{" "}
          <p className="text-sm font-bold text-muted-foreground">Aucun compte suivi pour l&apos;instant.</p>
        </div>
      ) : (
        <>
          {/* Contrôle qualité, avant tout chiffre */}
          <div className="mb-5 rounded-2xl border border-emerald-300/50 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-foreground">
              <span className="flex items-center gap-1.5 font-black"><ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" /> Contrôle des données</span>{" "}
              <span><strong className="tabular-nums">{controle.frais}/{controle.comptes}</strong> comptes relevés depuis hier</span>{" "}
              {controle.dernier && <span>dernier relevé : <strong>{jourCourt(controle.dernier)}</strong></span>}{" "}
              {controle.manquants > 0 && <span className="text-amber-700 dark:text-amber-300">{controle.manquants} sans relevé pour l&apos;instant</span>}{" "}
              {controle.anomalies > 0 && <span className="text-amber-700 dark:text-amber-300">{controle.anomalies} variation{controle.anomalies > 1 ? "s" : ""} à vérifier, hors progression</span>}{" "}
              <button onClick={() => setMethode(v => !v)} aria-expanded={methode} className="ml-auto min-h-[32px] font-bold text-emerald-700 underline dark:text-emerald-400">
                Comment c&apos;est vérifié
              </button>
            </div>{" "}
            {methode && (
              <ul className="mt-3 space-y-1.5 border-t border-emerald-300/40 pt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                <li><strong className="text-foreground">Identité :</strong> un compte X ou Instagram n&apos;est ajouté que si le nom affiché correspond au candidat et qu&apos;il dépasse 5 000 abonnés. Les faux comptes reprennent le nom à l&apos;identique, et le badge de X s&apos;achète.</li>
                <li><strong className="text-foreground">Progression :</strong> calculée à périmètre constant, entre deux relevés d&apos;une même source. Un compte tout juste ajouté ou un changement de source ne crée donc pas de faux gain.</li>
                <li><strong className="text-foreground">Variations suspectes :</strong> un saut de plus de 10 % en un jour est signalé et écarté de la progression.</li>
                <li><strong className="text-foreground">Vues :</strong> ce sont celles des publications de la période, chacune datée et reliée à l&apos;original. Instagram ne les rend pas publiques sur les photos : le total d&apos;un candidat peut donc les sous-estimer.</li>
                <li><strong className="text-foreground">Arrondis :</strong> YouTube arrondit ses abonnés (1 310 000), donc une variation peut n&apos;être qu&apos;un effet d&apos;arrondi. X, Instagram, TikTok et Bluesky donnent le chiffre exact.</li>
                <li><strong className="text-foreground">Publications :</strong> X ne montre qu&apos;une sélection de publications aux visiteurs sans compte : leur nombre y est un minimum, et les réponses et repartages sont exclus. Le total se complète à chaque relevé.</li>
                <li><strong className="text-foreground">Engagement :</strong> j&apos;aime, commentaires et partages par publication, rapportés aux abonnés du compte. Les petits comptes ont mécaniquement des taux plus élevés.</li>
                <li><strong className="text-foreground">Absence :</strong> un compte sans relevé affiche « — », jamais un ancien chiffre présenté comme frais. Un relevé de plus de 3 jours est signalé.</li>
                <li><strong className="text-foreground">Limite :</strong> ces chiffres mesurent une présence en ligne, pas une intention de vote.</li>
              </ul>
            )}
          </div>{" "}

          {/* Faits marquants */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fait Icone={Rocket} titre={`Plus forte progression ${period} j`} isPro={isPro} nom={faits.progression?.candidate.full_name}
              valeur={pourcent(faits.progression?.croissance, true)} detail={faits.progression ? `${signed(faits.progression.gain)} abonnés, sur ${faits.progression.nbComparables} compte${faits.progression.nbComparables > 1 ? "s" : ""} comparable${faits.progression.nbComparables > 1 ? "s" : ""}` : undefined} />{" "}
            <Fait Icone={Flame} titre="Publication la plus vue" isPro={isPro} nom={faits.virale ? nomDe.get(faits.virale.candidate_id) : undefined}
              valeur={faits.virale?.vues != null ? `${compact(faits.virale.vues)} vues` : `${compact(faits.virale ? interactions(faits.virale) : null)} interactions`} detail={faits.virale?.texte ?? undefined} />{" "}
            <Fait Icone={Target} titre="Meilleur engagement" isPro={isPro} nom={faits.engage?.candidate.full_name}
              valeur={pourcent(faits.engage?.engagement)} detail={faits.engage ? `sur ${faits.engage.pubs.length} publications` : undefined} />{" "}
            <Fait Icone={Zap} titre="Le plus actif" isPro={isPro} nom={faits.actif?.candidate.full_name}
              valeur={faits.actif ? `${faits.actif.publications} publications` : undefined} detail={`relevées sur ${period} jours`} />
          </div>{" "}

          {/* Réglages */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              {([[7, "7 jours"], [30, "30 jours"]] as const).map(([v, label]) => (
                <button key={v} onClick={() => setPeriod(v)} className={bouton(period === v)}>{label}</button>
              ))}
            </div>{" "}
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              {([["official", "Personnels"], ["support", "De soutien"], ["all", "Les deux"]] as const).map(([v, label]) => (
                <button key={v} onClick={() => setScope(v)} className={bouton(scope === v)}>{label}</button>
              ))}
            </div>{" "}
            <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-card p-1">
              <button onClick={() => setPlateforme("toutes")} className={bouton(plateforme === "toutes")}>Toutes</button>{" "}
              {PLATEFORMES.map(p => <button key={p} onClick={() => setPlateforme(p)} className={bouton(plateforme === p)}>{PLATFORM_META[p].label}</button>)}
            </div>
          </div>{" "}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Classer par</span>{" "}
            {TRIS.map(([v, label]) => (
              <button key={v} onClick={() => setTri(v)} aria-pressed={tri === v}
                className={`rounded-full border px-3 py-1 text-[12px] font-bold transition ${tri === v ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>{" "}

          {/* Classement */}
          <div className="space-y-2.5">
            {rows.map((r, rank) => {
              const open = openId === r.candidate.id;
              const meilleures = [...r.pubs].sort((a, b) => (b.vues ?? 0) - (a.vues ?? 0) || interactions(b) - interactions(a)).slice(0, 3);
              return (
                <div key={r.candidate.id} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-fuchsia-300">
                  <button onClick={() => setOpenId(open ? null : r.candidate.id)} aria-expanded={open}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 p-4 text-left lg:flex-nowrap">
                    <span className="w-6 shrink-0 text-center font-staatliches text-xl text-muted-foreground">{rank + 1}</span>{" "}
                    {r.candidate.photo_url
                      ? <img src={vignetteWikimedia(r.candidate.photo_url, 44)!} loading="lazy" decoding="async" alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                      : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-muted-foreground dark:bg-slate-500/10">{r.candidate.full_name.charAt(0)}</span>}{" "}
                    <span className="min-w-0 flex-1 basis-40">
                      <span className="block truncate text-sm font-black text-foreground">{r.candidate.full_name}</span>{" "}
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {r.candidate.party}{r.candidate.party ? " · " : ""}{r.plateformes.map(pf => PLATFORM_META[pf].label).join(", ")}
                        {r.mesures < r.metrics.length ? ` · ${r.mesures}/${r.metrics.length} relevés` : ""}
                      </span>
                    </span>{" "}
                    <span className="hidden lg:block"><Sparkline points={r.spark} /></span>{" "}
                    <span className="grid flex-[1_1_100%] grid-cols-3 gap-3 sm:grid-cols-5 lg:flex-[0_0_auto] lg:gap-5">
                      {[
                        ["Audience", <span key="a" className="flex items-center gap-1"><Users2 size={12} className="text-slate-300" /> {compact(r.followers)}</span>],
                        [`${period} j`, r.croissance == null ? "—" : <span key="c" className={r.croissance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>{pourcent(r.croissance, true)}</span>],
                        ["Posts", <span key="p" className="flex items-center gap-1"><Clapperboard size={12} className="text-slate-300" /> {r.publications || "—"}</span>],
                        ["Vues", <span key="v" className="flex items-center gap-1 text-fuchsia-700 dark:text-fuchsia-400"><Eye size={12} className="text-fuchsia-300" /> {compact(r.vues)}</span>],
                        ["Engag.", pourcent(r.engagement)],
                      ].map(([k, v]) => (
                        <span key={String(k)} className="min-w-[66px]">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-muted-foreground">{k}</span>{" "}
                          <span className="block text-sm font-black tabular-nums text-foreground"><Masked isPro={isPro}>{v}</Masked></span>
                        </span>
                      ))}
                    </span>{" "}
                    <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>{" "}

                  {open && (
                    <div className="px-4 pb-4">
                      {r.metrics.map(m => <AccountRow key={m.account.id} m={m} posts={postsParCompte.get(m.account.id) ?? []} period={period} isPro={isPro} />)}{" "}
                      {meilleures.length > 0 && (
                        <div className="mt-4">
                          <h4 className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Ses publications les plus fortes sur {period} jours</h4>{" "}
                          <div className="grid gap-2.5 md:grid-cols-3">{meilleures.map(p => <Publication key={`${p.account_id}-${p.post_id}`} p={p} isPro={isPro} />)}</div>
                        </div>
                      )}{" "}
                      <p className="mt-3 text-[12px]">
                        <Link href={`/presidentielles-2027/?candidat=${r.candidate.slug}`} className="font-bold text-fuchsia-700 hover:underline dark:text-fuchsia-400">Voir sa fiche</Link>
                      </p>{" "}
                      {!isPro && (
                        <div className="mt-4 text-center">
                          <Link href="/premium" className="text-[11px] font-black uppercase tracking-widest text-fuchsia-700 hover:underline dark:text-fuchsia-400">Débloquer les chiffres avec l&apos;abonnement Pro →</Link>
                        </div>
                      )}
                    </div>
                  )}{" "}
                </div>
              );
            })}
          </div>{" "}

          {/* Top des publications */}
          {top.length > 0 && (
            <section className="mt-10">
              <h3 className="text-xl font-black text-foreground">Les publications les plus fortes sur {period} jours</h3>{" "}
              <p className="mb-4 mt-1 text-[13px] text-muted-foreground">Toutes plateformes, classées par vues puis par interactions. Cliquez pour vérifier sur l&apos;original.</p>{" "}
              <div className="grid gap-2.5 md:grid-cols-2">{top.map(p => <Publication key={`${p.account_id}-${p.post_id}`} p={p} nom={nomDe.get(p.candidate_id)} isPro={isPro} />)}</div>
            </section>
          )}{" "}

          <p className="mt-8 text-[12px] leading-relaxed text-muted-foreground">
            {scope === "all"
              ? "Attention : « les deux » additionne les comptes de parti, partagés entre plusieurs candidats. L'audience d'un même parti est alors comptée pour chacun d'eux."
              : scope === "support"
                ? "Comptes de mouvements et de campagne uniquement. Un même parti peut soutenir plusieurs candidats."
                : "Comptes personnels des candidats uniquement, hors comptes de parti."}
            {" "}Relevés quotidiens.
            {controle.debutPosts && <> Publications relevées depuis le {jourCourt(controle.debutPosts)} : sur 30 jours, le total se complète de jour en jour.</>}
            {" "}Les abonnés de plusieurs réseaux s&apos;additionnent sans dédoublonner : une même personne peut suivre un candidat partout.
          </p>
        </>
      )}
      </ZonePro>
    </div>
  );
}
