"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";
import {
  CheckCircle2, Star, TrendingUp, FileText, ArrowRight, Quote, Scale,
  LayoutDashboard, BellRing, Users, Bookmark, Building2, Sliders,
  X, Sparkles, ExternalLink, Loader2, Vote, MapPin,
} from "lucide-react";
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

/* ══════════ Démo 1 : exemple d'analyse de loi réelle ══════════ */
function LawExampleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [law, setLaw] = useState<any | null | undefined>(undefined);
  useEffect(() => {
    if (!open || law !== undefined) return;
    api.getPremiumDossiers().then((rows: any[]) => {
      const good = (rows || []).find(l => l.summary && l.summary.length > 60) || (rows || [])[0] || null;
      setLaw(good);
    }).catch(() => setLaw(null));
  }, [open, law]);

  const impactPoints = (() => {
    if (!law?.impact) return [];
    if (Array.isArray(law.impact)) return law.impact.filter((x: any) => typeof x === "string").slice(0, 4);
    if (typeof law.impact === "string") return law.impact.split(/\n|•|·/).map((s: string) => s.trim()).filter((s: string) => s.length > 8).slice(0, 4);
    return [];
  })();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.98 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="relative bg-gradient-to-br from-red-600 to-rose-700 p-6 pr-14 text-white shrink-0">
              <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 hover:bg-white/30 transition" aria-label="Fermer"><X size={18} /></button>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80"><Sparkles size={12} /> Exemple : décryptage de loi</p>
              <p className="mt-1 text-[11px] text-white/70">Voici ce que vous obtenez, sur chaque loi, en Premium.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {law === undefined ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 className="animate-spin" size={18} /> Chargement d'un exemple réel…</div>
              ) : !law ? (
                <p className="py-10 text-center text-sm text-slate-500">Exemple momentanément indisponible.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {law.category && <span className="rounded-full bg-red-100 dark:bg-red-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">{law.category}</span>}
                    {law.date_adopted && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adoptée le {new Date(law.date_adopted).toLocaleDateString("fr-FR")}</span>}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{law.title}</h3>
                  <div className="mt-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">L'analyse, en clair</p>
                    <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">{law.summary}</p>
                  </div>
                  {impactPoints.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ce que ça change</p>
                      <ul className="space-y-2">
                        {impactPoints.map((p: string, i: number) => (
                          <li key={i} className="flex gap-2 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-sm text-slate-700 dark:text-slate-300">
                            <TrendingUp size={16} className="mt-0.5 shrink-0 text-emerald-500" /><span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center gap-3">
              <Link href="/lois" className="flex-1 text-center py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition">Voir tous les décryptages</Link>
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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const [selectedPlan] = useState<"elite">("elite");
  const [lawOpen, setLawOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const plan = { name: "Elite", monthly: "3.99€", annually: "38€" };
  const goPremium = () => { window.location.href = getPremiumUrl(userId, selectedPlan, billingCycle); };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ══════ HERO ══════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white py-28 px-4">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-amber-500 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 right-[15%] w-60 h-60 bg-yellow-600 rounded-full blur-[100px] animate-pulse" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 backdrop-blur-sm border border-amber-400/30 rounded-full text-amber-400 text-sm font-medium mb-8">
              <Star className="w-4 h-4 fill-current" /> L&apos;expérience politique ultime • Tout en illimité
            </div>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            className="text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-[0.9] mb-6">
            <span className="text-white">La politique, enfin</span>{" "}
            <span className="bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">à votre service.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Décryptages de lois illimités, suivi de vos élus et notifications personnalisées sur tout ce qui vous concerne. L&apos;essentiel, sans le bruit.
          </motion.p>
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}
            onClick={goPremium}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-4 text-slate-900 font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_rgba(251,191,36,0.35)] hover:brightness-110 transition">
            Devenir Premium — {plan.monthly}/mois <ArrowRight size={18} />
          </motion.button>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-14">
            <div className="text-center"><p className="text-4xl md:text-5xl font-extrabold text-amber-400"><AnimatedCounter target={302} suffix="+" /></p><p className="text-sm text-white/50 mt-1 italic">Citoyens Premium</p></div>
            <div className="text-center"><p className="text-4xl md:text-5xl font-extrabold text-white">∞</p><p className="text-sm text-white/50 mt-1 italic">Décryptages</p></div>
            <div className="text-center"><p className="text-4xl md:text-5xl font-extrabold text-white">100%</p><p className="text-sm text-white/50 mt-1 italic">Indépendant</p></div>
          </div>
        </div>
      </section>

      {/* ══════ VITRINE DES AVANTAGES (interactive) ══════ */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-amber-500 font-bold uppercase tracking-widest text-sm mb-3">Ce que Premium change pour vous</p>
            <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter">
              Tout ce que vous <span className="text-amber-500">débloquez</span>
            </h2>
            <p className="mt-3 text-slate-500 text-lg">Chaque avantage est déjà en ligne. Cliquez pour l&apos;essayer.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="group relative flex h-full flex-col bg-white dark:bg-slate-900 p-7 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-2xl transition-all duration-500 overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${f.color}`} />
                  <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <f.icon size={26} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
                  {f.demo ? (
                    <button onClick={() => (f.demo === "law" ? setLawOpen(true) : setNotifOpen(true))}
                      className="mt-5 inline-flex items-center gap-2 self-start rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white dark:text-slate-900 hover:opacity-90 transition">
                      <Sparkles size={13} /> {f.cta}
                    </button>
                  ) : (
                    <Link href={f.href} className="mt-5 inline-flex items-center gap-1.5 self-start text-[11px] font-black uppercase tracking-widest text-amber-600 hover:gap-2.5 transition-all">
                      {f.cta} <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ OFFRE & CTA ══════ */}
      <section className="py-24 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-lg mx-auto">
          <FadeIn>
            <div className="relative rounded-[2.5rem] border-2 border-amber-400 bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-500/5 dark:to-slate-900 p-8 md:p-10 shadow-2xl shadow-amber-500/10 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Offre la plus populaire</div>

              <div className="flex items-center justify-center gap-4 mb-6">
                <span className={`text-sm font-bold ${billingCycle === "monthly" ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>Mensuel</span>
                <button onClick={() => setBillingCycle(billingCycle === "monthly" ? "annually" : "monthly")} className="w-14 h-8 bg-slate-900 rounded-full p-1 relative">
                  <motion.div animate={{ x: billingCycle === "monthly" ? 0 : 24 }} className="w-6 h-6 bg-amber-400 rounded-full shadow-lg" />
                </button>
                <span className={`text-sm font-bold flex items-center gap-2 ${billingCycle === "annually" ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                  Annuel <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded-full">-20% 🔥</span>
                </span>
              </div>

              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-black text-slate-900 dark:text-white">{billingCycle === "monthly" ? plan.monthly : plan.annually}</span>
                  <span className="text-slate-400 font-bold">/{billingCycle === "monthly" ? "mois" : "an"}</span>
                </div>
                {billingCycle === "annually" && <p className="text-emerald-600 text-xs font-bold mt-2 italic">Soit {(parseInt(plan.annually) / 12).toFixed(2)}€/mois</p>}
                <p className="mt-2 text-sm text-slate-500">Formule <span className="font-bold text-amber-600">Elite</span> — l&apos;expérience complète.</p>
              </div>

              <div className="space-y-3 mb-8">
                {["Décryptages de lois illimités", "Suivi des députés ET sénateurs", "Notifications personnalisées", "Budgets locaux & favoris"].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> {t}</div>
                ))}
              </div>

              <button onClick={goPremium}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 text-slate-900 font-black uppercase tracking-widest text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 transition active:scale-[0.99]">
                <Star size={16} className="fill-current" /> Devenir Premium
              </button>
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Sécurisé par Stripe • Résiliable à tout moment</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════ TÉMOIGNAGES ══════ */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">Expériences</p>
            <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter text-slate-900 dark:text-white">Ils en parlent <span className="text-amber-500">mieux que nous</span></h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all h-full flex flex-col">
                  <Quote className="w-10 h-10 text-amber-200 mb-6" />
                  <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed flex-1 italic">&ldquo;{t.text}&rdquo;</p>
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-900 font-bold shadow-md">{t.name.charAt(0)}</div>
                    <div><p className="text-base font-bold text-slate-900 dark:text-white">{t.name}</p><p className="text-sm text-slate-500">{t.role}</p></div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <LawExampleModal open={lawOpen} onClose={() => setLawOpen(false)} />
      <NotifDemoModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
