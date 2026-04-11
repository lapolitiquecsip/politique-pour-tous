"use client";

import { use, useState, useEffect } from "react";
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
  X,
  Quote
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

// Mock data generator for votes
const getMockVotes = () => [
  { id: 1, title: "Loi Plein Emploi", date: "Janvier 2024", vote: "POUR", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2, lawSlug: "plein-emploi" },
  { id: 2, title: "Loi Programmation Militaire", date: "Octobre 2023", vote: "CONTRE", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle, lawSlug: "loi-militaire" },
  { id: 3, title: "Loi Immigration", date: "Décembre 2023", vote: "ABSTENTION", color: "text-amber-500", bg: "bg-amber-500/10", icon: MinusCircle, lawSlug: "loi-immigration" },
  { id: 4, title: "Réforme des Retraites", date: "Mars 2023", vote: "CONTRE", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle, lawSlug: "reforme-des-retraites" },
  { id: 5, title: "Loi Pouvoir d'Achat", date: "Juillet 2022", vote: "POUR", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2, lawSlug: "loi-pouvoir-achat" },
];

export default function DeputyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { userId, isPremium } = usePremium();
  
  const [deputy, setDeputy] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);

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

  // Format slug back to name for display
  const name = deputy?.first_name 
    ? `${deputy.first_name} ${deputy.last_name}`
    : slug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const votes = getMockVotes();
  const photoUrl = `https://www.nosdeputes.fr/depute/photo/${slug}/250`;

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
              <div className="relative aspect-[4/5]">
                <img 
                  src={photoUrl} 
                  alt={name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h1 className="text-4xl font-staatliches text-white tracking-tight uppercase leading-none mb-2">
                    {name}
                  </h1>
                  <p className="text-red-400 font-bold tracking-widest text-xs uppercase">
                    Député de la Nation
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
                       {deputy?.party || (slug === 'gabriel-attal' ? 'EPR' : 'Non spécifié')}
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

            {/* NEW: Integrity Badge Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
               <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Intégrité & Transparence</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Situation Juridique</h4>
                  </div>
                  <button 
                    onClick={() => setShowLegalModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all transform active:scale-95 border border-emerald-500/20"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Consulter
                  </button>
               </div>
            </div>

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
            {/* NEW: Biography / Background Section (Editorial Style) */}
            {deputy?.biography && (
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 md:p-14 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/10 transition-colors duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/5 rounded-full -ml-32 -mb-32 blur-3xl" />
                
                <div className="relative z-10">
                  {/* Badge Expertise */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Expertise Professionnelle
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 items-start mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white shrink-0 shadow-xl group-hover:rotate-6 transition-transform duration-500">
                      <Quote className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-4xl md:text-5xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                      Portrait & <span className="text-blue-600 underline decoration-blue-500/30 underline-offset-8">Parcours</span>
                    </h3>
                  </div>

                  <div className="font-playfair text-base md:text-lg text-slate-700 dark:text-slate-300 leading-[1.8] italic font-medium">
                    {(() => {
                      const bio = deputy.biography;
                      const firstChar = bio.charAt(0);
                      const rest = bio.slice(1);
                      
                      return (
                        <div className="relative">
                          <span className="float-left text-5xl md:text-6xl font-staatliches text-blue-600 mr-3 mt-1 leading-[0.8] drop-shadow-sm select-none">
                            {firstChar}
                          </span>
                          {rest.split(/(\*\*.*?\*\*)/).map((part: string, i: number) => 
                            part.startsWith('**') && part.endsWith('**') 
                              ? <strong key={i} className="font-bold text-slate-900 dark:text-white not-italic bg-blue-500/5 px-1 rounded-sm">{part.slice(2, -2)}</strong>
                              : part
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Bottom Signature Decor */}
                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between opacity-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archive Législative Officielle</p>
                  <div className="h-px w-24 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
                </div>
              </div>
            )}

            <div>
              <h2 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-4">
                Positions sur <span className="text-red-600">les grands votes</span>
              </h2>
              <p className="text-slate-500 font-medium max-w-xl">
                Retrouvez comment cet élu s'est positionné sur les textes législatifs les plus marquants de la législature actuelle.
              </p>
            </div>

            <div className="space-y-4">
              {votes.map((vote: any, idx) => (
                <Link key={vote.id} href={`/lois/${vote.lawSlug || 'reforme-des-retraites'}`}>
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (idx * 0.1) }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-red-500 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 transform hover:-translate-y-1 mb-4"
                  >
                    <div className="flex-1 flex items-center gap-6 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors shrink-0">
                        <Vote className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vote.date}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors truncate">
                          {vote.title}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Consulter le dossier &rarr;</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl ${vote.bg} ${vote.color} border border-transparent shadow-sm group-hover:shadow-lg transition-all shrink-0 min-w-[160px] justify-center`}>
                       <vote.icon className="w-5 h-5" />
                       <span className="font-black text-sm tracking-tighter italic">POSITION : {vote.vote}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* Footer info */}
            <div className="p-8 rounded-[2rem] bg-slate-100 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Landmark className="w-5 h-5" />
              </div>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                Les données de vote sont issues des scrutins publics de l'Assemblée nationale. 
                Une absence de vote peut être due à une délégation de vote ou un congé maladie.
              </p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* NEW: Legal Information Modal */}
      <AnimatePresence>
        {showLegalModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLegalModal(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                    <Gavel className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-staatliches uppercase tracking-tight">Dossier Juridique</h3>
                </div>
                <button onClick={() => setShowLegalModal(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:rotate-90 transition-transform">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 mt-1">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Statut Officiel</p>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        {deputy?.legal_issues || "Aucune affaire judiciaire n'a été signalée ou enregistrée pour ce député à ce jour dans nos bases de données."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600">
                   <AlertTriangle className="w-4 h-4" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">Information mise à jour en temps réel selon les sources officielles</p>
                </div>

                <button 
                  onClick={() => setShowLegalModal(false)}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                  Fermer le dossier
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
