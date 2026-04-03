"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { api } from "@/lib/api";
import { STRIPE_CHECKOUT_URL } from "@/lib/constants";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Bell,
  Building2,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  Quote,
  AlertCircle,
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
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString("fr-FR")}{suffix}
    </span>
  );
}

/* ── Fade-in wrapper ── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Testimonials ── */
const TESTIMONIALS = [
  {
    name: "Camille D.",
    role: "Étudiante en droit, Paris",
    text: "Enfin un résumé politique que je lis VRAIMENT. C'est clair, pas partisan, et ça me prend 3 minutes le lundi matin.",
  },
  {
    name: "Marc T.",
    role: "Cadre, Lyon",
    text: "Je n'ai plus besoin de scroller Twitter pour comprendre ce qui se passe. Le contenu Premium me donne l'essentiel sans le bruit.",
  },
  {
    name: "Sophie L.",
    role: "Enseignante, Nantes",
    text: "Mes élèves adorent quand je leur lis les faits de la semaine. C'est devenu mon outil pédagogique préféré.",
  },
];

/* ── What You Receive ── */
const CONTENTS = [
  {
    icon: FileText,
    title: "Le résumé de la semaine",
    desc: "Les 5 faits politiques majeurs, décryptés en langage clair. Zéro jargon.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    icon: TrendingUp,
    title: "Les votes clés",
    desc: "Quelles lois ont été votées, par qui, et ce que ça change concrètement pour vous.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    icon: Bell,
    title: "Alerte député",
    desc: "Si votre député a voté cette semaine, on vous dit quoi et comment.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    icon: Sparkles,
    title: "Le saviez-vous ?",
    desc: "Une anecdote politique surprenante + l'intox de la semaine vérifiée.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
];

export default function PremiumPage() {
  const [email, setEmail] = useState("");
  const [prefAssemblee, setPrefAssemblee] = useState(true);
  const [prefLois, setPrefLois] = useState(true);
  const [prefDepute, setPrefDepute] = useState(false);
  const [zipCode, setZipCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Redirection directe vers Stripe Checkout
    window.location.href = STRIPE_CHECKOUT_URL;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════ */}
      {/* 1. HERO SPECTACULAIRE                       */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-28 px-4">
        {/* Animated background dots */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-blue-400 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 right-[15%] w-60 h-60 bg-red-400 rounded-full blur-[100px] animate-pulse" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Personnalisé • Hebdomadaire • Sans jargon
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-5xl md:text-7xl font-extrabold leading-tight mb-6"
          >
            La politique,{" "}
            <span className="bg-gradient-to-r from-blue-400 via-white to-red-400 bg-clip-text text-transparent">
              livrée chez vous.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Chaque lundi, recevez un résumé politique personnalisé. 3 minutes de lecture, 100% accessible.
          </motion.p>

          {/* Compteurs animés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-14"
          >
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-extrabold">
                <AnimatedCounter target={2847} suffix="+" />
              </p>
              <p className="text-sm text-white/50 mt-1 font-medium">abonnés</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-extrabold">
                <AnimatedCounter target={142} />
              </p>
              <p className="text-sm text-white/50 mt-1 font-medium">lois suivies</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-extrabold">
                <AnimatedCounter target={98} suffix="%" />
              </p>
              <p className="text-sm text-white/50 mt-1 font-medium">taux d&apos;ouverture</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 2. CE QUE VOUS RECEVREZ                     */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              Ce que vous recevrez chaque semaine
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Un email concis, personnalisé selon vos centres d&apos;intérêt. Voici ce qu&apos;il contient.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CONTENTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="group flex gap-5 p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border ${item.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 3. APERÇU D'UN EMAIL TYPE                   */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              Aperçu d&apos;un email type
            </h2>
            <p className="text-lg text-slate-500">Voici à quoi ressemblera votre résumé Premium chaque lundi.</p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Email header */}
              <div className="bg-slate-900 px-6 py-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-white/60 text-sm font-mono ml-4 truncate">
                  premium@lapolitiquecestsimple.fr
                </span>
              </div>

              {/* Email body */}
              <div className="p-8 md:p-10 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-red-600 flex items-center justify-center">
                    <span className="text-white font-extrabold text-xs">LP</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">La Politique, C&apos;est Simple</p>
                    <p className="text-xs text-slate-400">Semaine du 24 mars 2026</p>
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold text-slate-900">
                  🇫🇷 Cette semaine au Parlement
                </h3>

                <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="font-bold text-blue-900 mb-1">📋 Loi « Fin de vie » — Vote solennel mardi</p>
                    <p className="text-blue-800/70">L&apos;Assemblée votera mardi sur ce texte-clé. 340 députés devraient voter pour, mais le Sénat reste incertain.</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="font-bold text-emerald-900 mb-1">✅ Votre député(e) a voté POUR le budget de la Sécu</p>
                    <p className="text-emerald-800/70">Marie Dupont (EPR, Loire-Atlantique) a voté en faveur du PLFSS 2027.</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="font-bold text-amber-900 mb-1">💡 Le saviez-vous ?</p>
                    <p className="text-amber-800/70">Le mot « amendement » vient du latin emendare (corriger). En 2025, 14 000 amendements ont été déposés à l&apos;AN.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-center">
                  <span className="text-xs text-slate-400">Se désabonner • Modifier mes préférences</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 4. TÉMOIGNAGES                              */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              Ils en parlent mieux que nous
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow h-full flex flex-col">
                  <Quote className="w-8 h-8 text-slate-200 mb-4" />
                  <p className="text-slate-700 text-sm leading-relaxed flex-1 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 5. FORMULAIRE PREMIUM                       */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-xl mx-auto">
          <FadeIn>
            {success ? (
              <div className="bg-green-50/80 border border-green-200 rounded-3xl p-10 text-center shadow-lg">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-bold text-green-900 mb-4">Bienvenue dans le club !</h2>
                <p className="text-green-800/80 text-lg mb-8">
                  Vous recevrez votre premier résumé dès lundi prochain à <strong>{email}</strong>.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                >
                  Retour à l&apos;accueil
                </Link>
              </div>
            ) : (
              <div>
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
                    Rejoignez <AnimatedCounter target={2847} suffix="+" /> abonnés
                  </h2>
                  <p className="text-slate-500">Un condensé politique sur-mesure, adapté à vos préférences.</p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="bg-white border border-slate-200 shadow-xl rounded-3xl p-8 md:p-10 relative overflow-hidden"
                >
                  {/* Top gradient bar */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-white to-red-500" />

                  <div className="space-y-7">
                    {/* Prix Mis en avant */}
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white">
                          <Star className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-900 uppercase">Accès Premium illimité</p>
                          <p className="text-xs text-blue-700/70">Sans engagement, résiliable en un clic.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-900">3€<span className="text-sm font-medium text-blue-700">/mois</span></p>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                        Votre adresse e-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          id="email"
                          type="email"
                          required
                          placeholder="camille@exemple.fr"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-lg transition-all"
                        />
                      </div>
                    </div>

                    {/* Preferences */}
                    <div className="space-y-3">
                      <p className="font-bold text-slate-900 text-sm">Contenu de votre abonnement :</p>

                      <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                          checked={prefAssemblee}
                          onChange={(e) => setPrefAssemblee(e.target.checked)}
                        />
                        <div>
                          <span className="font-semibold text-slate-800 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            Récap de l&apos;Assemblée
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                          checked={prefLois}
                          onChange={(e) => setPrefLois(e.target.checked)}
                        />
                        <div>
                          <span className="font-semibold text-slate-800 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-slate-400" />
                            Suivi des lois majeures
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                          checked={prefDepute}
                          onChange={(e) => setPrefDepute(e.target.checked)}
                        />
                        <div>
                          <span className="font-semibold text-slate-800 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            Alertes député(e)
                          </span>
                        </div>
                      </label>

                      {prefDepute && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="ml-8 overflow-hidden"
                        >
                          <input
                            id="zip"
                            type="text"
                            placeholder="Code postal (ex: 75011)"
                            maxLength={5}
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full md:w-56 px-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex flex-col items-center justify-center gap-1 py-5 rounded-2xl text-lg font-black text-white bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 transition-all shadow-xl hover:shadow-blue-500/20 disabled:opacity-70 group"
                    >
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            Passer au Premium
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <span className="text-[10px] font-medium opacity-60 uppercase tracking-widest text-white">Souscription sécurisée • 3€ / mois</span>
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-slate-400 font-medium">
                      En continuant, vous acceptez les conditions de vente de La Politique, C&apos;est Simple.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
