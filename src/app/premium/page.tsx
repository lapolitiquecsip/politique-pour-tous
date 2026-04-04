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
  Scale,
  ChevronDown,
  User,
  Briefcase
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

/* ── What You Receive (Expanded for Premium) ── */
const CONTENTS = [
  {
    icon: Mail,
    title: "Newsletter Hebdomadaire",
    desc: "100% personnalisée. Selon votre localisation, âge et catégorie socio-pro, nous calculons l'impact direct des nouvelles lois (impôts, aides, etc.) sur votre quotidien.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    icon: FileText,
    title: "Explications de lois illimitées",
    desc: "Accédez à l'intégralité de nos décryptages sans aucune restriction. Comprenez chaque vote en profondeur.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    href: "/lois",
  },
  {
    icon: Sparkles,
    title: "Filtrage par domaines",
    desc: "Personnalisez votre expérience en filtrant par thématique : écologie, santé, économie, social...",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    icon: Bell,
    title: "Alertes Député Personnalisées",
    desc: "Soyez prévenu dès que votre député prend part à un vote crucial à l'Assemblée Nationale.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
];

export default function PremiumPage() {
  const [email, setEmail] = useState("");
  const [prefAssemblee, setPrefAssemblee] = useState(true);
  const [prefLois, setPrefLois] = useState(true);
  const [prefDepute, setPrefDepute] = useState(false);
  const [age, setAge] = useState("");
  const [csp, setCsp] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Enregistrer les informations de profil dans Supabase
      await api.subscribeNewsletter({
        email,
        preferences: {
          newsletter: prefAssemblee,
          lois_illimite: prefLois,
          alertes_depute: prefDepute,
        },
        postal_code: zipCode || undefined,
        age,
        csp
      });

      // 2. Redirection vers Stripe Checkout
      window.location.href = STRIPE_CHECKOUT_URL;
    } catch (err: any) {
      console.error("Erreur d'inscription:", err);
      // Même si l'email existe déjà, on redirige vers Stripe pour le paiement
      if (err.message?.includes("déjà abonné")) {
        window.location.href = STRIPE_CHECKOUT_URL;
      } else {
        setError("Une erreur est survenue lors de l'enregistrement de vos informations. Veuillez réessayer.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════ */}
      {/* 1. HERO SPECTACULAIRE (OFFRE PREMIUM GOLD)   */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white py-28 px-4">
        {/* Animated background dots - Theme Gold */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-amber-500 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 right-[15%] w-60 h-60 bg-yellow-600 rounded-full blur-[100px] animate-pulse" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 backdrop-blur-sm border border-amber-400/30 rounded-full text-amber-400 text-sm font-medium mb-8">
              <Star className="w-4 h-4 fill-current" />
              L&apos;expérience politique ultime • Tout en illimité
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-5xl md:text-7xl font-extrabold leading-tight mb-6"
          >
            Passez à la vitesse supérieure avec{" "}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              Premium.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Newsletter hebdomadaire, décryptages de lois illimités et filtres thématiques exclusifs. Tout ce qu&apos;il vous faut pour comprendre.
          </motion.p>

          {/* Compteurs animés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-14"
          >
            <div className="text-center group">
              <p className="text-4xl md:text-5xl font-extrabold text-amber-400 group-hover:scale-110 transition-transform">
                <AnimatedCounter target={302} suffix="+" />
              </p>
              <p className="text-sm text-white/50 mt-1 font-medium italic">Citoyens Premium</p>
            </div>
            <div className="text-center group">
              <p className="text-4xl md:text-5xl font-extrabold text-white group-hover:scale-110 transition-transform">
                ∞
              </p>
              <p className="text-sm text-white/50 mt-1 font-medium italic">Décryptages</p>
            </div>
            <div className="text-center group">
              <p className="text-4xl md:text-5xl font-extrabold text-white group-hover:scale-110 transition-transform">
                100%
              </p>
              <p className="text-sm text-white/50 mt-1 font-medium italic">Indépendant</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 2. CE QUE VOUS DÉBLOQUEZ                     */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d97706 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-staatliches uppercase tracking-tighter text-slate-900 mb-4">
              Vos privilèges <span className="text-amber-500">Premium</span>
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Une vision claire et personnalisée de la vie politique française.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CONTENTS.map((item, i) => {
              const Icon = item.icon;
              const content = (
                <div className="group flex gap-5 p-8 rounded-3xl border border-slate-100 bg-white hover:shadow-2xl hover:border-amber-200 transition-all h-full">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border ${item.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );

              return (
                <FadeIn key={i} delay={i * 0.1}>
                  {item.href ? (
                    <Link href={item.href} className="block h-full">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 3. TÉMOIGNAGES (POSTER STYLE TITLE)          */}
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
                  <div className="bg-amber-50 border border-emerald-100 rounded-xl p-4">
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
      <section className="py-24 px-4 bg-white overflow-hidden relative">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16 relative">
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">Expériences</p>
            <h2 className="text-4xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none text-slate-900 relative z-10">
              <span className="text-slate-900 opacity-[0.04] absolute -top-8 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap">
                SATISFACTION • COMMUNAUTÉ
              </span>
              Ils en parlent <span className="text-amber-500">mieux que nous</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div className="bg-white rounded-3xl p-8 border border-white hover:shadow-xl transition-all h-full flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110" />
                  <Quote className="w-10 h-10 text-amber-200 mb-6 relative z-10" />
                  <p className="text-slate-700 text-lg leading-relaxed flex-1 italic relative z-10">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-900 font-bold shadow-md">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{t.name}</p>
                      <p className="text-sm text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 4. FORMULAIRE PREMIUM                       */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
        {/* Decorative gold sphere */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-[100px] -mr-48 -mb-48" />
        
        <div className="max-w-xl mx-auto relative z-10">
          <FadeIn>
            {success ? (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-10 text-center shadow-2xl animate-fade-in">
                <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-staatliches uppercase tracking-tighter text-amber-900 mb-4">Bienvenue dans l&apos;Elite !</h2>
                <p className="text-amber-800/80 text-lg mb-8">
                  Votre accès Premium est maintenant actif. Vous recevrez nos analyses dès lundi.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-8 py-4 font-bold text-slate-900 bg-amber-400 rounded-2xl hover:bg-amber-500 transition-colors shadow-lg shadow-amber-200"
                >
                  Découvrir les Lois
                </Link>
              </div>
            ) : (
              <div>
                <div className="text-center mb-10">
                  <p className="text-amber-500 font-bold uppercase tracking-widest text-sm mb-2">Offre de lancement</p>
                  <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter text-slate-900 mb-3">
                    Rejoignez <span className="text-amber-500">l&apos;Elite</span>
                  </h2>
                  <p className="text-slate-500 text-lg italic">Un condensé politique sur-mesure, adapté à vos préférences.</p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
                >
                  {/* Top gold bar */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />

                  <div className="space-y-8">
                    {/* Prix Premium Gold Style */}
                    <div className="bg-slate-900 p-6 rounded-3xl flex items-center justify-between border border-amber-400/20 shadow-inner">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-400 rounded-2xl text-slate-900">
                          <Star className="w-6 h-6 fill-current" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-400 uppercase tracking-widest">Accès Total</p>
                          <p className="text-xs text-amber-100/60 font-medium italic">Sans engagement</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-black text-white">3€</p>
                        <p className="text-[10px] font-bold text-amber-400 uppercase">/ mois</p>
                      </div>
                    </div>

                    {/* Grid for Age and CSP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Age */}
                      <div>
                        <label htmlFor="age" className="block text-sm font-bold text-slate-900 mb-2 ml-1">
                          Votre âge
                        </label>
                        <div className="relative group">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-amber-500 transition-colors" />
                          <select
                            id="age"
                            required
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full pl-14 pr-10 py-5 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 text-lg transition-all appearance-none bg-white font-medium"
                          >
                            <option value="" disabled>Tranche d&apos;âge</option>
                            <option value="-18">Moins de 18 ans</option>
                            <option value="18-24">18 - 24 ans</option>
                            <option value="25-34">25 - 34 ans</option>
                            <option value="35-49">35 - 49 ans</option>
                            <option value="50-64">50 - 64 ans</option>
                            <option value="65+">65 ans et +</option>
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                        </div>
                      </div>

                      {/* CSP */}
                      <div>
                        <label htmlFor="csp" className="block text-sm font-bold text-slate-900 mb-2 ml-1">
                          Votre situation
                        </label>
                        <div className="relative group">
                          <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-amber-500 transition-colors" />
                          <select
                            id="csp"
                            required
                            value={csp}
                            onChange={(e) => setCsp(e.target.value)}
                            className="w-full pl-14 pr-10 py-5 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 text-lg transition-all appearance-none bg-white font-medium"
                          >
                            <option value="" disabled>Secteur d&apos;activité</option>
                            <option value="etudiant">Étudiant(e)</option>
                            <option value="salarie_prive">Salarié (Secteur privé)</option>
                            <option value="fonctionnaire">Fonctionnaire / Service Public</option>
                            <option value="independant">Indépendant / Chef d&apos;entreprise</option>
                            <option value="demandeur">Demandeur d&apos;emploi</option>
                            <option value="retraite">Retraité(e)</option>
                            <option value="autre">Autre</option>
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2 ml-1">
                        Adresse e-mail de membre
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-amber-500 transition-colors" />
                        <input
                          id="email"
                          type="email"
                          required
                          placeholder="votre.email@institution.fr"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-14 pr-4 py-5 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 text-lg transition-all font-medium"
                        />
                      </div>
                      {error && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{error}</p>}
                    </div>

                    {/* Preferences checkbox styled gold */}
                    <div className="space-y-4">
                      <p className="font-bold text-slate-400 text-xs uppercase tracking-widest ml-1 mb-2">Options incluses :</p>

                      <div className="grid grid-cols-1 gap-3">
                        <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 accent-amber-500"
                            checked={prefAssemblee}
                            onChange={(e) => setPrefAssemblee(e.target.checked)}
                          />
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-500" />
                            Newsletter Hebdomadaire
                          </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                          <input
                            type="checkbox"
                            checked={true}
                            readOnly
                            className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 accent-amber-500"
                          />
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Scale className="w-4 h-4 text-amber-500" />
                            Lois en Illimité
                          </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 accent-amber-500"
                            checked={prefDepute}
                            onChange={(e) => setPrefDepute(e.target.checked)}
                          />
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-amber-500" />
                            Alertes de mon Député
                          </span>
                        </label>
                      </div>

                      {prefDepute && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="ml-2 overflow-hidden"
                        >
                          <input
                            type="text"
                            placeholder="Code postal (5 chiffres)"
                            maxLength={5}
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-amber-400/50"
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Submit Button Gold - Styled like the screenshot */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex flex-row items-center justify-between px-8 py-5 rounded-3xl text-xl font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 transition-all shadow-xl shadow-amber-200 group disabled:opacity-70"
                    >
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-900" />
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Star className="w-6 h-6 fill-current" />
                            Devenir Premium
                          </div>
                          <div className="flex items-center gap-2 bg-slate-900/10 px-4 py-2 rounded-2xl">
                            <span>3€</span>
                            <span className="text-xs opacity-60">/mois</span>
                          </div>
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                      Sécurisé par Stripe • Résiliable à tout moment
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
