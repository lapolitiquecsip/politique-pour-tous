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
  Users,
  ArrowRight,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { AwardBadge } from "@/components/ui/award-badge";
import FollowButton from "@/components/shared/FollowButton";
import ShareButtons from "@/components/shared/ShareButtons";
import { getFullPartyName } from "@/lib/party-utils";
import VoteDetailsModal from "@/components/deputies/VoteDetailsModal";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import ActivityRank from "@/components/shared/ActivityRank";
import ParallelRoles from "@/components/shared/ParallelRoles";
import StructuredBio, { hasStructuredBio } from "@/components/shared/StructuredBio";
import InstitutionalRoleBanner from "@/components/shared/InstitutionalRoleBanner";
import InitiativeRank from "@/components/shared/InitiativeRank";
import { useGlossary } from "@/components/providers/GlossaryProvider";
import { deputyPhotoSources } from "@/lib/initiators";

// Vote position formatting helper
// Extrait d'evidence lisible sur le site : ajoute une ellipse si le texte a été tronqué
// (les extraits sont volontairement courts — droit d'auteur — et coupés en milieu de phrase).
const cleanExcerpt = (t: string) => {
  const s = (t || "").trim();
  if (!s) return s;
  return /[.!?…»)]$/.test(s) ? s : s + "…";
};

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

export default function DeputyDetailPage({ params, embedded }: { params: Promise<{ slug: string }>; embedded?: boolean }) {
  const { slug } = use(params);
  const { userId, isPremium } = usePremium();
  const { wrapWithGlossary } = useGlossary();
  
  const [deputy, setDeputy] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [candidateLink, setCandidateLink] = useState<{ slug: string } | null>(null);
  const [partyLink, setPartyLink] = useState<{ slug: string; name: string; logo_url?: string | null; color?: string | null } | null>(null);

  const [votes, setVotes] = useState<any[]>([]);
  const [authoredLaws, setAuthoredLaws] = useState<any[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(true);
  const [loadingAuthoredLaws, setLoadingAuthoredLaws] = useState(true);
  const [selectedVoteForModal, setSelectedVoteForModal] = useState<any | null>(null);
  const [isVotesExpanded, setIsVotesExpanded] = useState(false);
  // Brique #3 — filtre thématique des votes ("ce qu'il fait" par enjeu).
  const [issues, setIssues] = useState<any[]>([]);
  const [scrutinIssues, setScrutinIssues] = useState<Record<string, string[]>>({});
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [issueQuery, setIssueQuery] = useState("");
  const [positions, setPositions] = useState<Record<string, any>>({}); // "ce qu'il dit" par enjeu

  // Helper to extract law info and group them
  const extractLawInfo = (objet: string) => {
    // 1. Check for global vote (Handles "Loi complète :" or "l'ensemble du...")
    const globalMatch = objet.match(/(?:Loi complète\s*:\s*|l'ensemble d[ue]\s+)(?:projet|proposition) de loi\s+(?:relatif à|visant à|autorisant|relative à)?\s*(.*?)(?:\s*\(|$)/i);
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

    // 3. Fallback for "le projet de loi ..." or "Motion de Rejet :"
    const genericMatch = objet.match(/(?:Motion de Rejet\s*:\s*|(?:projet|proposition) de loi)\s+(?:relatif à|visant à|autorisant|relative à)?\s*(.*?)(?:\s*\(|$)/i);
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

    // Attache à chaque groupe l'ensemble des enjeux de ses scrutins (les "actes" par sujet).
    for (const g of Object.values(groups) as any[]) {
      const set = new Set<string>();
      const collect = (v: any) => { for (const s of scrutinIssues[String(v?.scrutins?.id)] || []) set.add(s); };
      if (g.mainVote) collect(g.mainVote);
      collect(g.representative);
      for (const sv of g.subVotes) collect(sv);
      g.issues = set;
    }
    return Object.values(groups);
  }, [votes, scrutinIssues]);

  // Enjeux réellement présents dans les votes de cet élu (pour les puces de filtre).
  const presentIssues = useMemo(() => {
    const count: Record<string, number> = {};
    for (const g of groupedVotes as any[]) for (const s of g.issues || []) count[s] = (count[s] || 0) + 1;
    return issues
      .filter(i => count[i.slug])
      .map(i => ({ ...i, count: count[i.slug] }))
      .sort((a, b) => b.count - a.count);
  }, [groupedVotes, issues]);

  // Pré-sélection : dès que les enjeux sont chargés, on ouvre par défaut le 1er sujet (idéalement
  // un où l'élu s'est aussi EXPRIMÉ) → parole vs actes visible immédiatement, sans action.
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked || presentIssues.length === 0) return;
    const withParole = presentIssues.find(i => positions[i.slug]);
    setSelectedIssue((withParole || presentIssues[0]).slug);
    setAutoPicked(true);
  }, [presentIssues, positions, autoPicked]);

  // Filtering Logic (now on the GROUPED items) — par ENJEU.
  const filteredVotes = useMemo(() => {
    return groupedVotes
      .filter((g: any) => !selectedIssue || (g.issues && g.issues.has(selectedIssue)))
      .sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
  }, [groupedVotes, selectedIssue]);

  // Recherche thématique : "ukraine" matche le titre OU un mot-clé grand public de l'enjeu.
  const normTxt = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const issueMatches = (i: any, q: string) => {
    const n = normTxt(q).trim();
    if (!n) return true;
    return normTxt(i.title).includes(n) || (i.keywords || []).some((k: string) => normTxt(k).includes(n));
  };
  const issueChip = (active: boolean) =>
    `px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${active ? "bg-red-600 text-white border-red-600 shadow-lg" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-red-500"}`;

  // Load real deputy and follow status
  useEffect(() => {
    const loadDeputyData = async () => {
      let dbDeputy = await api.getDeputyBySlug(slug).catch(() => null);
      
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
        // Tags d'enjeux des scrutins votés (les "actes" par sujet) + référentiel des enjeux.
        const ids = realVotes.map((v: any) => v?.scrutins?.id).filter(Boolean);
        api.getScrutinIssues(ids).then(setScrutinIssues).catch(() => {});
        api.getIssues().then(setIssues).catch(() => {});
      }
      // "Ce qu'il dit" : positions déclaratives (questions écrites) par enjeu.
      if (dbDeputy?.slug) api.getEntityPositions("deputy", dbDeputy.slug).then(setPositions).catch(() => {});

      // Load authored laws
      if (dbDeputy?.first_name) {
        setLoadingAuthoredLaws(true);
        const fullName = `${dbDeputy.first_name} ${dbDeputy.last_name}`;
        const laws = await api.getLawsByAuthor(fullName);
        setAuthoredLaws(laws);
        setLoadingAuthoredLaws(false);

        // Fil conducteur : cette personne est-elle candidate à la présidentielle ?
        api.findCandidateByName(fullName).then(c => setCandidateLink(c)).catch(() => {});
      }

      // Fil conducteur : fiche du parti/groupe.
      if (dbDeputy?.party) {
        api.findPartyByAlias(dbDeputy.party).then(p => setPartyLink(p)).catch(() => {});
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

  const sources = useMemo(
    () => deputyPhotoSources(deputy?.an_id ?? null, slug, deputy?.photo_url ?? null),
    [deputy?.an_id, slug, deputy?.photo_url]
  );

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
      {!embedded && (
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
      )}

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
                {(() => {
                  const inner = (
                    <>
                      {partyLink?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={partyLink.logo_url} alt={partyLink.name} className="w-12 h-12 rounded-2xl object-contain bg-white p-1 shrink-0 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/20">
                          <Landmark className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Groupe Politique</p>
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {deputy?.party || (slug === 'gabriel-attal' ? 'EPR' : 'NI')}
                        </p>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5 whitespace-normal break-words">
                          {groupFullName}
                        </p>
                        {partyLink && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-600 inline-flex items-center gap-1 mt-1.5 bg-red-50 px-2 py-1 rounded-lg group-hover/party:bg-red-100 transition-colors">Voir la fiche du parti <ArrowRight className="w-3 h-3" /></span>
                        )}
                      </div>
                    </>
                  );
                  return partyLink ? (
                    <Link href={`/partis/${partyLink.slug}`} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 transition hover:border-red-400 hover:bg-red-50/40 group/party">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      {inner}
                    </div>
                  );
                })()}

                {deputy?.department ? (
                  <Link href={`/local/?type=department&code=${encodeURIComponent(deputy.department)}`}
                    className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50 group">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                       <MapPin className="w-6 h-6" />
                     </div>
                     <div className="min-w-0">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Circonscription</p>
                       <p className="font-bold text-slate-900 dark:text-white">
                         {deputy.department} {deputy?.constituency_number ? `- ${deputy.constituency_number}ème` : ''}
                       </p>
                       <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 inline-flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Voir la politique locale <ArrowRight className="w-3 h-3" /></span>
                     </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                       <MapPin className="w-6 h-6" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Circonscription</p>
                       <p className="font-bold text-slate-900 dark:text-white">...</p>
                     </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fil conducteur : candidat·e à la présidentielle 2027 */}
            {candidateLink && (
              <Link
                href={`/presidentielles-2027/?candidat=${candidateLink.slug}`}
                className="block rounded-[2rem] p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group transition-all hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Présidentielle 2027</p>
                <h4 className="text-lg font-bold leading-tight mb-3">Candidat·e à l&apos;élection présidentielle</h4>
                <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-white/15 px-4 py-2 rounded-xl group-hover:bg-white/25 transition-colors">
                  Voir la fiche candidat·e <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            )}

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
            {/* Suivi bien en évidence, en tête de colonne (comme la fiche sénateur). */}
            <div className="flex flex-col items-start gap-3">
              <FollowButton kind="deputy" id={deputy?.id ? String(deputy.id) : null} label="ce député" />
              <ShareButtons title={`${deputy?.first_name ?? ""} ${deputy?.last_name ?? ""}`.trim() || "Fiche de l'élu"} />
            </div>

            {/* Fonction institutionnelle (Président·e / Vice-président·e / président·e de commission). */}
            {name && <InstitutionalRoleBanner fullName={name} bio={deputy?.bio} />}

            {/* Toutes les fonctions de la personne (député, PM, candidat, parti…). */}
            {name && <ParallelRoles fullName={name} selfHref={`/deputes/${deputy?.slug || ""}`} />}

            {/* NEW: Biography / Background Section (Collapsible Editorial Style) */}
            {(deputy?.biography || hasStructuredBio(deputy?.bio)) && (
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group pb-2">
                {(() => {
                  const displayBio = (deputy?.biography || "").split('<!-- INTEGRITY_START -->')[0] || '';
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
                              {hasStructuredBio(deputy?.bio) && <StructuredBio bio={deputy.bio} />}
                              {!hasStructuredBio(deputy?.bio) && displayBio.split('\n\n').filter(Boolean).map((paragraph: string, pIdx: number) => {
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

            {/* Présence aux votes — comparaison entre députés. */}
            {deputy && (
              <ActivityRank
                kind="deputy" rate={deputy.participation_rate} selfId={String(deputy.id)}
                peerLabel="députés"
                note="Taux de participation aux scrutins publics de l'Assemblée nationale. Comparaison entre députés pour situer l'assiduité de chacun·e. Source : Assemblée nationale."
              />
            )}

            {/* Loyauté au groupe — déplacée ici (auparavant dans le panneau « Activité parlementaire »). */}
            {deputy?.group_loyalty != null && (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
                      <Users className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loyauté au groupe</p>
                      <p className="text-sm text-slate-500">Votes alignés sur la position de son groupe.</p>
                    </div>
                  </div>
                  <span className="font-staatliches text-4xl leading-none text-emerald-600">{deputy.group_loyalty}%</span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${deputy.group_loyalty}%` }} />
                </div>
              </div>
            )}

            {/* Initiatives législatives : classement (déposés/co-signés + rang) PUIS la liste des textes. */}
            <div className="pt-4 mb-10">
              <h2 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-6">
                Initiatives <span className="text-amber-500">Législatives</span>
              </h2>

              {deputy && (
                <div className="mb-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8">
                  <InitiativeRank kind="deputy" selfId={String(deputy.id)} primary={deputy.initiative_primary_count} cosigned={deputy.initiative_count} peerLabel="députés" embedded />
                </div>
              )}

              <p className="text-slate-500 font-medium max-w-xl mb-8">
                Retrouvez les propositions de loi portées par cet élu.
              </p>

              {authoredLaws.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
                  {authoredLaws.map((law: any) => (
                    <Link 
                      key={law.id}
                      href={`/lois/?dossier=${law.id}`}
                      className="min-w-[300px] md:min-w-[350px] bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl hover:border-amber-400 hover:shadow-amber-400/5 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-600 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                          <FileText size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Proposition de loi
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 line-clamp-3 group-hover:text-amber-600 transition-colors">
                        {law.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${law.timeline?.includes('Adopté') ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="text-xs font-bold text-slate-500">{law.timeline || "En cours d'examen"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-8 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm italic">
                    Aucune proposition de loi n&apos;a été répertoriée pour ce député pour le moment.
                  </p>
                </div>
              )}
            </div>

            {/* REORDERED: Positions sur les scrutins Section (moved here) */}
            <div className="pt-8">
              <h2 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-4">
                Positions sur <span className="text-red-600">les scrutins</span>
              </h2>
              <p className="text-slate-500 font-medium max-w-xl mb-8">
                Retrouvez comment cet élu s&apos;est positionné sur l&apos;intégralité des textes législatifs de la législature actuelle.
              </p>

              {/* FILTRE THÉMATIQUE — "ce qu'il fait" par sujet (recherche + enjeux, via scrutin_issues) */}
              {!loadingVotes && votes.length > 0 && presentIssues.length > 0 && (
                <div className="space-y-4 mb-10">
                  <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={issueQuery}
                      onChange={(e) => setIssueQuery(e.target.value)}
                      placeholder="Filtrer les votes par sujet (retraites, ukraine, climat…)"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-red-500 outline-none text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedIssue(null)} className={issueChip(!selectedIssue)}>Tous les sujets</button>
                    {presentIssues.filter(i => issueMatches(i, issueQuery)).map(i => (
                      <button
                        key={i.slug}
                        onClick={() => setSelectedIssue(selectedIssue === i.slug ? null : i.slug)}
                        className={issueChip(selectedIssue === i.slug)}
                      >
                        {i.title} <span className="opacity-60">· {i.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PAROLE vs ACTES — quand un sujet est choisi : "ce qu'il DIT" (questions écrites) */}
              {selectedIssue && (() => {
                const pos = positions[selectedIssue];
                const label = (issues.find(i => i.slug === selectedIssue)?.title) || "ce sujet";
                const STANCE: Record<string, { txt: string; cls: string }> = {
                  pour: { txt: "Plutôt favorable", cls: "bg-emerald-100 text-emerald-700" },
                  contre: { txt: "Plutôt opposé", cls: "bg-red-100 text-red-700" },
                  nuance: { txt: "Position nuancée", cls: "bg-amber-100 text-amber-700" },
                  inconnu: { txt: "Position non tranchée", cls: "bg-slate-100 text-slate-600" },
                };
                const st = STANCE[pos?.stance] || STANCE.inconnu;
                return (
                  <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-600"><Quote className="h-4 w-4" /> Ce qu'il·elle dit — {label}</span>
                      {pos && <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${st.cls}`}>{st.txt}</span>}
                    </div>
                    {pos ? (
                      <>
                        {pos.summary && <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{pos.summary}</p>}
                        {Array.isArray(pos.evidence) && pos.evidence.length > 0 && (
                          <ul className={`${pos.summary ? "mt-3" : ""} space-y-1.5`}>
                            {pos.evidence.slice(0, 6).map((e: any, i: number) => (
                              <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                                {/* Extrait lisible DIRECTEMENT sur le site (pas de lien sortant vers la
                                    question écrite). La provenance officielle est indiquée sous la liste. */}
                                <span>{cleanExcerpt(e.excerpt)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source : questions écrites &amp; amendements (open data Assemblée nationale)</p>
                      </>
                    ) : (
                      <p className="text-sm italic text-slate-500">Aucune prise de parole recensée sur ce sujet (questions écrites). Son <span className="font-bold">action</span> reste visible ci-dessous via ses votes.</p>
                    )}
                  </div>
                );
              })()}
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

              <AnimatePresence mode="popLayout">
                {filteredVotes.slice(0, isVotesExpanded ? undefined : 5).map((group: any, idx) => {
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
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
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
              </AnimatePresence>

              {filteredVotes.length > 5 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsVotesExpanded(!isVotesExpanded)}
                  className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3"
                >
                  {isVotesExpanded ? (
                    <>Voir moins <ChevronDown className="w-4 h-4 rotate-180" /></>
                  ) : (
                    <>Voir l&apos;intégralité des votes ({filteredVotes.length}) <ChevronDown className="w-4 h-4" /></>
                  )}
                </motion.button>
              )}
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
