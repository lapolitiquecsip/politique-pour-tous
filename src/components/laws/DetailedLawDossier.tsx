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

const getHashIndex = (id: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

const getLawBackgroundImage = (law: LawDossier) => {
  const title = law.title.toLowerCase();
  const category = law.category.toLowerCase();
  const id = law.id;

  // 1. SPECIFIC KEYWORD MATCHES
  if (title.includes("prison") || title.includes("pénitentiaire") || title.includes("détenu") || title.includes("cellule") || title.includes("détention") || title.includes("rétention")) {
    return "/images/themes/securite_prison.png";
  }
  if (title.includes("terroris") || title.includes("antiterroris") || title.includes("sécurité")) {
    return "/images/themes/securite_terrorisme.png";
  }
  if (title.includes("cancer") || title.includes("thérapeut") || title.includes("recher") || title.includes("patholog")) {
    return "/images/themes/sante_adn.png";
  }
  if (title.includes("santé") || title.includes("medic") || title.includes("hôpital") || title.includes("soins")) {
    return "/images/themes/sante_hopital.png";
  }
  if (title.includes("climat") || title.includes("carbone") || title.includes("énerg") || title.includes("renouvel") || title.includes("résili") || title.includes("inondation")) {
    return "/images/themes/environnement_eolienne.png";
  }
  if (title.includes("fraude") || title.includes("fisc") || title.includes("tax") || title.includes("impôt") || title.includes("économ") || title.includes("créance")) {
    return "/images/themes/economie_argent.png";
  }
  if (title.includes("emploi") || title.includes("travail") || title.includes("chôm") || title.includes("salair") || title.includes("entreprise")) {
    return "/images/themes/economie_entreprise.png";
  }
  
  // 2. CATEGORY FALLBACKS
  if (category.includes("éduc") || category.includes("educ")) {
    return getHashIndex(id, 2) === 0 ? "/images/themes/education_ecole.png" : "/images/themes/education_diplome.png";
  }
  if (category.includes("écol") || category.includes("envir") || category.includes("climat")) {
    return getHashIndex(id, 2) === 0 ? "/images/themes/environnement_nature.png" : "/images/themes/environnement_eolienne.png";
  }
  if (category.includes("écon") || category.includes("finance")) {
    return getHashIndex(id, 2) === 0 ? "/images/themes/economie_argent.png" : "/images/themes/economie_entreprise.png";
  }
  if (category.includes("sécu") || category.includes("défense") || category.includes("milit") || category.includes("justi")) {
    return getHashIndex(id, 2) === 0 ? "/images/themes/securite_terrorisme.png" : "/images/themes/securite_prison.png";
  }
  if (category.includes("santé") || category.includes("medic") || category.includes("social")) {
    return getHashIndex(id, 2) === 0 ? "/images/themes/sante_hopital.png" : "/images/themes/sante_adn.png";
  }
  if (category.includes("social") || category.includes("société")) {
    return getHashIndex(id, 2) === 0 ? "/images/themes/social_famille.png" : "/images/themes/social_communaute.png";
  }

  return "/images/themes/social_communaute.png"; // Fallback par défaut
};

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

  const bgMap: Record<string, string> = {
    indigo: "bg-indigo-500 hover:bg-indigo-400 text-white",
    emerald: "bg-emerald-500 hover:bg-emerald-400 text-white",
    blue: "bg-blue-500 hover:bg-blue-400 text-white",
    slate: "bg-slate-800 hover:bg-slate-700 text-white",
    rose: "bg-rose-500 hover:bg-rose-400 text-white",
    orange: "bg-orange-500 hover:bg-orange-400 text-white",
    violet: "bg-violet-700 hover:bg-violet-600 text-white",
  };

  const cardTheme = bgMap[law.color] || "bg-slate-800 hover:bg-slate-700 text-white";

  return (
    <div 
      id={law.id}
      className={`relative transition-all duration-500 group ${isOpen ? 'col-span-full z-20' : 'hover:-translate-y-2'}`}
    >
      {/* 1. THE UNDERLYING SHEETS */}
      {!isOpen && (
        <>
          {/* Bottom Sheet */}
          <div 
            className="absolute inset-0 bg-[#f8fafc] rounded-[1.5rem] transition-all duration-500 origin-bottom-right rotate-2 translate-y-1 group-hover:rotate-[5deg] group-hover:translate-x-3 group-hover:translate-y-2 border border-slate-200 shadow-[2px_2px_8px_rgba(0,0,0,0.05)]"
            style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #cbd5e1 27px, #cbd5e1 28px)', backgroundPosition: '0 14px' }}
          />
          {/* Middle Sheet */}
          <div 
            className="absolute inset-0 bg-white rounded-[1.5rem] transition-all duration-500 origin-bottom-left -rotate-1 translate-y-0.5 group-hover:-rotate-[3deg] group-hover:-translate-x-2 group-hover:translate-y-1 border border-slate-200 shadow-[2px_2px_8px_rgba(0,0,0,0.05)]"
            style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #cbd5e1 27px, #cbd5e1 28px)', backgroundPosition: '0 14px' }}
          />
        </>
      )}

      {/* 2. THE MAIN SHEET */}
      <div 
        className={`relative z-10 shadow-xl transition-all duration-500 flex flex-col overflow-hidden ${cardTheme} ${isOpen ? 'rounded-[2rem]' : 'rounded-[1.5rem]'}`}
      >
        {/* Background Image with Overlay Blend */}
        {(() => {
          const bgUrl = getLawBackgroundImage(law);
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
          const finalUrl = bgUrl.startsWith('/') ? `${basePath}${bgUrl}` : bgUrl;
          return finalUrl ? (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none opacity-[0.22] mix-blend-overlay">
              <img 
                src={finalUrl} 
                alt="" 
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
            </div>
          ) : null;
        })()}

        {/* 3. HEADER */}
        <button 
          onClick={() => {
            startTransition(() => {
              setIsOpen(!isOpen);
            });
          }}
          className={`relative z-10 w-full text-left flex flex-col transition-all focus-visible:outline-none group/header ${isOpen ? 'p-5 md:p-6 pb-5' : 'p-5 md:p-6 h-full justify-between aspect-[3/4] sm:aspect-[1/1.3] min-h-[300px]'}`}
        >
          <div className="space-y-4 md:space-y-6 w-full">
            <div className="flex justify-between items-start w-full">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="px-3 py-1 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-md flex items-center gap-1.5">
                  <span className="opacity-70">LOI</span>
                  <span className="opacity-50">•</span>
                  <span>{law.category}</span>
                </div>
                {(() => {
                  let dateInfo = null;
                  if (law.date_adopted) {
                    const d = new Date(law.date_adopted);
                    if (!isNaN(d.getTime())) {
                      const formatted = d.toLocaleDateString("fr-FR", { month: 'short', year: 'numeric' });
                      dateInfo = formatted.endsWith('.') ? formatted.slice(0, -1) : formatted;
                    }
                  }
                  
                  if (!dateInfo) {
                    dateInfo = law.calendar.length > 0 ? law.calendar[law.calendar.length - 1].date : null;
                  }
                  
                  if (!dateInfo) return null;
                  return (
                    <div className="px-3 py-1 bg-white/10 text-white/90 text-[10px] md:text-[11px] font-black rounded-full uppercase tracking-widest backdrop-blur-sm">
                      {dateInfo}
                    </div>
                  );
                })()}
                <div className="px-3 py-1 bg-white/10 text-white/90 text-[10px] md:text-[11px] font-black rounded-full uppercase tracking-widest backdrop-blur-sm flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${law.status === 'application' ? 'bg-green-400' : 'bg-amber-400'}`} />
                  {law.statusLabel}
                </div>
              </div>
              {!isOpen && (
                <div className="p-2 md:p-2.5 rounded-xl bg-white/10 text-white backdrop-blur-sm group-hover/header:bg-white/20 transition-all">
                  <ChevronDown className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 w-full">
              <h3 className={`font-staatliches uppercase tracking-wider block leading-none w-full break-words drop-shadow-sm transition-all ${isOpen ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}`}>
                {law.title}.
              </h3>
            </div>
          </div>

          {!isOpen && (
            <div className="w-full flex-grow flex flex-col justify-center space-y-4 py-3">
              {/* Element 2: Mini legislative progress timeline */}
              {(() => {
                const steps = [
                  { label: "Dépôt", active: false, done: true },
                  { label: "Débats", active: law.status === 'debat', done: law.status === 'vote' || law.status === 'application' },
                  { label: "Vote", active: law.status === 'vote', done: law.status === 'application' },
                  { label: "Application", active: law.status === 'application', done: law.status === 'application' },
                ];
                
                return (
                  <div className="w-full py-1">
                    <div className="relative flex items-center justify-between px-1.5">
                      <div className="absolute left-0 right-0 top-1.5 h-[2px] bg-white/20 z-0" />
                      {steps.map((step, idx) => {
                        let dotBg = "bg-white/30";
                        let ring = "";
                        if (step.active) {
                          dotBg = "bg-amber-400";
                          ring = "ring-[3px] ring-amber-400/40 scale-110";
                        } else if (step.done) {
                          dotBg = "bg-white";
                        }
                        
                        return (
                          <div key={idx} className="relative z-10 flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${dotBg} ${ring}`} />
                            <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-wider mt-1.5 select-none ${
                              step.active 
                                ? "text-amber-300 font-extrabold" 
                                : step.done 
                                  ? "text-white" 
                                  : "text-white/40"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Element 3: Vote bar if voteData is available */}
              {law.voteData && (() => {
                const total = law.voteData.pour + law.voteData.contre + law.voteData.abstention;
                const pctPour = total > 0 ? Math.round((law.voteData.pour / total) * 100) : 0;
                const pctContre = total > 0 ? Math.round((law.voteData.contre / total) * 100) : 0;
                return (
                  <div className="space-y-1.5 bg-white rounded-xl p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] select-none">
                    <div className="flex justify-between items-center text-[8px] md:text-[9px] font-black uppercase tracking-wider text-slate-800">
                      <span className="opacity-75">🗳️ Vote Assemblée</span>
                      <span className="text-emerald-600 font-extrabold">{pctPour}% POUR</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${pctPour}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${pctContre}%` }} />
                      <div className="h-full bg-slate-300" style={{ width: `${100 - pctPour - pctContre}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {!isOpen && (
            <div className="mt-6 pt-4 border-t border-white/20 w-full flex items-center justify-between">
               <p className="text-white/60 font-bold italic text-xs">Cliquer pour déplier la fiche</p>
            </div>
          )}

          {isOpen && (
            <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <div className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all flex items-center justify-center">
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
        <div className="relative z-10 px-6 md:px-8 pb-8 pt-8 bg-white text-slate-800 rounded-[1.5rem] mx-2 mb-2 shadow-inner">

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 mb-12">
            {/* Left column */}
            <div className="space-y-8 flex flex-col justify-center">
              {/* Résumé de la loi */}
              <div>
                <h4 className="text-base font-bold flex items-center gap-2 text-slate-900 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Résumé de la loi
                </h4>
                <div className="p-6 bg-slate-50 text-slate-700 text-base italic leading-relaxed rounded-2xl border border-slate-100">
                  {wrapWithGlossary(law.summary)}
                </div>
              </div>

              {/* État d'avancement */}
              <div>
                <h4 className="text-base font-bold flex items-center gap-2 text-slate-900 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  État d'avancement
                </h4>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-300"></span>
                  </span>
                  <span className="text-slate-400 italic text-sm">{law.timeline || "Mise à jour en cours par nos services..."}</span>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Initiateur du texte */}
              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-center min-h-[120px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">INITIATEUR DU TEXTE</span>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                    <UserCheck className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-lg leading-tight">
                      {law.author && law.author !== 'Non spécifié' ? law.author : 'Non spécifié'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight mt-1">
                      {law.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Auto Update Box */}
              <div className="bg-slate-950 rounded-[2rem] p-6 flex items-center gap-4 min-h-[120px]">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <p className="text-slate-300 text-sm leading-snug">
                  Ce dossier est <span className="text-white font-bold underline decoration-blue-500 decoration-2 underline-offset-2">mis à jour automatiquement</span> par notre intelligence artificielle.
                </p>
              </div>
            </div>
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
                  <div className="col-span-1 lg:col-span-2 bg-amber-50 rounded-[2rem] text-slate-900 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] border-2 border-slate-900">
                    <button 
                      onClick={() => setIsVoteOpen(!isVoteOpen)}
                      className="w-full p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left hover:bg-amber-100/50 transition-colors group/vote-btn"
                    >
                      <div>
                        <h4 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 mb-2 flex items-center gap-3">
                          <div className={`p-2 rounded-xl rotate-3 shadow-md transition-colors ${isVoteOpen ? 'bg-blue-600' : 'bg-blue-500'}`}>
                            <Vote className="w-6 h-6 text-white" />
                          </div>
                          Le verdict de l'Assemblée
                        </h4>
                        <p className="text-slate-500 font-bold italic text-sm">Cliquez pour voir comment vos députés ont tranché</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="px-5 py-2 bg-green-400 border-2 border-slate-900 rounded-xl -rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <span className="text-2xl font-black font-staatliches block leading-none">{law.voteData.pour} POUR</span>
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
                      <div className="px-6 md:px-8 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2 border-2 border-green-500">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-3xl font-black text-green-600 font-staatliches">{law.voteData.pour}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pour la loi</span>
                          </div>
                          
                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-2 border-2 border-red-500">
                              <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-3xl font-black text-red-600 font-staatliches">{law.voteData.contre}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contre la loi</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 border-2 border-slate-400">
                              <MinusCircle className="w-5 h-5 text-slate-500" />
                            </div>
                            <span className="text-3xl font-black text-slate-500 font-staatliches">{law.voteData.abstention}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Abstentions</span>
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
                <div className="space-y-4">
                  <h4 className="text-base font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-4">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Décryptage : ce que ça change
                  </h4>
                  <div className="space-y-3">
                    {law.impacts.map((impact, idx) => (
                      <div key={idx} className="flex gap-3 items-start p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="text-slate-700 text-sm font-medium leading-relaxed">{wrapWithGlossary(impact)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline & Analysis */}
                <div className="space-y-8">
                  <div>
                    <h4 className="text-base font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-4">
                      <Calendar className="w-4 h-4 text-primary" />
                      Calendrier législatif
                    </h4>
                    <div className="space-y-5 pl-5 border-l-2 border-slate-200 ml-2">
                      {law.calendar.map((item, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-card border-2 border-primary" />
                          <p className="text-[10px] font-bold uppercase text-primary tracking-widest mb-1">{item.date}</p>
                          <p className="text-sm text-slate-800 font-semibold">{item.event}</p>
                        </div>
                      ))}
                    </div>
                </div>
              </div>

              {/* Analyse Détaillée Premium Block */}
              {isPremium ? (
                <div className="mt-12 p-8 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-[2rem] shadow-sm">
                  <h4 className="text-slate-900 font-bold text-lg uppercase tracking-wider flex items-center gap-2 mb-6">
                    <Zap className="w-6 h-6 text-amber-500" fill="currentColor" />
                    Analyse Détaillée
                  </h4>
                  <div className="prose prose-slate max-w-none text-slate-800 space-y-4 whitespace-pre-wrap">
                    {law.content || law.premiumPoints?.join('\n')}
                  </div>
                </div>
              ) : (
                <div className="mt-12 relative overflow-hidden bg-[#0A0A10] rounded-[2rem] p-8 md:p-12 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-6 md:gap-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                      <Zap className="w-8 h-8 md:w-10 md:h-10 text-[#0A0A10]" fill="currentColor" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-amber-500 font-staatliches uppercase text-xl md:text-2xl tracking-widest leading-none mb-1">ANALYSE</span>
                      <span className="text-white font-staatliches uppercase text-3xl md:text-4xl tracking-widest leading-none mb-3">DÉTAILLÉE</span>
                      <span className="text-amber-500/70 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">RÉSERVÉ AUX MEMBRES PREMIUM</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const el = document.getElementById('premium-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                      else window.location.href = '/premium';
                    }}
                    className="relative z-10 w-full md:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.4)] whitespace-nowrap overflow-hidden group-hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                  >
                    <span className="relative z-10">DEVENIR PREMIUM</span>
                  </button>
                </div>
              )}

              {/* 3. MODULE DE VOTE CITOYEN */}
              {userId && (
                <div className="mt-10 pt-10 border-t border-slate-100">
                  <div className={`p-6 md:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden border ${isPremium ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-700"}`}>
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[8px] font-black uppercase rounded-full mb-4 ${isPremium ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                        <Star size={8} className={isPremium ? "fill-current" : ""} />
                        {isPremium ? "Action Citoyenne Elite" : "Action Citoyenne (Membre)"}
                      </div>
                      <h4 className="text-2xl font-staatliches uppercase mb-3 italic tracking-tight text-white leading-none">
                        Votre Position <span className={isPremium ? "text-amber-500" : "text-blue-400"}>Citoyenne</span>
                      </h4>
                      
                      {userVote ? (
                        <div className="flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-2 rounded-xl mb-6 w-fit text-xs font-bold text-amber-200">
                          <CheckCircle2 size={14} />
                          Vous avez voté : <span className="uppercase text-white">{userVote}</span>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs mb-6 leading-relaxed max-w-2xl">
                          {isPremium 
                            ? "En tant que membre Premium, enregistrez votre vote pour le comparer à celui des députés dans votre dashboard." 
                            : "Prenez position sur ce projet de loi. Connectez-vous à votre espace personnel pour suivre votre historique."}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                              className={`group p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 ${
                                isActive ? btn.activeColor : btn.color
                              } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <btn.icon size={16} className={isActive ? "" : "group-hover:rotate-12 transition-transform"} />
                              <span className="font-black text-[9px] tracking-widest">{btn.label}</span>
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
