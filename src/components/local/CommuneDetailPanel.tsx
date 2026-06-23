"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, MapPin, Calendar, Award, Building2, TrendingUp, UserMinus, Star, Loader2, Briefcase, GraduationCap, Heart, Shield, Home, Landmark, Coins, TreePine } from "lucide-react";
import type { CommuneResult, MayorData, ElectionResult } from "@/lib/hooks/useCommuneSearch";
import { useState, useEffect } from "react";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";

const PARTY_COLORS: Record<string, string> = {
  PS: "bg-rose-500",
  SOC: "bg-rose-500",
  DVG: "bg-rose-400",
  UG: "bg-rose-600",
  VEC: "bg-emerald-500",
  ECO: "bg-emerald-400",
  LR: "bg-blue-600",
  DVD: "bg-blue-400",
  UD: "bg-blue-700",
  RN: "bg-slate-800",
  RNV: "bg-slate-900",
  HOR: "bg-sky-500",
  ENS: "bg-amber-500",
  RE: "bg-amber-500",
  COM: "bg-red-700",
  FI: "bg-red-600",
  UDI: "bg-cyan-500",
  DVC: "bg-orange-400",
};

const NUANCE_MAP: Record<string, string> = {
  SOC: "Socialiste",
  PS: "Parti Socialiste",
  DVG: "Divers Gauche",
  UG: "Union de la Gauche",
  VEC: "Écologiste",
  ECO: "Écologiste",
  LR: "Les Républicains",
  DVD: "Divers Droite",
  UD: "Union de la Droite",
  RN: "Rassemblement National",
  RNV: "Rassemblement National",
  HOR: "Horizons",
  ENS: "Ensemble",
  RE: "Renaissance",
  COM: "Communiste",
  FI: "La France Insoumise",
  LFI: "La France Insoumise",
  UDI: "UDI",
  DVC: "Divers Centre",
  LDVG: "Divers Gauche",
  LDVD: "Divers Droite",
  LDVC: "Divers Centre",
  LUG: "Union de la Gauche",
  LUD: "Union de la Droite",
  LRN: "Rassemblement National",
  LEXG: "Extrême Gauche",
  LEXD: "Extrême Droite",
};

function formatPopulation(n: number): string {
  if (!n) return "N/A";
  return n.toLocaleString("fr-FR") + " hab.";
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}


const COMMUNE_CATEGORIES = [
  { 
    id: 'demographie', 
    title: 'Démographie', 
    icon: Users,
    bgClass: 'bg-blue-50/40',
    borderClass: 'border-blue-100/50',
    iconClass: 'bg-blue-100 text-blue-900',
    textClass: 'text-blue-800',
    progressClass: 'bg-blue-600',
    metrics: [
      { key: 'demographie.populationTotal', label: 'Population totale', format: (v: any) => v?.toLocaleString() + ' hab.', help: "Nombre total d'habitants résidents." },
      { key: 'demographie.densite', label: 'Densité', format: (v: any) => v + ' hab/km²', help: "Nombre moyen d'habitants par kilomètre carré." },
      { key: 'demographie.evolution10ans', label: 'Évol. 10 ans', format: (v: any) => v, help: "Variation de la population sur les 10 dernières années." },
      { key: 'demographie.moins25ans', label: '% -25 ans', format: (v: any) => v + '%', help: "Part de la population de moins de 25 ans." },
      { key: 'demographie.plus65ans', label: '% +65 ans', format: (v: any) => v + '%', help: "Part de la population de 65 ans et plus." },
    ]
  },
  { 
    id: 'economie', 
    title: 'Économie & Emploi', 
    icon: Briefcase,
    bgClass: 'bg-emerald-50/40',
    borderClass: 'border-emerald-100/50',
    iconClass: 'bg-emerald-100 text-emerald-900',
    textClass: 'text-emerald-800',
    progressClass: 'bg-emerald-600',
    metrics: [
      { key: 'economie.chomage', label: 'Taux de chômage', format: (v: any) => v + '%', inverse: true, help: "Taux de chômage localisé." },
      { key: 'economie.revenuMedian', label: 'Revenu médian', format: (v: any) => v + ' €/mois', help: "Revenu mensuel médian séparant la population en deux." },
      { key: 'economie.pauvrete', label: 'Taux de pauvreté', format: (v: any) => v + '%', inverse: true, help: "Part de la population vivant sous le seuil de pauvreté." },
    ]
  },
  {
    id: 'logement',
    title: 'Logement',
    icon: Home,
    bgClass: 'bg-cyan-50/40',
    borderClass: 'border-cyan-100/50',
    iconClass: 'bg-cyan-100 text-cyan-900',
    textClass: 'text-cyan-800',
    progressClass: 'bg-cyan-600',
    metrics: [
      { key: 'logement.prixM2', label: 'Prix moyen m²', format: (v: any) => v?.toLocaleString() + ' €', help: "Prix de vente moyen estimé du m²." },
      { key: 'logement.logementsSociaux', label: '% Logements sociaux', format: (v: any) => v + '%', help: "Part des logements sociaux parmi les résidences principales." },
      { key: 'logement.proprietaires', label: '% Propriétaires', format: (v: any) => v + '%', help: "Part des ménages propriétaires." },
    ]
  },
  {
    id: 'finances',
    title: 'Finances Municipales',
    icon: Landmark,
    bgClass: 'bg-pink-50/40',
    borderClass: 'border-pink-100/50',
    iconClass: 'bg-pink-100 text-pink-900',
    textClass: 'text-pink-800',
    progressClass: 'bg-pink-600',
    metrics: [
      { key: 'finances.budgetHabitant', label: 'Budget / hab.', format: (v: any) => v?.toLocaleString() + ' €', help: "Dépenses réelles de fonctionnement municipal par habitant." },
      { key: 'finances.endettement', label: 'Endettement', format: (v: any) => v + '%', inverse: true, help: "Encours de la dette totale rapporté aux recettes de fonctionnement." },
      { key: 'finances.investissement', label: '% Investissement', format: (v: any) => v + '%', help: "Part du budget consacrée à l'investissement." },
    ]
  },
  {
    id: 'fiscalite',
    title: 'Fiscalité Locale',
    icon: Coins,
    bgClass: 'bg-amber-50/40',
    borderClass: 'border-amber-100/50',
    iconClass: 'bg-amber-100 text-amber-900',
    textClass: 'text-amber-800',
    progressClass: 'bg-amber-600',
    metrics: [
      { key: 'fiscalite.tauxTF', label: 'Taux Taxe Foncière', format: (v: any) => v + '%', inverse: true, help: "Taux communal de la taxe foncière sur les propriétés bâties (2023/2024)." },
      { key: 'fiscalite.tauxTH', label: 'Taux Taxe Habitation', format: (v: any) => v + '%', inverse: true, help: "Taux communal de la taxe d'habitation sur les résidences secondaires (2023/2024)." },
    ]
  },
  {
    id: 'securite',
    title: 'Sécurité',
    icon: Shield,
    bgClass: 'bg-purple-50/40',
    borderClass: 'border-purple-100/50',
    iconClass: 'bg-purple-100 text-purple-900',
    textClass: 'text-purple-800',
    progressClass: 'bg-purple-600',
    metrics: [
      { key: 'securite.atteintesPersonnes', label: 'Violences / 1k hab.', format: (v: any) => v, inverse: true, help: "Violences physiques enregistrées pour 1000 hab." },
      { key: 'securite.atteintesBiens', label: 'Vols / 1k hab.', format: (v: any) => v, inverse: true, help: "Vols et dégradations pour 1000 hab." },
    ]
  },
  {
    id: 'sante',
    title: 'Santé',
    icon: Heart,
    bgClass: 'bg-rose-50/40',
    borderClass: 'border-rose-100/50',
    iconClass: 'bg-rose-100 text-rose-900',
    textClass: 'text-rose-800',
    progressClass: 'bg-rose-600',
    metrics: [
      { key: 'sante.medecins10k', label: 'Médecins / 10k hab.', format: (v: any) => v, help: "Nombre de médecins pour 10 000 habitants." },
      { key: 'sante.scoreAPL', label: 'Accessibilité Santé', format: (v: any) => v + '/100', help: "Indicateur d'accès aux soins APL (Ministère de la Santé)." },
      { key: 'sante.esperanceVie', label: 'Espérance de vie', format: (v: any) => v + ' ans', help: "Espérance de vie moyenne dans la commune." },
    ]
  },
  {
    id: 'education',
    title: 'Éducation',
    icon: GraduationCap,
    bgClass: 'bg-indigo-50/40',
    borderClass: 'border-indigo-100/50',
    iconClass: 'bg-indigo-100 text-indigo-900',
    textClass: 'text-indigo-800',
    progressClass: 'bg-indigo-600',
    metrics: [
      { key: 'education.bac', label: 'Réussite au Bac', format: (v: any) => v + '%', help: "Taux de réussite au baccalauréat moyen des lycées de la ville." },
      { key: 'education.diplomesSup', label: '% Diplômés Sup.', format: (v: any) => v + '%', help: "Part de la population diplômée du supérieur." },
      { key: 'education.decrochage', label: 'Décrochage', format: (v: any) => v + '%', inverse: true, help: "Part de décrochage scolaire estimée." },
    ]
  },
  {
    id: 'environnement',
    title: 'Environnement',
    icon: TreePine,
    bgClass: 'bg-purple-50/40',
    borderClass: 'border-purple-100/50',
    iconClass: 'bg-purple-100 text-purple-900',
    textClass: 'text-purple-800',
    progressClass: 'bg-purple-600',
    metrics: [
      { key: 'environnement.qualiteAir', label: 'Qualité Air', format: (v: any) => v + '/100', help: "Note moyenne sur les concentrations de polluants." },
      { key: 'environnement.surfaceNaturelle', label: '% Espaces verts', format: (v: any) => v + '%', help: "Part du territoire occupé par des espaces verts, parcs ou forêts." },
      { key: 'environnement.risques', label: 'Exposition aux risques', format: (v: any) => v, help: "Exposition aux risques naturels majeurs." },
    ]
  }
];

const NATIONAL_AVERAGES: Record<string, { value: any; label: string; format: (v: any) => string }> = {
  'demographie.populationTotal': { value: 1950, label: 'Moyenne des communes', format: (v: any) => v?.toLocaleString() + ' hab.' },
  'demographie.densite': { value: 120, label: 'Moyenne nationale', format: (v: any) => v + ' hab/km²' },
  'demographie.evolution10ans': { value: 4.0, label: 'Moyenne nationale', format: (v: any) => '+' + v + '%' },
  'demographie.moins25ans': { value: 29.5, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'demographie.plus65ans': { value: 21.0, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'economie.chomage': { value: 8.1, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'economie.revenuMedian': { value: 1923, label: 'Moyenne nationale', format: (v: any) => v + ' €/mois' },
  'economie.pauvrete': { value: 14.5, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'logement.prixM2': { value: 2931, label: 'Moyenne nationale', format: (v: any) => v?.toLocaleString() + ' €' },
  'logement.logementsSociaux': { value: 15.9, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'logement.proprietaires': { value: 57.4, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'finances.budgetHabitant': { value: 1550, label: 'Moyenne nationale', format: (v: any) => v?.toLocaleString() + ' €' },
  'finances.endettement': { value: 73.6, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'finances.investissement': { value: 27.0, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'fiscalite.tauxTF': { value: 40.07, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'fiscalite.tauxTH': { value: 16.73, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'securite.atteintesPersonnes': { value: 7.0, label: 'Moyenne nationale', format: (v: any) => v },
  'securite.atteintesBiens': { value: 25.0, label: 'Moyenne nationale', format: (v: any) => v },
  'sante.medecins10k': { value: 35.8, label: 'Moyenne nationale', format: (v: any) => v },
  'sante.scoreAPL': { value: 60, label: 'Moyenne nationale', format: (v: any) => v + '/100' },
  'sante.esperanceVie': { value: 83.1, label: 'Moyenne nationale', format: (v: any) => v + ' ans' },
  'education.bac': { value: 91.8, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'education.diplomesSup': { value: 33.2, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'education.decrochage': { value: 7.6, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'environnement.qualiteAir': { value: 70, label: 'Moyenne nationale', format: (v: any) => v + '/100' },
  'environnement.surfaceNaturelle': { value: 48.0, label: 'Moyenne nationale', format: (v: any) => v + '%' },
  'environnement.risques': { value: 'modéré', label: 'Moyenne nationale', format: (v: any) => v }
};

const NEUTRAL_COMPARISON_KEYS = [
  'demographie.populationTotal',
  'demographie.densite',
  'demographie.evolution10ans',
  'demographie.moins25ans',
  'demographie.plus65ans',
  'logement.prixM2',
  'logement.logementsSociaux',
  'logement.proprietaires',
  'finances.budgetHabitant'
];

const renderComparison = (val: any, metricKey: string, inverse?: boolean) => {
  const nat = NATIONAL_AVERAGES[metricKey];
  if (!nat || val === null || val === undefined) return null;

  // Normalize val to number if it's a string percentage/float
  let numericVal = val;
  if (typeof val === 'string') {
    if (val.includes('%') || val.includes('+') || val.includes('-')) {
      const cleaned = val.replace('%', '').trim();
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        numericVal = parsed;
      }
    }
  }

  const isNeutral = NEUTRAL_COMPARISON_KEYS.includes(metricKey);

  if (typeof numericVal === 'number' && typeof nat.value === 'number') {
    const diff = numericVal - nat.value;
    const absDiff = Math.abs(diff);
    
    // Favorable direction: inverse means lower is better, otherwise higher is better.
    const isBetter = inverse ? diff < 0 : diff > 0;
    const isSame = absDiff < 0.01;
    
    // Format diff text
    const sign = diff > 0 ? '+' : '';
    let diffStr = '';

    if (metricKey.includes('Median') || metricKey.includes('budgetHabitant') || metricKey.includes('prixM2')) {
      diffStr = `${sign}${Math.round(diff).toLocaleString('fr-FR')} €`;
    } else if (metricKey.includes('TF') || metricKey.includes('TH') || metricKey.includes('chomage') || metricKey.includes('pauvrete') || metricKey.includes('evolution') || metricKey.includes('ans') || metricKey.includes('Sociaux') || metricKey.includes('proprietaires') || metricKey.includes('investissement') || metricKey.includes('bac') || metricKey.includes('diplomesSup') || metricKey.includes('decrochage') || metricKey.includes('Air') || metricKey.includes('surfaceNaturelle') || metricKey.includes('endettement')) {
      diffStr = `${sign}${diff.toFixed(1).replace('.0', '')}%`;
    } else if (metricKey.includes('medecins10k') || metricKey.includes('atteintes') || metricKey.includes('scoreAPL') || metricKey.includes('esperanceVie')) {
      const unit = metricKey.includes('esperanceVie') ? ' ans' : metricKey.includes('scoreAPL') ? '/100' : '';
      diffStr = `${sign}${diff.toFixed(1).replace('.0', '')}${unit}`;
    } else {
      diffStr = `${sign}${diff.toFixed(1).replace('.0', '')}`;
    }

    return (
      <div className="flex justify-between items-center text-[9px] mt-1 font-medium leading-none">
        <span className="text-slate-400">Moy. nationale : <span className="font-bold text-slate-500">{nat.format(nat.value)}</span></span>
        {isSame ? (
          <span className="text-slate-500 font-semibold">Identique à la moyenne</span>
        ) : isNeutral ? (
          <span className="text-slate-500 font-semibold">Écart : {diffStr}</span>
        ) : (
          <span className={`${isBetter ? 'text-emerald-600' : 'text-rose-600'} font-semibold flex items-center gap-0.5`}>
            {isBetter ? 'Plus favorable' : 'Moins favorable'} ({diffStr})
          </span>
        )}
      </div>
    );
  } else if (typeof val === 'string' && typeof nat.value === 'string') {
    const isSame = val.toLowerCase() === nat.value.toLowerCase();
    return (
      <div className="flex justify-between items-center text-[9px] mt-1 font-medium leading-none">
        <span className="text-slate-400">Moy. nationale : <span className="font-bold text-slate-500">{nat.value}</span></span>
        <span className="text-slate-500 font-semibold">{isSame ? 'Identique' : `Ville : ${val}`}</span>
      </div>
    );
  }

  return null;
};

interface CommuneDetailPanelProps {
  commune: CommuneResult | null;
  mayor: MayorData | null;
  onClose: () => void;
}

export default function CommuneDetailPanel({
  commune,
  mayor,
  onClose,
}: CommuneDetailPanelProps) {
  const { userId, isPremium } = usePremium();
  const [electionData, setElectionData] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [communeData, setCommuneData] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!commune) {
      setCommuneData(null);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${API_URL}/api/comparateur/${commune.code}?name=${encodeURIComponent(commune.nom)}`);
        const json = await res.json();
        setCommuneData(json);
      } catch (e) {
        console.error("Failed to fetch commune details:", e);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [commune]);

  useEffect(() => {
    if (!commune || !userId || !isPremium) return;

    const checkSaved = async () => {
      const saved = await api.getUserSavedItems(userId);
      setIsSaved(saved.some((item: any) => item.item_id === commune.code && item.item_type === 'commune'));
    };
    checkSaved();
  }, [commune, userId, isPremium]);

  const handleToggleSave = async () => {
    if (!userId) {
      alert("Veuillez vous connecter pour enregistrer vos favoris.");
      return;
    }

    if (!isPremium) {
      alert("Cette fonctionnalité est réservée aux membres PREMIUM. Passez à l'offre Elite pour suivre vos territoires !");
      return;
    }

    if (!commune) return;
    
    setLoadingSave(true);
    try {
      if (isSaved) {
        await api.unsaveItem(userId, commune.code, 'commune');
        setIsSaved(false);
      } else {
        await api.saveItem(userId, commune.code, 'commune');
        setIsSaved(true);
      }
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
      alert(`Erreur : Impossible de sauvegarder ce territoire. Cela est probablement dû à une contrainte de base de données non mise à jour. Veuillez appliquer la migration SQL.`);
    } finally {
      setLoadingSave(false);
    }
  };

  useEffect(() => {
    if (!commune) {
      setElectionData(null);
      return;
    }

    const fetchElection = async () => {
      setLoading(true);
      try {
        const res = await fetch("/data/election_results.json");
        const allData = await res.json();
        setElectionData(allData[commune.code] || null);
      } catch (e) {
        console.error("Failed to fetch election data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchElection();
  }, [commune]);

  if (!commune) return null;

  const partyColor = mayor?.p ? PARTY_COLORS[mayor.p] || "bg-slate-500" : "bg-slate-300";

  return (
    <AnimatePresence>
      {commune && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8 z-50 pointer-events-none">
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-rose-600 via-fuchsia-600 to-rose-700 p-8 pb-12 shrink-0">
                <div className="absolute top-6 right-6 flex gap-2">
                  <button
                    onClick={handleToggleSave}
                    disabled={loadingSave}
                    className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                      isSaved 
                        ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/20" 
                        : "bg-white/20 text-white hover:bg-white/30"
                    } ${!isPremium ? "opacity-70" : ""}`}
                  >
                    {loadingSave ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Star size={18} className={isSaved ? "fill-current" : ""} />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-rose-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-200">
                      {commune.departement?.nom} · {commune.region?.nom}
                    </span>
                    {communeData && !communeData.isEstimated && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[8px] uppercase tracking-widest rounded-full border border-emerald-500/30 font-bold ml-2">
                        Données officielles
                      </span>
                    )}
                  </div>

                  <h2 className="text-4xl font-staatliches uppercase tracking-tight text-white leading-none">
                    {commune.nom}
                  </h2>

                  <div className="flex items-center gap-4 pt-2">
                    {commune.codesPostaux?.[0] && (
                      <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-white">
                        {commune.codesPostaux[0]}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-white flex items-center gap-1.5">
                      <Users size={12} />
                      {formatPopulation(commune.population)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content (Scrollable) */}
              <div className="p-8 space-y-8 -mt-4 overflow-y-auto custom-scrollbar">
                {/* Mayor Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 space-y-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                      <Award size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {mayor?.s === "F" ? "Maire" : "Maire"}
                      </p>
                      <h3 className="text-xl font-bold text-slate-900">
                        {mayor ? mayor.n : "Données non disponibles"}
                      </h3>
                    </div>
                  </div>

                  {mayor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Party */}
                      <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Parti politique
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${partyColor}`} />
                          <span className="text-sm font-bold text-slate-900">
                            {mayor.p || "Non renseigné"}
                          </span>
                        </div>
                      </div>

                      {/* Mandate */}
                      <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          <Calendar size={10} /> Mandat depuis
                        </p>
                        <span className="text-sm font-bold text-slate-900">
                          {formatDate(mayor.d)}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Election Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-fuchsia-100 flex items-center justify-center text-fuchsia-600">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Résultats Municipales
                        </p>
                        <h3 className="text-lg font-bold text-slate-900">
                          Mars 2026
                        </h3>
                      </div>
                    </div>
                    {electionData?.m_score && (
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Score du maire
                        </p>
                        <p className="text-3xl font-black text-rose-600 leading-none mt-1">
                          {electionData.m_score.toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {electionData ? (
                    <div className="space-y-4">
                      {/* Mayor Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <span>{mayor?.n || "Maire sortant"}</span>
                          <span>{electionData.m_score?.toFixed(2)}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${electionData.m_score}%` }}
                            className={`h-full ${partyColor}`}
                          />
                        </div>
                      </div>

                      {/* Competitors */}
                      {electionData.comp.length > 0 && (
                        <div className="pt-2 space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <UserMinus size={12} /> Principaux concurrents
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {electionData.comp.slice(0, 3).map((comp, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 transition-hover hover:border-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${PARTY_COLORS[comp.p] || "bg-slate-300"}`} />
                                  <span className="text-xs font-bold text-slate-700">
                                    {NUANCE_MAP[comp.p] || comp.p || "Indépendant"}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-slate-400">
                                  {comp.s.toFixed(2)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-medium italic">
                        Les données détaillées du scrutin ne sont pas disponibles pour cette commune.
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Real indicators or coming soon */}
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="animate-spin text-rose-600" size={24} />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Chargement des indicateurs...</p>
                  </div>
                ) : communeData && !communeData.isEstimated ? (
                  <>
                    {COMMUNE_CATEGORIES.map((cat, catIdx) => (
                      <motion.div 
                        key={catIdx} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + catIdx * 0.05 }}
                        className="space-y-4 pt-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cat.iconClass}`}>
                            <cat.icon size={20} />
                          </div>
                          <h3 className={`text-xl font-staatliches uppercase tracking-wide ${cat.textClass}`}>{cat.title}</h3>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 rounded-[2rem] p-8 border ${cat.bgClass} ${cat.borderClass} bg-white`}>
                          {cat.metrics.map((metric, mIdx) => {
                            const getVal = (data: any, path: string) => {
                              if (!data) return null;
                              return path.split('.').reduce((obj, key) => (obj && typeof obj[key] !== 'undefined') ? obj[key] : null, data);
                            };
                            const val = getVal(communeData, metric.key);
                            
                            return (
                              <div key={mIdx} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  <span>{metric.label}</span>
                                  <span className="text-slate-900 font-bold">{val !== null ? metric.format(val) : 'N/A'}</span>
                                </div>
                                {metric.help && (
                                  <div className="text-[10px] text-slate-400 font-medium normal-case leading-relaxed -mt-1">
                                    {metric.help}
                                  </div>
                                )}
                                <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: val ? (typeof val === 'number' ? Math.min(val, 100) : 50) + '%' : '0%' }}
                                    className={`h-full ${cat.progressClass}`}
                                  />
                                </div>
                                {renderComparison(val, metric.key, (metric as any).inverse)}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}

                    {/* Sources */}
                    {communeData.sources && (
                      <div className="text-center text-[10px] text-slate-400/80 italic pt-6 border-t border-slate-100 mt-6">
                        Source(s) de données : {communeData.sources}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Quick Stats */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-lg shadow-slate-200/30 text-center space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Population
                        </p>
                        <p className="text-2xl font-black text-slate-900">
                          {commune.population?.toLocaleString("fr-FR") || "N/A"}
                        </p>
                      </div>
                      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-lg shadow-slate-200/30 text-center space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Code INSEE
                        </p>
                        <p className="text-2xl font-black text-slate-900">
                          {commune.code}
                        </p>
                      </div>
                    </motion.div>

                    {/* More info coming soon */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center space-y-3"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Bientôt disponible
                      </p>
                      <p className="text-lg font-bold">
                        Budget municipal, fiscalité locale, projets en cours…
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        Ces données seront intégrées prochainement.
                      </p>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
