"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";
import {
  CheckCircle2, Star, FileText, ArrowRight, Quote, Scale,
  LayoutDashboard, BellRing, Bookmark, Building2, Sliders,
  X, Sparkles, Vote, MapPin,
  AlertTriangle, Target, GitBranch, Pencil, HelpCircle,
  Mic, Radio, Search, Download, LineChart,
} from "lucide-react";
import { PLANS, SALES_OPEN } from "@/lib/constants";
import Link from "next/link";

/* ── Animated Counter ── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const inc = target / (2000 / 16);
    const timer = setInterval(() => {
      start += inc;
      if (start >= target) { setCount(target); clearInterval(timer); } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);
  return <span ref={ref} className="tabular-nums">{count.toLocaleString("fr-FR")}{suffix}</span>;
}

/* ── Fade-in wrapper ── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

const TESTIMONIALS = [
  { name: "Camille D.", role: "Étudiante en droit, Paris", text: "Enfin un résumé politique que je lis VRAIMENT. C'est clair, pas partisan, et ça me prend 3 minutes." },
  { name: "Marc T.", role: "Cadre, Lyon", text: "Je n'ai plus besoin de scroller Twitter pour comprendre ce qui se passe. L'essentiel, sans le bruit." },
  { name: "Sophie L.", role: "Enseignante, Nantes", text: "Mes élèves adorent quand je leur lis les faits de la semaine. Mon outil pédagogique préféré." },
];

/* ── Avantages premium : chacun renvoie vers la vraie fonctionnalité ; deux ouvrent une démo. ── */
type Feature = { icon: any; title: string; desc: string; color: string; href: string; demo?: "law" | "notif"; cta: string };
const FEATURES: Feature[] = [
  { icon: FileText, title: "Décryptages de lois illimités", desc: "Chaque loi expliquée : ce qu'elle change concrètement, avant / après, qui a voté quoi. Sans jargon.", color: "from-red-500 to-rose-600", href: "/lois", demo: "law", cta: "Voir un exemple d'analyse" },
  { icon: BellRing, title: "Suivi des élus & notifications", desc: "Abonnez-vous à vos députés et sénateurs : soyez prévenu à chaque vote important, dans votre fil.", color: "from-purple-500 to-fuchsia-600", href: "/dashboard", demo: "notif", cta: "Voir le fil en action" },
  { icon: Sliders, title: "Alertes 100% personnalisées", desc: "Choisissez vos centres d'intérêt et votre territoire : ne recevez QUE ce qui vous concerne vraiment.", color: "from-amber-400 to-orange-500", href: "/dashboard", cta: "Personnaliser mon profil" },
  { icon: Building2, title: "Budgets locaux expliqués", desc: "Les finances réelles de votre commune, département et région : recettes, dépenses, dette, fiscalité.", color: "from-emerald-500 to-teal-600", href: "/local", cta: "Explorer les budgets" },
  { icon: Bookmark, title: "Favoris : lois & territoires", desc: "Enregistrez lois, communes et régions pour les suivre et les retrouver d'un clic sur votre profil.", color: "from-sky-500 to-indigo-600", href: "/dashboard", cta: "Voir mon espace" },
  { icon: LayoutDashboard, title: "Espace personnel complet", desc: "Historique de vote, élus suivis, lois favorites, territoires : tout au même endroit, à jour.", color: "from-slate-500 to-slate-700", href: "/dashboard", cta: "Ouvrir mon tableau de bord" },
];

/**
 * Particules qui tombent sur la carte Pro.
 *
 * Positions, tailles et délais sont FIXES et non tirés au hasard : un Math.random()
 * au rendu donnerait des valeurs différentes côté serveur et côté navigateur, ce qui
 * provoque une erreur d'hydratation. Une liste écrite à la main règle le problème et
 * reste parfaitement lisible.
 */
const PARTICLES = [
  { x: 8, size: 3, delay: 0, dur: 7.5, opacity: 0.7 },
  { x: 21, size: 2, delay: 1.8, dur: 9.2, opacity: 0.5 },
  { x: 34, size: 4, delay: 0.6, dur: 6.4, opacity: 0.8 },
  { x: 47, size: 2, delay: 3.1, dur: 8.8, opacity: 0.45 },
  { x: 58, size: 3, delay: 1.2, dur: 7.1, opacity: 0.65 },
  { x: 69, size: 2, delay: 4.2, dur: 9.6, opacity: 0.4 },
  { x: 78, size: 4, delay: 2.4, dur: 6.9, opacity: 0.75 },
  { x: 88, size: 2, delay: 0.9, dur: 8.3, opacity: 0.55 },
  { x: 95, size: 3, delay: 3.7, dur: 7.8, opacity: 0.6 },
  { x: 15, size: 2, delay: 5.1, dur: 9.0, opacity: 0.5 },
  { x: 41, size: 3, delay: 2.9, dur: 8.1, opacity: 0.6 },
  { x: 63, size: 2, delay: 5.8, dur: 7.3, opacity: 0.45 },
];

function FallingParticles() {
  const reduce = useReducedMotion();
  if (reduce) return null;   // rien qui bouge si le système demande des animations réduites
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2.5rem]">
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 rounded-full bg-fuchsia-300"
          style={{ left: `${p.x}%`, width: p.size, height: p.size }}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 620, opacity: [0, p.opacity, p.opacity, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "linear", times: [0, 0.1, 0.8, 1] }}
        />
      ))}
    </div>
  );
}

/* ── Avis : défilement continu sur mobile, grille classique sur grand écran ── */
function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-5 sm:p-8 transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <Quote className="mb-3 h-6 w-6 sm:mb-6 sm:h-10 sm:w-10 text-amber-200" />
      <p className="flex-1 text-[13px] sm:text-lg italic leading-snug sm:leading-relaxed text-slate-700 dark:text-slate-300">&ldquo;{t.text}&rdquo;</p>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 sm:mt-8 sm:gap-4 sm:pt-6 dark:border-slate-800">
        <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-sm sm:text-base font-bold text-slate-900 shadow-md">{t.name.charAt(0)}</div>
        <div className="min-w-0">
          <p className="text-[13px] sm:text-base font-bold text-slate-900 dark:text-white">{t.name}</p>
          <p className="truncate text-[11px] sm:text-sm text-slate-500">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Sur mobile, les avis défilent d'eux-mêmes de droite à gauche.
 *
 * La liste est affichée DEUX FOIS : quand le défilement atteint la moitié du rail, on
 * revient au début sans transition visible — l'œil ne voit pas la couture, ce qui donne
 * une boucle continue plutôt qu'un aller-retour.
 *
 * Le défilement automatique se met en pause dès que l'utilisateur touche le rail, et
 * reprend deux secondes après qu'il l'a lâché : on n'arrache jamais le geste en cours.
 * Respecte « animations réduites » du système.
 */
function TestimonialRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resumeAt = useRef(0);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const step = () => {
      // scrollWidth > clientWidth n'est vrai que dans la disposition en rail (mobile) :
      // sur grand écran, la grille ne défile pas et la boucle ne fait rien.
      if (!paused.current && Date.now() >= resumeAt.current && el.scrollWidth > el.clientWidth + 4) {
        el.scrollLeft += 0.45;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hold = () => { paused.current = true; };
  const release = () => { paused.current = false; resumeAt.current = Date.now() + 2000; };

  return (
    <div
      ref={railRef}
      onPointerDown={hold}
      onPointerUp={release}
      onPointerCancel={release}
      onMouseEnter={hold}
      onMouseLeave={release}
      className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0"
    >
      {TESTIMONIALS.map((t, i) => (
        <div key={i} className="w-[78vw] max-w-xs shrink-0 md:w-auto md:max-w-none md:shrink">
          <TestimonialCard t={t} />
        </div>
      ))}
      {/* Doublon masqué sur grand écran : il ne sert qu'à fermer la boucle du rail. */}
      {TESTIMONIALS.map((t, i) => (
        <div key={`bis-${i}`} aria-hidden className="w-[78vw] max-w-xs shrink-0 md:hidden">
          <TestimonialCard t={t} />
        </div>
      ))}
    </div>
  );
}

/* ── Prix à la française : 3,99 € ── */
const fmtPrice = (n: number) => `${n.toFixed(2).replace(".", ",").replace(",00", "")} €`;

/* ── Ce que l'abonnement Pro ajoute par-dessus le Premium. ── */
const PRO_FEATURES = [
  {
    icon: Mic,
    title: "Suivi des commissions parlementaires",
    desc: "Assemblée ET Sénat : chaque réunion de commission, avec l'analyse détaillée de ce qui s'y est dit — positions défendues, chiffres avancés, arbitrages, suites annoncées.",
    color: "from-emerald-500 to-teal-600",
    href: "/deputes#commissions",
    cta: "Voir les commissions",
  },
  {
    icon: Radio,
    title: "Veille réseaux sociaux des candidats",
    desc: "Comptes personnels et comptes de soutien de chaque candidat à la présidentielle : audience, vues par semaine et par mois, dynamiques comparées.",
    color: "from-fuchsia-500 to-purple-600",
    href: "/presidentielles-2027#veille",
    cta: "Voir les dynamiques",
  },
  {
    icon: Search,
    title: "Recherche plein texte",
    desc: "Retrouvez une prise de parole, un chiffre ou un amendement dans l'ensemble des comptes rendus de commission indexés.",
    color: "from-sky-500 to-blue-600",
    href: "/deputes#commissions",
    cta: "Chercher dans les comptes rendus",
  },
  {
    icon: Download,
    title: "Export des données",
    desc: "Sortez en CSV ce que vous consultez — suivi de commission ou séries d'audience — pour vos notes, vos revues de presse et vos tableaux de bord.",
    color: "from-amber-400 to-orange-500",
    href: "/presidentielles-2027#veille",
    cta: "Essayer un export",
  },
];

/* ══════════ Démo 1 : une VRAIE analyse détaillée, rendue avec le VRAI design du site ══════════ */
// Analyse réelle (report des élections en Nouvelle-Calédonie) — telle qu'affichée aux membres
// premium : sections en cartes, chiffres surlignés. Aucun contenu inventé.
const DEMO_ANALYSIS = {
  title: "Report du renouvellement des institutions de la Nouvelle-Calédonie",
  category: "Institutions",
  status: "Promulguée",
  text: `**Contexte et objectif** : le texte reporte le renouvellement des institutions calédoniennes – initialement prévu en mai 2024, puis reporté à décembre 2024 – afin de laisser une fenêtre de dialogue pour un accord consensuel sur le statut futur de l'archipel. **Procédure accélérée** : le gouvernement a déclaré l'urgence le 2 octobre 2024, ce qui a permis une navette parlementaire rapide (Sénat le 23 octobre, Assemblée nationale le 5 novembre). **Amendements clés** : l'amendement proposant un report au 30 mai 2025 a été rejeté, tandis que l'amendement des rapporteurs fixant l'échéance au 30 novembre 2025 a été adopté. Un amendement technique a prévu une entrée en vigueur dès le lendemain de la publication pour respecter les délais de convocation des électeurs. **Votes** : le texte a été adopté sans opposition en première lecture à l'Assemblée nationale (297 pour, 0 contre) et au Sénat (324 pour, 0 contre, 19 abstentions). La commission mixte paritaire a été saisie, et le texte définitif a été adopté par l'Assemblée (279 pour, 247 contre, 9 abstentions) et le Sénat (298 pour, 39 contre, 5 abstentions). Le Conseil constitutionnel, saisi le 6 novembre, a validé le texte le 13 novembre. **Limites de l'analyse** : les sources ne précisent pas les positions des groupes minoritaires calédoniens autres que ceux représentés par les amendements rejetés. Le report à novembre 2025 résulte d'un compromis entre continuité institutionnelle et temps laissé aux négociations politiques.`,
};

// Mêmes helpers que le rendu réel (LawsClient) : découpage des sections + surlignage des chiffres.
const NUM_RE = /(\d[\d  .]*\s?(?:%|€|Md€|M€|milliards?|millions?)|\d{1,4}\s?(?:pour|contre|abstentions?|voix|sièges)|\d+(?:[.,]\d+)?)/gi;
function HL({ text }: { text: string }) {
  const parts = String(text || "").split(NUM_RE);
  return <>{parts.map((p, i) => i % 2 === 1
    ? <span key={i} className="rounded-md bg-amber-400/25 px-1 font-black text-amber-900 dark:text-amber-300 whitespace-nowrap">{p}</span>
    : <span key={i}>{p}</span>)}</>;
}
function sectionStyle(header: string) {
  const h = header.toLowerCase();
  if (/vote|scrutin/.test(h)) return { Icon: Vote, c: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
  if (/limite|réserve/.test(h)) return { Icon: AlertTriangle, c: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800" };
  if (/contexte|objectif|objet|mesure/.test(h)) return { Icon: Target, c: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" };
  if (/procédure|navette|étape|calendrier/.test(h)) return { Icon: GitBranch, c: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" };
  if (/amendement/.test(h)) return { Icon: Pencil, c: "text-fuchsia-600", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10" };
  if (/problème|enjeu|pourquoi/.test(h)) return { Icon: HelpCircle, c: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-500/10" };
  return { Icon: FileText, c: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" };
}
function parseSections(raw: string) {
  const re = /\*\*(.+?)\*\*\s*:?\s*/g;
  const out: { header: string; body: string }[] = [];
  let m: RegExpExecArray | null, lastIdx = 0, lastHeader: string | null = null;
  while ((m = re.exec(raw))) {
    if (lastHeader !== null) out.push({ header: lastHeader, body: raw.slice(lastIdx, m.index).trim() });
    lastHeader = m[1].trim(); lastIdx = re.lastIndex;
  }
  if (lastHeader !== null) out.push({ header: lastHeader, body: raw.slice(lastIdx).trim() });
  return out.filter(s => s.body.length > 1);
}

function LawExampleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = DEMO_ANALYSIS;
  const sections = parseSections(d.text);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.98 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-6 pr-14 text-white shrink-0">
              <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.6),transparent_60%)]" />
              <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2 hover:bg-white/25 transition" aria-label="Fermer"><X size={18} /></button>
              <p className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-400"><Scale size={12} /> Exemple réel · Analyse détaillée</p>
              <h3 className="relative mt-2 text-lg sm:text-xl font-bold leading-tight">{d.title}</h3>
              <div className="relative mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/80">{d.category}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300"><CheckCircle2 size={11} /> {d.status}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {sections.map((s, i) => {
                  const { Icon, c, bg } = sectionStyle(s.header);
                  const wide = /vote|scrutin|contexte|objectif|objet/i.test(s.header) ? "sm:col-span-2" : "";
                  return (
                    <div key={i} className={`rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm ${wide}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${c}`}><Icon size={16} /></span>
                        <h4 className={`text-[11px] font-black uppercase tracking-widest ${c}`}>{s.header}</h4>
                      </div>
                      <p className="text-[13.5px] leading-6 text-slate-700 dark:text-slate-300"><HL text={s.body} /></p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[10px] italic text-slate-400">Exemple réel d&apos;un décryptage Premium — le design exact affiché sur chaque loi.</p>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <Link href="/lois" className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-black uppercase tracking-widest text-xs hover:brightness-110 transition">
                <Sparkles size={14} /> Voir tous les décryptages
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ══════════ Démo 2 : le fil de notifications d'un élu suivi ══════════ */
const DEMO_NOTIFS = [
  { kind: "vote", who: "Votre député·e a voté", pos: "POUR", title: "Projet de loi de finances 2027", when: "il y a 2 h", color: "#059669" },
  { kind: "vote", who: "Sénateur·rice suivi·e a voté", pos: "CONTRE", title: "Proposition de loi sur le logement", when: "hier", color: "#e11d48" },
  { kind: "info", dom: "Écologie & énergie", title: "Nouvelle loi sur la résilience des territoires forestiers", when: "hier", color: "#16a34a" },
  { kind: "local", dom: "Ma commune", title: "Conseil municipal : le budget 2027 voté", when: "il y a 3 j", color: "#ea580c" },
];
function NotifDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.98 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="relative bg-gradient-to-br from-purple-600 to-fuchsia-700 p-6 pr-14 text-white shrink-0">
              <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 hover:bg-white/30 transition" aria-label="Fermer"><X size={18} /></button>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80"><BellRing size={12} /> Votre fil d'alertes</p>
              <p className="mt-1 text-[11px] text-white/70">Un aperçu de ce qui vous attend, en temps réel.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {/* mini en-tête façon fil réel */}
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600"><BellRing size={15} /></span>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Mes alertes</span>
                </div>
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">4 nouvelles</span>
              </div>
              {DEMO_NOTIFS.map((n, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: n.color + "22", color: n.color }}>
                    {n.kind === "vote" ? <Vote size={17} /> : n.kind === "local" ? <MapPin size={17} /> : <FileText size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {n.kind === "vote" ? (
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{n.who} <span style={{ color: n.color }}>{n.pos}</span></p>
                    ) : (
                      <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{n.title}</p>
                    )}
                    {n.kind === "vote" ? <p className="text-xs text-slate-500 line-clamp-1">« {n.title} »</p> : null}
                    <div className="mt-1 flex items-center gap-2">
                      {n.dom && <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: n.color }}>{n.dom}</span>}
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{n.when}</span>
                    </div>
                  </div>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                </motion.div>
              ))}
            </div>
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <Link href="/dashboard" className="block text-center py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition">Configurer mes alertes</Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function PremiumPage() {
  const { userId } = usePremium();
  const reduceMotion = useReducedMotion();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const [lawOpen, setLawOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Rail des offres sur mobile : on suit la carte visible pour allumer la bonne pastille.
  const offersRef = useRef<HTMLDivElement>(null);
  const [offerIndex, setOfferIndex] = useState(0);
  // On mesure les cartes réelles plutôt qu'une fraction de la largeur : le rail a des
  // marges asymétriques (débord à droite), qu'un simple découpage en deux fausserait.
  const onOffersScroll = () => {
    const el = offersRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0, bestGap = Infinity;
    Array.from(el.children).forEach((node, i) => {
      const card = node as HTMLElement;
      const gap = Math.abs(card.offsetLeft - el.offsetLeft + card.offsetWidth / 2 - center);
      if (gap < bestGap) { bestGap = gap; best = i; }
    });
    setOfferIndex(best);
  };
  const scrollToOffer = (i: number) => {
    const el = offersRef.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  const plan = PLANS.elite;
  // Chaque carte lance son propre paiement : le clic porte l'offre choisie.
  // Le Premium est mensuel uniquement — seule l'offre Pro suit la bascule de périodicité.
  const goPremium = (key: "elite" | "pro" = "elite") => {
    window.location.href = getPremiumUrl(userId, key, key === "pro" ? billingCycle : "monthly");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ══════ HERO ══════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white py-28 px-4">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-amber-500 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 right-[15%] w-60 h-60 bg-yellow-600 rounded-full blur-[100px] animate-pulse" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-4 text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-[0.9] mb-6">
            <span className="text-white">La politique,</span>{" "}
            <span className="bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">en premium.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Décryptages de lois illimités, suivi de vos élus et notifications personnalisées sur tout ce qui vous concerne. L&apos;essentiel, sans le bruit.
          </motion.p>
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}
            onClick={() => SALES_OPEN ? goPremium("elite") : document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-4 text-slate-900 font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_rgba(251,191,36,0.35)] hover:brightness-110 transition">
            {SALES_OPEN ? <>Devenir Premium — dès {fmtPrice(plan.monthly)}/mois</> : <>Découvrir les formules</>} <ArrowRight size={18} />
          </motion.button>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-14">
            <div className="text-center"><p className="text-4xl md:text-5xl font-extrabold text-amber-400"><AnimatedCounter target={302} suffix="+" /></p><p className="text-sm text-white/50 mt-1 italic">Citoyens Premium</p></div>
            <div className="text-center"><p className="text-4xl md:text-5xl font-extrabold text-white">∞</p><p className="text-sm text-white/50 mt-1 italic">Décryptages</p></div>
            <div className="text-center"><p className="text-4xl md:text-5xl font-extrabold text-white">100%</p><p className="text-sm text-white/50 mt-1 italic">Indépendant</p></div>
          </div>
        </div>
      </section>

      {/* Les vitrines de fonctionnalités ont été retirées : chaque fonctionnalité est
          désormais listée — et cliquable — directement dans sa carte d'offre ci-dessous.
          Les répéter en amont rallongeait la page sans rien ajouter, surtout sur mobile. */}

      {/* ══════ OFFRES & CTA ══════ */}
      <section id="offres" className="scroll-mt-24 py-24 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter text-slate-900 dark:text-white">
              Deux formules, <span className="text-amber-500">un seul site</span>
            </h2>
            <p className="mt-3 text-slate-500 text-lg">Choisissez selon l&apos;usage que vous en faites.</p>
            <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-slate-400 md:hidden">
              Faites glisser pour comparer →
            </p>
          </FadeIn>

          {/*
            Mobile : les deux offres sont côte à côte dans un rail qui défile au doigt,
            avec accrochage par carte. Le débord négatif laisse la carte suivante
            dépasser du bord, ce qui signale qu'il y en a une autre à droite.
            À partir de md, le rail redevient une grille classique à deux colonnes.
          */}
          <div ref={offersRef} onScroll={onOffersScroll}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-4 -mx-4 pl-4 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-2 md:gap-8 md:overflow-visible md:px-0 md:pb-0 md:pt-4 items-stretch">
            {/* ─── Premium ─── */}
            <FadeIn className="w-[86vw] shrink-0 snap-center md:w-auto md:shrink [&>div]:h-full">
              <div className="relative flex h-full flex-col rounded-[2.5rem] border-2 border-amber-400 bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-500/5 dark:to-slate-900 p-8 shadow-2xl shadow-amber-500/10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Offre la plus populaire</div>

                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{PLANS.elite.audience}</p>
                <h3 className="mt-1 font-staatliches text-4xl uppercase tracking-tight text-slate-900 dark:text-white">{PLANS.elite.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{PLANS.elite.tagline}</p>

                {/* Formule mensuelle uniquement : aucun choix de périodicité à proposer. */}
                <div className="mt-6 mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">{fmtPrice(PLANS.elite.monthly)}</span>
                    <span className="text-slate-400 font-bold">/mois</span>
                  </div>
                  <p className="mt-2 text-xs font-bold italic text-slate-400">Sans engagement, résiliable à tout moment.</p>
                </div>

                {/* Les fonctionnalités sont listées ICI, et chacune mène à la vraie page
                    ou ouvre sa démo : on décide et on essaie au même endroit. */}
                <div className="mb-8 flex-1 space-y-1">
                  {FEATURES.map(f => {
                    const inner = (
                      <>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
                          <f.icon size={14} />
                        </span>
                        <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-slate-700 dark:text-slate-200">{f.title}</span>
                        <ArrowRight size={13} className="shrink-0 text-slate-300 transition-transform group-hover/f:translate-x-0.5" />
                      </>
                    );
                    const cls = "group/f -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60";
                    return f.demo
                      ? <button key={f.title} onClick={() => (f.demo === "law" ? setLawOpen(true) : setNotifOpen(true))} className={cls}>{inner}</button>
                      : <Link key={f.title} href={f.href} className={cls}>{inner}</Link>;
                  })}
                </div>

                {SALES_OPEN ? (
                  <button onClick={() => goPremium("elite")}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 transition active:scale-[0.99]">
                    <Star size={16} className="fill-current" /> Devenir Premium
                  </button>
                ) : (
                  <div className="w-full rounded-2xl border-2 border-dashed border-amber-300 px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                    Bientôt disponible
                  </div>
                )}
              </div>
            </FadeIn>

            {/* ─── Pro ─── */}
            <FadeIn delay={0.1} className="w-[86vw] shrink-0 snap-center md:w-auto md:shrink [&>div]:h-full">
              <div className="group relative flex h-full flex-col rounded-[2.5rem] border-2 border-fuchsia-400/70 bg-gradient-to-b from-slate-950 to-slate-900 p-8 text-white shadow-[0_0_45px_-8px_rgba(217,70,239,0.55)]">
                {/* Halo qui respire le long du contour — l'offre Pro doit accrocher l'œil. */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-[2.5rem] ring-2 ring-fuchsia-400/60"
                  animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], boxShadow: [
                    "0 0 18px 0 rgba(217,70,239,0.25) inset",
                    "0 0 34px 0 rgba(217,70,239,0.55) inset",
                    "0 0 18px 0 rgba(217,70,239,0.25) inset",
                  ] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <FallingParticles />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Professionnels</div>

                <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-300">{PLANS.pro.audience}</p>
                <h3 className="mt-1 font-staatliches text-4xl uppercase tracking-tight">{PLANS.pro.name}</h3>
                <p className="mt-1 text-sm text-white/60">{PLANS.pro.tagline}</p>

                {/* Le Pro est la seule formule à proposer l'annuel : la bascule vit donc ici. */}
                <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-white/10 p-1 pr-3">
                  <button onClick={() => setBillingCycle(billingCycle === "monthly" ? "annually" : "monthly")}
                    aria-label="Basculer entre facturation mensuelle et annuelle"
                    className="relative h-7 w-12 rounded-full bg-slate-950/60 p-1">
                    <motion.div animate={{ x: billingCycle === "monthly" ? 0 : 20 }} className="h-5 w-5 rounded-full bg-fuchsia-400 shadow-lg" />
                  </button>
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {billingCycle === "monthly"
                      ? <span className="text-white/50">Passer à l&apos;annuel <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-white">-20%</span></span>
                      : <span className="text-emerald-400">Facturation annuelle</span>}
                  </span>
                </div>

                <div className="mt-4 mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black">{fmtPrice(billingCycle === "monthly" ? PLANS.pro.monthly : PLANS.pro.annually)}</span>
                    <span className="text-white/40 font-bold">/{billingCycle === "monthly" ? "mois" : "an"}</span>
                  </div>
                  {billingCycle === "annually" && <p className="mt-2 text-xs font-bold italic text-emerald-400">Soit {fmtPrice(PLANS.pro.annually / 12)}/mois — deux mois offerts</p>}
                </div>

                {/* Même principe côté Pro : tout le Premium, puis les outils de veille, cliquables. */}
                <div className="mb-8 flex-1 space-y-1">
                  <div className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
                      <Sparkles size={14} />
                    </span>
                    <span className="text-[13px] font-bold text-white">Tous les avantages premium</span>
                  </div>
                  {PRO_FEATURES.map(f => (
                    <Link key={f.title} href={f.href}
                      className="group/f -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-white/10">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-300">
                        <f.icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-white/90">{f.title}</span>
                      <ArrowRight size={13} className="shrink-0 text-white/30 transition-transform group-hover/f:translate-x-0.5" />
                    </Link>
                  ))}
                </div>

                {SALES_OPEN ? (
                  <button onClick={() => goPremium("pro")}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-6 py-4 font-black uppercase tracking-widest text-sm shadow-lg shadow-fuchsia-500/30 hover:brightness-110 transition active:scale-[0.99]">
                    <LineChart size={16} /> Passer au Pro
                  </button>
                ) : (
                  <div className="w-full rounded-2xl border-2 border-dashed border-fuchsia-400/50 px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-fuchsia-300">
                    Bientôt disponible
                  </div>
                )}
              </div>
            </FadeIn>
          </div>

          {/* Repère de position, pour qu'on sache laquelle des deux offres on regarde. */}
          <div className="mt-1 flex justify-center gap-2 md:hidden">
            {[0, 1].map(i => (
              <button key={i} onClick={() => scrollToOffer(i)} aria-label={`Voir l'offre ${i + 1}`}
                className={`h-2 rounded-full transition-all ${offerIndex === i ? "w-6 bg-slate-900 dark:bg-white" : "w-2 bg-slate-300 dark:bg-slate-700"}`} />
            ))}
          </div>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6 md:mt-8">
            {SALES_OPEN ? "Sécurisé par Stripe • Résiliable à tout moment" : "Ouverture des abonnements très prochainement"}
          </p>
        </div>
      </section>

      {/* ══════ TÉMOIGNAGES ══════ */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">Expériences</p>
            <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter text-slate-900 dark:text-white">Ils en parlent <span className="text-amber-500">mieux que nous</span></h2>
          </FadeIn>
          <TestimonialRail />
        </div>
      </section>

      <LawExampleModal open={lawOpen} onClose={() => setLawOpen(false)} />
      <NotifDemoModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
