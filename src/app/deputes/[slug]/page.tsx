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
  Star
} from "lucide-react";
import { motion } from "framer-motion";
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

  // Load real deputy and follow status
  useEffect(() => {
    const loadDeputyData = async () => {
      const dbDeputy = await api.getDeputyBySlug(slug);
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
    if (!userId || !isPremium || !deputy) return;
    
    setLoadingFollow(true);
    const previousState = isFollowing;
    setIsFollowing(!previousState); // Optimistic update

    try {
      if (previousState) {
        await api.unfollowDeputy(userId, deputy.id);
      } else {
        await api.followDeputy(userId, deputy.id);
      }
    } catch (err) {
      console.error("Erreur de suivi:", err);
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
                     <p className="font-bold text-slate-900 dark:text-white">Picardie Debout / LFI-NFP</p>
                   </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                   <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                     <MapPin className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Circonscription</p>
                     <p className="font-bold text-slate-900 dark:text-white">Somme - 1ère</p>
                   </div>
                </div>
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
    </div>
  );
}
