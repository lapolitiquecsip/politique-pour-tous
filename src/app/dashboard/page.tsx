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
  ArrowRight,
  Bookmark,
  FileText,
  Search,
  Clock,
  Globe,
  Layers
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
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"votes" | "deputies" | "saved" | "geos">("votes");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!userId || authLoading) return;

    const loadDashboardData = async () => {
      try {
        const [votes, follows, saved] = await Promise.all([
          api.getUserVotes(userId),
          api.getUserFollows(userId),
          isPremium ? api.getUserSavedItems(userId) : Promise.resolve([])
        ]);
        setUserVotes(votes);
        setFollowedDeputies(follows);
        
        // Enrich votes with law/scrutin titles in the background if not already present
        const enrichVotes = async () => {
          const fullVotes = await Promise.all(votes.map(async (v: any) => {
            if (v.laws || v.scrutins) return v; // Already has relation info
            
            // 1. Check in FREE_LAWS
            const free = FREE_LAWS.find(l => l.id === v.law_id);
            if (free) return { ...v, laws: free };
            
            // 2. Try fetching from laws table
            try {
              let lawData = await api.getLaw(v.law_id);
              if (lawData) return { ...v, laws: lawData };
              
              // 3. Try fetching from scrutins table
              const scrutinData = await api.getScrutin(v.law_id);
              if (scrutinData) return { ...v, scrutins: scrutinData };
              
              return v;
            } catch (e) {
              return v;
            }
          }));
          setUserVotes(fullVotes);
        };
        enrichVotes();
        
        // Render raw saved items immediately so counts are correct and fast
        setSavedItems(saved.map((item: any) => ({ ...item, data: { title: `Chargement... (${item.item_id})` } })));
        setLoading(false); // Stop main loading state here
        
        if (isPremium && saved.length > 0) {
          // Fetch full data for saved items in the background
          const fullSavedItems = await Promise.all(saved.map(async (item: any) => {
            try {
              if (item.item_type === 'scrutin') {
                const data = await api.getScrutin(item.item_id);
                return { ...item, data };
              } else if (item.item_type === 'law') {
                const data = await api.getLaw(item.item_id);
                return { ...item, data };
              } else if (item.item_type === 'commune') {
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 3000);
                  const res = await fetch(`https://geo.api.gouv.fr/communes/${item.item_id}?fields=nom,code,codesPostaux,population`, { signal: controller.signal });
                  clearTimeout(timeoutId);
                  const data = await res.json();
                  return { ...item, data: { ...data, title: data.nom || `Commune ${item.item_id}` } };
                } catch (e) {
                  return { ...item, data: { title: `Commune ${item.item_id}` } };
                }
              } else {
                // region or department
                return { ...item, data: { title: item.item_id } };
              }
            } catch (e) {
              console.error(`Error loading item ${item.item_id}:`, e);
              return null;
            }
          }));
          setSavedItems(fullSavedItems.filter(Boolean));
        }
      } catch (err: any) {
        console.error("Error toggling favorite:", err);
        alert(`Erreur lors de la sauvegarde : ${err.message || "Vérifiez que les migrations de base de données ont été appliquées."}`);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userId, authLoading]);

  const savedLaws = savedItems.filter(item => ['scrutin', 'law'].includes(item.item_type));
  const savedGeos = savedItems.filter(item => ['commune', 'region', 'department'].includes(item.item_type));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 size={40} className="animate-spin text-amber-500 mb-4" />
        <p className="text-white font-bold uppercase tracking-[0.15em] text-sm">Authentification en cours...</p>
      </div>
    );
  }

  if (!userId && !authLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
          <User size={40} />
        </div>
        <h1 className="text-3xl font-bold uppercase mb-4">Connexion Requise</h1>
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
      <section className="bg-white border-b border-slate-200 pt-28 pb-20 px-4 relative overflow-hidden">
        {/* Animated premium background glows */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-12 left-[10%] w-72 h-72 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-5 right-[15%] w-60 h-60 bg-yellow-600/5 rounded-full blur-[80px]" />
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
             <div className={`w-20 h-20 rounded-full border-2 p-1 flex items-center justify-center transition-all duration-300 ${isPremium ? 'border-amber-400 bg-gradient-to-br from-amber-100 to-yellow-100 shadow-[0_0_15px_rgba(251,191,36,0.15)] text-amber-600' : 'border-slate-300 bg-slate-100 text-slate-500'}`}>
                <User size={40} />
             </div>
             <div className="flex flex-col items-center sm:items-start">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1 text-[10px] font-black uppercase rounded-full mb-3 tracking-widest ${isPremium ? 'bg-amber-100 border border-amber-200 text-amber-700 shadow-[0_0_10px_rgba(251,191,36,0.05)]' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}>
                  {isPremium && <Star size={12} className="fill-current" />}
                  {isPremium ? "Membre Elite" : "Compte Citoyen"}
                </div>
                <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none inline-flex items-center gap-2 md:gap-3 flex-wrap">
                  <span className="text-slate-900">Mon Espace</span>{" "}
                  <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-white px-4 pt-1.5 pb-0.5 md:pt-3 md:pb-1 rounded-xl md:rounded-2xl shadow-sm">
                    Personnel
                  </span>
                </h1>
                <p className="text-slate-500 text-sm mt-3 font-medium">Gérez votre activité citoyenne et vos députés favoris.</p>
                <div className={`h-[1px] w-32 mt-6 rounded-full ${isPremium ? 'bg-gradient-to-r from-amber-400/50 to-transparent' : 'bg-gradient-to-r from-blue-500/50 to-transparent'}`} />
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
              className={`relative flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                activeTab === "votes" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <Vote size={18} className={isPending && activeTab !== "votes" ? "opacity-30" : ""} />
              Mon Historique de Vote
              {activeTab === "votes" && <div className={`absolute bottom-0 w-32 h-1 rounded-full ${isPremium ? 'bg-amber-500' : 'bg-slate-900'}`} />}
            </button>
            <button 
              onClick={() => startTransition(() => setActiveTab("deputies"))}
              className={`relative flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                activeTab === "deputies" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <Users size={18} className={isPending && activeTab !== "deputies" ? "opacity-30" : ""} />
              Mes Députés Suivis
              {activeTab === "deputies" && <div className={`absolute bottom-0 w-32 h-1 rounded-full ${isPremium ? 'bg-amber-500' : 'bg-slate-900'}`} />}
            </button>
            {isPremium && (
              <>
                <button 
                  onClick={() => startTransition(() => setActiveTab("saved"))}
                  className={`relative flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    activeTab === "saved" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <Bookmark size={18} className={isPending && activeTab !== "saved" ? "opacity-30" : ""} />
                  Lois Favorites
                  {activeTab === "saved" && <div className="absolute bottom-0 w-32 h-1 bg-amber-500 rounded-full" />}
                </button>
                <button 
                  onClick={() => startTransition(() => setActiveTab("geos"))}
                  className={`relative flex-1 py-6 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    activeTab === "geos" ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <MapPin size={18} className={isPending && activeTab !== "geos" ? "opacity-30" : ""} />
                  Territoires
                  {activeTab === "geos" && <div className="absolute bottom-0 w-32 h-1 bg-rose-500 rounded-full" />}
                </button>
              </>
            )}
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
                        const lawInfo = v.laws || v.scrutins || FREE_LAWS.find(l => l.id === v.law_id);
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
                                {lawInfo?.title || lawInfo?.objet || `Loi #${v.law_id}`}
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
                ) : activeTab === "deputies" ? (
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
                        <h3 className="text-2xl font-bold uppercase mb-2">Suivi Député Réservé Elite</h3>
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
                ) : activeTab === "saved" ? (
                  <motion.div 
                    key="saved"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    {savedLaws.length === 0 ? (
                      <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <Bookmark className="mx-auto mb-4 text-slate-300" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucune loi enregistrée</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Enregistrez vos lois et propositions favorites pour les retrouver ici.</p>
                        <Link href="/lois" className="text-slate-950 font-black uppercase text-xs tracking-widest hover:underline">Explorer les lois &rarr;</Link>
                      </div>
                    ) : (
                      savedLaws.map((item) => (
                        <Link key={item.id} href={`/lois?id=${item.item_id}`}>
                          <div className="group flex flex-col p-8 rounded-[2.5rem] border border-slate-100 hover:border-amber-400 hover:shadow-2xl transition-all duration-500 h-full bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-colors" />
                            
                            <div className="flex items-center justify-between mb-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                item.item_type === 'scrutin' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                              }`}>
                                {item.item_type === 'scrutin' ? 'Loi Votée' : 'Proposition'}
                              </span>
                              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all">
                                <Bookmark size={14} className="fill-current" />
                              </div>
                            </div>
                            
                            <h4 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-3 mb-4 italic">
                              {item.data?.objet || item.data?.title}
                            </h4>
                            
                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                               <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                                  <Calendar size={12} />
                                  {new Date(item.data?.date_scrutin || item.data?.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                               </div>
                               <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </motion.div>
                ) : activeTab === "geos" ? (
                  <motion.div 
                    key="geos"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    {savedGeos.length === 0 ? (
                      <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <MapPin className="mx-auto mb-4 text-slate-300" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun territoire suivi</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Suivez vos communes, départements ou régions pour les retrouver ici.</p>
                        <Link href="/local" className="text-slate-950 font-black uppercase text-xs tracking-widest hover:underline">Découvrir les territoires &rarr;</Link>
                      </div>
                    ) : (
                      savedGeos.map((item) => (
                        <Link key={item.id} href={`/local?code=${item.item_id}&type=${item.item_type}`}>
                          <div className="group flex flex-col p-8 rounded-[2.5rem] border border-slate-100 hover:border-rose-400 hover:shadow-2xl transition-all duration-500 h-full bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-rose-500/10 transition-colors" />
                            
                            <div className="flex items-center justify-between mb-6">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-600">
                                {item.item_type === 'commune' ? 'Commune' :
                                 item.item_type === 'region' ? 'Région' : 'Département'}
                              </span>
                              <div className="p-2 bg-rose-50 text-rose-500 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-all">
                                <Star size={14} className="fill-current" />
                              </div>
                            </div>
                            
                            <h4 className="text-xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-3 mb-4 italic">
                              {item.data?.title}
                            </h4>
                            
                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                               <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                                  <MapPin size={12} />
                                  {item.item_type === 'commune' ? `${item.data?.population?.toLocaleString()} hab.` : 'Territoire Suivi'}
                               </div>
                               <ChevronRight size={18} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
