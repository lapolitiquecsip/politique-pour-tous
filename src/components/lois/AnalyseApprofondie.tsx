"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Lock, Check, ArrowRight, ChevronDown, Sparkles, Users, CalendarClock, Gavel, Coins,
  Landmark, MessageSquareWarning, Library, FileText, ExternalLink, BookOpen, Scale, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * L'ANALYSE APPROFONDIE d'un texte de loi, écrite à partir du texte lui-même
 * (texte adopté, exposé des motifs, étude d'impact) : chaque mesure avec ce qui
 * existait avant et ce qui change, les chiffres, les publics, le calendrier, les
 * sanctions — puis « Ce qui existe déjà » dans le droit sur le même sujet.
 *
 * Réservée aux abonnés, et pas seulement à l'affichage : la table est protégée
 * par la base. Un compte classique voit à la place ce qu'il manque (« 32 mesures
 * expliquées ») derrière un cadenas doré, jamais le contenu.
 */

type Mesure = { titre?: string; article?: string; avant?: string; apres?: string; detail?: string; qui?: string };
type Analyse = {
  analyse_loi: {
    en_une_phrase?: string; contexte?: string; mesures?: Mesure[];
    chiffres_cles?: { valeur: string; libelle: string }[];
    concernes?: { public: string; effet: string }[];
    calendrier?: { quand: string; quoi: string }[];
    sanctions?: string[]; financement?: string; apports_parlement?: string;
    points_debat?: string[]; limites?: string;
  };
  cadre: null | {
    synthese?: string;
    dispositifs?: { nom: string; description: string; reference?: string }[];
    chiffres?: { valeur: string; libelle: string }[];
    acteurs?: string[]; lacunes?: string;
    fiches?: { titre: string; url: string }[];
    textes?: { titre: string; url: string }[];
  };
  sources: { titre: string; url: string }[];
  generated_at: string;
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateFr = (d?: string) => { const x = d ? new Date(d) : null; return x && !isNaN(+x) ? `${x.getDate()} ${MOIS[x.getMonth()]} ${x.getFullYear()}` : ""; };
const plein = (s?: string | null) => !!s && s.trim().length > 1;

// Chiffres surlignés dans le corps des textes.
// Un nombre à séparateur de milliers (« 380 000 ») reste d'un seul tenant.
const NUM = /(\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?(?:\s?(?:%|€|euros?|ans?|mois|jours?|heures?|semaines?|milliards?|millions?))?|\d[\d.,]*\s?(?:%|€|euros?|ans?|mois|jours?|heures?|semaines?|milliards?|millions?)|\d+(?:[.,]\d+)?)/gi;
function Chiffres({ t }: { t?: string }) {
  const parts = String(t || "").split(NUM);
  return <>{parts.map((p, i) => i % 2 === 1
    ? <span key={i} className="whitespace-nowrap rounded bg-amber-400/20 px-1 font-bold text-amber-800 dark:text-amber-300">{p}</span>
    : <span key={i}>{p}</span>)}</>;
}

export default function AnalyseApprofondie({ dossierId, scrutinId, sujet, repli }: {
  dossierId?: string | null;
  /** Depuis un vote : le dossier est retrouvé par l'identifiant du scrutin. */
  scrutinId?: string | null;
  sujet?: string;
  /** Pour un abonné, ce qui s'affiche tant que l'analyse n'est pas écrite (l'ancien « En détail »). */
  repli?: React.ReactNode;
}) {
  const { isPremium, isPro, loading } = usePremium();
  // Chaque réponse est rangée avec la clé qui l'a demandée : une réponse tardive
  // d'un autre texte ne s'affiche jamais sur celui qu'on regarde.
  const [resolu, setResolu] = useState<{ cle: string; dossier: string | null } | null>(null);
  const [lu, setLu] = useState<{ cle: string; data: Analyse | null } | null>(null);
  const [vu, setVu] = useState<{ cle: string; apercu: { mesures: number; chiffres: number; cadre: boolean } | null } | null>(null);

  useEffect(() => {
    if (dossierId || !scrutinId) return;
    let actif = true;
    api.getDossierDuScrutin(scrutinId).then(d => { if (actif) setResolu({ cle: scrutinId, dossier: d }); });
    return () => { actif = false; };
  }, [dossierId, scrutinId]);
  const dossier = dossierId || (!scrutinId ? null : resolu?.cle === scrutinId ? resolu.dossier : undefined);

  useEffect(() => {
    if (loading || !dossier) return;
    let actif = true;
    if (isPremium) api.getAnalyseApprofondie(dossier).then(d => { if (actif) setLu({ cle: dossier, data: d as Analyse | null }); });
    else api.getAnalyseApercu(dossier).then(a => { if (actif) setVu({ cle: dossier, apercu: a }); });
    return () => { actif = false; };
  }, [dossier, isPremium, loading]);
  const data = dossier === null ? null : dossier && lu?.cle === dossier ? lu.data : undefined;
  const apercu = dossier && vu?.cle === dossier ? vu.apercu : null;

  if (loading) return null;
  if (!isPremium) return <Verrou apercu={apercu} sujet={sujet} />;
  if (data === undefined) return <div className="h-40 animate-pulse rounded-3xl bg-amber-400/10" />;
  if (!data) {
    if (repli) return <>{repli}</>;
    return (
      <div data-offre={isPro ? "pro" : undefined} className="flex items-start gap-3 rounded-3xl border border-amber-400/30 bg-amber-400/[0.06] p-5">
        <Sparkles className="mt-0.5 shrink-0 text-amber-500" size={18} />
        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          <strong className="text-foreground dark:text-white">Analyse approfondie en préparation.</strong> Elle est rédigée
          à partir du texte officiel lui-même, article par article, et paraît ici dès qu&apos;elle est prête.
        </p>
      </div>
    );
  }
  return <Complete a={data} pro={isPro} />;
}

/* ─────────────────────────── Compte classique : le cadenas ─────────────────────────── */

function Verrou({ apercu, sujet }: { apercu: { mesures: number; chiffres: number; cadre: boolean } | null; sujet?: string }) {
  const n = apercu?.mesures || 0;
  const benefices = [
    n ? `${n} mesures expliquées une par une : avant / après, article par article` : "Chaque mesure expliquée : ce qui existait avant, ce qui change après",
    apercu?.chiffres ? `${apercu.chiffres} chiffres clés, le calendrier d'application et les sanctions` : "Les chiffres clés, le calendrier d'application et les sanctions",
    `Tout ce qui existe déjà dans la loi ${sujet ? `sur ce sujet` : "dans ce domaine"}`,
  ];
  const faux = ["Mesure 1 · ce qui change", "Mesure 2 · qui est concerné", "Calendrier d'application", "Ce qui existe déjà"];
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-amber-400/40 bg-[#0d1222] shadow-[0_20px_60px_-20px_rgb(var(--lueur-offre)/0.45)]">
      {/* Aperçu flouté : la forme de l'analyse, sans son contenu. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none p-5 blur-[6px]">
        <div className="grid grid-cols-2 gap-3">
          {faux.map((l, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-2 h-2 w-14 rounded-full bg-amber-300/50" />
              <p className="text-sm font-bold text-white/80">{l}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="h-10 rounded-lg bg-rose-400/15" /><div className="h-10 rounded-lg bg-emerald-400/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d1222]/40 via-[#0d1222]/80 to-[#0d1222]/95" />

      <div className="relative flex flex-col items-center px-6 py-9 text-center">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#fde68a,#f59e0b_25%,transparent_45%,#fbbf24_70%,transparent_90%,#fde68a)] motion-safe:animate-[spin_5s_linear_infinite]" />
          <span className="absolute inset-[3px] rounded-full bg-[#0f1424]" />
          <span className="absolute inset-0 rounded-full shadow-[0_0_36px_rgba(251,191,36,0.45)] motion-safe:animate-pulse" />
          <Lock size={24} className="relative text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" strokeWidth={2.2} />
        </div>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
          Réservé aux membres Premium & Pro
        </span>
        <h4 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white sm:text-4xl">Analyse détaillée complète</h4>
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-slate-300">
          L&apos;analyse détaillée totale de cette loi est réservée aux membres Premium : après l&apos;avoir lue, vous savez tout de ce texte.
        </p>
        <ul className="mt-5 grid gap-2 text-left">
          {benefices.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-[13px] text-slate-200">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><Check size={12} strokeWidth={3} /></span>
              {b}
            </li>
          ))}
        </ul>
        <Link href="/premium"
          className="sword-shine group mt-7 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-7 py-3.5 font-staatliches text-xl uppercase leading-none tracking-wide text-slate-950 shadow-[0_10px_36px_rgba(251,191,36,0.4)] transition hover:brightness-105 active:scale-[0.98]">
          Débloquer l&apos;analyse
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────── Abonné : l'analyse entière ─────────────────────────── */

function Titre({ Icon, children }: { Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h5 className="mb-3 mt-7 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15"><Icon size={14} /></span>
      {children}
    </h5>
  );
}

function CarteMesure({ m, i, ouverte, basculer }: { m: Mesure; i: number; ouverte: boolean; basculer: () => void }) {
  return (
    <div className={`overflow-hidden rounded-2xl border transition ${ouverte ? "border-amber-400/50 bg-card shadow-md dark:bg-slate-900" : "border-border bg-card dark:border-slate-800 dark:bg-slate-900/60"}`}>
      <button onClick={basculer} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-[12px] font-black text-slate-950">{i + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold leading-snug text-foreground dark:text-white">{m.titre}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {plein(m.article) && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">{m.article}</span>}
            {plein(m.qui) && !ouverte && <span className="line-clamp-1 text-[11px] text-muted-foreground">{m.qui}</span>}
          </span>
        </span>
        <ChevronDown size={18} className={`mt-1 shrink-0 text-muted-foreground transition-transform ${ouverte ? "rotate-180" : ""}`} />
      </button>
      {ouverte && (
        <div className="space-y-3 px-4 pb-4">
          {(plein(m.avant) || plein(m.apres)) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {plein(m.avant) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/[0.07]">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300">Avant</p>
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300"><Chiffres t={m.avant} /></p>
                </div>
              )}
              {plein(m.apres) && (
                <div className={`rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07] ${plein(m.avant) ? "" : "sm:col-span-2"}`}>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Ce que change la loi</p>
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300"><Chiffres t={m.apres} /></p>
                </div>
              )}
            </div>
          )}
          {plein(m.detail) && <p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300"><Chiffres t={m.detail} /></p>}
          {plein(m.qui) && (
            <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
              <Users size={14} className="mt-0.5 shrink-0" /><span><strong className="text-foreground dark:text-slate-200">Concerne :</strong> {m.qui}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Complete({ a, pro }: { a: Analyse; pro: boolean }) {
  const l = a.analyse_loi || {};
  const mesures = (l.mesures || []).filter(m => plein(m.titre));
  const [ouvertes, setOuvertes] = useState<Set<number>>(() => new Set([0]));
  const tout = ouvertes.size === mesures.length;
  const basculer = (i: number) => setOuvertes(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const c = a.cadre;

  return (
    <section data-offre={pro ? "pro" : undefined} className="rounded-[2rem] border border-amber-400/40 bg-gradient-to-b from-amber-400/[0.08] via-transparent to-transparent p-5 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">
          <Sparkles size={12} /> Analyse {pro ? "Pro" : "Premium"}
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground">Rédigée d&apos;après le texte officiel{dateFr(a.generated_at) ? ` · ${dateFr(a.generated_at)}` : ""}</span>
      </div>
      <h4 className="mt-3 font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground dark:text-white">Analyse détaillée complète</h4>
      {plein(l.en_une_phrase) && <p className="mt-3 text-[16px] font-semibold leading-snug text-foreground dark:text-white"><Chiffres t={l.en_une_phrase} /></p>}
      {plein(l.contexte) && <p className="mt-3 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300"><Chiffres t={l.contexte} /></p>}

      {/* Chiffres clés */}
      {!!l.chiffres_cles?.length && (
        <>
          <Titre Icon={Scale}>Les chiffres clés</Titre>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {l.chiffres_cles.map((k, i) => (
              <div key={i} className="rounded-2xl border border-amber-400/25 bg-card p-3 dark:bg-slate-900">
                <p className="font-staatliches text-2xl leading-none text-amber-600 dark:text-amber-300">{k.valeur}</p>
                <p className="mt-1.5 text-[12px] leading-snug text-slate-600 dark:text-slate-400">{k.libelle}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mesures */}
      {mesures.length > 0 && (
        <>
          <div className="flex items-end justify-between gap-3">
            <Titre Icon={BookOpen}>Toutes les mesures ({mesures.length})</Titre>
            <button onClick={() => setOuvertes(tout ? new Set() : new Set(mesures.map((_, i) => i)))}
              className="mb-3 shrink-0 text-[11px] font-black uppercase tracking-widest text-amber-700 hover:underline dark:text-amber-300">
              {tout ? "Tout replier" : "Tout déplier"}
            </button>
          </div>
          <div className="space-y-2">
            {mesures.map((m, i) => <CarteMesure key={i} m={m} i={i} ouverte={ouvertes.has(i)} basculer={() => basculer(i)} />)}
          </div>
        </>
      )}

      {/* Qui est concerné */}
      {!!l.concernes?.length && (
        <>
          <Titre Icon={Users}>Ce que ça change, pour qui</Titre>
          <div className="grid gap-2 sm:grid-cols-2">
            {l.concernes.map((p, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[13px] font-bold text-foreground dark:text-white">{p.public}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400"><Chiffres t={p.effet} /></p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Calendrier */}
      {!!l.calendrier?.length && (
        <>
          <Titre Icon={CalendarClock}>Quand ça s&apos;applique</Titre>
          <ol className="relative ml-3 space-y-3 border-l-2 border-amber-400/40 pl-5">
            {l.calendrier.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-amber-400 bg-card dark:bg-slate-900" />
                <p className="text-[12px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">{e.quand}</p>
                <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">{e.quoi}</p>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Sanctions */}
      {!!l.sanctions?.length && (
        <>
          <Titre Icon={Gavel}>Sanctions prévues</Titre>
          <ul className="space-y-2">
            {l.sanctions.map((s, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl bg-rose-50 p-3 text-[13px] leading-relaxed text-slate-700 dark:bg-rose-500/[0.07] dark:text-slate-300">
                <Gavel size={14} className="mt-0.5 shrink-0 text-rose-500" /><span><Chiffres t={s} /></span>
              </li>
            ))}
          </ul>
        </>
      )}

      {plein(l.financement) && (<><Titre Icon={Coins}>Coût et financement</Titre><p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300"><Chiffres t={l.financement} /></p></>)}
      {plein(l.apports_parlement) && (<><Titre Icon={Landmark}>Ce qu&apos;ont changé les députés</Titre><p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300"><Chiffres t={l.apports_parlement} /></p></>)}
      {!!l.points_debat?.length && (
        <>
          <Titre Icon={MessageSquareWarning}>Les points qui font débat</Titre>
          <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-slate-700 marker:text-amber-500 dark:text-slate-300">
            {l.points_debat.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </>
      )}

      {/* Ce qui existe déjà */}
      {c && (plein(c.synthese) || !!c.dispositifs?.length) && (
        <div className="mt-8 rounded-3xl border border-sky-300/50 bg-sky-50/70 p-5 dark:border-sky-400/20 dark:bg-sky-500/[0.06]">
          <h5 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/15"><Library size={14} /></span>
            Ce qui existe déjà sur ce sujet
          </h5>
          <p className="mt-1 text-[12px] text-muted-foreground">Le droit qui s&apos;applique aujourd&apos;hui dans ce domaine, indépendamment de ce texte.</p>
          {plein(c.synthese) && <p className="mt-3 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300"><Chiffres t={c.synthese} /></p>}
          {!!c.dispositifs?.length && (
            <div className="mt-4 space-y-2">
              {c.dispositifs.map((d, i) => (
                <div key={i} className="rounded-2xl border border-sky-200 bg-card p-3.5 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[13.5px] font-bold text-foreground dark:text-white">{d.nom}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400"><Chiffres t={d.description} /></p>
                  {plein(d.reference) && <p className="mt-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">{d.reference}</p>}
                </div>
              ))}
            </div>
          )}
          {!!c.chiffres?.length && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {c.chiffres.map((k, i) => (
                <div key={i} className="rounded-2xl bg-card p-3 dark:bg-slate-900">
                  <p className="font-staatliches text-xl leading-none text-sky-700 dark:text-sky-300">{k.valeur}</p>
                  <p className="mt-1 text-[11.5px] leading-snug text-slate-600 dark:text-slate-400">{k.libelle}</p>
                </div>
              ))}
            </div>
          )}
          {!!c.acteurs?.length && <p className="mt-4 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400"><strong className="text-foreground dark:text-slate-200">Qui intervient aujourd&apos;hui :</strong> {c.acteurs.join(" · ")}</p>}
          {plein(c.lacunes) && <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400"><strong className="text-foreground dark:text-slate-200">Ce que le droit actuel ne règle pas :</strong> {c.lacunes}</p>}
          {!!(c.fiches?.length || c.textes?.length) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[...(c.fiches || []), ...(c.textes || [])].slice(0, 12).map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-300/60 bg-card px-3 py-1 text-[11.5px] font-semibold text-sky-800 transition hover:bg-sky-100 dark:border-sky-400/25 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800">
                  <ExternalLink size={11} className="shrink-0" /><span className="truncate">{f.titre}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sources */}
      <div className="mt-6 border-t border-border pt-4 dark:border-slate-800">
        {plein(l.limites) && <p className="mb-3 text-[11.5px] italic leading-relaxed text-muted-foreground">{l.limites}</p>}
        {!!a.sources?.length && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Documents lus</span>
            {a.sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                <FileText size={11} />{s.titre}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
