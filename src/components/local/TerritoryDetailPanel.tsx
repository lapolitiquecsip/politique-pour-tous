"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, MapPin, Building2, TrendingUp, Star, Loader2, ArrowRight, Shield, Heart, GraduationCap, Home, Landmark, TreePine, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";
import Link from "next/link";
import { AwardBadge } from "@/components/ui/award-badge";

interface TerritoryDetailPanelProps {
  territory: { id: string, name: string, type: 'region' | 'department' } | null;
  onClose: () => void;
}

const CATEGORIES = [
  { 
    id: 'demographie', 
    title: 'Démographie', 
    icon: Users,
    metrics: [
      { key: 'demographie.populationTotal', label: 'Population totale', format: (v: any) => v?.toLocaleString() + ' hab.' },
      { key: 'demographie.densite', label: 'Densité', format: (v: any) => v + ' hab/km²' },
      { key: 'demographie.evolution10ans', label: 'Évol. 10 ans', format: (v: any) => v },
      { key: 'demographie.moins25ans', label: '% -25 ans', format: (v: any) => v + '%' },
      { key: 'demographie.plus65ans', label: '% +65 ans', format: (v: any) => v + '%' },
    ]
  },
  { 
    id: 'economie', 
    title: 'Économie & Emploi', 
    icon: Briefcase,
    metrics: [
      { key: 'economie.chomage', label: 'Taux de chômage', format: (v: any) => v + '%', inverse: true },
      { key: 'economie.revenuMedian', label: 'Revenu médian', format: (v: any) => v + ' €/mois' },
      { key: 'economie.pauvrete', label: 'Taux de pauvreté', format: (v: any) => v + '%', inverse: true },
    ]
  },
  {
    id: 'education',
    title: 'Éducation',
    icon: GraduationCap,
    metrics: [
      { key: 'education.bac', label: 'Réussite au Bac', format: (v: any) => v + '%' },
      { key: 'education.diplomesSup', label: '% Diplômés Sup.', format: (v: any) => v + '%' },
      { key: 'education.decrochage', label: 'Décrochage', format: (v: any) => v + '%', inverse: true },
    ]
  },
  {
    id: 'sante',
    title: 'Santé',
    icon: Heart,
    metrics: [
      { key: 'sante.medecins10k', label: 'Médecins / 10k hab.', format: (v: any) => v },
      { key: 'sante.scoreAPL', label: 'Accessibilité Santé', format: (v: any) => v + '/100' },
      { key: 'sante.esperanceVie', label: 'Espérance de vie', format: (v: any) => v + ' ans' },
    ]
  },
  {
    id: 'securite',
    title: 'Sécurité',
    icon: Shield,
    metrics: [
      { key: 'securite.atteintesPersonnes', label: 'Violences / 1k hab.', format: (v: any) => v, inverse: true },
      { key: 'securite.atteintesBiens', label: 'Vols / 1k hab.', format: (v: any) => v, inverse: true },
    ]
  },
  {
    id: 'logement',
    title: 'Logement',
    icon: Home,
    metrics: [
      { key: 'logement.prixM2', label: 'Prix moyen m²', format: (v: any) => v + ' €' },
      { key: 'logement.logementsSociaux', label: '% Logements sociaux', format: (v: any) => v + '%' },
      { key: 'logement.proprietaires', label: '% Propriétaires', format: (v: any) => v + '%' },
    ]
  },
  {
    id: 'finances',
    title: 'Finances',
    icon: Landmark,
    metrics: [
      { key: 'finances.budgetHabitant', label: 'Budget / hab.', format: (v: any) => v + ' €' },
      { key: 'finances.endettement', label: 'Endettement', format: (v: any) => v + '%', inverse: true },
      { key: 'finances.investissement', label: '% Investissement', format: (v: any) => v + '%' },
    ]
  },
  {
    id: 'environnement',
    title: 'Environnement',
    icon: TreePine,
    metrics: [
      { key: 'environnement.qualiteAir', label: 'Qualité Air', format: (v: any) => v + '/100' },
      { key: 'environnement.surfaceNaturelle', label: '% Espaces verts', format: (v: any) => v + '%' },
    ]
  }
];

export default function TerritoryDetailPanel({ territory, onClose }: TerritoryDetailPanelProps) {
  const { userId, isPremium } = usePremium();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    if (!territory) {
      setData(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/comparateur/${territory.id}?name=${encodeURIComponent(territory.name)}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch territory details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [territory, API_URL]);

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

                <div className="relative z-10 space-y-4">
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
                  
                  <div className="flex items-center gap-4 text-white/60">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} />
                      <span className="text-sm font-bold">{data?.president || territory.name}</span>
                    </div>
                  </div>
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
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900">
                            <cat.icon size={20} />
                          </div>
                          <h3 className="text-xl font-staatliches uppercase tracking-wide text-slate-900">{cat.title}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
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
                                  <span className="text-slate-900">{val !== null ? metric.format(val) : 'N/A'}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: val ? (typeof val === 'number' ? Math.min(val, 100) : 50) + '%' : '0%' }}
                                    className={`h-full bg-slate-900`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Compare Button */}
                    <div className="pt-8">
                      {isPremium ? (
                        <Link 
                          href={`/local/comparateur?id=${territory.id}&type=${territory.type}`}
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
