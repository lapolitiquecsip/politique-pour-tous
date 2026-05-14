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
  Vote,
  FileText
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
  const [isVoteOpen, setIsVoteOpen] = useState(false);
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
      id={law.id}
      className={`relative transition-all duration-500 ${isOpen ? 'col-span-full z-20' : 'hover:-translate-y-2'}`}
    >
      {/* 1. THE STACK (BACKGROUND SHEETS) */}
      {!isOpen && (
        <>
          <div className="absolute inset-0 bg-white border-2 border-slate-900 rounded-[2rem] rotate-2 translate-x-1 translate-y-1 z-0 shadow-sm" />
          <div className="absolute inset-0 bg-white border-2 border-slate-900 rounded-[2rem] -rotate-1 -translate-x-1 z-1 shadow-sm" />
        </>
      )}

      {/* 2. THE MAIN SHEET */}
      <div 
        className={`relative z-10 bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col ${isOpen ? 'rounded-[3rem] p-4' : 'rounded-[2rem] min-h-[420px]'}`}
        style={{ 
          backgroundImage: !isOpen ? 'repeating-linear-gradient(transparent, transparent 31px, #f1f5f9 31px, #f1f5f9 32px)' : 'none',
          backgroundSize: '100% 32px',
          backgroundPosition: '0 40px'
        }}
      >
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] z-10 rounded-[inherit]" />
        
        {/* Folded Corner Effect (Bottom Left) */}
        {!isOpen && (
          <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none z-20">
            <div className="absolute bottom-0 left-0 w-full h-full bg-white border-t-4 border-r-4 border-slate-900 rounded-tr-xl -rotate-1 shadow-[-4px_4px_0px_0px_rgba(255,255,255,1)]" />
            <div className="absolute bottom-0 left-0 w-[calc(100%-4px)] h-[calc(100%-4px)] bg-slate-50 border-t-2 border-r-2 border-slate-200 rounded-tr-lg" />
          </div>
        )}

        {/* 3. HEADER (SHEET STYLE) */}
        <button 
          onClick={() => {
            startTransition(() => {
              setIsOpen(!isOpen);
            });
          }}
          className={`relative z-10 w-full text-left flex flex-col transition-all focus-visible:outline-none group/header ${isOpen ? 'p-8 md:p-12 pb-8' : 'p-8 md:p-10 h-full justify-between'}`}
        >
          <div className="space-y-6">
            <div className="flex justify-between items-start w-full">
              <div className="flex gap-2 items-center">
                <div className={`w-fit px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-3 ${badgeColor} bg-white text-slate-900 border-slate-900`}>
                  {law.category}
                </div>
                {/* Vintage Year Stamp */}
                {(() => {
                  const lastYear = law.calendar.length > 0 ? law.calendar[law.calendar.length - 1].date.match(/\d{4}/)?.[0] : null;
                  if (!lastYear) return null;
                  return (
                    <div className="px-3 py-1 border-2 border-red-600/30 text-red-600/40 text-[11px] font-black rounded-lg rotate-12 -mt-1 select-none pointer-events-none uppercase tracking-tighter">
                      Vote {lastYear}
                    </div>
                  );
                })()}
              </div>
              {!isOpen && (
                <div className="p-3 rounded-2xl bg-slate-100 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-slate-900 group-hover/header:bg-blue-500 group-hover/header:text-white transition-all -rotate-2">
                  <ChevronDown className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className={`font-black text-slate-900 tracking-tight leading-[1.1] transition-all ${isOpen ? 'text-3xl md:text-5xl max-w-4xl' : 'text-2xl md:text-3xl'}`}>
                {law.title}
              </h3>
              
              <div className="flex flex-wrap gap-3 items-center">
                <div className="px-3 py-1 bg-amber-400 text-slate-900 text-[9px] font-black uppercase rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] tracking-tighter rotate-1">
                  Accès Premium Offert
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <FileText className="w-3 h-3" />
                  Dossier Complet
                </div>
              </div>
            </div>
          </div>

          {!isOpen && (
            <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100 flex items-center justify-between">
               <p className="text-slate-500 font-bold italic text-sm">Cliquer pour déplier la fiche</p>
               <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
          )}

          {isOpen && (
            <div className="absolute top-8 right-8">
              <div className="p-4 rounded-full bg-slate-900 text-white shadow-xl hover:scale-110 transition-transform flex items-center justify-center">
                <ChevronDown className="w-6 h-6 rotate-180" />
              </div>
            </div>
          )}
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
        <div className="relative z-10 px-8 pb-12 pt-0">
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
                {/* Voting Results (Educational & Collapsible) */}
                {law.voteData && (
                  <div className="col-span-1 lg:col-span-2 bg-amber-50 rounded-[3rem] text-slate-900 relative overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)] border-4 border-slate-900">
                    <button 
                      onClick={() => setIsVoteOpen(!isVoteOpen)}
                      className="w-full p-10 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 text-left hover:bg-amber-100/50 transition-colors group/vote-btn"
                    >
                      <div>
                        <h4 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900 mb-2 flex items-center gap-3">
                          <div className={`p-2 rounded-xl rotate-3 shadow-lg transition-colors ${isVoteOpen ? 'bg-blue-600' : 'bg-blue-500'}`}>
                            <Vote className="w-8 h-8 text-white" />
                          </div>
                          Le verdict de l'Assemblée
                        </h4>
                        <p className="text-slate-500 font-bold italic text-lg">Cliquez pour voir comment vos députés ont tranché</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="px-6 py-3 bg-green-400 border-4 border-slate-900 rounded-2xl -rotate-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <span className="text-3xl font-black font-staatliches block leading-none">{law.voteData.pour} POUR</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isVoteOpen ? 180 : 0 }}
                          className="p-3 bg-white border-2 border-slate-900 rounded-xl"
                        >
                          <ChevronDown className="w-6 h-6" />
                        </motion.div>
                      </div>
                    </button>

                    <motion.div
                      initial={false}
                      animate={{ height: isVoteOpen ? "auto" : 0, opacity: isVoteOpen ? 1 : 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-10 md:px-14 pb-14">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                          <div className="bg-white p-6 rounded-3xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 border-2 border-green-500">
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <span className="text-4xl font-black text-green-600 font-staatliches">{law.voteData.pour}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Pour la loi</span>
                          </div>
                          
                          <div className="bg-white p-6 rounded-3xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 border-2 border-red-500">
                              <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <span className="text-4xl font-black text-red-600 font-staatliches">{law.voteData.contre}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Contre la loi</span>
                          </div>

                          <div className="bg-white p-6 rounded-3xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 border-2 border-slate-400">
                              <MinusCircle className="w-6 h-6 text-slate-500" />
                            </div>
                            <span className="text-4xl font-black text-slate-500 font-staatliches">{law.voteData.abstention}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Abstentions</span>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute -left-4 -top-4 w-full h-full bg-blue-500/5 rounded-[2rem] -rotate-1 pointer-events-none" />
                          <h5 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                            <span className="w-8 h-1 bg-blue-500 rounded-full" />
                            Positions par groupe politique
                          </h5>
                          
                          {law.voteData.group_results && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
                              {law.voteData.group_results.map((group: any, i: number) => {
                                const GROUP_NAMES: Record<string, string> = {
                                  'PO845401': 'LFI-NFP',
                                  'PO845407': 'GDR (Gauche)',
                                  'PO845413': 'Socialistes',
                                  'PO845419': 'Écologistes',
                                  'PO845425': 'LIOT',
                                  'PO845439': 'Ensemble (Renaissance)',
                                  'PO845454': 'MoDem',
                                  'PO845470': 'Horizons',
                                  'PO845485': 'Droite Républicaine',
                                  'PO845514': 'RN',
                                  'PO872880': 'UDR (Ciotti)',
                                  'PO840056': 'Non-inscrits'
                                };
                                
                                const groupName = GROUP_NAMES[group.group_id] || group.group_id;
                                const isPour = group.pour > group.contre && group.pour > group.abstention;
                                const isContre = group.contre > group.pour && group.contre > group.abstention;
                                
                                const groupStyle = isPour 
                                  ? 'bg-green-100 border-green-500 text-green-700' 
                                  : isContre 
                                    ? 'bg-red-100 border-red-500 text-red-700' 
                                    : 'bg-slate-100 border-slate-400 text-slate-600';
                                
                                return (
                                  <div 
                                    key={i} 
                                    className={`p-4 rounded-2xl border-2 ${groupStyle} flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]`}
                                  >
                                    <span className="text-[11px] font-black uppercase leading-tight mb-3" title={groupName}>{groupName}</span>
                                    <div className="flex justify-between items-end">
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-bold uppercase opacity-60">Pour</span>
                                        <span className="text-lg font-black font-staatliches">{group.pour}</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-bold uppercase opacity-60">Contre</span>
                                        <span className="text-lg font-black font-staatliches">{group.contre}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

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
  </div>
);
}
