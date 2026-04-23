"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  MapPin, 
  Landmark, 
  Vote, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Calendar,
  ExternalLink,
  Bell,
  BellRing,
  Loader2,
  Star,
  History,
  ShieldCheck,
  Gavel,
  AlertTriangle,
  ChevronDown,
  X,
  Quote,
  Briefcase,
  FileText,
  Clock,
  Globe,
  Layers,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { getFullPartyName } from "@/lib/party-utils";
import VoteDetailsModal from "@/components/deputies/VoteDetailsModal";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import { useGlossary } from "@/components/providers/GlossaryProvider";

// Vote position formatting helper
const getVoteDisplay = (position: string) => {
  switch (position) {
    case 'POUR':
      return { label: 'POUR', color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 };
    case 'CONTRE':
      return { label: 'CONTRE', color: "text-red-500", bg: "bg-red-500/10", icon: XCircle };
    case 'ABSTENTION':
      return { label: 'ABSTENTION', color: "text-amber-500", bg: "bg-amber-500/10", icon: MinusCircle };
    default:
      return { label: 'NON VOTANT', color: "text-slate-400", bg: "bg-slate-100", icon: Vote };
  }
};

export default function DeputyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { userId, isPremium } = usePremium();
  const { wrapWithGlossary } = useGlossary();
  
  const [deputy, setDeputy] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(true);

  const [votes, setVotes] = useState<any[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tout");
  const [selectedVoteForModal, setSelectedVoteForModal] = useState<any | null>(null);

  // Helper to extract law info and group them
  const extractLawInfo = (objet: string) => {
    // 1. Check for global vote
    const globalMatch = objet.match(/l'ensemble d[ue]\s+(?:projet|proposition) de loi\s+(?:relatif à|visant à|autorisant|relative à)?\s*(.*?)(?:\s*\(|$)/i);
    if (globalMatch) {
      let title = globalMatch[1].trim();
      title = title.replace(/\s*\(.*?\)\s*$/, "").replace(/\s*$/, "");
      return { title: title.charAt(0).toUpperCase() + title.slice(1), isGlobal: true, isArticle: false };
    }

    // 2. Check for article vote (Accepts "du" and "de la")
    const articleMatch = objet.match(/l'article\s+(.*?)\s+(?:du|de la)\s+(?:proposition|projet) de loi\s+(?:relatif à|visant à|autorisant|relative à)?\s*(.*?)(?:\s*\(|$)/i);
    if (articleMatch) {
      // If it mentions an amendment "to" an article, we skip as user said "Pas les amendements"
      if (objet.toLowerCase().includes("l'amendement n°")) return null;
      let title = articleMatch[2].trim();
      title = title.replace(/\s*\(.*?\)\s*$/, "").replace(/\s*$/, "");
      return { title: title.charAt(0).toUpperCase() + title.slice(1), isGlobal: false, isArticle: true, article: articleMatch[1].trim() };
    }

    // 3. Fallback for "le projet de loi ..." without "l'ensemble"
    const genericMatch = objet.match(/(?:projet|proposition) de loi\s+(?:relatif à|visant à|autorisant|relative à)?\s*(.*?)(?:\s*\(|$)/i);
    if (genericMatch) {
      let title = genericMatch[1].trim();
      title = title.replace(/\s*\(.*?\)\s*$/, "").replace(/\s*$/, "");
      return { title: title.charAt(0).toUpperCase() + title.slice(1), isGlobal: true, isArticle: false };
    }

    return { title: objet, isGlobal: false, isArticle: false };
  };

  // Grouping Logic
  const groupedVotes = useMemo(() => {
    const groups: Record<string, any> = {};

    votes.forEach(v => {
      const s = v.scrutins;
      if (!s) return;

      const info = extractLawInfo(s.objet);
      if (!info) return; // Skip if null (like amendments)

      const key = info.title.toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          id: v.id,
          title: info.title.charAt(0).toUpperCase() + info.title.slice(1), // Capitalize
          category: s.category || "Autre",
          date: s.date_scrutin,
          mainVote: null,
          subVotes: [],
          // Keep a ref to the "best" scrutin for the main display
          representative: v
        };
      }

      if (info.isGlobal) {
        groups[key].mainVote = v;
        groups[key].representative = v;
      } else if (info.isArticle) {
        groups[key].subVotes.push({ ...v, articleLabel: info.article });
      } else if (!groups[key].mainVote) {
        // If we don't have a global yet, this one is the representative
        groups[key].representative = v;
      }
    });

    return Object.values(groups);
  }, [votes]);

  // Filtering Logic (now on the GROUPED items)
  const filteredVotes = useMemo(() => {
    return groupedVotes
      .filter(g => {
        const matchesCategory = selectedCategory === "Tout" || g.category === selectedCategory;
        return matchesCategory;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
  }, [groupedVotes, selectedCategory]);

  // Load real deputy and follow status
  useEffect(() => {
    const loadDeputyData = async () => {
      let dbDeputy = await api.getDeputyBySlug(slug).catch(() => null);
      
      // Inject mock data for Gabriel Attal (Demo purposes - robust even if DB/API fails)
      if (slug === 'gabriel-attal') {
        if (!dbDeputy) {
          dbDeputy = { 
            id: 'attal-gabriel', 
            first_name: 'Gabriel', 
            last_name: 'Attal', 
            slug: 'gabriel-attal', 
            party: 'EPR', 
            department: 'Hauts-de-Seine',
            constituency_number: 10
          };
        }
        if (!dbDeputy.biography) {
          dbDeputy.biography = "Gabriel Attal a commencé son parcours politique au Parti Socialiste avant de rejoindre En Marche en 2016. Plus jeune ministre de la République sous la Ve, puis plus jeune Premier ministre, il est une figure centrale de la majorité présidentielle. Son passage à l'Éducation Nationale lui a permis de porter des réformes majeures avant d'accéder à Matignon.";
        }
        if (!dbDeputy.legal_issues) {
          dbDeputy.legal_issues = "Aucune affaire judiciaire connue ou signalée à ce jour.";
        }
      }
      
      setDeputy(dbDeputy);

      if (dbDeputy && userId) {
        const follows = await api.getUserFollows(userId);
        const following = follows.some((f: any) => f.deputy_id === dbDeputy.id);
        setIsFollowing(following);
      }
      setCheckingFollow(false);

      // Load real votes
      if (dbDeputy?.an_id) {
        setLoadingVotes(true);
        const realVotes = await api.getVotesByDeputy(dbDeputy.an_id);
        setVotes(realVotes);
        setLoadingVotes(false);
      }
    };
    loadDeputyData();
  }, [slug, userId]);

  const handleFollow = async () => {
    if (!userId) {
      console.error("Suivi impossible : Utilisateur non connecté");
      return;
    }
    if (!isPremium) {
      console.error("Suivi impossible : Compte non Premium");
      return;
    }
    if (!deputy) {
      console.error("Suivi impossible : Données du député non trouvées en base de données", { slug });
      return;
    }
    
    setLoadingFollow(true);
    const previousState = isFollowing;
    setIsFollowing(!previousState); // Optimistic update

    try {
      if (previousState) {
        await api.unfollowDeputy(userId, deputy.id);
      } else {
        await api.followDeputy(userId, deputy.id);
      }
    } catch (err: any) {
      console.error("Erreur technique de suivi:", err.message);
      setIsFollowing(previousState); // Rollback on error
    } finally {
      setLoadingFollow(false);
    }
  };

  const isLegalClean = useMemo(() => {
    const issues = deputy?.legal_issues || "";
    if (!issues) return true;
    return issues.toLowerCase().includes("aucune") || issues.toLowerCase().includes("casier vierge");
  }, [deputy]);

  const groupFullName = getFullPartyName(deputy?.party || (slug === 'gabriel-attal' ? 'EPR' : ''));


  // Format slug back to name for display
  const name = deputy?.first_name 
    ? `${deputy.first_name} ${deputy.last_name}`
    : slug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const anImageId = deputy?.an_id ? deputy.an_id.replace('PA', '') : null;
  const sources = useMemo(() => {
    if (!anImageId) return [`https://www.nosdeputes.fr/depute/photo/${slug}/250`];
    return [
      `https://www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/${anImageId}.jpg`,
      `https://www.nosdeputes.fr/depute/photo/${slug}/250`,
      `https://www.assemblee-nationale.fr/dyn/static/tribun/photos/carre/${anImageId}.jpg`,
    ];
  }, [anImageId, slug]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setSrcIndex(0);
    setImgError(false);
  }, [deputy?.id]);

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setImgError(true);
    }
  };

  // const votes = getMockVotes(); -- REMOVED

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 1. Header Navigation */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            href="/deputes" 
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à la carte
          </Link>
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profil Officiel</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* LEFT COLUMN: Profile Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
              <div className="relative aspect-[4/5] bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {!imgError ? (
                  <img 
                    src={sources[srcIndex]} 
                    alt={name}
                    onError={handleImgError}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-6xl font-black text-slate-300 dark:text-slate-700 select-none">
                    {deputy?.first_name?.charAt(0)}{deputy?.last_name?.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h1 className="text-4xl font-staatliches text-white tracking-tight uppercase leading-none mb-2">
                    {name}
                  </h1>
                  <p className="text-red-400 font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                    {deputy?.biography?.includes('**Ministre**') ? (
                      <>
                        <ShieldCheck className="w-3 h-3" />
                        Membre du Gouvernement
                      </>
                    ) : (
                      'Député de la Nation'
                    )}
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                   <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/20">
                     <Landmark className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Groupe Politique</p>
                     <p className="font-bold text-slate-900 dark:text-white truncate">
                       {deputy?.party || (slug === 'gabriel-attal' ? 'EPR' : 'NI')}
                     </p>
                     <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5 whitespace-normal break-words">
                       {groupFullName}
                     </p>
                   </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                   <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                     <MapPin className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Circonscription</p>
                     <p className="font-bold text-slate-900 dark:text-white">
                       {deputy?.department || '...'} {deputy?.constituency_number ? `- ${deputy.constituency_number}ème` : ''}
                     </p>
                   </div>
                </div>
              </div>
            </div>

            {/* NEW: Integrity Badge Section (Bento Style) */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group transition-all duration-500"
            >
               <div className={`absolute top-0 left-0 w-2 h-full transition-colors duration-500 ${isLegalClean ? 'bg-emerald-500' : 'bg-amber-500'}`} />
               <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Intégrité & Transparence</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">Situation Juridique</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLegalClean ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isLegalClean ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isLegalClean ? 'Dossier Vierge' : 'Données à consulter'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowLegalModal(true)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all transform active:scale-95 shadow-lg border ${
                      isLegalClean 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-emerald-500/10' 
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white shadow-amber-500/10'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Consulter
                  </button>
               </div>
            </motion.div>

            <div className="bg-red-600 rounded-[2rem] p-8 text-white shadow-xl shadow-red-600/20">
               <h4 className="text-xl font-staatliches uppercase mb-4 tracking-tight">Contact Parlementaire</h4>
               <p className="text-sm opacity-90 leading-relaxed mb-6">
                 Vous pouvez contacter ce député pour toute question relative à l&apos;activité législative.
               </p>
               <div className="space-y-3">
                 <button className="w-full py-4 rounded-2xl bg-white text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Envoyer un message
                 </button>

                 {isPremium && (
                   <button 
                     onClick={handleFollow}
                     disabled={loadingFollow}
                     className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                       isFollowing 
                         ? "bg-transparent border-white text-white hover:bg-white/10" 
                         : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-lg"
                     }`}
                   >
                     {loadingFollow ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : isFollowing ? (
                       <>
                         <BellRing className="w-4 h-4" />
                         Suivi activé
                       </>
                     ) : (
                       <>
                         <Bell className="w-4 h-4" />
                         Suivre ce député
                       </>
                     )}
                   </button>
                 )}

                 {!isPremium && (
                   <Link href="/premium" className="w-full py-4 rounded-2xl bg-amber-400 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors group/premium">
                      <Star size={16} className="fill-current group-hover:rotate-12 transition-transform" />
                      Suivre (Premium)
                   </Link>
                 )}
               </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Votes & Activity */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-10"
          >
            {/* NEW: Biography / Background Section (Collapsible Editorial Style) */}
            {deputy?.biography && (
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group pb-2">
                {(() => {
                  const displayBio = deputy.biography.split('<!-- INTEGRITY_START -->')[0] || '';
                  return (
                    <>
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/10 transition-colors duration-1000" />
                      
                      <button 
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        className="w-full text-left p-8 md:px-12 md:py-10 relative z-10 flex items-center justify-between group/header"
                      >
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white shrink-0 shadow-lg group-hover/header:rotate-6 transition-transform duration-500">
                            <Quote className="w-6 h-6 opacity-50" />
                          </div>
                          <div className="flex flex-col">
                            <h3 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                              Portrait & <span className="text-blue-600">Parcours</span>
                            </h3>
                          </div>
                        </div>
                        <div className={`w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform duration-500 ${isBioExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </button>

                      <AnimatePresence>
                        {isBioExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-8 pb-10 md:px-12 md:pb-12 relative z-10 space-y-4">
                              {displayBio.split('\n\n').filter(Boolean).map((paragraph: string, pIdx: number) => {
                                let Icon = History;
                                const pLower = paragraph.toLowerCase();
                                if (pLower.includes('profession')) Icon = Briefcase;
                                if (pLower.includes('milieu social d\'origine')) Icon = Layers;
                                if (pLower.includes('origine')) Icon = MapPin;
                                if (pLower.includes('ancienneté')) Icon = Clock;
                                if (pLower.includes('groupe')) Icon = Landmark;
                                if (pLower.includes('commission')) Icon = FileText;
                                if (pLower.includes('amitiés internationales')) Icon = Globe;

                                return (
                                  <div 
                                    key={pIdx}
                                    className="flex gap-4 items-start bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 group/item hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-blue-600 shadow-sm shrink-0 group-hover/item:scale-110 transition-transform">
                                      <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="font-playfair text-base md:text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic pt-1">
                                      {paragraph.split(/(\*\*.*?\*\*)/).map((part: string, i: number) => 
                                        part.startsWith('**') && part.endsWith('**') 
                                          ? <strong key={i} className="font-bold text-slate-900 dark:text-white not-italic bg-blue-500/10 px-1.5 py-0.5 rounded-md mx-0.5">{part.slice(2, -2)}</strong>
                                          : wrapWithGlossary(part)
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Bottom Signature Decor */}
                              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between opacity-50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dossier Certifié Assemblée Nationale</p>
                                <div className="h-px w-24 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  );
                })()}
              </div>
            )}



            <div>
              <h2 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-4">
                Positions sur <span className="text-red-600">les scrutins</span>
              </h2>
              <p className="text-slate-500 font-medium max-w-xl mb-8">
                Retrouvez comment cet élu s&apos;est positionné sur l&apos;intégralité des textes législatifs de la législature actuelle.
              </p>

              {/* FILTERS UI */}
              {!loadingVotes && votes.length > 0 && (
                <div className="space-y-6 mb-10">
                  {/* Category Tabs */}
                  <div className="flex flex-wrap gap-2 pb-2">
                    {["Tout", "Sécurité & Justice", "Économie & Budget", "Santé & Social", "Environnement & Énergie", "Éducation & Culture", "International & Défense", "Institution & Citoyenneté", "Autre"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                          selectedCategory === cat 
                            ? "bg-red-600 text-white border-red-600 shadow-lg scale-105" 
                            : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-red-500"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {loadingVotes && (
                <div className="flex flex-col items-center py-20 text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Chargement des lois...</p>
                </div>
              )}

              {filteredVotes.length === 0 && !loadingVotes && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center">
                  <Vote className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold">
                    {votes.length === 0 
                      ? "Aucun scrutin législatif enregistré pour l'instant."
                      : "Aucune loi ne correspond à cette thématique."}
                  </p>
                </div>
              )}

              {filteredVotes.map((group: any, idx) => {
                const v = group.representative;
                const voteInfo = getVoteDisplay(v.position);
                const dateStr = group.date 
                  ? new Date(group.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Date inconnue';
                
                const category = group.category;

                return (
                  <motion.div 
                    key={group.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (idx * 0.05) }}
                    onClick={() => setSelectedVoteForModal({ ...v, subVotes: group.subVotes, cleanedTitle: group.title })}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-red-500 hover:shadow-2xl hover:shadow-red-500/10 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 mb-4"
                  >
                    <div className="flex-1 flex items-center gap-6 min-w-0 w-full">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors shrink-0">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dateStr}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter bg-blue-500/10 text-blue-600`}>
                            LOI
                          </span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {category}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors line-clamp-2">
                          {group.title}
                        </h3>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl ${voteInfo.bg} ${voteInfo.color} border border-transparent shadow-sm group-hover:shadow-lg transition-all shrink-0 min-w-[160px] justify-center`}>
                       <voteInfo.icon className="w-5 h-5" />
                       <span className="font-black text-sm tracking-tighter italic">VOTE : {voteInfo.label}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer info */}
            <div className="p-8 rounded-[2rem] bg-slate-100 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Landmark className="w-5 h-5" />
              </div>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                Les données de vote sont issues des scrutins publics de l&apos;Assemblée nationale. 
                Une absence de vote peut être due à une délégation de vote ou un congé maladie.
              </p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* NEW: Legal Information Modal */}
      <LegalStatusModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
        deputy={deputy} 
      />

      {/* NEW: Vote Details Modal */}
      <AnimatePresence>
        {selectedVoteForModal && (
          <VoteDetailsModal 
            vote={selectedVoteForModal} 
            onClose={() => setSelectedVoteForModal(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
