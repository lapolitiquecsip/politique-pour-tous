"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
// ... (imports lucide-react)
import { User, Star, Vote, Users, ChevronRight, Bell, MapPin, CheckCircle2, XCircle, MinusCircle, Loader2, Calendar, LayoutDashboard, LogOut, Settings, ArrowRight, Bookmark, FileText, Search, Clock, Globe, Layers, UserMinus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { BallotBox, BallotChip } from "@/components/dashboard/BallotVote";
import NotificationsFeed from "@/components/dashboard/NotificationsFeed";
import { usePremium } from "@/lib/hooks/usePremium";

// Les favoris et votes créés sous l'ancien schéma pointent vers des identifiants qui
// n'existent plus (la table « laws » est une vue reconstruite depuis legislative_dossiers).
// On ne peut PAS retrouver de quelle loi il s'agissait : le titre n'a jamais été stocké côté
// utilisateur. Plutôt que d'afficher l'UUID brut ou « INVALID DATE », on le dit franchement.
const REFERENCE_PERDUE = "Loi retirée de la base";

// Renvoie null si la date est absente/illisible, au lieu de produire « INVALID DATE ».
function formatDateSafe(value: any): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Un enregistrement est « résolu » si on a réellement récupéré son titre.
function titreOuNull(data: any): string | null {
  const t = data?.title || data?.objet;
  if (!t) return null;
  // Le placeholder de chargement ne doit jamais être pris pour un vrai titre.
  if (typeof t === "string" && t.startsWith("Chargement...")) return null;
  return t;
}

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
            
            // Resolve the canonical legislative record; never fall back to demo facts.
            try {
              let lawData = await api.getLaw(v.law_id);
              if (lawData) return { ...v, laws: lawData };
              
              // Legacy citizen votes may still point at an old scrutin.
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

  // Retrait d'un élu suivi. Mise à jour optimiste : l'utilisateur voit l'effet
  // immédiatement, et on restaure la liste si la suppression échoue côté serveur.
  const [removingId, setRemovingId] = useState<string | null>(null);
  const handleUnfollow = async (e: React.MouseEvent, follow: any) => {
    e.preventDefault();
    e.stopPropagation();   // la carte entière est un lien : sans ça, on navigue au lieu de retirer
    if (!userId || removingId) return;
    const nom = `${follow.elu?.first_name ?? ""} ${follow.elu?.last_name ?? ""}`.trim();
    if (!window.confirm(`Ne plus suivre ${nom || "cet élu"} ?`)) return;

    const avant = followedDeputies;
    setRemovingId(follow.id);
    setFollowedDeputies(prev => prev.filter(x => x.id !== follow.id));
    try {
      await api.unfollowById(follow.id);   // vaut pour un député comme pour un sénateur
    } catch (err: any) {
      setFollowedDeputies(avant);   // échec : on remet la carte
      alert(`Impossible de retirer ce suivi : ${err?.message || "erreur inconnue"}`);
    } finally {
      setRemovingId(null);
    }
  };

  const savedLawsAll = savedItems.filter(item => ['scrutin', 'law'].includes(item.item_type));
  // On masque les favoris dont la loi n'existe plus (titre irrécupérable) : ils affichaient
  // « Loi retirée de la base ». L'utilisateur a demandé à ne plus les voir sur son profil.
  const savedLaws = savedLawsAll.filter(item => !!titreOuNull(item.data));
  // Idem pour l'historique de vote : on ne garde que les votes dont la loi est résolue.
  const resolvedVotes = userVotes.filter(v => !!titreOuNull(v.laws || v.scrutins));
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

      {isPremium && userId && (
        <div className="container mx-auto max-w-6xl px-4 -mt-16 mb-6">
          <NotificationsFeed userId={userId} />
        </div>
      )}

      <div className={`container mx-auto max-w-6xl px-4 ${isPremium ? "" : "-mt-16"}`}>
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[600px]">
          
          {/* Tabs Navigation — grille 2x2 sur mobile (4 onglets ne tiennent pas en ligne),
              rangée unique sur écran large. */}
          <div className="grid grid-cols-2 md:flex border-b border-slate-100">
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={() => startTransition(() => setActiveTab("votes"))}
              className={`relative flex-1 py-4 md:py-6 px-2 font-bold text-[11px] md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 border-r border-b md:border-b-0 border-white/30 md:last:border-r-0 ${
                activeTab === "votes" 
                  ? "text-white bg-blue-600 shadow-xl shadow-blue-500/40 z-20 scale-[1.04] ring-2 ring-white/60 ring-inset" 
                  : "text-white/70 bg-blue-500/40 hover:bg-blue-500/70 hover:text-white z-10"
              }`}
            >
              <motion.span 
                animate={{ scale: activeTab === "votes" ? 1.05 : 1 }}
                className="flex items-center gap-3"
              >
                <Vote size={18} className={isPending && activeTab !== "votes" ? "opacity-30" : ""} />
                Mon Historique de Vote
              </motion.span>
              {activeTab === "votes" && (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute bottom-0 left-0 right-0 h-1.5 bg-white shadow-[0_-2px_10px_rgba(255,255,255,0.6)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={() => startTransition(() => setActiveTab("deputies"))}
              className={`relative flex-1 py-4 md:py-6 px-2 font-bold text-[11px] md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 border-r border-b md:border-b-0 border-white/30 md:last:border-r-0 ${
                activeTab === "deputies" 
                  ? "text-white bg-emerald-600 shadow-xl shadow-emerald-500/40 z-20 scale-[1.04] ring-2 ring-white/60 ring-inset" 
                  : "text-white/70 bg-emerald-500/40 hover:bg-emerald-500/70 hover:text-white z-10"
              }`}
            >
              <motion.span 
                animate={{ scale: activeTab === "deputies" ? 1.05 : 1 }}
                className="flex items-center gap-3"
              >
                <Users size={18} className={isPending && activeTab !== "deputies" ? "opacity-30" : ""} />
                Mes Élus Suivis
              </motion.span>
              {activeTab === "deputies" && (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute bottom-0 left-0 right-0 h-1.5 bg-white shadow-[0_-2px_10px_rgba(255,255,255,0.6)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
            {isPremium && (
              <>
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startTransition(() => setActiveTab("saved"))}
                  className={`relative flex-1 py-4 md:py-6 px-2 font-bold text-[11px] md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 border-r border-b md:border-b-0 border-white/30 md:last:border-r-0 ${
                    activeTab === "saved" 
                      ? "text-white bg-amber-500 shadow-xl shadow-amber-500/40 z-20 scale-[1.04] ring-2 ring-white/60 ring-inset" 
                      : "text-white/70 bg-amber-400/40 hover:bg-amber-400/70 hover:text-white z-10"
                  }`}
                >
                  <motion.span 
                    animate={{ scale: activeTab === "saved" ? 1.05 : 1 }}
                    className="flex items-center gap-3"
                  >
                    <Bookmark size={18} className={isPending && activeTab !== "saved" ? "opacity-30" : ""} />
                    Lois Favorites
                  </motion.span>
                  {activeTab === "saved" && (
                    <motion.div 
                      layoutId="activeTabIndicator" 
                      className="absolute bottom-0 left-0 right-0 h-1.5 bg-white shadow-[0_-2px_10px_rgba(255,255,255,0.6)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startTransition(() => setActiveTab("geos"))}
                  className={`relative flex-1 py-4 md:py-6 px-2 font-bold text-[11px] md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 border-r border-b md:border-b-0 border-white/30 md:last:border-r-0 ${
                    activeTab === "geos" 
                      ? "text-white bg-pink-600 shadow-xl shadow-pink-500/40 z-20 scale-[1.04] ring-2 ring-white/60 ring-inset" 
                      : "text-white/70 bg-pink-500/40 hover:bg-pink-500/70 hover:text-white z-10"
                  }`}
                >
                  <motion.span 
                    animate={{ scale: activeTab === "geos" ? 1.05 : 1 }}
                    className="flex items-center gap-3"
                  >
                    <MapPin size={18} className={isPending && activeTab !== "geos" ? "opacity-30" : ""} />
                    Territoires
                  </motion.span>
                  {activeTab === "geos" && (
                    <motion.div 
                      layoutId="activeTabIndicator" 
                      className="absolute bottom-0 left-0 right-0 h-1.5 bg-white shadow-[0_-2px_10px_rgba(255,255,255,0.6)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>
              </>
            )}
          </div>

          <div className="p-4 sm:p-6 md:p-12">
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
                    {resolvedVotes.length === 0 ? (
                      <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <Vote className="mx-auto mb-4 text-slate-300" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun vote enregistré</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Votez sur les prochaines lois pour voir apparaître vos positions ici.</p>
                        <Link href="/lois" className="text-slate-950 font-black uppercase text-xs tracking-widest hover:underline">Voir les lois &rarr;</Link>
                      </div>
                    ) : (
                      resolvedVotes.map((v) => {
                        const lawInfo = v.laws || v.scrutins;

                        return (
                          <div key={v.id} className="group flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-6 rounded-3xl border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all bg-white relative">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                              <BallotBox vote={v.vote} size={34} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  {lawInfo?.category || "Législation"}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                  <Calendar size={10} />
                                  {formatDateSafe(v.created_at) || "Date inconnue"}
                                </div>
                              </div>
                              {titreOuNull(lawInfo) ? (
                                <h3 className="text-lg font-bold text-slate-900 truncate">
                                  {titreOuNull(lawInfo)}
                                </h3>
                              ) : (
                                <h3 className="text-lg font-bold text-slate-400 truncate">
                                  {REFERENCE_PERDUE}
                                </h3>
                              )}
                            </div>
                            <BallotChip vote={v.vote} />
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
                        <Link key={f.id} href={f.elu_href || "#"}>
                          <div className="group flex items-center gap-4 md:gap-6 p-4 md:p-6 rounded-3xl border border-slate-100 hover:border-amber-400 hover:shadow-xl transition-all h-full bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-colors" />
                            
                            <img 
                              src={f.elu?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${f.elu?.first_name ?? ""} ${f.elu?.last_name ?? ""}`.trim())}&background=fcd34d&color=1e293b`}
                              loading="lazy"
                              decoding="async"
                              className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500 shadow-lg"
                              alt={`${f.elu?.first_name ?? ""} ${f.elu?.last_name ?? ""}`.trim()}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(`${f.elu?.first_name ?? ""} ${f.elu?.last_name ?? ""}`.trim())}&background=fcd34d&color=1e293b`;
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
                                {f.elu?.first_name} {f.elu?.last_name}
                              </h4>
                              <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={12} className="text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                  {f.elu?.department || (f.elu_type === "senator" ? "Sénat" : "Circonscription")}
                                </span>
                              </div>
                              {/* La chambre est plus informative qu'un « suivi actif » redondant :
                                  les deux chambres cohabitent désormais dans cette liste. */}
                              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg w-fit mt-3 ${
                                f.elu_type === "senator" ? "text-rose-600 bg-rose-50" : "text-blue-600 bg-blue-50"
                              }`}>
                                <Bell size={10} fill="currentColor" />
                                {f.elu_type === "senator" ? "Sénateur·rice" : "Député·e"}
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleUnfollow(e, f)}
                              disabled={removingId === f.id}
                              title="Ne plus suivre cet élu"
                              aria-label={`Ne plus suivre ${f.elu?.first_name ?? ""} ${f.elu?.last_name ?? ""}`}
                              className="relative z-10 shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-300 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                            >
                              <UserMinus size={16} />
                            </button>
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
                          <div className="group flex flex-col p-6 md:p-8 rounded-[2.5rem] border border-slate-100 hover:border-amber-400 hover:shadow-2xl transition-all duration-500 h-full bg-white relative overflow-hidden">
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
                            
                            <h4 className={`text-xl font-bold line-clamp-3 mb-4 transition-colors ${
                              titreOuNull(item.data) ? "text-slate-900 group-hover:text-amber-600" : "text-slate-400"
                            }`}>
                              {titreOuNull(item.data) || REFERENCE_PERDUE}
                            </h4>
                            
                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                               <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                                  <Calendar size={12} />
                                  {formatDateSafe(item.data?.date_scrutin || item.data?.date_adopted || item.data?.created_at)
                                    || "Non disponible"}
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
                          <div className="group flex flex-col p-6 md:p-8 rounded-[2.5rem] border border-slate-100 hover:border-rose-400 hover:shadow-2xl transition-all duration-500 h-full bg-white relative overflow-hidden">
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
                            
                            {/* Même police que les titres de sections (font-staatliches) :
                                l'italique gras était illisible sur les noms de communes.
                                Taille et couleurs volontairement inchangées. */}
                            <h4 className="text-xl font-staatliches tracking-wide text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-3 mb-4">
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
