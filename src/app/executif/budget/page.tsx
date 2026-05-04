"use client";

import { useState, useEffect } from "react";
import { motion, animate } from "framer-motion";
import { 
  ArrowLeft, 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Info, 
  Zap, 
  ArrowRight,
  Landmark,
  ShieldCheck,
  Scale,
  Crown,
  Compass,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { usePremium } from "@/lib/hooks/usePremium";
import { BUDGETS } from "../page";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const COMPARISON_DATA = [
  { label: "Remboursements et dégrèvements", val2025: 138.50, val2026: 145.60, trend: "up" },
  { label: "Éducation Nationale", val2025: 82.20, val2026: 89.62, trend: "up" },
  { label: "Pensions (CAS)", val2025: 65.40, val2026: 69.33, trend: "up" },
  { label: "Défense (Armées)", val2025: 47.20, val2026: 66.48, trend: "up" },
  { label: "Charge de la dette", val2025: 51.50, val2026: 60.34, trend: "up" },
  { label: "Intérieur (Sécurités & Admin)", val2025: 31.20, val2026: 33.06, trend: "up" },
  { label: "Enseignement Supérieur & Recherche", val2025: 30.80, val2026: 31.63, trend: "up" },
  { label: "Solidarité et Insertion", val2025: 30.40, val2026: 31.28, trend: "up" },
  { label: "Justice", val2025: 9.60, val2026: 12.97, trend: "up" },
  { label: "Écologie & Mobilité", val2025: 20.10, val2026: 22.76, trend: "up" },
  { label: "Agriculture", val2025: 5.80, val2026: 4.13, trend: "down" },
  { label: "Relations avec les collectivités", val2025: 53.00, val2026: 53.45, trend: "up" },
  { label: "Travail et emploi", val2025: 22.40, val2026: 21.80, trend: "down" },
  { label: "Cohésion des territoires", val2025: 23.50, val2026: 22.90, trend: "down" },
  { label: "Aide publique au développement", val2025: 6.20, val2026: 5.80, trend: "down" },
  { label: "Culture", val2025: 4.20, val2026: 4.35, trend: "up" },
  { label: "Outre-mer", val2025: 2.85, val2026: 2.91, trend: "up" },
  { label: "Santé", val2025: 1.80, val2026: 1.95, trend: "up" },
];

const BUDGET_METRICS = [
  { label: "Dépenses Totales", value: "613.0 Md€", sub: "Autorisations d'Engagement", icon: CircleDollarSign, color: "text-blue-600" },
  { label: "Part du PIB", value: "55.8 %", sub: "Dépenses Publiques Totales", icon: Landmark, color: "text-red-600" },
  { label: "Déficit Prévu", value: "4.7 %", sub: "Objectif PLF 2026", icon: TrendingDown, color: "text-amber-600" },
  { label: "Dette Publique", value: "114 %", sub: "Rapport au PIB", icon: ShieldCheck, color: "text-slate-600" },
];

const RECETTES = [
  { label: "TVA", amount: 188.4, desc: "Taxe sur la Valeur Ajoutée (Consommation)", color: "bg-blue-500" },
  { label: "Impôt sur le revenu", amount: 130.2, desc: "Impôt direct sur les revenus des ménages", color: "bg-red-500" },
  { label: "Impôt sur les sociétés", amount: 84.7, desc: "Impôt sur les bénéfices des entreprises", color: "bg-emerald-500" },
  { label: "TICPE", amount: 30.5, desc: "Taxe sur les produits énergétiques (Carburants)", color: "bg-amber-500" },
  { label: "Autres", amount: 22.2, desc: "Taxes diverses, amendes, dividendes de l'État", color: "bg-slate-300" },
];

const MISSIONS_DETAILED = [
  {
    id: "remboursements",
    title: "Remboursements et dégrèvements",
    amount: "145.60 Md€",
    impact: "Mécanique",
    desc: "Ce poste correspond aux restitutions d'impôts et dégrèvements fiscaux. C'est techniquement le plus gros bloc budgétaire.",
    details: "Sur ces 145,6 Md€, près de 100 Md€ sont consacrés à la gestion mécanique de la TVA (remboursements de crédits aux entreprises). Le reste finance des dispositifs comme le Crédit d'Impôt Recherche (CIR - env. 7 Md€), les dégrèvements de fiscalité locale compensés par l'État, et les remboursements de litiges. C'est un poste 'passif' : l'État rend ce qu'il a perçu en trop ou ce qu'il doit légalement.",
    color: "bg-slate-400"
  },
  {
    id: "education",
    title: "Éducation Nationale",
    amount: "89.62 Md€",
    impact: "Prioritaire",
    desc: "Premier poste de dépense directe. Il couvre les salaires et le fonctionnement du système scolaire.",
    details: "Le budget se répartit entre le 1er degré (env. 28 Md€) et le 2nd degré (env. 42 Md€). Plus de 90% des crédits sont absorbés par les rémunérations des 1,2 million d'agents. En 2026, l'accent est mis sur le 'Pacte enseignant', le financement des AESH (env. 4,5 Md€) pour le handicap, et la rénovation énergétique des bâtiments via le Fonds Vert.",
    color: "bg-blue-600"
  },
  {
    id: "defense",
    title: "Défense (Armées)",
    amount: "66.48 Md€",
    impact: "Régalien",
    desc: "Budget en forte croissance pour répondre aux engagements de la Loi de Programmation Militaire (LPM).",
    details: "En pleine LPM 2024-2030, 2026 finance l'équipement : 15 Md€ pour l'armement (Rafale F4, Frégates, Scorpion). La dissuasion nucléaire mobilise env. 6,5 Md€. Les crédits permettent aussi de reconstituer les stocks de munitions et de financer l'innovation (IA, spatial). Les dépenses de personnel restent stables à env. 14 Md€.",
    color: "bg-red-600"
  },
  {
    id: "dette",
    title: "Charge de la dette",
    amount: "60.34 Md€",
    impact: "Critique",
    desc: "Intérêts payés sur la dette passée. Poste sous haute surveillance en raison de l'évolution des taux d'intérêt.",
    details: "Ce poste est exclusivement dédié au paiement des intérêts des OAT (emprunts d'État). Il ne réduit pas le stock de dette (env. 3200 Md€). La hausse est due à la remontée des taux de la BCE : chaque milliard emprunté coûte désormais env. 3,5% contre 0% auparavant. L'État doit refinancer env. 280 Md€ de dette chaque année à ces nouveaux taux.",
    color: "bg-orange-500"
  }
];

const BUDGET_GUIDE_STEPS = [
  {
    title: "L'Origine",
    subtitle: "D'où vient l'argent ?",
    content: "L'État français ne 'produit' pas d'argent. 95% de ses ressources proviennent de la fiscalité. La TVA est la reine des impôts (env. 40% des recettes), suivie de l'Impôt sur le Revenu et de l'Impôt sur les Sociétés. Le reste provient de revenus patrimoniaux (dividendes) ou d'amendes.",
    icon: Landmark
  },
  {
    title: "La Promesse",
    subtitle: "AE vs CP : Le jargon décrypté",
    content: "Une Autorisation d'Engagement (AE) est une promesse de payer sur plusieurs années (ex: commander un sous-marin). Un Crédit de Paiement (CP) est l'argent réellement décaissé cette année. C'est pourquoi le total des AE est souvent plus élevé que celui des CP.",
    icon: ShieldCheck
  },
  {
    title: "Le Choix",
    subtitle: "Les 32 Missions de l'État",
    content: "L'argent est découpé en 'Missions' (Défense, Justice, Éducation...). Chaque mission est pilotée par un ministre. À l'intérieur, on trouve des 'Programmes' précis. Ce découpage permet au Parlement de voter sur des objectifs politiques plutôt que sur de simples lignes comptables.",
    icon: Compass
  },
  {
    title: "Le Déséquilibre",
    subtitle: "Le Déficit et la Dette",
    content: "Depuis 1974, la France dépense plus qu'elle ne gagne. Ce trou annuel est le 'Déficit'. Pour le combler, l'État emprunte sur les marchés financiers. L'accumulation de ces déficits forme la 'Dette'. Aujourd'hui, la simple charge des intérêts est devenue l'un des premiers budgets du pays.",
    icon: TrendingDown
  },
  {
    title: "Le Verdict",
    subtitle: "Le vote du budget",
    content: "Rien ne se dépense sans l'accord du Parlement. Chaque automne, députés et sénateurs examinent le PLF (Projet de Loi de Finances). C'est le moment de vérité politique où les priorités sont débattues, souvent conclu par l'usage de l'article 49.3.",
    icon: CheckCircle2
  }
];

const GLOBAL_SPENDING_DATA = [
  {
    title: "Sécurité Sociale (ASSO)",
    amount: "680 Md€",
    source: "Cotisations & CSG",
    desc: "C'est le plus gros budget de France, bien devant l'État. Il gère votre santé, vos allocations familiales et l'assurance chômage.",
    details: "Contrairement au budget de l'État voté par le Parlement (PLF), la Sécu a son propre budget (LFSS). Son financement repose sur le travail (cotisations patronales et salariales) et la solidarité (CSG). En 2026, la priorité est le financement de la 'Cinquième branche' dédiée à la dépendance et au grand âge.",
    icon: Scale,
    color: "bg-blue-500"
  },
  {
    title: "Retraites",
    amount: "360 Md€",
    source: "Système par répartition",
    desc: "Inclus en partie dans la Sécu et l'État, c'est le pilier du modèle social français.",
    details: "Le système français repose sur la solidarité entre générations. Les actifs paient pour les retraités. Le budget des retraites représente env. 14% du PIB. L'État intervient directement pour équilibrer les régimes spéciaux (SNCF, RATP) et pour ses propres fonctionnaires via une contribution employeur massive.",
    icon: ShieldCheck,
    color: "bg-rose-500"
  },
  {
    title: "Collectivités (APUL)",
    amount: "295 Md€",
    source: "Taxe Foncière & Dotations",
    desc: "Mairies, Départements et Régions. Elles assurent vos services de proximité et l'investissement local.",
    details: "Les collectivités territoriales réalisent 70% de l'investissement public civil (routes, collèges, piscines). Elles sont soumises à une 'règle d'or' : interdiction d'emprunter pour payer leurs dépenses de fonctionnement. Leurs ressources dépendent de la taxe foncière et des dotations versées par l'État (DGF).",
    icon: Landmark,
    color: "bg-emerald-500"
  }
];

const DEBT_HISTORY = [
  { year: 1980, value: 20.8, event: "Début de l'endettement moderne" },
  { year: 1985, value: 30.7, event: "Relance et investissements" },
  { year: 1990, value: 35.8, event: "Stabilisation pré-Maastricht" },
  { year: 1995, value: 55.3, event: "Crise monétaire et sociale" },
  { year: 2000, value: 58.9, event: "Passage à l'Euro" },
  { year: 2005, value: 67.2, event: "Rapport Pébereau sur la dette" },
  { year: 2008, value: 68.8, event: "Crise des Subprimes", highlight: true },
  { year: 2010, value: 85.3, event: "Plans de sauvetage bancaire" },
  { year: 2015, value: 97.1, event: "Période de taux bas" },
  { year: 2020, value: 114.7, event: "Pandémie COVID-19", highlight: true },
  { year: 2023, value: 110.6, event: "Rebond post-covid" },
  { year: 2024, value: 112.5, event: "Dérapage du déficit", highlight: true },
  { year: 2025, value: 114.7, event: "Prévision PLF" },
  { year: 2026, value: 114.9, event: "Objectif de stabilisation" },
];

const DEBT_NEWS = [
  {
    date: "Mars 2026",
    title: "Chiffre Record",
    content: "La dette publique française atteint officiellement 3 228,4 Md€ au dernier relevé de l'INSEE.",
    type: "stats",
    impact: "high"
  },
  {
    date: "Octobre 2025",
    title: "Moody's : Alerte",
    content: "L'agence Moody's maintient la note Aa2 mais confirme une perspective 'négative' pour la France.",
    type: "rating",
    impact: "medium"
  },
  {
    date: "Mai 2024",
    title: "Dégradation S&P",
    content: "Standard & Poor's dégrade la note souveraine de la France de AA à AA-. Une première depuis 2013.",
    type: "rating",
    impact: "high"
  },
  {
    date: "Janvier 2026",
    title: "Charge de la Dette",
    content: "Les intérêts de la dette deviennent le premier poste budgétaire de l'État devant l'Éducation Nationale.",
    type: "stats",
    impact: "high"
  }
];

const LEGISLATIVE_STEPS = [
  { 
    label: "Présentation", 
    date: "Fin Septembre", 
    desc: "Le Gouvernement présente le PLF en Conseil des Ministres et le dépose à l'Assemblée.",
    status: "Terminé"
  },
  { 
    label: "Assemblée Nationale", 
    date: "Octobre", 
    desc: "Examen en commission puis en séance publique. Vote de la partie 'Recettes' puis 'Dépenses'.",
    status: "En cours"
  },
  { 
    label: "Sénat", 
    date: "Novembre", 
    desc: "Le Sénat dispose de 20 jours pour examiner le texte. Souvent, des modifications majeures sont apportées.",
    status: "À venir"
  },
  { 
    label: "Version Finale", 
    date: "Décembre", 
    desc: "Commission Mixte Paritaire (CMP) pour accorder les deux chambres. Vote définitif avant Noël.",
    status: "À venir"
  },
];

export default function DetailedBudgetPage() {
  const { isPremium, loading } = usePremium();
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // Counter component for animated numbers
  const Counter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
    const [count, setCount] = useState(0);
    const nodeRef = useState<HTMLSpanElement | null>(null)[0];

    useEffect(() => {
      const controls = animate(0, value, {
        duration,
        onUpdate: (latest) => setCount(Math.round(latest)),
        ease: "easeOut"
      });
      return () => controls.stop();
    }, [value, duration]);

    return <span>{count}</span>;
  };

  if (loading) return null;

  if (!isPremium) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-xl w-full text-center space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              backgroundPosition: ["0% 50%", "200% 50%"],
            }}
            transition={{
              backgroundPosition: {
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: { duration: 0.5 },
              y: { duration: 0.5 }
            }}
            className="text-4xl md:text-7xl font-staatliches uppercase tracking-wider bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-[length:200%_auto] bg-clip-text text-transparent"
          >
            Analyse Budgétaire Elite
          </motion.h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Accédez à l'analyse la plus précise du budget de l'État. 
            Découvrez où va chaque euro de vos impôts avec nos graphiques interactifs et nos décryptages d'experts.
          </p>
          <Link 
            href="/premium"
            className="inline-block px-12 py-5 bg-gradient-to-r from-amber-200 to-amber-500 text-slate-950 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-amber-900/40"
          >
            Débloquer l'accès Premium
          </Link>
          <div className="pt-8">
            <Link href="/executif" className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ArrowLeft size={14} /> Retour à la page Exécutif
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="container mx-auto max-w-6xl">
          <Link href="/executif" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-8">
            <ArrowLeft size={14} /> Retour à l'Exécutif
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">

              <h1 className="text-5xl md:text-8xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
                Budget <span className="text-blue-600">2026</span>
              </h1>
              <p className="text-xl text-slate-500 font-medium italic">
                Décryptage intégral de la dépense publique et des ressources de l'État.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-950 text-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-900/20">
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Déficit Public</p>
                  <p className="text-3xl font-black text-amber-400">4.7% <span className="text-sm text-white/50">PIB</span></p>
               </div>
               <div className="w-px h-12 bg-white/10 mx-2" />
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dépense Totale (AE)</p>
                  <p className="text-3xl font-black text-white">613.0 <span className="text-sm text-white/50">Md€</span></p>
               </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 mt-16 space-y-16">
        
        {/* KEY METRICS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {BUDGET_METRICS.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 ${metric.color}`}>
                <metric.icon size={24} />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{metric.label}</h3>
              <p className="text-4xl font-black text-slate-900 leading-none mb-2">{metric.value}</p>
              <p className="text-xs text-slate-500 font-medium italic">{metric.sub}</p>
            </motion.div>
          ))}
        </section>

        {/* REVENUE ANALYSIS (WHERE MONEY COMES FROM) */}
        <section className="bg-white rounded-[3rem] border border-slate-200 p-8 md:p-16 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48" />
           
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-7 space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <PieChart size={24} />
                    </div>
                    <h2 className="text-4xl font-staatliches uppercase tracking-wider text-slate-900">
                        Origine des <span className="text-blue-600">Recettes</span>
                    </h2>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed font-medium italic max-w-2xl">
                    Pour dépenser, l'État doit d'abord collecter. La TVA reste la source d'oxygène principale de la France, suivie par l'impôt sur le revenu.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                   {RECETTES.map((item, i) => (
                     <motion.div 
                       key={i} 
                       initial={{ opacity: 0, x: -20 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       transition={{ delay: i * 0.1 }}
                       className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors"
                     >
                        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${item.color.replace('bg-', 'bg-')}`} />
                        <div className="space-y-1">
                           <div className="flex justify-between items-baseline gap-4">
                              <span className="text-sm font-bold text-slate-900">{item.label}</span>
                              <span className="text-sm font-black text-slate-900 whitespace-nowrap">{item.amount} Md€</span>
                           </div>
                           <p className="text-[10px] text-slate-400 font-medium italic leading-tight">{item.desc}</p>
                        </div>
                     </motion.div>
                   ))}
                </div>
              </div>

              <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
                 {/* DONUT CHART SVG */}
                 <div className="relative w-72 h-72 md:w-80 md:h-80">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                       {/* Calculate segments manually for a clean donut */}
                       {(() => {
                          let currentOffset = 0;
                          const total = 456.0;
                         return RECETTES.map((item, i) => {
                           const percentage = (item.amount / total) * 100;
                           const strokeDasharray = `${percentage} ${100 - percentage}`;
                           const strokeDashoffset = -currentOffset;
                           currentOffset += percentage;
                           
                           const colorMap: {[key: string]: string} = {
                             'bg-blue-500': '#3b82f6',
                             'bg-red-500': '#ef4444',
                             'bg-emerald-500': '#10b981',
                             'bg-amber-500': '#f59e0b',
                             'bg-slate-300': '#cbd5e1'
                           };

                           return (
                             <motion.circle
                               key={i}
                               cx="50"
                               cy="50"
                               r="40"
                               fill="transparent"
                               stroke={colorMap[item.color] || '#334155'}
                               strokeWidth="12"
                               strokeDasharray={strokeDasharray}
                               strokeDashoffset={100} // Start hidden
                               animate={{ strokeDashoffset }}
                               transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "circOut" }}
                               strokeLinecap="round"
                               pathLength="100"
                             />
                           );
                         });
                       })()}
                    </svg>
                    
                    {/* CENTER LABEL */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fiscal</p>
                        <div className="flex items-baseline gap-1">
                           <span className="text-5xl font-black text-slate-900">456.0</span>
                           <span className="text-xl font-bold text-slate-400">Md€</span>
                        </div>
                    </div>
                 </div>
                 
                 {/* DECORATIVE ELEMENTS */}
                 <div className="mt-8 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500" />
                       <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Budget Général</span>
                    </div>
                    <div className="w-px h-3 bg-slate-200" />
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-slate-300" />
                       <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Fonds Spéciaux</span>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* DETAILED MISSIONS FOCUS */}
        <section className="space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-4">
               <h2 className="text-4xl font-staatliches uppercase tracking-wider text-slate-900">
                  Zoom sur les <span className="text-red-600">Points de Vigilance</span>
               </h2>
               <p className="text-slate-500 font-medium italic">
                 Analyse approfondie des piliers du Budget 2026. Cliquez sur "En savoir plus" pour les détails exclusifs.
               </p>
            </div>

            {/* BUDGET CONTEXT EXPLANATION - REDESIGNED */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="bg-[#1a0105] text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden border border-white/5"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full -mr-64 -mt-64 blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-900/5 rounded-full -ml-48 -mb-48 blur-[100px]" />
              
              <div className="relative z-10 space-y-8">
                <h3 className="text-5xl md:text-6xl font-staatliches leading-none tracking-tight">
                  COMPRENDRE <span className="text-red-500 italic opacity-80">L'AUGMENTATION</span>
                </h3>
                
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="shrink-0 pt-1">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <Info size={24} className="text-red-400" />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <p className="text-xl text-slate-300 leading-relaxed font-light italic">
                      Pourquoi le budget augmente-t-il malgré les appels à la rigueur ? 
                    </p>
                    <p className="text-slate-400 leading-relaxed font-medium text-lg">
                      Cette apparente contradiction s'explique par trois facteurs majeurs : l'inflation qui renchérit mécaniquement le coût des services publics, la hausse inévitable de la charge de la dette liée aux taux d'intérêt, et des engagements de long terme (comme la Loi de Programmation Militaire) qui sanctuarisent certaines dépenses régaliennes. Ainsi, même si l'État cherche à réduire son train de vie dans certains domaines, les postes "mécaniques" et de sécurité poussent mathématiquement le total vers le haut.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {MISSIONS_DETAILED.map((mission, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden group"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${mission.color}`} />
                  
                  <div className="flex justify-between items-start mb-8">
                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                       mission.impact === 'Critique' ? 'bg-red-100 text-red-600' : 
                       mission.impact === 'Prioritaire' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                     }`}>
                        Impact : {mission.impact}
                     </div>
                     <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{mission.amount}</p>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
                    {mission.title}
                  </h3>
                  
                  <p className="text-slate-500 leading-relaxed text-sm font-medium italic">
                    {mission.desc}
                  </p>

                  <motion.div
                    initial={false}
                    animate={{ 
                      height: selectedMission === mission.id ? "auto" : 0,
                      opacity: selectedMission === mission.id ? 1 : 0,
                      marginTop: selectedMission === mission.id ? 24 : 0
                    }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Crown size={12} className="text-amber-500" /> Analyse Premium
                       </p>
                       <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          {mission.details}
                       </p>
                    </div>
                  </motion.div>

                  <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                     <button 
                       onClick={() => setSelectedMission(selectedMission === mission.id ? null : mission.id)}
                       className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                     >
                        {selectedMission === mission.id ? "Réduire" : "En savoir plus"}
                     </button>
                     <button 
                       onClick={() => setSelectedMission(selectedMission === mission.id ? null : mission.id)}
                       className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                         selectedMission === mission.id ? 'bg-blue-600 text-white rotate-90' : 'bg-slate-50 group-hover:bg-slate-900 group-hover:text-white'
                       }`}
                     >
                        <ArrowRight size={18} />
                     </button>
                  </div>
                </motion.div>
              ))}
           </div>
        </section>

         {/* STEP-BY-STEP BUDGETARY GUIDE */}
         <section className="py-24 space-y-20 border-t border-slate-100">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-5xl font-staatliches uppercase tracking-wider text-slate-900">
                 GUIDE <span className="text-blue-600 italic">PAS À PAS</span> DU BUDGET
              </h2>
              <p className="text-slate-500 font-medium text-lg">
                Comprendre la mécanique complexe des finances publiques en 5 étapes clés.
              </p>
            </div>

            <div className="relative">
               <div className="flex gap-6 overflow-x-auto pb-12 snap-x snap-mandatory hide-scrollbar px-4 -mx-4">
                  {BUDGET_GUIDE_STEPS.map((step, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="min-w-[300px] md:min-w-[400px] snap-center bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/20 group relative overflow-hidden flex flex-col justify-between"
                    >
                       <div className="absolute top-0 right-0 p-6 text-6xl font-black text-slate-50 opacity-[0.05] select-none italic">
                          {i + 1}
                       </div>

                       <div className="space-y-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                            i % 2 === 0 ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
                          }`}>
                             <step.icon size={28} />
                          </div>

                          <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 bg-blue-600 rounded-full" />
                                <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">{step.title}</h4>
                             </div>
                             <h3 className="text-xl font-bold text-slate-900 leading-tight">{step.subtitle}</h3>
                          </div>

                          <p className="text-slate-600 leading-relaxed text-sm font-medium italic opacity-80">
                             {step.content}
                          </p>
                       </div>
                    </motion.div>
                  ))}
               </div>
               
               {/* SCROLL INDICATOR */}
               <div className="flex justify-center gap-2 mt-4">
                  {BUDGET_GUIDE_STEPS.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-slate-200" />
                  ))}
               </div>
            </div>
         </section>

         {/* BEYOND THE STATE (HORS-BUDGET) */}
         <section className="py-24 space-y-16 bg-slate-900 rounded-[4rem] text-white overflow-hidden relative border border-white/5">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[150px] -mr-96 -mt-96" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-600/5 rounded-full blur-[120px] -ml-64 -mb-64" />
            
            <div className="relative z-10 px-8 md:px-16 space-y-16">
               <div className="text-center max-w-3xl mx-auto space-y-6">
                 <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-wider">
                   AU-DELÀ DE <span className="text-blue-500">L'ÉTAT</span>
                 </h2>
                 <p className="text-slate-400 text-lg font-medium italic">
                   Les 613 Md€ de l'État ne représentent qu'une fraction de la dépense publique. Découvrez le "Hors-Budget" : Sécurité Sociale, Retraites et Collectivités.
                 </p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {GLOBAL_SPENDING_DATA.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-8 hover:bg-white/[0.08] transition-all group"
                    >
                       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                          <item.icon size={32} />
                       </div>
                       
                       <div className="space-y-2">
                          <h3 className="text-3xl font-staatliches tracking-wide">{item.title}</h3>
                          <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-black text-white">{item.amount}</span>
                             <span className="text-sm font-bold text-slate-500">par an</span>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                             Source : {item.source}
                          </div>
                          <p className="text-slate-300 leading-relaxed font-medium italic">
                             {item.desc}
                          </p>
                       </div>

                       <div className="pt-6 border-t border-white/5">
                          <div className="text-xs text-slate-400 leading-relaxed font-medium">
                             <span className="text-blue-400 font-bold block mb-2 uppercase tracking-widest">Détail Premium :</span>
                             {item.details}
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </div>

               {/* GLOBAL TOTAL CALLOUT */}
               <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600/20 to-rose-600/20 p-1 rounded-[3rem]">
                  <div className="bg-slate-950 rounded-[2.8rem] p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
                     <div className="space-y-4">
                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em]">Total Dépense Publique</h4>
                        <p className="text-6xl md:text-8xl font-staatliches leading-none flex items-baseline gap-2 justify-center md:justify-start">
                           <span className="opacity-40">~</span>
                           <Counter value={1600} />
                           <span className="text-2xl md:text-4xl opacity-40">Md€</span>
                        </p>
                     </div>
                     <div className="max-w-xs space-y-4">
                        <div className="w-12 h-1 bg-blue-500" />
                        <p className="text-slate-400 text-sm font-medium italic leading-relaxed">
                           Soit environ 56% du PIB. La France possède l'un des taux de redistribution les plus élevés au monde, couvrant l'intégralité du cycle de vie des citoyens.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* DEBT ANALYTICS */}
         <section className="py-24 space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-5xl font-staatliches uppercase tracking-wider text-slate-900">
                 ANALYSE DE LA <span className="text-amber-600">DETTE</span>
              </h2>
              <p className="text-slate-500 font-medium text-lg">
                Comprendre qui détient nos 3 200 Md€ de dette et comment elle a évolué.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               {/* HISTORICAL CHART */}
               <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-center mb-12">
                     <div>
                        <h3 className="text-xl font-bold text-slate-900">Évolution de la Dette</h3>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">En % du PIB (1980 - 2026)</p>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                        <TrendingUp size={16} className="text-amber-600" />
                        <span className="text-sm font-black text-amber-700">Objectif 2026 : 114%</span>
                     </div>
                  </div>

                  <div className="h-64 w-full relative group cursor-crosshair">
                     {/* TOOLTIP */}
                     {hoveredYear !== null && (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="absolute top-0 right-0 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-20 border border-white/10 pointer-events-none"
                       >
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
                             {DEBT_HISTORY.find(d => d.year === hoveredYear)?.year}
                          </p>
                          <p className="text-2xl font-black">{DEBT_HISTORY.find(d => d.year === hoveredYear)?.value}% <span className="text-xs text-white/50">PIB</span></p>
                          <p className="text-[10px] text-slate-400 italic mt-2 max-w-[150px]">
                             {DEBT_HISTORY.find(d => d.year === hoveredYear)?.event}
                          </p>
                       </motion.div>
                     )}

                     <svg viewBox="0 0 500 100" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map((v) => (
                           <line key={v} x1="0" y1={100-v} x2="500" y2={100-v} stroke="#f1f5f9" strokeWidth="0.5" />
                        ))}
                        
                        {/* Area Gradient */}
                        <defs>
                           <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                           </linearGradient>
                        </defs>

                        {/* The Path */}
                        <motion.path
                           d={`M 0 100 ${DEBT_HISTORY.map((d, i) => `L ${(i / (DEBT_HISTORY.length - 1)) * 500} ${100 - d.value}`).join(' ')} L 500 100 Z`}
                           fill="url(#debtGradient)"
                           initial={{ opacity: 0 }}
                           whileInView={{ opacity: 1 }}
                           transition={{ duration: 1 }}
                        />
                        <motion.path
                           d={`M 0 ${100 - DEBT_HISTORY[0].value} ${DEBT_HISTORY.map((d, i) => `L ${(i / (DEBT_HISTORY.length - 1)) * 500} ${100 - d.value}`).join(' ')}`}
                           fill="none"
                           stroke="#f59e0b"
                           strokeWidth="2"
                           initial={{ pathLength: 0 }}
                           whileInView={{ pathLength: 1 }}
                           transition={{ duration: 2, ease: "easeInOut" }}
                        />

                        {/* Event Markers */}
                        {DEBT_HISTORY.filter(d => d.highlight).map((d, i) => {
                           const x = (DEBT_HISTORY.indexOf(d) / (DEBT_HISTORY.length - 1)) * 500;
                           return (
                             <g key={`highlight-${i}`}>
                                <line x1={x} y1="0" x2={x} y2="100" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
                                <motion.circle
                                   cx={x}
                                   cy={100 - d.value}
                                   r="3"
                                   fill="#f59e0b"
                                   initial={{ scale: 0 }}
                                   whileInView={{ scale: 1 }}
                                   transition={{ delay: 2 }}
                                />
                             </g>
                           )
                        })}

                        {/* Interactive Hit Areas */}
                        {DEBT_HISTORY.map((d, i) => (
                           <rect
                              key={`hit-${i}`}
                              x={(i / (DEBT_HISTORY.length - 1)) * 500 - 10}
                              y="0"
                              width="20"
                              height="100"
                              fill="transparent"
                              onMouseEnter={() => setHoveredYear(d.year)}
                              onMouseLeave={() => setHoveredYear(null)}
                              className="cursor-pointer"
                           />
                        ))}

                        {/* Data Points */}
                        {DEBT_HISTORY.map((d, i) => (
                           <motion.circle
                              key={i}
                              cx={(i / (DEBT_HISTORY.length - 1)) * 500}
                              cy={100 - d.value}
                              r={hoveredYear === d.year ? "3" : "1.5"}
                              fill={hoveredYear === d.year ? "#f59e0b" : "white"}
                              stroke="#f59e0b"
                              strokeWidth="0.5"
                              animate={{ scale: hoveredYear === d.year ? 1.5 : 1 }}
                           />
                        ))}
                     </svg>
                     
                     {/* Labels */}
                     <div className="flex justify-between mt-4">
                        {DEBT_HISTORY.map((d, i) => (
                           <span key={i} className="text-[10px] font-bold text-slate-400">{d.year}</span>
                        ))}
                     </div>
                  </div>
               </div>

               {/* DEBT STATS & NEWS */}
               <div className="lg:col-span-4 space-y-6">
                  {/* NEWS FEED */}
                  <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 space-y-6">
                     <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Dernières Actualités</h4>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 rounded-full">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                           <span className="text-[8px] font-black text-blue-700 uppercase">Live INSEE</span>
                        </div>
                     </div>
                     
                     <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {DEBT_NEWS.map((news, i) => (
                           <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2 group hover:border-blue-200 transition-colors">
                              <div className="flex justify-between items-start">
                                 <span className="text-[10px] font-bold text-slate-400">{news.date}</span>
                                 <div className={`w-2 h-2 rounded-full ${news.impact === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{news.title}</h5>
                              <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic">
                                 {news.content}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Scale size={80} />
                     </div>
                     <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-6">Profil des Détenteurs</h4>
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <div className="flex justify-between text-sm font-bold">
                              <span>Résidents (Français)</span>
                              <span>~55%</span>
                           </div>
                           <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} whileInView={{ width: "55%" }} className="h-full bg-amber-500" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-sm font-bold">
                              <span>Non-Résidents</span>
                              <span>~45%</span>
                           </div>
                           <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} whileInView={{ width: "45%" }} className="h-full bg-white/30" />
                           </div>
                        </div>
                     </div>
                     <p className="mt-8 text-[10px] text-slate-400 font-medium italic">
                        La France dépend de la confiance des investisseurs internationaux pour refinancer ses échéances.
                     </p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Indicateurs Clés</h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-medium text-slate-600">Maturité moyenne</span>
                           <span className="text-sm font-black text-slate-900">8 ans & 2 mois</span>
                        </div>
                        <div className="w-full h-px bg-slate-100" />
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-medium text-slate-600">Taux moyen (Stock)</span>
                           <span className="text-sm font-black text-slate-900">1.8%</span>
                        </div>
                        <div className="w-full h-px bg-slate-100" />
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-medium text-slate-600">Taux actuel (Refi)</span>
                           <span className="text-sm font-black text-rose-600">~3.4%</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* LEGISLATIVE CYCLE TIMELINE */}
         <section className="py-24 space-y-16 border-t border-slate-100">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-5xl font-staatliches uppercase tracking-wider text-slate-900">
                 CALENDRIER <span className="text-blue-600">LÉGISLATIF</span>
              </h2>
              <p className="text-slate-500 font-medium text-lg">
                 Le marathon budgétaire du PLF 2026 : de la conception au vote final.
              </p>
            </div>

            <div className="max-w-5xl mx-auto relative px-4">
               {/* Vertical Line */}
               <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 hidden md:block" />
               
               <div className="space-y-12 relative">
                  {LEGISLATIVE_STEPS.map((step, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    >
                       <div className="flex-1 text-center md:text-right w-full">
                          {i % 2 === 0 && (
                            <div className="space-y-2">
                               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{step.date}</span>
                               <h3 className="text-xl font-bold text-slate-900">{step.label}</h3>
                               <p className="text-sm text-slate-500 font-medium italic">{step.desc}</p>
                            </div>
                          )}
                       </div>

                       <div className="relative z-10 w-12 h-12 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center shadow-lg">
                          <div className={`w-3 h-3 rounded-full ${
                            step.status === 'Terminé' ? 'bg-emerald-500' : 
                            step.status === 'En cours' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'
                          }`} />
                       </div>

                       <div className="flex-1 text-center md:text-left w-full">
                          {i % 2 !== 0 && (
                             <div className="space-y-2">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{step.date}</span>
                                <h3 className="text-xl font-bold text-slate-900">{step.label}</h3>
                                <p className="text-sm text-slate-500 font-medium italic">{step.desc}</p>
                             </div>
                          )}
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>

            <div className="max-w-3xl mx-auto bg-blue-50 border border-blue-100 p-8 rounded-[2.5rem] flex items-start gap-6">
               <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Zap size={24} />
               </div>
               <div className="space-y-2">
                  <h4 className="font-bold text-blue-900">Le rôle critique du 49.3</h4>
                  <p className="text-sm text-blue-800/80 leading-relaxed font-medium italic">
                    Pour le PLF 2026, l'absence de majorité absolue rend probable l'usage de l'article 49.3 de la Constitution. Il permet l'adoption du texte sans vote, sauf si une motion de censure est votée par la majorité des députés.
                  </p>
               </div>
            </div>
         </section>

         {/* SUMMARY CTA */}
        <section className="bg-slate-950 rounded-[3.5rem] p-8 md:p-20 relative overflow-hidden shadow-2xl border border-white/5">
           <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -mr-96 -mt-96" />
           
           <div className="relative z-10 space-y-12">
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <h2 className="text-4xl md:text-6xl font-staatliches text-white uppercase tracking-tighter">
                  Évolution <span className="text-blue-500">2025 → 2026</span>
                </h2>
                <p className="text-slate-400 font-medium italic">
                  Comparez les priorités budgétaires d'une année sur l'autre pour identifier les grandes orientations politiques.
                </p>
              </div>

              <div className="bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="border-b border-white/10">
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mission de l'État</th>
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Budget 2025</th>
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Budget 2026</th>
                             <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Évolution</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {COMPARISON_DATA.map((row, i) => {
                            const diff = ((row.val2026 - row.val2025) / row.val2025) * 100;
                            return (
                              <motion.tr 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="hover:bg-white/[0.02] transition-colors"
                              >
                                 <td className="px-8 py-5">
                                    <span className="text-sm font-bold text-white">{row.label}</span>
                                 </td>
                                 <td className="px-8 py-5 text-slate-400 font-mono text-sm">{row.val2025} Md€</td>
                                 <td className="px-8 py-5 text-white font-mono font-bold text-sm">{row.val2026} Md€</td>
                                 <td className="px-8 py-5 text-right">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                      row.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                       {row.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                       {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                    </div>
                                 </td>
                              </motion.tr>
                            );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-white/10">
                 <div className="text-left">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Source Officielle</p>
                    <p className="text-xs text-slate-400 italic">Direction du Budget - Ministère de l'Économie et des Finances</p>
                 </div>
                 <button className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                    Télécharger le rapport comparatif (PDF)
                 </button>
              </div>
           </div>
        </section>

      </div>
    </main>
  );
}
