"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
// ... (imports lucide-react)
import { 
  User, 
  Star, 
  Vote, 
  Users, 
  ChevronRight, 
  Bell, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  Loader2,
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import { FREE_LAWS } from "@/data/free-laws-dossiers";

export default function DashboardPage() {
  const { userId, isPremium, loading: authLoading } = usePremium();
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<any[]>([]);
  const [followedDeputies, setFollowedDeputies] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"votes" | "deputies">("votes");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!userId || authLoading) return;

    const loadDashboardData = async () => {
      try {
        const [votes, follows] = await Promise.all([
          api.getUserVotes(userId),
          api.getUserFollows(userId)
        ]);
        setUserVotes(votes);
        setFollowedDeputies(follows);
      } catch (err) {
        console.error("Erreur chargement dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userId, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 size={40} className="animate-spin text-amber-500 mb-4" />
        <p className="text-white font-staatliches uppercase tracking-[0.2em]">Authentification en cours...</p>
      </div>
    );
  }

  if (!userId && !authLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
          <User size={40} />
        </div>
        <h1 className="text-3xl font-staatliches uppercase mb-4">Connexion Requise</h1>
        <p className="text-slate-500 max-w-md mb-8">
          Veuillez vous connecter pour accéder à votre espace personnel et suivre votre activité citoyenne.
        </p>
        <Link href="/login" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* 1. Dashboard Header */}
      <section className="bg-slate-950 text-white pt-24 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-none" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="flex items-center gap-6">
               <div className={`w-20 h-20 rounded-full bg-slate-800 border-2 p-1 flex items-center justify-center ${isPremium ? 'border-amber-400 text-amber-400' : 'border-slate-600 text-slate-400'}`}>
                  <User size={40} />
               </div>
               <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 text-[10px] font-black uppercase rounded-full mb-2 ${isPremium ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    {isPremium && <Star size={12} className="fill-current" />}
                    {isPremium ? "Membre Elite" : "Compte Citoyen"}
                  </div>
                  <h1 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tight italic leading-none">
                    Mon Espace{" "}
                    <span className={isPremium 
                      ? "text-amber-500" 
                      : "bg-gradient-to-r from-blue-400 via-red-400 to-blue-500 bg-clip-text text-transparent"
                    }>
                      Personnel
                    </span>
                  </h1>
                  <p className="text-slate-400 text-sm mt-2">Gérez votre activité citoyenne et vos députés favoris.</p>
                  <div className={`h-1.5 w-24 mt-6 rounded-full ${isPremium ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-600 to-red-600'}`} />
               </div>
            </div>

            <div className="flex gap-4">
               <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-3xl text-center min-w-[120px]">
                  <p className="text-2xl font-black text-white">{userVotes.length}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Votes</p>
               </div>
               <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-3xl text-center min-w-[120px]">
                  <p className="text-2xl font-black text-amber-400">{followedDeputies.length}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Suivis</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 -mt-16">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[600px]">
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => startTransition(() => setActiveTab("votes"))}
              className={`flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                activeTab === "votes" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <Vote size={18} className={isPending && activeTab !== "votes" ? "opacity-30" : ""} />
              Mon Historique de Vote
              {activeTab === "votes" && <div className="absolute bottom-0 w-32 h-1 bg-slate-900 rounded-full" />}
            </button>
            <button 
              onClick={() => startTransition(() => setActiveTab("deputies"))}
              className={`flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                activeTab === "deputies" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <Users size={18} className={isPending && activeTab !== "deputies" ? "opacity-30" : ""} />
              Mes Députés Suivis
              {activeTab === "deputies" && <div className="absolute bottom-0 w-32 h-1 bg-slate-900 rounded-full" />}
            </button>
          </div>

          <div className="p-8 md:p-12">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 grayscale opacity-30">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Chargement de votre compte...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "votes" ? (
                  <motion.div 
                    key="votes"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {userVotes.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Vote className="mx-auto mb-4 text-slate-300" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun vote enregistré</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Votez sur les prochaines lois pour voir apparaître vos positions ici.</p>
                        <Link href="/lois" className="text-slate-950 font-black uppercase text-xs tracking-widest hover:underline">Voir les lois &rarr;</Link>
                      </div>
                    ) : (
                      userVotes.map((v) => {
                        const lawInfo = v.laws || FREE_LAWS.find(l => l.id === v.law_id);
                        const voteConfig = {
                          "POUR": { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
                          "CONTRE": { color: "bg-red-100 text-red-700", icon: XCircle },
                          "ABSTENTION": { color: "bg-slate-100 text-slate-700", icon: MinusCircle }
                        }[v.vote as string] || { color: "bg-slate-100 text-slate-700", icon: Vote };

                        return (
                          <div key={v.id} className="group flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-3xl border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all bg-white relative">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors shrink-0">
                              <voteConfig.icon size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  {lawInfo?.category || "Législation"}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                  <Calendar size={10} />
                                  {new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </div>
                              </div>
                              <h3 className="text-lg font-bold text-slate-900 truncate italic">
                                {lawInfo?.title || `Loi #${v.law_id}`}
                              </h3>
                            </div>
                            <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${voteConfig.color}`}>
                              <voteConfig.icon size={12} />
                              Position : {v.vote}
                            </div>
                            <Link 
                              href={`/lois`}
                              className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shrink-0"
                            >
                              <ArrowRight size={18} />
                            </Link>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="deputies"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    {!isPremium ? (
                      <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-amber-200">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-6">
                            <Star size={32} className="fill-current" />
                        </div>
                        <h3 className="text-2xl font-staatliches uppercase mb-2">Suivi Député Réservé Elite</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                          Suivez vos députés favoris et recevez leurs derniers votes directement ici en passant Premium.
                        </p>
                        <Link href="/premium" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
                          Devenir Premium Elite
                        </Link>
                      </div>
                    ) : followedDeputies.length === 0 ? (
                      <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Users className="mx-auto mb-4 text-slate-300" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun député suivi</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Suivez vos députés préférés pour recevoir leurs derniers votes et positions.</p>
                        <Link href="/deputes" className="text-slate-950 font-black uppercase text-xs tracking-widest hover:underline">Explorer la carte &rarr;</Link>
                      </div>
                    ) : (
                      followedDeputies.map((f) => (
                        <Link key={f.id} href={`/deputes/${f.deputies?.slug}`}>
                          <div className="group flex items-center gap-6 p-6 rounded-3xl border border-slate-100 hover:border-amber-400 hover:shadow-xl transition-all h-full bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-colors" />
                            
                            <img 
                              src={`https://www.nosdeputes.fr/depute/photo/${f.deputies?.slug}/100`} 
                              className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500 shadow-lg"
                              alt={f.deputies?.last_name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${f.deputies?.first_name}+${f.deputies?.last_name}&background=fcd34d&color=1e293b`;
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
                                {f.deputies?.first_name} {f.deputies?.last_name}
                              </h4>
                              <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={12} className="text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                  {f.deputies?.department || "Circonscription"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-lg w-fit mt-3">
                                <Bell size={10} fill="currentColor" />
                                Suivi Actif
                              </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-300 group-hover:text-amber-500 transition-colors shrink-0" />
                          </div>
                        </Link>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
