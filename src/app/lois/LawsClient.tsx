import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Leaf, 
  Shield, 
  TrendingUp, 
  HeartPulse, 
  Users, 
  GraduationCap,
  Lock,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Calendar as CalendarIcon,
  Vote
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";
import DetailedLawDossier from "@/components/laws/DetailedLawDossier";
import { FREE_LAWS } from "@/data/free-laws-dossiers";
import { api } from "@/lib/api";
import VoteHemicycle from "@/components/laws/VoteHemicycle";
import LawDetailModal from "@/components/laws/LawDetailModal";

const CATEGORIES = [
  { id: "edu", label: "Éducation", icon: GraduationCap, color: "border-indigo-400", bgColor: "bg-indigo-50/80", iconBg: "bg-indigo-100", iconColor: "text-indigo-600", isFree: true },
  { id: "env", label: "Environnement", icon: Leaf, color: "border-emerald-400", bgColor: "bg-emerald-50/80", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { id: "eco", label: "Économie", icon: TrendingUp, color: "border-blue-400", bgColor: "bg-blue-50/80", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  { id: "sec", label: "Sécurité", icon: Shield, color: "border-slate-400", bgColor: "bg-slate-100/80", iconBg: "bg-slate-200", iconColor: "text-slate-600" },
  { id: "health", label: "Santé", icon: HeartPulse, color: "border-rose-400", bgColor: "bg-rose-50/80", iconBg: "bg-rose-100", iconColor: "text-rose-600" },
  { id: "social", label: "Social", icon: Users, color: "border-orange-400", bgColor: "bg-orange-50/80", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
];

export default function LawsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dossiers' | 'history'>('dossiers');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const { isPremium, loading: pLoading, userId } = usePremium();
  const [dbLaws, setDbLaws] = useState<any[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(true);
  const [selectedLaw, setSelectedLaw] = useState<any | null>(null);

  useEffect(() => {
    const loadLaws = async () => {
      const data = await api.getVotedLaws(60);
      setDbLaws(data);
      setLoadingLaws(false);
    };
    loadLaws();
    
    const interval = setInterval(async () => {
      const data = await api.getVotedLaws(60);
      setDbLaws(data);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const scrollToPremium = () => {
    const element = document.getElementById("premium-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-24">
      <LawDetailModal 
        law={selectedLaw} 
        isOpen={!!selectedLaw} 
        onClose={() => setSelectedLaw(null)} 
      />

      {/* TABS NAVIGATION (STUCK AT TOP ON SCROLL) */}
      <div className="sticky top-0 z-[50] bg-white/90 backdrop-blur-md py-6 mb-12 border-b border-slate-100 -mx-4 px-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => setActiveTab('dossiers')}
            className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'dossiers' 
                ? 'bg-slate-950 text-white shadow-2xl shadow-slate-950/20 scale-105' 
                : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100 hover:border-slate-300'
            }`}
          >
            <BookOpen size={18} />
            Dossiers Premium
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'history' 
                ? 'bg-slate-950 text-white shadow-2xl shadow-slate-950/20 scale-105' 
                : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100 hover:border-slate-300'
            }`}
          >
            <Vote size={18} />
            Historique des lois
          </button>
        </div>
      </div>
      {activeTab === 'dossiers' && (
        <>
          {/* 1. FILTRES THÉMATIQUES (ULTRA COMPACT BENTO STYLE) */}
      <div className="mb-24">
        <div className="relative mb-10 text-center md:text-left">
          <h3 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none">
            <span className="text-slate-900 opacity-5 absolute -top-8 left-0 select-none hidden md:block">COLLECTIONS</span>
            Explorez par <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">thématique</span>
          </h3>
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-red-600 mt-4 rounded-full mx-auto md:mx-0" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCat === cat.id;
            
            const handleCategoryClick = () => {
              if (cat.isFree || isPremium) {
                if (cat.id === "edu") {
                  router.push("/lois/education");
                } else if (cat.id === "env") {
                  router.push("/lois/environnement");
                } else {
                  setSelectedCat(cat.id);
                }
              } else {
                scrollToPremium();
              }
            };

            return (
              <button
                key={cat.id}
                onClick={handleCategoryClick}
                className={`group relative flex flex-col items-start gap-3 p-4 md:p-5 rounded-[1rem] border transition-all duration-500 shadow-sm overflow-hidden ${
                  isActive 
                    ? "ring-4 ring-blue-500/10 border-blue-500 bg-slate-950 text-white shadow-2xl scale-[1.02] border-t-4" 
                    : `hover:shadow-lg hover:-translate-y-1 border-slate-200 ${cat.bgColor} border-t-4`
                } ${cat.color}`}
              >
                {/* Background Pattern for Active state */}
                {isActive && (
                  <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
                )}

                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-2 md:p-2.5 rounded-lg ${isActive ? 'bg-white/10' : cat.iconBg} transition-all duration-500 group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? 'text-white' : cat.iconColor}`} />
                  </div>
                  
                  <div>
                    {(!cat.isFree && !isPremium) ? (
                      <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white/40' : 'text-slate-400'}`} />
                    ) : (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black border ${isActive ? 'bg-white/20 border-white/30 text-white' : (cat.isFree ? 'bg-white/50 border-indigo-100 text-indigo-600' : 'bg-amber-50 border-amber-200 text-amber-600')}`}>
                        {cat.isFree ? 'Libre' : 'Premium'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-left">
                  <span className={`text-xl md:text-2xl font-staatliches uppercase tracking-wide block leading-none ${isActive ? 'text-white' : 'text-slate-900 group-hover:text-blue-600 transition-colors'}`}>
                    {cat.label}
                  </span>
                  <p className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-1 transition-opacity duration-300 ${isActive ? 'text-white/40' : 'text-slate-400'}`}>
                    Dossiers
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* 3. DOSSIERS GRATUITS (POSTER STYLE REBORN) */}
      <div className="space-y-4 mb-32">
        <div className="relative mb-16 text-center md:text-left">
          <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none">
            <span className="text-slate-900 opacity-10 absolute -top-8 left-0 select-none hidden md:block">PREVIEW</span>
            L&apos;essentiel en <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">libre accès</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-red-600 mt-4 rounded-full mx-auto md:mx-0" />
          <p className="text-lg font-bold italic text-slate-500 mt-6 max-w-2xl font-staatliches">
            Voici une prévisualisation de nos dossiers Premium : une analyse complète pour chaque grande loi.
          </p>
        </div>

        <div className="space-y-12">
          {FREE_LAWS.map((law) => (
            <DetailedLawDossier key={law.id} law={law} />
          ))}
        </div>
      </div>

      {/* 4. LE RIDEAU DORÉ (SECTION PREMIUM VERROUILLÉE) */}
      {!isPremium && !pLoading && (
        <div id="premium-section" className="relative mt-32">
          {/* Fake Blurry Content */}
          <div className="opacity-40 grayscale pointer-events-none select-none blur-md space-y-12 mb-12">
             <div className="h-[400px] w-full bg-muted rounded-[3rem] border border-border" />
          </div>

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center -top-20">
            <div className="w-full max-w-2xl bg-card/80 backdrop-blur-2xl border border-amber-200/50 rounded-[3rem] p-10 md:p-16 text-center shadow-2xl relative overflow-hidden">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-8">
                <Lock className="w-10 h-10" />
              </div>
              <h3 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-tight">
                Accédez à <span className="text-amber-600 italic">tous</span> les dossiers
              </h3>
              <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
                Plus de <span className="text-foreground font-bold">150 dossiers législatifs</span> décryptés, mis à jour en temps réel.
              </p>
              <Link
                href={getPremiumUrl(userId)}
                className="group px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-3xl hover:shadow-2xl transition-all text-xl flex items-center gap-4 mx-auto w-fit"
              >
                Devenir membre Premium
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-12 mb-32">
          <div className="relative mb-16 text-center md:text-left">
            <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
               <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">XVIIe Législature</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none">
              Historique des <span className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">lois</span>
            </h2>
            <div className="h-1.5 w-24 bg-slate-950 mt-4 rounded-full mx-auto md:mx-0" />
            <p className="text-lg font-bold italic text-slate-500 mt-6 max-w-2xl font-staatliches">
              Toutes les lois votées à l&apos;Assemblée Nationale en temps réel.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {dbLaws.map((law, idx) => {
              const hasVotes = (law.pour + law.contre + law.abstention) > 0;
              
              return (
                <motion.div
                  key={law.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedLaw(law)}
                  className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row cursor-pointer group"
                >
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {law.category}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400">
                          <CalendarIcon size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {new Date(law.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-4 italic leading-tight line-clamp-3 group-hover:text-blue-600 transition-colors">
                        {law.objet}
                      </h3>
                      <div className="flex items-center gap-3 mt-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          law.resultat?.includes('adopté') 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                            : 'bg-red-50 border-red-100 text-red-600'
                        }`}>
                          {law.resultat}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-56 bg-slate-50/50 p-8 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-100">
                    {hasVotes ? (
                      <VoteHemicycle 
                        pour={law.pour || 0} 
                        contre={law.contre || 0} 
                        abstention={law.abstention || 0} 
                      />
                    ) : (
                      <div className="text-center space-y-2">
                         <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mx-auto" />
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Calcul des votes...</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {dbLaws.length === 0 && !loadingLaws && (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-300">
               <Vote className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Aucun vote enregistré pour le moment</p>
            </div>
          )}
        </div>
      )}
      {isPremium && (
        <div className="mt-20 p-8 rounded-[3rem] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 flex flex-col md:flex-row items-center gap-8 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 shadow-lg shadow-amber-200/50 flex-shrink-0">
            <Sparkles className="w-10 h-10" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Accès Premium Actif</h3>
            <p className="text-slate-600">
              Bienvenue ! En tant que membre Premium, vous avez accès à l&apos;intégralité des dossiers législatifs et aux analyses thématiques.
            </p>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl border border-amber-200 text-amber-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Membre Élite
          </div>
        </div>
      )}
    </div>
  );
}
