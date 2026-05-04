"use client";

import { useState, useEffect } from "react";
import { motion, animate, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Info, 
  Zap, 
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  ShieldCheck,
  Scale,
  Crown,
  Compass,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Coins,
  Activity,
  Shield
} from "lucide-react";
import Link from "next/link";
import { usePremium } from "@/lib/hooks/usePremium";
import { BUDGETS } from "../page";
import { Minus } from "lucide-react";

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
    id: "remboursements-et-degrevements",
    title: "Remboursements et dégrèvements",
    amount: "145.60 Md€",
    impact: "Mécanique",
    desc: "Ce poste correspond aux restitutions d'impôts et dégrèvements fiscaux. C'est techniquement le plus gros bloc budgétaire.",
    details: "Sur ces 145,6 Md€, près de 100 Md€ sont consacrés à la gestion mécanique de la TVA (remboursements de crédits aux entreprises). Le reste finance des dispositifs comme le Crédit d'Impôt Recherche (CIR - env. 7 Md€), les dégrèvements de fiscalité locale compensés par l'État, et les remboursements de litiges.",
    color: "bg-slate-400",
    breakdown: [
      { label: "Remboursements TVA", value: 102.4 },
      { label: "Crédit Impôt Recherche", value: 7.2 },
      { label: "Dégrèvements Locaux", value: 18.5 },
      { label: "Autres remboursements", value: 17.5 }
    ],
    evolution: [
      { year: "2022", value: 128.4 },
      { year: "2023", value: 132.1 },
      { year: "2024", value: 135.8 },
      { year: "2025", value: 138.5 },
      { year: "2026", value: 145.6 }
    ],
    measures: [
      { title: "Gestion dynamique des crédits de TVA", desc: "Optimisation des flux de trésorerie pour accélérer les remboursements aux entreprises exportatrices." },
      { title: "Sanctuarisation du CIR pour l'innovation", desc: "Maintien du Crédit d'Impôt Recherche à 7,2 Md€ pour préserver la compétitivité technologique française." }
    ],
    split: { functioning: 98, investment: 2 }
  },
  {
    id: "education-nationale",
    title: "Éducation Nationale",
    amount: "89.62 Md€",
    impact: "Prioritaire",
    desc: "Premier poste de dépense directe. Il couvre les salaires et le fonctionnement du système scolaire.",
    details: "Le budget se répartit entre le 1er degré et le 2nd degré. Plus de 90% des crédits sont absorbés par les rémunérations des 1,2 million d'agents. En 2026, l'accent est mis sur le recrutement et l'inclusion.",
    color: "bg-blue-600",
    breakdown: [
      { label: "Enseignement 1er degré", value: 27.91 },
      { label: "Enseignement 2nd degré", value: 40.01 },
      { label: "Enseignement Privé", value: 8.87 },
      { label: "Vie de l'élève", value: 8.08 },
      { label: "Soutien & Pilotage", value: 3.05 }
    ],
    evolution: [
      { year: "2022", value: 76.8 },
      { year: "2023", value: 84.8 },
      { year: "2024", value: 88.5 },
      { year: "2025", value: 88.6 },
      { year: "2026", value: 89.6 }
    ],
    measures: [
      { title: "Création de 1 600 nouveaux emplois (ETP)", desc: "Focus sur l'accompagnement des élèves en situation de handicap (AESH) et le renforcement des équipes de remplacement." },
      { title: "Modernisation des établissements", desc: "Plan d'investissement pour la rénovation thermique des écoles et l'équipement numérique des classes." }
    ],
    split: { functioning: 95, investment: 5 }
  },
  {
    id: "defense-armees",
    title: "Défense (Armées)",
    amount: "66.48 Md€",
    impact: "Régalien",
    desc: "Budget en forte croissance pour répondre aux engagements de la Loi de Programmation Militaire (LPM).",
    details: "En pleine LPM 2024-2030, 2026 finance l'équipement et la modernisation des forces dans un contexte de haute intensité.",
    color: "bg-red-600",
    breakdown: [
      { label: "Équipement des forces", value: 33.20 },
      { label: "Préparation & Emploi", value: 11.50 },
      { label: "Soutien & RH", value: 7.90 },
      { label: "Dissuasion nucléaire", value: 6.50 },
      { label: "Innovation & Spatial", value: 7.38 }
    ],
    evolution: [
      { year: "2022", value: 40.9 },
      { year: "2023", value: 43.9 },
      { year: "2024", value: 47.2 },
      { year: "2025", value: 50.5 },
      { year: "2026", value: 66.48 }
    ],
    measures: [
      { title: "Accélération du programme Scorpion", desc: "Livraison de 250 blindés Griffon et 40 Jaguar. Intégration du combat collaboratif info-centré." },
      { title: "Livraison de nouveaux Rafale F4", desc: "Réception de 12 chasseurs au standard F4.2 avec connectivité améliorée et nouveaux senseurs." }
    ],
    split: { functioning: 40, investment: 60 }
  },
  {
    id: "justice",
    title: "Justice",
    amount: "12.97 Md€",
    impact: "Prioritaire",
    desc: "Budget en hausse pour renforcer la chaîne pénale et améliorer les conditions de détention.",
    details: "Focus sur le recrutement de magistrats et de greffiers, ainsi que sur la modernisation du parc pénitentiaire.",
    color: "bg-emerald-600",
    breakdown: [
      { label: "Justice judiciaire", value: 4.76 },
      { label: "Administration pénitentiaire", value: 5.55 },
      { label: "Protection Jeunesse (PJJ)", value: 1.16 },
      { label: "Aide juridictionnelle", value: 0.81 },
      { label: "Pilotage & Support", value: 0.69 }
    ],
    evolution: [
      { year: "2022", value: 10.7 },
      { year: "2023", value: 11.5 },
      { year: "2024", value: 12.2 },
      { year: "2025", value: 12.7 },
      { year: "2026", value: 12.97 }
    ],
    measures: [
      { title: "Création de 1 600 nouveaux emplois (ETP)", desc: "Recrutement massif de magistrats, greffiers et conseillers d'insertion pour réduire les délais de traitement judiciaire." },
      { title: "Restauration du droit de timbre pour l'aide juridique", desc: "Contribution forfaitaire pour financer l'accès au droit et compenser la hausse des coûts de l'aide juridictionnelle." }
    ],
    split: { functioning: 75, investment: 25 }
  },
  {
    id: "interieur-securites-&-admin",
    title: "Intérieur (Sécurités)",
    amount: "33.06 Md€",
    impact: "Régalien",
    desc: "Financement des forces de sécurité intérieure et de l'administration territoriale.",
    details: "Mise en œuvre de la LOPMI pour moderniser les équipements et renforcer la présence sur le terrain.",
    color: "bg-blue-800",
    breakdown: [
      { label: "Police nationale", value: 13.90 },
      { label: "Gendarmerie nationale", value: 11.10 },
      { label: "Sécurité civile", value: 1.05 },
      { label: "Administration", value: 6.01 }
    ],
    evolution: [
      { year: "2022", value: 20.8 },
      { year: "2023", value: 21.9 },
      { year: "2024", value: 23.2 },
      { year: "2025", value: 24.4 },
      { year: "2026", value: 25.0 }
    ],
    measures: [
      { title: "Transformation numérique des forces", desc: "Déploiement de tablettes NEO, caméras-piétons et modernisation des systèmes de communication cryptés (RRF)." },
      { title: "Renouvellement des flottes de véhicules", desc: "Achat de 3 500 véhicules propres (électriques/hybrides) et modernisation du parc lourd." }
    ],
    split: { functioning: 85, investment: 15 }
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
  { year: 2024, value: 112.6, event: "Dérapage du déficit (Official INSEE)", highlight: true },
  { year: 2025, value: 115.6, event: "Dette Record fin 2025 (3 460 Md€)", highlight: true },
  { year: 2026, value: 115.8, event: "Prévision de stabilisation PLF" },
];

const DEBT_NEWS = [
  {
    date: "27 Mars 2026",
    title: "Alerte INSEE : 3 460 Md€",
    content: "La dette publique française a bondi à 115,6% du PIB fin 2025, atteignant un montant record de 3 460,5 milliards d'euros.",
    type: "stats",
    impact: "high"
  },
  {
    date: "Avril 2026",
    title: "Dérapage 2025",
    content: "L'INSEE confirme un déficit public de 5,9% pour l'année 2025, contre 5,5% initialement espérés.",
    type: "stats",
    impact: "high"
  },
  {
    date: "Octobre 2025",
    title: "Moody's : Perspective Négative",
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
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [dynamicMissions, setDynamicMissions] = useState(MISSIONS_DETAILED);
  const [dynamicComparison, setDynamicComparison] = useState(COMPARISON_DATA);

  // Dynamic Data Sync
  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        const response = await fetch('/api/budget/data');
        const result = await response.json();
        
        if (result.success && result.data) {
          const apiData = result.data as any[];
          
          // Merge with MISSIONS_DETAILED
          const mergedMissions = MISSIONS_DETAILED.map(m => {
             const apiMission = apiData.find(am => 
                am.mission.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') === m.id
             );
             if (apiMission) {
                return {
                   ...m,
                   amount: `${apiMission.val2026} Md€`,
                   evolution: [
                      { year: "2024", value: apiMission.val2024 || (parseFloat(m.amount) * 0.95) },
                      { year: "2025", value: apiMission.val2025 },
                      { year: "2026", value: apiMission.val2026 }
                   ],
                   measures: apiMission.programs ? apiMission.programs.map((p: any) => ({
                      title: p.name,
                      impact: "Prioritaire",
                      desc: `Dotation PLF 2026 : ${p.amount}`
                   })) : m.measures
                };
             }
             return m;
          });
          
          // Merge with COMPARISON_DATA
          const mergedComparison = COMPARISON_DATA.map(c => {
             const slug = c.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
             const apiMission = apiData.find(am => 
                am.mission.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') === slug
             );
             if (apiMission) {
                return {
                   ...c,
                   val2025: apiMission.val2025,
                   val2026: apiMission.val2026,
                   trend: apiMission.trend
                };
             }
             return c;
          });

          setDynamicMissions(mergedMissions);
          setDynamicComparison(mergedComparison);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic budget data, using static fallback", err);
      }
    };

    fetchBudgetData();
  }, []);

  const selectedMissionData = dynamicMissions.find(m => m.id === selectedMissionId);

  const navigateMission = (direction: 'next' | 'prev') => {
    const currentIndex = dynamicMissions.findIndex(m => m.id === selectedMissionId);
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % dynamicMissions.length;
    } else {
      nextIndex = (currentIndex - 1 + dynamicMissions.length) % dynamicMissions.length;
    }
    
    setSelectedMissionId(dynamicMissions[nextIndex].id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMissionId) {
        if (e.key === 'ArrowRight') navigateMission('next');
        if (e.key === 'ArrowLeft') navigateMission('prev');
        if (e.key === 'Escape') setSelectedMissionId(null);
      }
    };

    if (selectedMissionId) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMissionId, dynamicMissions]);

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
                    <div className="text-slate-400 leading-relaxed font-medium text-lg space-y-4">
                      <p>Cette apparente contradiction s'explique par trois facteurs majeurs :</p>
                      
                      <p className="pl-6 border-l-2 border-emerald-500/20">
                        1. <span className="inline-flex items-center gap-1.5 text-emerald-400 font-black mx-1">
                          <TrendingUp size={16} /> l'inflation
                        </span> 
                        qui renchérit mécaniquement le coût des 
                        <span className="text-blue-400 font-black mx-1">services publics</span>,
                      </p>

                      <p className="pl-6 border-l-2 border-amber-500/20">
                        2. la <span className="text-rose-400 font-black underline decoration-rose-500/40 underline-offset-8 mx-1">hausse inévitable</span> de la charge de la 
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-black mx-1">
                          <Coins size={16} /> dette
                        </span> 
                        liée aux taux d'intérêt,
                      </p>

                      <p className="pl-6 border-l-2 border-indigo-500/20">
                        3. et des engagements de long terme (comme la 
                        <span className="inline-flex items-center gap-1.5 text-indigo-400 font-black mx-1">
                          <Shield size={16} /> Loi de Programmation Militaire
                        </span>) 
                        qui <span className="italic border-b border-slate-600 pb-0.5">sanctuarisent</span> certaines dépenses régaliennes.
                      </p>

                      <p className="pt-4 text-slate-500 text-base">
                        Ainsi, même si l'État cherche à réduire son train de vie dans certains domaines, les postes "mécaniques" et de sécurité poussent mathématiquement le total vers le haut.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {dynamicMissions.map((mission, i) => (
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


                  <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                     <button 
                       onClick={() => setSelectedMissionId(mission.id)}
                       className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                     >
                        Explorer en détail
                     </button>
                     <button 
                       onClick={() => setSelectedMissionId(mission.id)}
                       className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-slate-50 group-hover:bg-slate-900 group-hover:text-white shadow-sm"
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
                Comprendre qui détient nos 3 460 Md€ de dette et comment elle a évolué.
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
                     <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">
                        <TrendingUp size={16} className="text-rose-600" />
                        <span className="text-sm font-black text-rose-700">Dernier relevé : 115,6%</span>
                     </div>
                  </div>

                  <div className="h-64 w-full relative group cursor-crosshair">
                     {/* TOOLTIP */}
                     {hoveredYear !== null && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
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

                     <svg viewBox="0 0 500 130" className="w-full h-full preserve-3d overflow-visible" preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0, 30, 60, 90, 120].map((v) => (
                           <line key={v} x1="0" y1={130-v} x2="500" y2={130-v} stroke="#f1f5f9" strokeWidth="0.5" />
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
                           d={`M 0 130 ${DEBT_HISTORY.map((d, i) => `L ${(i / (DEBT_HISTORY.length - 1)) * 500} ${130 - d.value}`).join(' ')} L 500 130 Z`}
                           fill="url(#debtGradient)"
                           initial={{ opacity: 0 }}
                           whileInView={{ opacity: 1 }}
                           transition={{ duration: 1 }}
                        />
                        <motion.path
                           d={`M 0 ${130 - DEBT_HISTORY[0].value} ${DEBT_HISTORY.map((d, i) => `L ${(i / (DEBT_HISTORY.length - 1)) * 500} ${130 - d.value}`).join(' ')}`}
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
                                <line x1={x} y1="0" x2={x} y2="130" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
                                <motion.circle
                                   cx={x}
                                   cy={130 - d.value}
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
                              height="130"
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
                              cy={130 - d.value}
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
                        {DEBT_HISTORY.filter((_, i) => i % 2 === 0 || i === DEBT_HISTORY.length - 1).map((d, i) => (
                           <span key={i} className="text-[10px] font-bold text-slate-400">{d.year}</span>
                        ))}
                     </div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-4 opacity-50">Source : INSEE / Agence France Trésor</p>
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
                           {dynamicComparison.map((row, i) => {
                            const diff = ((row.val2026 - row.val2025) / row.val2025) * 100;
                            return (
                              <motion.tr 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                               onClick={() => {
                                 const missionId = row.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                                  if (dynamicMissions.some(m => m.id === missionId)) {
                                   setSelectedMissionId(missionId);
                                 }
                               }}
                              >
                                 <td className="px-8 py-5">
                                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{row.label}</span>
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
           </div>
         </section>

        {/* MISSION DRILL-DOWN SIDE PANEL */}
        <AnimatePresence>
           {selectedMissionId && selectedMissionData && (
              <>
                 <style jsx global>{`
                    .mission-panel::-webkit-scrollbar {
                      width: 6px;
                    }
                    .mission-panel::-webkit-scrollbar-track {
                      background: transparent;
                    }
                    .mission-panel::-webkit-scrollbar-thumb {
                      background: #e2e8f0;
                      border-radius: 10px;
                    }
                    .mission-panel::-webkit-scrollbar-thumb:hover {
                      background: #cbd5e1;
                    }
                 `}</style>
                 {/* Backdrop */}
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   onClick={() => setSelectedMissionId(null)}
                   className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100]"
                   style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                 />

                 {/* Navigation Arrows */}
                 <div className="fixed left-2 md:left-8 top-1/2 -translate-y-1/2 z-[120] pointer-events-auto hidden md:block">
                    <motion.button 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => navigateMission('prev')}
                      className="w-16 h-16 rounded-full bg-white shadow-2xl text-slate-900 flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-100"
                    >
                       <ChevronLeft size={32} />
                    </motion.button>
                 </div>
                 <div className="fixed right-2 md:right-8 top-1/2 -translate-y-1/2 z-[120] pointer-events-auto hidden md:block">
                    <motion.button 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => navigateMission('next')}
                      className="w-16 h-16 rounded-full bg-white shadow-2xl text-slate-900 flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-100"
                    >
                       <ChevronRight size={32} />
                    </motion.button>
                 </div>
                 
                 {/* Modal Container */}
                 <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12 pointer-events-none">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      className="w-full max-w-5xl max-h-full bg-white shadow-2xl rounded-[3rem] overflow-y-auto mission-panel border border-slate-100 pointer-events-auto relative"
                    >
                       <div className="p-8 md:p-12 pt-16 md:pt-20 space-y-12 flex flex-col min-h-full">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                             <div className="space-y-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${selectedMissionData.color}`}>
                                   {selectedMissionData.impact}
                                </div>
                                <h2 className="text-3xl md:text-4xl font-staatliches text-slate-900 uppercase leading-tight">
                                   {selectedMissionData.title}
                                </h2>
                                <p className="text-xl md:text-2xl font-mono font-bold text-slate-400">{selectedMissionData.amount}</p>
                             </div>
                             <button 
                               onClick={() => setSelectedMissionId(null)}
                               className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
                             >
                                <X size={24} className="text-slate-900" />
                             </button>
                          </div>

                          {/* Description */}
                          <div className="space-y-4">
                             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contexte Budgétaire</h3>
                             <p className="text-slate-600 leading-relaxed font-medium italic">
                                {selectedMissionData.details}
                             </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Breakdown Chart */}
                             <div className="bg-slate-50 rounded-[2rem] p-8 space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Répartition Interne</h3>
                                <div className="space-y-4">
                                   {selectedMissionData.breakdown?.map((item: any, i: number) => (
                                      <div key={i} className="space-y-2">
                                         <div className="flex justify-between text-xs font-bold text-slate-700">
                                            <span>{item.label}</span>
                                            <span>{item.value} Md€</span>
                                         </div>
                                         <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${(item.value / parseFloat(selectedMissionData.amount)) * 100}%` }}
                                              className={`h-full ${selectedMissionData.color}`}
                                            />
                                         </div>
                                      </div>
                                   ))}
                                </div>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest pt-4 opacity-50">Source : data.economie.gouv.fr</p>
                             </div>

                             {/* Evolution Chart */}
                             <div className="bg-slate-900 rounded-[2rem] p-8 space-y-6 text-white relative overflow-hidden group">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Évolution PLF (Md€)</h3>
                                
                                <div className="h-40 w-full relative mt-4">
                                   {selectedMissionData.evolution && (
                                      <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible">
                                         <defs>
                                            <linearGradient id={`grad-${selectedMissionId}`} x1="0" y1="0" x2="0" y2="1">
                                               <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                                               <stop offset="100%" stopColor="white" stopOpacity="0" />
                                            </linearGradient>
                                         </defs>
                                         
                                         {/* Helper lines */}
                                         <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                                         
                                         {/* Path */}
                                         {(() => {
                                            const points = selectedMissionData.evolution;
                                            const values = points.map((p: any) => p.value);
                                            const max = Math.max(...values) * 1.2;
                                            const min = Math.min(...values) * 0.8;
                                            const range = max - min;
                                            
                                            const getX = (i: number) => (i / (points.length - 1)) * 400;
                                            const getY = (v: number) => 120 - ((v - min) / range) * 100;
                                            
                                            const d = `M ${getX(0)} ${getY(points[0].value)} ` + 
                                                     points.slice(1).map((p: any, i: number) => `L ${getX(i+1)} ${getY(p.value)}`).join(' ');
                                            
                                            const areaD = `${d} L 400 120 L 0 120 Z`;
                                            
                                            return (
                                               <>
                                                  <motion.path 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    d={areaD}
                                                    fill={`url(#grad-${selectedMissionId})`}
                                                    transition={{ duration: 1 }}
                                                  />
                                                  <motion.path 
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    d={d}
                                                    fill="none"
                                                    stroke="white"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    transition={{ duration: 1.5 }}
                                                  />
                                                  {points.map((p: any, i: number) => (
                                                     <g key={i}>
                                                        <motion.circle 
                                                          initial={{ scale: 0 }}
                                                          animate={{ scale: 1 }}
                                                          cx={getX(i)}
                                                          cy={getY(p.value)}
                                                          fill="white"
                                                          r="4"
                                                          transition={{ delay: 0.5 + (i * 0.2) }}
                                                        />
                                                        <text 
                                                          x={getX(i)} 
                                                          y={getY(p.value) - 15} 
                                                          textAnchor="middle" 
                                                          className="text-[10px] font-black fill-white"
                                                        >
                                                           {p.value}
                                                        </text>
                                                        <text 
                                                          x={getX(i)} 
                                                          y="140" 
                                                          textAnchor="middle" 
                                                          className="text-[10px] font-bold fill-slate-500 uppercase tracking-widest"
                                                        >
                                                           {p.year}
                                                        </text>
                                                     </g>
                                                  ))}
                                               </>
                                            );
                                         })()}
                                      </svg>
                                   )}
                                </div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pt-4 opacity-30 text-center">Source : Direction du Budget / PLF 2026</p>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Measures */}
                             <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mesures Phares 2026</h3>
                                <div className="space-y-4">
                                    {selectedMissionData.measures?.map((m: any, i: number) => (
                                       <div key={i} className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                             <CheckCircle2 size={14} />
                                          </div>
                                          <div className="space-y-1">
                                             <p className="text-xs font-bold text-emerald-900">{typeof m === 'string' ? m : m.title}</p>
                                             {typeof m !== 'string' && m.desc && (
                                                <p className="text-[10px] text-emerald-800/70 font-medium italic leading-relaxed">
                                                   {m.desc}
                                                </p>
                                             )}
                                          </div>
                                       </div>
                                    ))}
                                </div>
                             </div>

                             {/* Functioning vs Investment */}
                             <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Nature de la dépense</h3>
                                <div className="p-8 border border-slate-100 rounded-[2rem] space-y-6">
                                   <div className="flex justify-between items-end">
                                      <div className="space-y-1">
                                         <p className="text-[10px] font-black text-slate-400 uppercase">Fonctionnement</p>
                                         <p className="text-2xl font-staatliches text-slate-900">{selectedMissionData.split?.functioning}%</p>
                                      </div>
                                      <div className="space-y-1 text-right">
                                         <p className="text-[10px] font-black text-slate-400 uppercase">Investissement</p>
                                         <p className="text-2xl font-staatliches text-blue-600">{selectedMissionData.split?.investment}%</p>
                                      </div>
                                   </div>
                                   <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${selectedMissionData.split?.functioning}%` }}
                                        className="h-full bg-slate-400"
                                      />
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${selectedMissionData.split?.investment}%` }}
                                        className="h-full bg-blue-600"
                                      />
                                   </div>
                                   <p className="text-[10px] text-slate-400 font-medium italic text-center">
                                      La dépense de fonctionnement inclut majoritairement les salaires des agents publics.
                                   </p>
                                </div>
                             </div>
                          </div>
                          
                          <div className="pt-8 mt-auto">
                             <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
                                Accéder au Rapport Complet PAP 2026
                             </button>
                          </div>
                       </div>
                    </motion.div>
                 </div>
              </>
           )}
        </AnimatePresence>

      </div>
    </main>
  );
}
