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
        <p className="text-slate-400 max-w-md mb-8">
          Veuillez vous connecter pour accéder à votre espace personnel et suivre votre activité citoyenne.
        </p>
        <Link href="/login" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1020] via-[#0a0e1c] to-[#070a14] pb-20 text-white">
      {/* 1. Dashboard Header */}
      <section className="border-b border-white/5 pt-28 pb-20 px-4 relative overflow-hidden">
        {/* Halos dorés premium */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 left-[8%] w-80 h-80 bg-amber-500/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-[12%] w-72 h-72 bg-yellow-600/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_60%)]" />
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
             <div className={`w-20 h-20 rounded-full border-2 p-1 flex items-center justify-center transition-all duration-300 ${isPremium ? 'border-amber-400 bg-gradient-to-br from-amber-400/20 to-yellow-600/10 shadow-[0_0_30px_rgba(251,191,36,0.35)] text-amber-300' : 'border-white/20 bg-white/5 text-slate-300'}`}>
                <User size={40} />
             </div>
             <div className="flex flex-col items-center sm:items-start">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1 text-[10px] font-black uppercase rounded-full mb-3 tracking-widest ${isPremium ? 'bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : 'bg-white/5 border border-white/10 text-slate-300'}`}>
                  {isPremium && <Star size={12} className="fill-current" />}
                  {isPremium ? "Membre Elite" : "Compte Citoyen"}
                </div>
                <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none inline-flex items-center gap-2 md:gap-3 flex-wrap">
                  <span className="text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.15)]">Mon Espace</span>{" "}
                  <span className="sword-shine bg-gradient-to-r from-amber-300 via-amber-500 to-yellow-600 text-white px-4 pt-1.5 pb-0.5 md:pt-3 md:pb-1 rounded-xl md:rounded-2xl shadow-[0_8px_30px_rgba(251,191,36,0.4)]">
                    Personnel
                  </span>
                </h1>
                <p className="text-slate-400 text-sm mt-3 font-medium">Gérez votre activité citoyenne et vos députés favoris.</p>
                <div className={`h-[1px] w-32 mt-6 rounded-full ${isPremium ? 'bg-gradient-to-r from-amber-400/70 to-transparent' : 'bg-gradient-to-r from-blue-500/50 to-transparent'}`} />
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
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden min-h-[600px]">
          
          {/* Tabs Navigation — grille 2x2 sur mobile (4 onglets ne tiennent pas en ligne),
              rangée unique sur écran large. */}
          <div className="grid grid-cols-2 md:flex border-b border-white/10">
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={() => startTransition(() => setActiveTab("votes"))}
              className={`relative flex-1 py-4 md:py-6 px-2 font-bold text-[11px] md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 border-r border-b md:border-b-0 border-white/30 md:last:border-r-0 ${
                activeTab === "votes" 
                  ? "text-white bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50 z-20 scale-[1.04] ring-2 ring-white/70 ring-inset" 
                  : "text-white/85 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 hover:text-white z-10"
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
                  ? "text-white bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50 z-20 scale-[1.04] ring-2 ring-white/70 ring-inset" 
                  : "text-white/85 bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 hover:text-white z-10"
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
                      ? "text-white bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/50 z-20 scale-[1.04] ring-2 ring-white/70 ring-inset" 
                      : "text-white/85 bg-gradient-to-br from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 hover:text-white z-10"
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
                      ? "text-white bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-lg shadow-fuchsia-500/50 z-20 scale-[1.04] ring-2 ring-white/70 ring-inset" 
                      : "text-white/85 bg-gradient-to-br from-fuchsia-500 to-pink-700 hover:from-fuchsia-400 hover:to-pink-600 hover:text-white z-10"
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
                      <div className="text-center py-20 bg-white/[0.03] rounded-[2rem] border border-dashed border-white/15">
                        <Vote className="mx-auto mb-4 text-white/25" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun vote enregistré</h3>
                        <p className="text-slate-400 mb-8 max-w-sm mx-auto">Votez sur les prochaines lois pour voir apparaître vos positions ici.</p>
                        <Link href="/lois" className="text-amber-400 font-black uppercase text-xs tracking-widest hover:underline">Voir les lois &rarr;</Link>
                      </div>
                    ) : (
                      resolvedVotes.map((v) => {
                        const lawInfo = v.laws || v.scrutins;

                        return (
                          <div key={v.id} className="group flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-6 rounded-3xl border border-white/10 hover:border-white/25 hover:shadow-xl transition-all gold-sheen-hover bg-white/[0.04] relative">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                              <BallotBox vote={v.vote} size={34} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {lawInfo?.category || "Législation"}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                  <Calendar size={10} />
                                  {formatDateSafe(v.created_at) || "Date inconnue"}
                                </div>
                              </div>
                              {titreOuNull(lawInfo) ? (
                                <h3 className="text-lg font-bold text-white truncate">
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
                              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shrink-0"
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
                      <div className="col-span-full text-center py-20 bg-amber-400/[0.06] rounded-[2.5rem] border-2 border-dashed border-amber-400/30">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-6">
                            <Star size={32} className="fill-current" />
                        </div>
                        <h3 className="text-2xl font-bold uppercase mb-2">Suivi Député Réservé Elite</h3>
                        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                          Suivez vos députés favoris et recevez leurs derniers votes directement ici en passant Premium.
                        </p>
                        <Link href="/premium" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-400 to-yellow-600 text-slate-950 rounded-2xl font-black hover:brightness-110 transition-all shadow-[0_8px_30px_rgba(251,191,36,0.35)]">
                          Devenir Premium Elite
                        </Link>
                      </div>
                    ) : followedDeputies.length === 0 ? (
                      <div className="col-span-full text-center py-20 bg-white/[0.03] rounded-[2rem] border border-dashed border-white/15">
                        <Users className="mx-auto mb-4 text-white/25" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun élu suivi</h3>
                        <p className="text-slate-400 mb-8 max-w-sm mx-auto">Suivez vos députés, sénateurs et eurodéputés pour recevoir leurs derniers votes et positions.</p>
                        <Link href="/deputes" className="text-amber-400 font-black uppercase text-xs tracking-widest hover:underline">Explorer les élus &rarr;</Link>
                      </div>
                    ) : (
                      followedDeputies.map((f) => (
                        <Link key={f.id} href={f.elu_href || "#"}>
                          <div className="group flex items-center gap-4 md:gap-6 p-4 md:p-6 rounded-3xl border border-white/10 hover:border-amber-400 hover:shadow-xl transition-all h-full gold-sheen-hover bg-white/[0.04] relative overflow-hidden">
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
                              <h4 className="text-xl font-bold text-white group-hover:text-amber-600 transition-colors truncate">
                                {f.elu?.first_name} {f.elu?.last_name}
                              </h4>
                              <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={12} className="text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                  {f.elu?.department || (f.elu_type === "senator" ? "Sénat" : f.elu_type === "mep" ? (f.elu?.ep_group || "Parlement européen") : "Circonscription")}
                                </span>
                              </div>
                              {/* La chambre est plus informative qu'un « suivi actif » redondant :
                                  les trois chambres cohabitent désormais dans cette liste. */}
                              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg w-fit mt-3 ${
                                f.elu_type === "senator" ? "text-rose-300 bg-rose-500/15" : f.elu_type === "mep" ? "text-sky-300 bg-sky-500/15" : "text-blue-300 bg-blue-500/15"
                              }`}>
                                <Bell size={10} fill="currentColor" />
                                {f.elu_type === "senator" ? "Sénateur·rice" : f.elu_type === "mep" ? "Eurodéputé·e" : "Député·e"}
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
                      <div className="col-span-full text-center py-20 bg-white/[0.03] rounded-[2.5rem] border border-dashed border-white/15">
                        <Bookmark className="mx-auto mb-4 text-white/25" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucune loi enregistrée</h3>
                        <p className="text-slate-400 mb-8 max-w-sm mx-auto">Enregistrez vos lois et propositions favorites pour les retrouver ici.</p>
                        <Link href="/lois" className="text-amber-400 font-black uppercase text-xs tracking-widest hover:underline">Explorer les lois &rarr;</Link>
                      </div>
                    ) : (
                      savedLaws.map((item) => (
                        <Link key={item.id} href={`/lois?id=${item.item_id}`}>
                          <div className="group flex flex-col p-6 md:p-8 rounded-[2.5rem] border border-white/10 hover:border-amber-400 hover:shadow-2xl transition-all duration-500 h-full gold-sheen-hover bg-white/[0.04] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-colors" />
                            
                            <div className="flex items-center justify-between mb-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                item.item_type === 'scrutin' ? 'bg-blue-500/15 text-blue-300' : 'bg-purple-500/15 text-purple-300'
                              }`}>
                                {item.item_type === 'scrutin' ? 'Loi Votée' : 'Proposition'}
                              </span>
                              <div className="p-2 bg-amber-500/15 text-amber-300 rounded-lg group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                                <Bookmark size={14} className="fill-current" />
                              </div>
                            </div>
                            
                            <h4 className={`text-xl font-bold line-clamp-3 mb-4 transition-colors ${
                              titreOuNull(item.data) ? "text-white group-hover:text-amber-600" : "text-slate-400"
                            }`}>
                              {titreOuNull(item.data) || REFERENCE_PERDUE}
                            </h4>
                            
                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/10">
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
                      <div className="col-span-full text-center py-20 bg-white/[0.03] rounded-[2.5rem] border border-dashed border-white/15">
                        <MapPin className="mx-auto mb-4 text-white/25" size={48} />
                        <h3 className="text-xl font-bold mb-2">Aucun territoire suivi</h3>
                        <p className="text-slate-400 mb-8 max-w-sm mx-auto">Suivez vos communes, départements ou régions pour les retrouver ici.</p>
                        <Link href="/local" className="text-amber-400 font-black uppercase text-xs tracking-widest hover:underline">Découvrir les territoires &rarr;</Link>
                      </div>
                    ) : (
                      savedGeos.map((item) => (
                        <Link key={item.id} href={`/local?code=${item.item_id}&type=${item.item_type}`}>
                          <div className="group flex flex-col p-6 md:p-8 rounded-[2.5rem] border border-white/10 hover:border-rose-400 hover:shadow-2xl transition-all duration-500 h-full gold-sheen-hover bg-white/[0.04] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-rose-500/10 transition-colors" />
                            
                            <div className="flex items-center justify-between mb-6">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/15 text-rose-300">
                                {item.item_type === 'commune' ? 'Commune' :
                                 item.item_type === 'region' ? 'Région' : 'Département'}
                              </span>
                              <div className="p-2 bg-rose-500/15 text-rose-300 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-all">
                                <Star size={14} className="fill-current" />
                              </div>
                            </div>
                            
                            {/* Même police que les titres de sections (font-staatliches) :
                                l'italique gras était illisible sur les noms de communes.
                                Taille et couleurs volontairement inchangées. */}
                            <h4 className="text-xl font-staatliches tracking-wide text-white group-hover:text-rose-600 transition-colors line-clamp-3 mb-4">
                              {item.data?.title}
                            </h4>
                            
                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/10">
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
