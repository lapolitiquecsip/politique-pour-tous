"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, MapPin, Building2, TrendingUp, Star, Loader2, ArrowRight, Shield, Heart, GraduationCap, Home, Landmark, TreePine, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import RegionFinancesChart from "./RegionFinancesChart";
import { REGIONS, DEPARTMENTS } from "@/lib/data/territories";
import { useState, useEffect } from "react";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";
import Link from "next/link";
import { AwardBadge } from "@/components/ui/award-badge";
import { departmentPaths } from "@/lib/data/departmentPaths";

type TerritoryRef = { id: string, name: string, type: 'region' | 'department' };
interface TerritoryDetailPanelProps {
  territory: TerritoryRef | null;
  onClose: () => void;
  onNavigate?: (territory: TerritoryRef) => void;
}

const CATEGORIES = [
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
      { key: 'demographie.populationTotal', label: 'Population totale', format: (v: any) => v?.toLocaleString() + ' hab.', help: "Population issue du dernier millésime disponible Insee/SDES." },
      { key: 'demographie.densite', label: 'Densité', format: (v: any) => v + ' hab/km²', help: "Nombre moyen d'habitants par kilomètre carré." },
      { key: 'demographie.evolution10ans', label: 'Évol. 10 ans', format: (v: any) => v, help: "Variation en pourcentage de la population sur les 10 dernières années." },
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
      { key: 'economie.chomage', label: 'Taux de chômage', format: (v: any) => v + '%', inverse: true, help: "Taux de chômage au sens du BIT, dernier millésime Insee disponible." },
      { key: 'economie.revenuMedian', label: 'Revenu médian', format: (v: any) => v + ' €/mois', help: "Revenu mensuel séparant la population en deux parts égales." },
      { key: 'economie.pauvrete', label: 'Taux de pauvreté', format: (v: any) => v + '%', inverse: true, help: "Vivant avec moins de 60% du revenu médian national (≈ 1150 €/mois)." },
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
      { key: 'education.bac', label: 'Réussite au Bac', format: (v: any) => v + '%', help: "Taux de réussite global aux examens du baccalauréat (session 2023)." },
      { key: 'education.diplomesSup', label: '% Diplômés Sup.', format: (v: any) => v + '%', help: "Part de la population de 15 ans ou plus ayant un diplôme supérieur." },
      { key: 'education.decrochage', label: 'Décrochage', format: (v: any) => v + '%', inverse: true, help: "Part des 15-24 ans sortis du système scolaire sans aucun diplôme." },
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
      { key: 'sante.medecins10k', label: 'Médecins / 10k hab.', format: (v: any) => v, help: "Nombre de médecins généralistes et spécialistes pour 10 000 hab." },
      { key: 'sante.scoreAPL', label: 'Accessibilité Santé', format: (v: any) => v + ' consult./an', help: "Accessibilité potentielle localisée aux médecins généralistes de moins de 65 ans, en consultations accessibles par habitant et par an." },
      { key: 'sante.esperanceVie', label: 'Espérance de vie', format: (v: any) => v + ' ans', help: "Durée de vie moyenne estimée à la naissance." },
    ]
  },
  {
    id: 'securite',
    title: 'Sécurité',
    icon: Shield,
    bgClass: 'bg-amber-50/40',
    borderClass: 'border-amber-100/50',
    iconClass: 'bg-amber-100 text-amber-900',
    textClass: 'text-amber-800',
    progressClass: 'bg-amber-600',
    metrics: [
      { key: 'securite.atteintesPersonnes', label: 'Violences / 1k hab.', format: (v: any) => v, inverse: true, help: "Somme des taux officiels d'homicides et violences enregistrées, dernier millésime SSMSI disponible." },
      { key: 'securite.atteintesBiens', label: 'Vols / 1k hab.', format: (v: any) => v, inverse: true, help: "Somme des vols sur personnes, vols de véhicules et cambriolages enregistrés, dernier millésime SSMSI disponible." },
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
      { key: 'logement.prixM2', label: 'Prix moyen m²', format: (v: any) => v + ' €', help: "Prix de vente moyen du m² tous logements confondus (Insee 2023)." },
      { key: 'logement.logementsSociaux', label: '% Logements sociaux', format: (v: any) => v + '%' , help: "Part des logements sociaux parmi les résidences principales." },
      { key: 'logement.proprietaires', label: '% Propriétaires', format: (v: any) => v + '%', help: "Part des ménages propriétaires de leur résidence principale." },
    ]
  },
  {
    id: 'finances',
    title: 'Finances',
    icon: Landmark,
    bgClass: 'bg-pink-50/40',
    borderClass: 'border-pink-100/50',
    iconClass: 'bg-pink-100 text-pink-900',
    textClass: 'text-pink-800',
    progressClass: 'bg-pink-600',
    metrics: [
      { key: 'finances.budgetHabitant', label: 'Budget / hab.', format: (v: any) => v + ' €', help: "Dépenses réelles de fonctionnement et d'investissement par hab." },
      { key: 'finances.endettement', label: 'Endettement', format: (v: any) => v + '%', inverse: true, help: "Encours de la dette totale rapporté aux recettes de fonctionnement." },
      { key: 'finances.investissement', label: '% Investissement', format: (v: any) => v + '%', help: "Part du budget consacrée au développement à long terme du territoire." },
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
      { key: 'environnement.qualiteAir', label: 'Indice ATMO moyen', format: (v: any) => v + '/6', inverse: true, help: "Moyenne des indices ATMO quotidiens officiels (1 = bon, 6 = extrêmement mauvais), intégrant NO₂, O₃, PM10, PM2.5 et SO₂." },
      { key: 'environnement.surfaceNaturelle', label: '% Espaces verts', format: (v: any) => v + '%', help: "Part du territoire occupé par des forêts ou espaces naturels protégés." },
      { key: 'environnement.risques', label: 'Exposition aux risques', format: (v: any) => v + '/3', inverse: true, help: "Niveau reproductible fondé sur le nombre de risques majeurs distincts recensés dans GASPAR." },
    ]
  }
];

export default function TerritoryDetailPanel({ territory, onClose, onNavigate }: TerritoryDetailPanelProps) {
  // Navigation préc./suiv. dans la liste des régions (ou départements).
  const navList: TerritoryRef[] = territory
    ? (territory.type === 'region' ? REGIONS : DEPARTMENTS).map((t: any) => ({ id: t.id, name: t.name, type: territory.type }))
    : [];
  const navIndex = territory ? navList.findIndex(t => t.id === territory.id) : -1;
  const goTo = (delta: number) => {
    if (!onNavigate || navIndex < 0 || navList.length === 0) return;
    const next = navList[(navIndex + delta + navList.length) % navList.length];
    onNavigate(next);
  };
  const { userId, isPremium } = usePremium();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  useEffect(() => {
    if (!territory) {
      setData(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Dans le référentiel, les régions sont codées « R52 », « R84 »… tandis
        // que les départements utilisent « 52 ». Sans le préfixe, une région
        // récupérait par erreur les données du département de même code.
        const code = territory.type === 'region' ? `R${territory.id}` : territory.id;
        const json = await api.getTerritoryDetail(code, territory.name);
        setData(json);
      } catch (e) {
        console.error("Failed to fetch territory details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [territory]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!territory || !userId || !isPremium) return;

    const checkSaved = async () => {
      const saved = await api.getUserSavedItems(userId);
      setIsSaved(saved.some((item: any) => item.item_id === territory.name && item.item_type === (territory.type === 'region' ? 'region' : 'department')));
    };
    checkSaved();
  }, [territory, userId, isPremium]);

  const handleToggleSave = async () => {
    if (!userId || !isPremium || !territory) return;
    
    setLoadingSave(true);
    try {
      const type = territory.type === 'region' ? 'region' : 'department';
      if (isSaved) {
        await api.unsaveItem(userId, territory.name, type);
        setIsSaved(false);
      } else {
        await api.saveItem(userId, territory.name, type);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <AnimatePresence>
      {territory && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8 z-50 pointer-events-none">
            {onNavigate && navIndex >= 0 && (
              <>
                <button
                  onClick={() => goTo(-1)}
                  aria-label={territory.type === 'region' ? 'Région précédente' : 'Département précédent'}
                  className="pointer-events-auto absolute left-2 top-1/2 z-[55] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl backdrop-blur transition hover:bg-white md:left-6"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  onClick={() => goTo(1)}
                  aria-label={territory.type === 'region' ? 'Région suivante' : 'Département suivant'}
                  className="pointer-events-auto absolute right-2 top-1/2 z-[55] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl backdrop-blur transition hover:bg-white md:right-6"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            )}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="relative bg-slate-900 p-8 pb-12 shrink-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/20 blur-3xl rounded-full pointer-events-none" />
                
                <div className="absolute top-6 right-6 flex gap-2 z-[60]">
                  <button
                    data-testid="panel-favorite-btn"
                    onClick={handleToggleSave}
                    disabled={loadingSave}
                    className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                      isSaved 
                        ? "bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/20" 
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {loadingSave ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} className={isSaved ? "fill-current" : ""} />}
                  </button>
                  <button
                    data-testid="panel-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all cursor-pointer z-[70]"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-start gap-8 md:gap-12 mr-16">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                        {territory.type === 'region' ? 'Échelon Régional' : 'Échelon Départemental'}
                      </span>
                      {data?.isEstimated && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[8px] uppercase tracking-widest rounded-full border border-amber-500/30">
                          Données estimées
                        </span>
                      )}
                    </div>

                    <h2 className="text-5xl font-staatliches uppercase tracking-tight text-white leading-none">
                      {territory.name}
                    </h2>
                    
                    <div className="flex items-center gap-4 text-white/70">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                            {territory.type === 'region' ? 'Président du Conseil Régional' : 'Président du Conseil Départemental'}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {data?.president || (data === null && loading ? "Chargement..." : territory.name)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* France map (only for departments) */}
                  {(territory.type === 'department' || !territory.type) && departmentPaths[territory.id] && (
                    (() => {
                      const colors = [
                        '#ec4899', // pink
                        '#10b981', // emerald
                        '#3b82f6', // blue
                        '#a855f7', // purple
                        '#f59e0b', // amber
                        '#f43f5e', // rose
                        '#6366f1', // indigo
                        '#06b6d4'  // cyan
                      ];
                      const colorIndex = (territory.id.charCodeAt(0) + (territory.id.charCodeAt(territory.id.length - 1) || 0)) % colors.length;
                      const activeColor = colors[colorIndex];

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.7, rotate: -3 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.15 }}
                          className="relative w-36 h-36 md:w-44 md:h-44 shrink-0 flex items-center justify-center overflow-visible"
                        >
                          <svg
                            viewBox="10 10 690 580"
                            className="w-full h-full"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            {/* Base departments map */}
                            {Object.entries(departmentPaths).map(([code, pathData], idx) => {
                              const isCurrent = code === territory.id;
                              return (
                                <motion.path
                                  key={code}
                                  d={pathData.d}
                                  fill={isCurrent ? activeColor : "#ffffff"}
                                  fillOpacity={isCurrent ? 1 : 0.90}
                                  stroke={isCurrent ? "#ffffff" : "#475569"}
                                  strokeOpacity={isCurrent ? 1 : 0.45}
                                  strokeWidth={isCurrent ? "2.5" : "1.6"}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={isCurrent ? "drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-10" : ""}
                                  style={{ originX: 0.5, originY: 0.5 }}
                                  initial={{ opacity: 0, y: -35, scale: 0.4, rotate: -15 }}
                                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                                  transition={{
                                    delay: idx * 0.003, // Highly visible stagger ripple
                                    duration: 0.45,
                                    type: "spring",
                                    stiffness: 140,
                                    damping: 10 // Playful bouncy physics
                                  }}
                                />
                              );
                            })}

                            {/* Pulsing Pin and Path locator */}
                            {(() => {
                              const activePath = departmentPaths[territory.id];
                              if (!activePath) return null;
                              const parts = activePath.viewBox.trim().split(/\s+/).map(Number);
                              if (parts.length !== 4 || parts.some(isNaN)) return null;
                              const [x, y, w, h] = parts;
                              const centerX = x + w / 2;
                              const centerY = y + h / 2;

                              return (
                                <g>
                                  {/* Pulsing path shape wave */}
                                  <motion.path
                                    d={activePath.d}
                                    fill={activeColor}
                                    stroke={activeColor}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ originX: 0.5, originY: 0.5 }}
                                    initial={{ opacity: 0.6, scale: 1 }}
                                    animate={{ opacity: 0, scale: 1.25 }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 2.0,
                                      ease: "easeOut"
                                    }}
                                    className="pointer-events-none"
                                  />

                                  {/* Pulsing circle wave */}
                                  <motion.circle
                                    cx={centerX}
                                    cy={centerY}
                                    r="22"
                                    fill={activeColor}
                                    initial={{ opacity: 0.5, scale: 0.2 }}
                                    animate={{ opacity: 0, scale: 1 }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 2.0,
                                      ease: "easeOut",
                                      delay: 0.2
                                    }}
                                  />
                                  
                                  {/* Static inner dot */}
                                  <circle
                                    cx={centerX}
                                    cy={centerY}
                                    r="4.5"
                                    fill="#ffffff"
                                    stroke={activeColor}
                                    strokeWidth="2.5"
                                    className="drop-shadow"
                                  />
                                </g>
                              );
                            })()}
                          </svg>
                        </motion.div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-10 -mt-4 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-rose-600" size={40} />
                    <p className="text-slate-400 font-medium">Chargement des indicateurs...</p>
                  </div>
                ) : (
                  <>
                    {CATEGORIES.map((cat, catIdx) => (
                      <div key={catIdx} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cat.iconClass}`}>
                            <cat.icon size={20} />
                          </div>
                          <h3 className={`text-xl font-staatliches uppercase tracking-wide ${cat.textClass}`}>{cat.title}</h3>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 rounded-[2rem] p-8 border ${cat.bgClass} ${cat.borderClass}`}>
                          {cat.metrics.map((metric, mIdx) => {
                            const getVal = (data: any, path: string) => {
                              if (!data) return null;
                              return path.split('.').reduce((obj, key) => (obj && typeof obj[key] !== 'undefined') ? obj[key] : null, data);
                            };
                            const val = getVal(data, metric.key);
                            
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
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Finances régionales 2012-2024 (OFGL) */}
                    {territory.type === 'region' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600">
                            <TrendingUp size={20} />
                          </div>
                          <h3 className="text-xl font-staatliches uppercase tracking-wide text-blue-600">Finances 2012-2024</h3>
                        </div>
                        <div className="rounded-[2rem] p-6 md:p-8 border bg-slate-50/60 border-slate-100">
                          <RegionFinancesChart regionCode={territory.id} />
                        </div>
                      </div>
                    )}

                    {/* Compare Button */}
                    <div className="pt-8">
                      {isPremium ? (
                        <Link 
                          href={`/local/comparateur/app?id=${territory.id}&type=${territory.type === 'region' ? 'region' : 'department'}`}
                          className="w-full py-6 bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white rounded-3xl font-staatliches uppercase tracking-widest text-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-rose-600/20"
                        >
                          Comparer avec un autre territoire
                          <ArrowRight size={24} />
                        </Link>
                      ) : (
                        <div className="p-8 rounded-[2rem] bg-amber-50 border border-amber-100 text-center space-y-4 flex flex-col items-center">
                          <p className="font-bold text-amber-900 uppercase tracking-widest text-xs">Fonctionnalité Premium</p>
                          <p className="text-sm text-amber-800 mb-2">Passez à l'offre <strong>Elite</strong> pour comparer les performances de ce territoire avec n'importe quel autre en France.</p>
                          <AwardBadge 
                            titleText="Découvrir l'offre Elite"
                            subtitleText="Fonctionnalité Premium"
                            link="/premium"
                          />
                        </div>
                      )}
                    </div>

                    {/* Sources (if available) */}
                    {data?.sources && (
                      <div className="text-center text-[10px] text-slate-400/80 italic pt-6 border-t border-slate-100 mt-6">
                        Source(s) de données : {data.sources}
                      </div>
                    )}
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
