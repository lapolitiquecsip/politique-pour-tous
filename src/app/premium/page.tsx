"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";
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
  FileText,
  ArrowRight,
  Quote,
  AlertCircle,
  Scale,
  ChevronDown,
  User,
  Briefcase,
  LayoutDashboard,
  BellRing,
  Zap,
  Users
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
    icon: LayoutDashboard,
    title: "Dashboard de Pilotage Elite",
    desc: "Un espace personnel unique pour suivre l'écart entre vos convictions et les votes réels de l'Hémicycle.",
    color: "from-amber-400 to-orange-500",
    href: "/dashboard"
  },
  {
    icon: BellRing,
    title: "Suivi des Députés Interactif",
    desc: "Abonnez-vous à vos élus favoris. Recevez un flux d'activité en temps réel sur leurs prises de position.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: Mail,
    title: "Newsletter sur-mesure",
    desc: "Le condensé politique le plus précis de France. Focus municipal, institutionnel et analyse d'impact profil.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: FileText,
    title: "Décryptages de Lois Illimités",
    desc: "Accédez à l'intégralité de nos analyses 'Avant/Après' sans aucune restriction ni publicité.",
    color: "from-red-500 to-rose-600",
    href: "/lois",
  },
  {
    icon: Zap,
    title: "Alertes Votes Cruciaux",
    desc: "Soyez notifié instantanément lors des votes à fort impact sur votre catégorie socio-professionnelle.",
    color: "from-purple-500 to-fuchsia-600",
  },
  {
    icon: Sparkles,
    title: "Filtres Thématiques Avancés",
    desc: "Économie, Écologie, Santé... Ne recevez que ce qui compte vraiment pour vous grâce à nos filtres IA.",
    color: "from-amber-200 to-yellow-400",
  },
];

const REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
  "Guadeloupe",
  "Guyane",
  "Martinique",
  "La Réunion",
  "Mayotte"
].sort();

export default function PremiumPage() {
  const { isPremium, userId, loading: statusLoading } = usePremium();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [csp, setCsp] = useState("");
  const [region, setRegion] = useState("");
  const [zipCode, setZipCode] = useState("");
  
  const [prefAssemblee, setPrefAssemblee] = useState(true);
  const [prefLois, setPrefLois] = useState(true);
  const [prefDepute, setPrefDepute] = useState(true);
  const [prefLocalNews, setPrefLocalNews] = useState(true);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'student' | 'elite' | 'institution'>('elite');

  const plans = {
    student: { name: "Étudiant", monthly: "1.99€", annually: "19€", desc: "Pour les citoyens de -26 ans.", popular: false, comingSoon: false },
    elite: { name: "Elite", monthly: "3.99€", annually: "38€", desc: "L'expérience complète sans compromis.", popular: true, comingSoon: false },
    institution: { name: "Institution", monthly: "7.99€", annually: "77€", desc: "Suivi multi-circos & analyses poussées.", popular: false, comingSoon: true }
  };

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
          actualites_locales: prefLocalNews,
          region: region,
          age,
          csp,
          plan: selectedPlan,
          cycle: billingCycle
        },
        postal_code: zipCode || undefined,
        age,
        csp
      });

      // 2. Redirection vers Stripe Checkout sécurisé en fonction du plan
      window.location.href = getPremiumUrl(userId, selectedPlan, billingCycle);
    } catch (err: any) {
      console.error("Erreur d'inscription:", err);
      if (err.message?.includes("déjà abonné")) {
        window.location.href = getPremiumUrl(userId, selectedPlan, billingCycle);
      } else {
        setError("Une erreur est survenue lors de l'enregistrement de vos informations. Veuillez réessayer.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ... (Hero section omitted for brevity, keeping the same structure) */}
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
      {/* 2. GRILLE DES PRIX & SÉLECTION              */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-staatliches uppercase mb-4 tracking-tighter">Choisissez votre <span className="text-amber-500">engagement</span></h2>
            
            {/* Billing Switch */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>Mensuel</span>
              <button 
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annually' : 'monthly')}
                className="w-14 h-8 bg-slate-900 rounded-full p-1 relative transition-colors"
              >
                <motion.div 
                  animate={{ x: billingCycle === 'monthly' ? 0 : 24 }}
                  className="w-6 h-6 bg-amber-400 rounded-full shadow-lg"
                />
              </button>
              <span className={`text-sm font-bold flex items-center gap-2 ${billingCycle === 'annually' ? 'text-slate-900' : 'text-slate-400'}`}>
                Annuel
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded-full animate-bounce">
                  -20% 🔥
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {(['student', 'elite', 'institution'] as const).map((planId) => {
              const plan = plans[planId] as any;
              const isSelected = selectedPlan === planId;
              const isComingSoon = plan.comingSoon;
              
              return (
                <div 
                  key={planId}
                  onClick={() => {
                    if (!isComingSoon) {
                      setSelectedPlan(planId as any);
                      document.getElementById('final-form')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 ${
                    isSelected 
                      ? 'border-amber-400 bg-amber-50/30 shadow-2xl scale-105 z-10' 
                      : isComingSoon
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-100 bg-white hover:border-slate-200 opacity-80'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Plus Populaire
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{plan.desc}</p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-slate-900">
                        {billingCycle === 'monthly' ? plan.monthly : plan.annually}
                      </span>
                      <span className="text-slate-400 font-bold text-sm">
                        /{billingCycle === 'monthly' ? 'mois' : 'an'}
                      </span>
                    </div>
                    {billingCycle === 'annually' && (
                      <p className="text-emerald-600 text-xs font-bold mt-2 italic">
                        Soit environ {(parseInt(plan.annually) / 12).toFixed(2)}€/mois
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      Newsletter Elite
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      Décryptages illimités
                    </div>
                  </div>

                  <div className={`w-full py-4 rounded-2xl font-bold text-center transition-all ${
                    isComingSoon 
                      ? 'bg-slate-200 text-slate-500'
                      : isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isComingSoon ? 'Bientôt disponible' : isSelected ? 'Offre sélectionnée' : 'Choisir ce plan'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 🏙️ SECTION : LES AVANTAGES COMPLETS */}
      <section className="py-24 px-4 bg-slate-50 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-staatliches uppercase tracking-tighter mb-4">
              Tout ce que <span className="text-amber-500">votre abonnement</span> contient
            </h2>
            <p className="text-slate-500 text-lg">Une expérience sans limite, sans bruit, 100% citoyenne.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {CONTENTS.map((item, index) => (
              <FadeIn key={index} delay={index * 0.1}>
                <div className="group bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-amber-200 hover:shadow-2xl transition-all duration-500 h-full relative overflow-hidden">
                  {/* Left accent color bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${item.color}`} />
                  
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <item.icon size={24} />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 text-slate-900 group-hover:text-amber-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 3. FORMULAIRE DE PERSONNALISATION            */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-12 px-4 bg-white" id="final-form">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-amber-500 font-bold uppercase tracking-widest text-sm mb-2">Dernière étape</p>
            <h2 className="text-4xl font-staatliches uppercase tracking-tighter">Personnalisez votre <span className="text-amber-500">Expérience</span></h2>
            <p className="text-slate-500 text-sm italic mt-2">Nous adaptons nos résumés à votre profil.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
          >
            {/* Top gold bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />

            <div className="space-y-8">
              {/* Résumé de l'offre */}
              <div className="bg-slate-900 p-6 rounded-3xl flex items-center justify-between border border-amber-400/20 shadow-inner">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-400 rounded-2xl text-slate-900">
                    <Star className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-400 uppercase tracking-widest">{plans[selectedPlan].name}</p>
                    <p className="text-xs text-amber-100/60 font-medium italic">Facturation {billingCycle === 'monthly' ? 'mensuelle' : 'annuelle'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-white">
                    {billingCycle === 'monthly' ? plans[selectedPlan].monthly : plans[selectedPlan].annually}
                  </p>
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
                            className="w-full pl-14 pr-10 py-5 rounded-2xl border border-border shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 text-lg transition-all appearance-none bg-card text-foreground font-medium"
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
                            className="w-full pl-14 pr-10 py-5 rounded-2xl border border-border shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 text-lg transition-all appearance-none bg-card text-foreground font-medium"
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

                    {/* Bloc Ma Proximité */}
                    <div className="p-6 rounded-3xl border-2 border-amber-100 bg-amber-50/30 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-400 rounded-lg text-slate-900">
                          <MapPin size={18} className="fill-current" />
                        </div>
                        <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm">MA LOCALISATION</h3>
                      </div>
                      <p className="text-xs text-slate-500 font-medium italic mb-4 ml-1">
                        Pour recevoir des informations personnalisées sur tout ce qui vous entoure.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Région */}
                        <div>
                          <label htmlFor="region" className="block text-xs font-bold text-slate-600 mb-2 ml-1 uppercase">
                            Ma Région
                          </label>
                          <div className="relative group">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <select
                              id="region"
                              required
                              value={region}
                              onChange={(e) => setRegion(e.target.value)}
                              className="w-full pl-11 pr-10 py-4 rounded-xl border border-border focus:ring-2 focus:ring-amber-400/20 bg-card text-foreground text-sm font-medium appearance-none"
                            >
                              <option value="" disabled>Sélectionner...</option>
                              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </div>

                        {/* Code Postal */}
                        <div>
                          <label htmlFor="zipCode" className="block text-xs font-bold text-slate-600 mb-2 ml-1 uppercase">
                            Code Postal
                          </label>
                          <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              id="zipCode"
                              type="text"
                              required
                              placeholder="75001"
                              maxLength={5}
                              value={zipCode}
                              onChange={(e) => setZipCode(e.target.value.replace(/[^0-9]/g, ""))}
                              className="w-full pl-11 pr-4 py-4 rounded-xl border border-border focus:ring-2 focus:ring-amber-400/20 bg-card text-foreground text-sm font-medium"
                            />
                          </div>
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
                          className="w-full pl-14 pr-4 py-5 rounded-2xl border border-border shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 text-lg transition-all text-foreground bg-card font-medium"
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
                            checked={prefLocalNews}
                            onChange={(e) => setPrefLocalNews(e.target.checked)}
                          />
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Actualités de ma Région
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
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 4. APERÇU EMAIL TYPE                         */}
      {/* ═══════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-staatliches uppercase tracking-tighter text-slate-900 mb-4">
              Aperçu d&apos;un <span className="text-amber-500">email type</span>
            </h2>
            <p className="text-lg text-slate-500">Voici à quoi ressemblera votre résumé Premium chaque lundi.</p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden relative group hover:border-amber-200 transition-all duration-500">
              {/* Fake Browser/Email header - Premium Dark Style */}
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-700" />
                  <span className="w-3 h-3 rounded-full bg-slate-700" />
                  <span className="w-3 h-3 rounded-full bg-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <Star size={12} className="text-amber-400 fill-current" />
                  <span className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em]">Cible : Elite Marseille</span>
                </div>
                <span className="text-white/40 text-[10px] font-mono truncate max-w-[100px] md:max-w-none">
                  elite@lapolitiquecestsimple.fr
                </span>
              </div>

              {/* Email Content Body */}
              <div className="p-0">
                {/* 1. Header Branded */}
                <div className="p-8 md:p-12 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200 rotate-3 group-hover:rotate-0 transition-transform">
                      <span className="text-white font-black text-xl">P.</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900 tracking-tight">Bonjour Marc,</p>
                      <p className="text-slate-500 text-sm font-medium">Votre synthèse Elite • Lundi 24 mars 2026</p>
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-end">
                    <div className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full tracking-widest leading-none mb-1">Impact : Élevé</div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Marseille (PACA)</p>
                  </div>
                </div>

                <div className="p-8 md:p-12 space-y-12">
                  {/* 2. Elite Intelligence Section - IMPACT PROFIL */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-amber-400 rounded-full" />
                      <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter">1. Analyse de votre situation (Cadre)</h3>
                    </div>
                    <div className="bg-slate-900 text-white rounded-[2rem] p-8 relative overflow-hidden group/card shadow-xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 opacity-[0.05] rounded-bl-full -mr-10 -mt-10" />
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                          <TrendingUp className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white mb-2 leading-tight">Loi &quot;Plein Emploi&quot; : + 450€ / an pour votre profil</p>
                          <p className="text-slate-300 text-sm leading-relaxed">
                            En tant que <span className="text-white font-bold underline decoration-amber-400 underline-offset-4">Cadre du secteur privé</span>, le nouveau plafonnement des cotisations cadres vous impactera directement dès Juillet.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                        <div>
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Votre Impact</p>
                          <p className="text-xl font-black text-white">+1.2% net</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Confiance Vote</p>
                          <p className="text-xl font-black text-white">Adoption 98%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Ma Localisation PACA/Marseille */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-blue-600 rounded-full" />
                      <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter">2. Ma Localisation : PACA & Marseille</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-slate-100 rounded-3xl p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Building2 size={16} />
                          </div>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Grand Port Marseille</p>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Vote imminent du budget &quot;Mer Propre&quot;</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">L&apos;État injecte 200M€ dans le port de Marseille. Un impact majeur sur l&apos;emploi local dans les 24 prochains mois.</p>
                      </div>

                      <div className="border border-slate-100 rounded-3xl p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                            <MapPin size={16} />
                          </div>
                          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Votre Député • 4e Circ.</p>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Manuel Bompard a voté CONTRE</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Le député de votre secteur s&apos;oppose au projet de loi logement débattu mercredi dernier à l&apos;Assemblée.</p>
                      </div>

                      <div className="border border-slate-100 rounded-3xl p-6 bg-slate-900 text-white md:col-span-2 group/local transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center">
                              <Building2 size={16} />
                            </div>
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Hôtel de Ville • Marseille</p>
                          </div>
                          <div className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold">EXCLUSIF</div>
                        </div>
                        <h4 className="font-bold text-white mb-2">Benoît Payan lance le plan &quot;Écoles de demain&quot;</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">Le Maire de Marseille débloque 45M€ pour la rénovation thermique du groupe scolaire de votre quartier. Chantier prévu automne 2026.</p>
                      </div>
                    </div>
                  </div>

                  {/* 4. L'Échiquier Institutionnel */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-slate-900 rounded-full" />
                      <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter">3. L&apos;Échiquier Institutionnel</h3>
                    </div>
                    
                    <div className="border border-slate-200 rounded-[2rem] overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="p-6 hover:bg-slate-50 transition-colors">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Gouvernement</p>
                          <h5 className="font-bold text-slate-900 text-sm mb-2 text-balance">Conseil des Ministres : Focus Simplification</h5>
                          <p className="text-[11px] text-slate-500 leading-relaxed">Le Gvt a présenté 14 mesures pour réduire la paperasse des PME. Marc, cela pourrait impacter vos process RH.</p>
                        </div>
                        <div className="p-6 hover:bg-slate-50 transition-colors">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sénat</p>
                          <h5 className="font-bold text-slate-900 text-sm mb-2 text-balance">Loi Montagne II : Le Sénat durcit le ton</h5>
                          <p className="text-[11px] text-slate-500 leading-relaxed">Les sénateurs ont ajouté 3 amendements sur la préservation des glaciers. Le texte repart à l&apos;Assemblée.</p>
                        </div>
                        <div className="p-6 hover:bg-slate-50 transition-colors">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assemblée</p>
                          <h5 className="font-bold text-slate-900 text-sm mb-2 text-balance">Commissions : Audition sous tension</h5>
                          <p className="text-[11px] text-slate-500 leading-relaxed">La commission des finances a auditionné le PDG d&apos;EDF sur les tarifs 2027. Rien n&apos;est encore tranché.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. L'Analyse de la semaine - FOCUS DÉTAILLÉ */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                      <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tighter">4. L&apos;Analyse de la semaine : Loi Industrie Verte</h3>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 md:p-10">
                      <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-full tracking-widest">Votée & Validée</div>
                          <h4 className="text-2xl font-bold text-slate-900 leading-tight italic decoration-emerald-200 underline underline-offset-8 decoration-4 mb-6">Simplification du droit pour la souveraineté économique</h4>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">Marc, cette loi phare du Gvt vise à diviser par deux les délais d&apos;implantation d&apos;usines industrielles. Pour un cadre marseillais en lien avec le Port, le projet &quot;Marseille Vert&quot; passe en priorité nationale.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-2">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Avant / Après</p>
                              <div className="text-[11px] space-y-2">
                                <p className="text-red-500 line-through">17 mois d&apos;autorisation</p>
                                <p className="text-emerald-600 font-bold">9 mois garantis (Procédure accélérée)</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Impact Clé</p>
                              <p className="text-[11px] text-slate-600">Le crédit d&apos;impôt vert est étendu aux PME marseillaises de la Supply Chain.</p>
                            </div>
                          </div>
                        </div>
                        <div className="w-full md:w-56 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pertinence Profil</p>
                          <p className="text-3xl font-black text-slate-900 mb-1">A+</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Score d&apos;impact personnel</p>
                          <div className="mt-6 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="w-[85%] h-full bg-emerald-500" />
                          </div>
                        </div>
                      </div>

                      {/* Vote Interactif */}
                      <div className="mt-10 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-400 rounded-lg">
                            <Star size={16} className="fill-current" />
                          </div>
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">ET VOUS ? Auriez-vous voté POUR cette loi ?</p>
                        </div>
                        <div className="flex gap-3">
                          <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors">OUI</button>
                          <button className="px-6 py-2 border-2 border-slate-900 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">NON</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Le Verdict Elite (Conclusion) */}
                  <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles size={20} className="text-amber-500" />
                      <p className="font-black text-slate-900 text-sm uppercase tracking-widest">Le Verdict Elite</p>
                    </div>
                    <p className="text-slate-800 font-medium italic border-l-4 border-amber-400 pl-4 py-1 leading-relaxed">
                      &quot;Une semaine charnière pour les cadres marseillais. Entre baisse de charges nationales et investissements portuaires, le pouvoir d&apos;achat local respire.&quot;
                    </p>
                  </div>
                </div>

                {/* Email footer actions */}
                <div className="bg-slate-50 p-8 border-t border-slate-200 text-center">
                  <div className="flex justify-center gap-6 mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900">Dashboard Elite</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900">Préférences</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900">Archives</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-none">
                    Ceci est une simulation de l&apos;email Premium que vous recevrez chaque lundi.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 5. TÉMOIGNAGES (RETOURS D'EXPÉRIENCE)         */}
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
    </div>
  );
}
