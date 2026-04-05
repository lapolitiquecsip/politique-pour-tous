"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  LayoutDashboard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

export default function DashboardPage() {
  const { userId, isPremium } = usePremium();
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<any[]>([]);
  const [followedDeputies, setFollowedDeputies] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"votes" | "deputies">("votes");

  useEffect(() => {
    if (!userId) return;

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
  }, [userId]);

  if (!isPremium && !loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-6">
          <Star size={40} className="fill-current" />
        </div>
        <h1 className="text-3xl font-staatliches uppercase mb-4">Espace Réservé Elite</h1>
        <p className="text-slate-500 max-w-md mb-8">
          Le tableau de bord personnalisé et le suivi des députés sont des fonctionnalités exclusives aux membres Premium.
        </p>
        <Link href="/premium" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
          Découvrir les avantages
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* 1. Dashboard Header */}
      <section className="bg-slate-950 text-white pt-24 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-none" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-amber-400 p-1 flex items-center justify-center text-amber-400">
                  <User size={40} />
               </div>
               <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-950 text-[10px] font-black uppercase rounded-full mb-2">
                    <Star size={12} className="fill-current" />
                    Membre Elite
                  </div>
                  <h1 className="text-4xl font-staatliches uppercase tracking-tight italic">Mon Espace Personnel</h1>
                  <p className="text-slate-400 text-sm">Gérez votre activité citoyenne et vos députés favoris.</p>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-3xl text-center min-w-[120px]">
                  <p className="text-2xl font-black text-amber-400">{userVotes.length}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Votes</p>
               </div>
               <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-3xl text-center min-w-[120px]">
                  <p className="text-2xl font-black text-white">{followedDeputies.length}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Suivis</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 -mt-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[600px]">
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setActiveTab("votes")}
              className={`flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                activeTab === "votes" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <Vote size={18} />
              Mon Historique de Vote
              {activeTab === "votes" && <div className="absolute bottom-0 w-32 h-1 bg-slate-900 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab("deputies")}
              className={`flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                activeTab === "deputies" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <Users size={18} />
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
                      userVotes.map((v) => (
                        <div key={v.id} className="group flex items-center gap-6 p-6 rounded-3xl border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors">
                            <LayoutDashboard size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                               <Calendar size={12} className="text-slate-400" />
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                 {new Date(v.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                               </span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 truncate">
                              {v.laws?.title || "Loi inconnue"}
                            </h4>
                          </div>
                          <div className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-tighter italic border ${
                            v.vote === 'POUR' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            v.vote === 'CONTRE' ? "bg-red-50 text-red-600 border-red-100" :
                            "bg-amber-50 text-amber-600 border-amber-100"
                          }`}>
                            VOUS AVEZ VOTÉ : {v.vote}
                          </div>
                          <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))
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
                    {followedDeputies.length === 0 ? (
                      <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Users className="mx-auto mb-4 text-slate-300" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun député suivi</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Suivez vos députés préférés pour recevoir leurs derniers votes et positions.</p>
                        <Link href="/deputes" className="text-slate-950 font-black uppercase text-xs tracking-widest hover:underline">Explorer la carte &rarr;</Link>
                      </div>
                    ) : (
                      followedDeputies.map((f) => (
                        <Link key={f.id} href={`/deputes/${f.deputies?.slug}`}>
                          <div className="group flex items-center gap-6 p-6 rounded-3xl border border-slate-100 hover:border-amber-400 hover:shadow-xl transition-all h-full bg-white">
                            <img 
                              src={`https://www.nosdeputes.fr/depute/photo/${f.deputies?.slug}/100`} 
                              className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                              alt={f.deputies?.last_name}
                            />
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                                {f.deputies?.first_name} {f.deputies?.last_name}
                              </h4>
                              <div className="flex items-center gap-2 text-slate-400 mb-3">
                                <MapPin size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  {f.deputies?.department} - {f.deputies?.circonscription}e
                                </span>
                              </div>
                              
                              <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                    {i === 1 ? "P" : "?"}
                                  </div>
                                ))}
                                <span className="text-[10px] font-bold text-slate-400 ml-2">Derniers votes</span>
                              </div>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-amber-500" />
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
