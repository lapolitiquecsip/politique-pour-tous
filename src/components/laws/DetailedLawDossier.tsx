import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  CheckCircle2, 
  ChevronDown,
  Sparkles, 
  ArrowRight,
  Star,
  XCircle,
  MinusCircle,
  Vote
} from "lucide-react";
import { type LawDossier } from "@/data/free-laws-dossiers";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";
import { useGlossary } from "@/components/providers/GlossaryProvider";

interface DetailedLawDossierProps {
  law: LawDossier;
}

export default function DetailedLawDossier({ law }: DetailedLawDossierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { isPremium, userId } = usePremium();
  const [userVote, setUserVote] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showHeavyContent, setShowHeavyContent] = useState(false);
  const [communityStats, setCommunityStats] = useState<{POUR:number, CONTRE:number, ABSTENTION:number, total:number} | null>(null);
  const { wrapWithGlossary } = useGlossary();

  // Charger les stats globales
  const fetchCommunityStats = async () => {
    const stats = await api.getLawVoteStats(law.id);
    setCommunityStats(stats);
  };

  // Charger le vote existant avec useEffect (correct)
  useEffect(() => {
    if (userId) {
      api.getUserVotes(userId).then(votes => {
        const existing = votes.find((v: any) => v.law_id === law.id);
        if (existing) {
          setUserVote(existing.vote);
          fetchCommunityStats();
        }
      }).catch(err => {
        console.error("Erreur chargement vote existant:", err);
      });
    }
  }, [userId, law.id]);

  // Différer le contenu lourd pour optimiser l'INP
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowHeavyContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowHeavyContent(false);
    }
  }, [isOpen]);

  const handleVote = async (btnVal: string) => {
    if (!userId) {
      alert("Vous devez être connecté pour voter.");
      return;
    }
    setIsVoting(true);
    try {
      await api.saveUserVote(userId, law.id, btnVal as any);
      setUserVote(btnVal);
      fetchCommunityStats();
      alert(`Votre position "${btnVal}" a été enregistrée avec succès !`);
    } catch (err: any) {
      console.error("Erreur vote:", err);
      alert(`Erreur lors de l'enregistrement : ${err.message || "Problème de connexion"}`);
    } finally {
      setIsVoting(false);
    }
  };

  const colorMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  const badgeColor = colorMap[law.color] || "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <div 
      className={`relative bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all mb-4 transform-gpu ${isOpen ? 'ring-2 ring-primary/10' : ''}`}
    >
      {/* Background Image Layer (Immersive) */}
      {law.backgroundImage && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[2rem]">
          <img 
            src={law.backgroundImage} 
            alt="" 
            decoding="async"
            className="w-full h-full object-cover opacity-[0.28] scale-105 transition-transform duration-[2s] group-hover:scale-110 saturate-[1.1] transform-gpu backface-visibility-hidden will-change-transform" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-card/30 via-transparent to-card/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-card/10 via-transparent to-card/30" />
        </div>
      )}

      {/* 1. HEADER (TOUJOURS VISIBLE) */}
      <button 
        onClick={() => {
          startTransition(() => {
            setIsOpen(!isOpen);
          });
        }}
        className="relative z-10 w-full text-left p-6 md:p-8 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transform-gpu"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
            {law.category}
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight italic">
            {law.title}
          </h3>
          <div className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[9px] font-black uppercase rounded border border-amber-200 tracking-tighter shrink-0">
            Accès Premium Offert
          </div>
        </div>
        
        <motion.div 
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="p-2 rounded-full transform-gpu bg-muted/50 text-foreground"
        >
          <ChevronDown className={`w-6 h-6 ${isPending ? 'opacity-30' : ''}`} />
        </motion.div>
      </button>

      {/* 2. CONTENU DÉPLIABLE (ACCORDÉON OPTIMISÉ POUR L'INP) */}
      <motion.div
        initial={false}
        animate={{ 
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ 
          duration: 0.2, 
          ease: "circOut"
        }}
        className="overflow-hidden transform-gpu will-change-[height,opacity]"
      >
        <div className="relative z-10 px-8 pb-12 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-100/80 px-4 py-1.5 rounded-full capitalize w-fit mb-8">
            <span className={`w-2 h-2 rounded-full ${law.status === 'application' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            {law.statusLabel}
          </div>

          <div className="text-lg md:text-xl text-slate-800 font-medium leading-relaxed mb-10 max-w-4xl">
            {wrapWithGlossary(law.summary)}
          </div>

          {showHeavyContent && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Impacts */}
                <div className="space-y-6">
                  <h4 className="text-lg font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-6">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Décryptage : ce que ça change
                  </h4>
                  <div className="space-y-4">
                    {law.impacts.map((impact, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-5 bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="text-slate-700 text-base font-medium leading-relaxed">{wrapWithGlossary(impact)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline & Analysis */}
                <div className="space-y-10">
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-6">
                      <Calendar className="w-5 h-5 text-primary" />
                      Calendrier législatif
                    </h4>
                    <div className="space-y-7 pl-6 border-l-2 border-slate-200 ml-2">
                      {law.calendar.map((item, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-primary" />
                          <p className="text-xs font-bold uppercase text-primary tracking-widest mb-1.5">{item.date}</p>
                          <p className="text-base text-slate-800 font-semibold">{item.event}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deep Analysis */}
                  <div className="p-7 bg-blue-50/50 border border-blue-100 rounded-3xl relative overflow-hidden group shadow-sm">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Analyse approfondie de la rédaction
                      </h4>
                    </div>
                    <ul className="space-y-4">
                      {law.premiumPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-base text-slate-700 font-medium">
                          <ArrowRight className="w-5 h-5 text-amber-500/60 shrink-0 mt-0.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. MODULE DE VOTE CITOYEN */}
              {userId && (
                <div className="mt-12 pt-12 border-t border-slate-100">
                  <div className={`p-8 md:p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border ${isPremium ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-700"}`}>
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase rounded-full mb-6 ${isPremium ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                        <Star size={10} className={isPremium ? "fill-current" : ""} />
                        {isPremium ? "Action Citoyenne Elite" : "Action Citoyenne (Membre)"}
                      </div>
                      <h4 className="text-3xl font-staatliches uppercase mb-4 italic tracking-tight text-white leading-none">
                        Votre Position <span className={isPremium ? "text-amber-500" : "text-blue-400"}>Citoyenne</span>
                      </h4>
                      
                      {userVote ? (
                        <div className="flex items-center gap-3 bg-white/10 border border-white/10 px-4 py-3 rounded-2xl mb-8 w-fit text-sm font-bold text-amber-200">
                          <CheckCircle2 size={16} />
                          Vous avez voté : <span className="uppercase text-white">{userVote}</span>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-2xl">
                          {isPremium 
                            ? "En tant que membre Premium, enregistrez votre vote pour le comparer à celui des députés dans votre dashboard." 
                            : "Prenez position sur ce projet de loi. Connectez-vous à votre espace personnel pour suivre votre historique."}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { label: "POUR", val: "POUR", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white", activeColor: "bg-emerald-500 text-white border-transparent", icon: CheckCircle2 },
                          { label: "CONTRE", val: "CONTRE", color: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white", activeColor: "bg-red-500 text-white border-transparent", icon: XCircle },
                          { label: "ABSTENTION", val: "ABSTENTION", color: "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white", activeColor: "bg-slate-700 text-white border-transparent", icon: MinusCircle }
                        ].map((btn) => {
                          const isActive = userVote === btn.val;
                          return (
                            <button
                              key={btn.val}
                              disabled={isVoting}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(btn.val);
                              }}
                              className={`group p-6 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
                                isActive ? btn.activeColor : btn.color
                              } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <btn.icon size={20} className={isActive ? "" : "group-hover:rotate-12 transition-transform"} />
                              <span className="font-black text-[10px] tracking-widest">{btn.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* RÉSULTATS COMMUNAUTAIRES (VISIBLE APRÈS VOTE) */}
                      {userVote && communityStats && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <h5 className="font-staatliches text-xl italic tracking-wide text-amber-500">
                              Résultats de la Communauté
                            </h5>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {communityStats.total} votes cumulés
                            </span>
                          </div>

                          <div className="space-y-5">
                            {[
                              { label: "POUR", val: communityStats.POUR, color: "bg-emerald-500", raw: "POUR" },
                              { label: "CONTRE", val: communityStats.CONTRE, color: "bg-red-500", raw: "CONTRE" },
                              { label: "ABSTENTION", val: communityStats.ABSTENTION, color: "bg-slate-500", raw: "ABSTENTION" }
                            ].map((stat) => {
                              const percentage = communityStats.total > 0 
                                ? Math.round((stat.val / communityStats.total) * 100) 
                                : 0;
                              return (
                                <div key={stat.label} className="space-y-1.5">
                                  <div className="flex justify-between text-[10px] font-black tracking-tighter">
                                    <span className={userVote === stat.raw ? "text-white" : "text-slate-400"}>
                                      {stat.label} {userVote === stat.raw && " (Votre choix)"}
                                    </span>
                                    <span>{percentage}% ({stat.val})</span>
                                  </div>
                                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 1, ease: "circOut" }}
                                      className={`h-full ${stat.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
