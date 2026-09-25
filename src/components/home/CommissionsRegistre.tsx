"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Landmark, Loader2, ChevronDown, ChevronUp, Lock, Check, ArrowRight,
  ExternalLink, FileText, Video, Search, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { CommissionAnalysis, ACCENTS } from "@/components/commissions/CommissionAnalysis";
import DragScroller from "@/components/ui/DragScroller";
import Garde from "@/components/ui/Garde";

/**
 * Le suivi des commissions, réservé aux abonnés Pro — sur la page d'accueil.
 *
 * Les commissions sont l'endroit où le travail parlementaire se fait vraiment :
 * un texte y est réécrit article par article, des ministres et des dirigeants y
 * sont entendus, et rien de tout cela ne sort dans la presse. Le suivi complet
 * vit déjà sur les pages des députés et des sénateurs ; il manquait à l'accueil,
 * là où un abonné commence sa journée.
 *
 * Même dispositif que le Journal officiel, pour la même raison : une journée de
 * commissions fait des dizaines de lignes, et les déplier d'emblée poserait un
 * mur de texte à qui vient pour autre chose. On ouvre donc un registre.
 *
 * Deux leçons du Journal officiel sont appliquées d'entrée :
 *   — aucune rotation 3D, aucun dégradé animé découpé au texte. Ces deux-là
 *     forcent le navigateur à repeindre des glyphes à chaque image et ont fait
 *     tomber l'onglet ; les mouvements d'ici n'engagent que le compositeur ;
 *   — le rail des jours vit HORS du bouton de couverture, imbriquer des boutons
 *     étant du HTML invalide que les navigateurs traitent en ignorant les clics
 *     intérieurs.
 */

type Jour = { date: string; total: number; an: number; senat: number };
type Reunion = {
  ref: string;
  chamber: "AN" | "SENAT" | null;
  commission: string | null;
  title: string | null;
  meeting_date: string;
  cr_url: string | null;
  video_url: string | null;
  analyzed_at: string | null;
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function dateLongue(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const semaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getUTCDay()];
  return `${semaine} ${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}`;
}
function jourCourt(iso: string) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { jour: +m[3], mois: MOIS_COURT[+m[2] - 1] } : { jour: 0, mois: "" };
}

const CHAMBRE = {
  AN: { court: "Assemblée", long: "Assemblée nationale", classe: "bg-emerald-500/20 text-emerald-200", accent: "emerald" as const },
  SENAT: { court: "Sénat", long: "Sénat", classe: "bg-red-500/20 text-red-200", accent: "red" as const },
};
const ch = (c: string | null) => CHAMBRE[(c as "AN" | "SENAT") ?? "AN"] ?? CHAMBRE.AN;

/* ───────────────────────────── Une réunion ───────────────────────────── */

function Ligne({ m }: { m: Reunion }) {
  const [ouvert, setOuvert] = useState(false);
  const [detail, setDetail] = useState<{ analysis: any; summary: string | null } | null>(null);
  const [chargeant, setChargeant] = useState(false);

  // L'analyse pèse plusieurs kilo-octets et n'est lue qu'au dépliage : on la
  // demande alors, et une seule fois.
  useEffect(() => {
    if (!ouvert || detail || chargeant) return;
    let vivant = true;
    setChargeant(true);
    api.getCommissionAnalysis(m.ref)
      .then(r => { if (vivant) setDetail((r as any) ?? { analysis: null, summary: null }); })
      .catch(() => { if (vivant) setDetail({ analysis: null, summary: null }); })
      .finally(() => { if (vivant) setChargeant(false); });
    return () => { vivant = false; };
  }, [ouvert, detail, chargeant, m.ref]);

  const c = ch(m.chamber);

  return (
    <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
      <button
        onClick={() => setOuvert(o => !o)}
        aria-expanded={ouvert}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.05]"
      >
        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${c.classe}`}>
          {c.court}
        </span>
        <span className="min-w-0 flex-1">
          {m.commission && (
            <span className="block truncate text-[10px] font-black uppercase tracking-wider text-white/40">
              {m.commission}
            </span>
          )}
          <span className="mt-0.5 block text-[13px] font-bold leading-snug text-white/90">
            {m.title || "Réunion"}
          </span>
        </span>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-white/40 transition-transform ${ouvert ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-4 py-4">
              {chargeant || detail === null ? (
                <p className="flex items-center gap-2 text-[12px] text-white/50">
                  <Loader2 size={13} className="animate-spin" /> Chargement du compte rendu…
                </p>
              ) : detail.analysis || detail.summary ? (
                <CommissionAnalysis m={detail as any} accent={ACCENTS[c.accent]} sombre />
              ) : (
                <p className="text-[12px] italic leading-snug text-white/45">
                  Le compte rendu de cette réunion n&apos;a pas encore été analysé. Il le
                  sera au prochain passage ; le lien officiel ci-dessous reste disponible.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                {m.cr_url && (
                  <a href={m.cr_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 transition hover:text-white">
                    <FileText size={12} /> Compte rendu officiel <ExternalLink size={10} />
                  </a>
                )}
                {m.video_url && (
                  <a href={m.video_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 transition hover:text-white">
                    <Video size={12} /> Vidéo <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────── Recherche ─────────────────────────────── */

function RechercheCommissions({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Reunion[] | null>(null);
  const [cherche, setCherche] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const terme = q.trim();
      if (terme.length < 2) { setRes(null); return; }
      setCherche(true);
      api.getCommissionMeetings({ search: terme, limit: 40, withAnalysis: false })
        .then(r => setRes(r as Reunion[]))
        .catch(() => setRes([]))
        .finally(() => setCherche(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="border-b border-white/10 bg-slate-950/50 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-white/[0.07] px-4 ring-1 ring-white/15 focus-within:ring-emerald-400/60">
          <Search size={17} className="shrink-0 text-emerald-300" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Chercher une audition, un texte, une commission…"
            aria-label="Rechercher dans les comptes rendus de commission"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-white outline-none placeholder:text-white/35"
          />
          {cherche && <Loader2 size={15} className="shrink-0 animate-spin text-white/50" />}
        </div>
        <button onClick={onClose} aria-label="Fermer la recherche"
          className="shrink-0 rounded-2xl bg-white/[0.07] p-3.5 text-white/70 ring-1 ring-white/15 transition hover:bg-white/15 hover:text-white">
          <X size={17} />
        </button>
      </div>

      {q.trim().length < 2 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-white/45">
          La recherche porte sur l&apos;intitulé des réunions et sur le résumé de leur
          compte rendu, dans les deux chambres.
        </p>
      ) : res === null ? null : !res.length ? (
        <p className="mt-4 text-[13px] text-white/50">
          Aucune réunion ne correspond à <strong className="text-white/80">{q.trim()}</strong>.
        </p>
      ) : (
        <div className="mt-4">
          <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-white/40">
            {res.length} réunion{res.length > 1 ? "s" : ""}
          </p>
          <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            {res.map(m => (
              <div key={m.ref}>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  {dateLongue(m.meeting_date)}
                </p>
                <Ligne m={m} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── La couverture ───────────────────────────── */

function Couverture({
  jours, indexCourant, onOuvrir, onChoisir,
}: {
  jours: Jour[]; indexCourant: number;
  onOuvrir: () => void; onChoisir: (i: number) => void;
}) {
  const reduce = useReducedMotion();
  const j = jours[indexCourant];
  const autres = jours.map((x, i) => ({ x, i })).filter(({ i }) => i !== indexCourant);
  const total = jours.reduce((n, x) => n + x.total, 0);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="group relative mb-10 overflow-hidden rounded-[2rem] border-2 border-emerald-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-2xl shadow-emerald-950/40"
    >
      {/* Tranche du registre : la reliure, à gauche. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/45 to-transparent" />

      <motion.button
        type="button"
        onClick={onOuvrir}
        aria-label={`Ouvrir le suivi des commissions — ${j.total} réunions le ${dateLongue(j.date)}`}
        whileHover={reduce ? undefined : { y: -4, scale: 1.005 }}
        whileTap={reduce ? undefined : { scale: 0.99 }}
        className="relative block w-full p-6 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-400/40 sm:p-9"
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
            <span>Travaux parlementaires</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-2.5 py-1 text-white">
              <Landmark size={11} /> Pro
            </span>
          </div>

          <div className="mt-3 h-px bg-white/20" />
          <div className="mt-[3px] h-px bg-white/10" />

          {/* Un reflet qui traverse, par translation seule : le compositeur s'en
              charge sans repeindre une lettre. */}
          <h3 className="relative mt-5 select-none overflow-hidden font-staatliches text-[2.4rem] uppercase leading-[0.85] tracking-tight sm:text-6xl">
            <span className="block">Suivi des</span>
            <span className="block text-emerald-300">commissions</span>
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["0%", "500%"] }}
                transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.6, ease: "easeInOut" }}
              />
            )}
          </h3>

          <p className="mt-4 max-w-xl text-[15px] font-bold leading-snug sm:text-base">
            <span className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
              Votre abonnement Pro ouvre le travail des commissions, jour après
              jour, dans les deux chambres.
            </span>
            <span className="mt-1 block text-[13px] font-medium text-white/55">
              Auditions, examens de textes, tables rondes : ce qui s&apos;est dit,
              qui l&apos;a dit, et ce qui a été décidé — avant que la presse n&apos;en parle.
            </span>
          </p>

          <div className="mt-5 h-px bg-white/20" />

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-bold text-white/85">{dateLongue(j.date)}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/35">
              dernière journée de séance
            </span>
          </div>

          {/* Onglets de registre : la silhouette d'un classeur, sans faire croire
              à des boutons — le rail cliquable est plus bas, hors du bouton. */}
          <div aria-hidden className="mt-4 flex gap-1.5 opacity-25">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-7 rounded-t-md bg-white/50" style={{ width: `${[26, 34, 22, 30, 24, 36, 28, 20][i]}px` }} />
            ))}
          </div>
          <div aria-hidden className="h-1.5 rounded-sm bg-white/30 opacity-25" />

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition group-hover:brightness-110">
              Ouvrir le registre
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </span>
            <span className="text-[13px] font-bold text-white/60">
              <strong className="font-staatliches text-2xl text-white">{j.total}</strong> réunion{j.total > 1 ? "s" : ""} ce jour-là
              {j.an > 0 && j.senat > 0 && <span className="text-white/40"> · {j.an} à l&apos;Assemblée, {j.senat} au Sénat</span>}
            </span>
          </div>
        </motion.div>
      </motion.button>

      {autres.length > 0 && (
        <div className="relative border-t border-white/10 px-6 pb-5 pt-4 sm:px-9">
          <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Autres journées — {jours.length} jours de séance, {total} réunions suivies
          </p>
          <DragScroller ariaLabel="Journées de séance des commissions" sombre className="gap-2 pb-2 pt-0 md:gap-2">
            {autres.map(({ x, i }) => {
              const d = jourCourt(x.date);
              return (
                <button
                  key={x.date}
                  type="button"
                  onClick={() => onChoisir(i)}
                  title={`${dateLongue(x.date)} — ${x.total} réunion(s)`}
                  className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-center text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  <span className="block font-staatliches text-lg leading-none tabular-nums">{d.jour}</span>
                  <span className="block text-[9px] font-black uppercase tracking-widest opacity-70">{d.mois}</span>
                </button>
              );
            })}
          </DragScroller>
        </div>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────── Rubrique ──────────────────────────────── */

export default function CommissionsRegistre() {
  const { isPro, isPremium, loading: aboEnCours } = usePremium();
  const reduce = useReducedMotion();
  const [jours, setJours] = useState<Jour[] | null>(null);
  const [choisi, setChoisi] = useState(0);
  const [reunions, setReunions] = useState<Reunion[] | null>(null);
  const [reunionsPour, setReunionsPour] = useState<string | null>(null);
  const [chambre, setChambre] = useState<"AN" | "SENAT" | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState(false);

  // Rouvert tel qu'on l'a laissé pendant la visite ; une nouvelle visite retrouve
  // le registre fermé, qui est le geste voulu. Lu après le premier rendu : le
  // HTML est pré-rendu, et lire le stockage à la construction ferait diverger le
  // serveur du navigateur.
  useEffect(() => {
    try { if (sessionStorage.getItem("lpcs.com.ouvert") === "1") setOuvert(true); } catch { /* navigation privée */ }
  }, []);
  useEffect(() => {
    try {
      if (ouvert) sessionStorage.setItem("lpcs.com.ouvert", "1");
      else sessionStorage.removeItem("lpcs.com.ouvert");
    } catch { /* sans mémoire, le registre revient fermé : acceptable */ }
  }, [ouvert]);

  // La liste des journées est légère et sert à tous : c'est elle qui porte les
  // chiffres du panneau d'abonnement.
  useEffect(() => {
    let vivant = true;
    api.getCommissionDays(300)
      .then(r => { if (vivant) setJours(r as Jour[]); })
      .catch(() => { if (vivant) setJours([]); });
    return () => { vivant = false; };
  }, []);

  const jour = jours?.[choisi] ?? null;

  useEffect(() => {
    if (!isPro || !ouvert || !jour) return;
    let vivant = true;
    setReunions(null);
    api.getCommissionsOfDay(jour.date)
      .then(r => { if (vivant) { setReunions(r as Reunion[]); setReunionsPour(jour.date); } })
      .catch(() => { if (vivant) setReunions([]); });
    return () => { vivant = false; };
  }, [isPro, ouvert, jour?.date]);

  const visibles = useMemo(
    () => (reunions ?? []).filter(m => !chambre || (m.chamber ?? "AN") === chambre),
    [reunions, chambre],
  );

  if (jours === null || aboEnCours) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" /></div>;
  }
  if (!jour) return null;   // tant que le cron n'a rien déposé, la rubrique s'efface

  /* ── Panneau fermé, pour qui n'est pas abonné Pro ── */
  if (!isPro) {
    const total = jours.reduce((n, x) => n + x.total, 0);
    return (
      <div className="mb-10 overflow-hidden rounded-[2rem] border-2 border-emerald-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl">
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <Landmark size={12} /> Pro
            </span>
            <h3 className="font-staatliches text-2xl uppercase leading-none tracking-tight sm:text-3xl">
              Le suivi des commissions
            </h3>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="font-staatliches text-6xl leading-none text-emerald-300">{jour.total}</span>
            <span className="pb-1.5 text-sm font-bold text-white/70">
              réunion{jour.total > 1 ? "s" : ""} le {dateLongue(jour.date)}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-white/45">
            {total} réunions suivies sur {jours.length} journées de séance, dans les deux chambres.
          </p>

          <div className="mt-7 rounded-2xl bg-white/[0.05] p-5 ring-1 ring-white/10">
            <p className="flex items-start gap-2 text-[10px] font-black uppercase leading-snug tracking-widest text-emerald-300">
              <Lock size={13} className="mt-px shrink-0" />
              {isPremium ? "Votre abonnement Premium ne couvre pas cette rubrique" : "Réservé à l'offre Pro"}
            </p>
            <ul className="mt-3.5 grid gap-2 sm:grid-cols-2">
              {[
                "Ce qui s'est dit dans chaque réunion",
                "Assemblée nationale et Sénat réunis",
                "Les points d'accord et de désaccord",
                "Les citations qui comptent, sourcées",
                "Recherche sur tous les comptes rendus",
                "Mis à jour après chaque séance",
              ].map(b => (
                <li key={b} className="flex items-start gap-2 text-[13px] leading-snug text-white/85">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Link href="/premium"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-6 py-3.5 text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110">
              {isPremium ? "Passer à l'offre Pro" : "Découvrir l'offre Pro"} <ArrowRight size={15} />
            </Link>
            <span className="text-[11px] font-bold text-white/45">24,99 €/mois, sans engagement</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Abonné Pro : le registre, fermé puis ouvert ── */
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!ouvert ? (
        /* Fondu, sans rotation 3D : voir l'en-tête de fichier. */
        <motion.div
          key="couverture"
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.28, ease: "easeIn" } }}
        >
          <Couverture
            jours={jours}
            indexCourant={choisi}
            onOuvrir={() => setOuvert(true)}
            onChoisir={(i) => { setChoisi(i); setChambre(null); setOuvert(true); }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="registre"
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Garde quoi="Le suivi des commissions">
            <div className="mb-10 overflow-hidden rounded-[2rem] border-2 border-emerald-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl">
              <div className="border-b border-white/10 p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    <Landmark size={12} /> Pro
                  </span>
                  <h3 className="font-staatliches text-2xl uppercase leading-none tracking-tight sm:text-3xl">
                    Le suivi des commissions
                  </h3>
                  <button
                    onClick={() => setRecherche(r => !r)}
                    aria-expanded={recherche}
                    aria-label={recherche ? "Fermer la recherche" : "Rechercher dans les comptes rendus"}
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                      recherche ? "bg-white text-slate-900" : "bg-white/10 text-white/80 ring-1 ring-white/15 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    <Search size={13} /> <span className="hidden sm:inline">Rechercher</span>
                  </button>
                  <button
                    onClick={() => { setOuvert(false); setRecherche(false); }}
                    aria-label="Refermer le registre"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/80 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
                  >
                    <ChevronUp size={13} /> <span className="hidden sm:inline">Refermer</span>
                  </button>
                </div>

                <div className="mt-4">
                  <DragScroller ariaLabel="Journées de séance des commissions" sombre className="gap-2 md:gap-2">
                    {jours.map((x, i) => {
                      const d = jourCourt(x.date);
                      const actif = i === choisi;
                      return (
                        <button
                          key={x.date}
                          onClick={() => { setChoisi(i); setChambre(null); }}
                          aria-current={actif ? "true" : undefined}
                          title={`${dateLongue(x.date)} — ${x.total} réunion(s)`}
                          className={`shrink-0 rounded-xl px-3 py-2 text-center transition ${
                            actif ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          <span className="block font-staatliches text-lg leading-none tabular-nums">{d.jour}</span>
                          <span className="block text-[9px] font-black uppercase tracking-widest opacity-70">{d.mois}</span>
                        </button>
                      );
                    })}
                  </DragScroller>
                </div>

                <p className="mt-4 text-sm font-bold text-white/90">{dateLongue(jour.date)}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setChambre(null)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                      chambre === null ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {jour.total} réunion{jour.total > 1 ? "s" : ""}
                  </button>
                  {jour.an > 0 && (
                    <button
                      onClick={() => setChambre(chambre === "AN" ? null : "AN")}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                        chambre === "AN" ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {jour.an} à l&apos;Assemblée
                    </button>
                  )}
                  {jour.senat > 0 && (
                    <button
                      onClick={() => setChambre(chambre === "SENAT" ? null : "SENAT")}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                        chambre === "SENAT" ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {jour.senat} au Sénat
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {recherche && (
                  <motion.div
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <RechercheCommissions onClose={() => setRecherche(false)} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-5 sm:p-7">
                {reunions === null || reunionsPour !== jour.date ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-400" /></div>
                ) : !visibles.length ? (
                  <p className="py-6 text-center text-sm italic text-white/50">
                    Aucune réunion de cette chambre ce jour-là.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {visibles.map(m => <Ligne key={m.ref} m={m} />)}
                  </div>
                )}

                <p className="mt-4 text-[10px] italic leading-snug text-white/40">
                  Source : comptes rendus officiels de l&apos;Assemblée nationale et du Sénat.
                  Chaque réunion renvoie à son compte rendu intégral.
                </p>
              </div>
            </div>
          </Garde>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
