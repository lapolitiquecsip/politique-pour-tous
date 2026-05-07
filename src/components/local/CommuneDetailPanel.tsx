"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, MapPin, Calendar, Award, Building2, TrendingUp, UserMinus, Star, Loader2 } from "lucide-react";
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
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
