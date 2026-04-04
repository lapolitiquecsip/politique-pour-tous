"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  ChevronUp,
  ArrowRight,
  X as CloseIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { FREE_LAWS, LawDossier } from "@/data/free-laws-dossiers";
import { api } from "@/lib/api";
import Link from "next/link";
import { getPremiumUrl } from "@/lib/utils";
import { usePremium } from "@/lib/hooks/usePremium";

export default function LawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { isPremium, loading: premiumLoading, userId } = usePremium();
  const [law, setLaw] = useState<LawDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    const fetchLaw = async () => {
      // 1. Check Mock Data (Priorité pour la démo)
      const mockLaw = FREE_LAWS.find(l => l.id === id);
      if (mockLaw) {
        setLaw(mockLaw);
        setLoading(false);
        return;
      }

      // 2. Try API if not in mock
      try {
        const dbLaw = await api.getLaw(id);
        if (dbLaw) {
          setLaw({
            id: dbLaw.id,
            title: dbLaw.title,
            category: dbLaw.category,
            summary: dbLaw.summary,
            impacts: [], 
            calendar: [], 
            premiumPoints: [],
            status: "application",
            statusLabel: dbLaw.vote_result || "Décryptage en cours",
            color: "blue"
          });
        }
      } catch (err) {
        console.error("Error fetching law:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLaw();
  }, [id]);

  if (loading || premiumLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-staatliches">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-2xl shadow-red-500/20" />
        <span className="text-white tracking-[0.3em] uppercase animate-pulse">Chargement du dossier</span>
      </div>
    </div>
  );

  if (!law) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-staatliches text-white mb-4 uppercase">Dossier non trouvé</h1>
      <button onClick={() => router.back()} className="text-red-500 font-bold hover:underline">
        Retourner à la page précédente
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-32 overflow-x-hidden relative">
      {/* 1. IMMERSIVE HEADER */}
      <div className="relative h-[65vh] min-h-[550px] w-full flex items-end overflow-hidden">
        {/* Background Image Layer */}
        {law.backgroundImage && (
          <div className="absolute inset-0 z-0">
             <img 
               src={law.backgroundImage} 
               alt="" 
               className="w-full h-full object-cover saturate-[1.2] brightness-[0.4] scale-110 lg:scale-100 transition-transform duration-[10s] transform-gpu motion-safe:hover:scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30" />
          </div>
        )}

        {/* Floating Top Nav */}
        <div className="absolute top-0 left-0 right-0 z-30 p-8 container mx-auto max-w-6xl flex justify-between items-center">
            <button 
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-2xl text-white text-xs font-black uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_100px_rgba(220,38,38,0.8)]" />
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Analyse en direct</span>
            </div>
        </div>

        <div className="container mx-auto px-4 pb-16 relative z-10 max-w-6xl">
           <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                 <span className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-xl shadow-blue-600/30">
                   {law.category}
                 </span>
                 <div className="flex items-center gap-2 px-4 py-1.5 bg-white/95 rounded-full text-slate-950 border border-white shadow-xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{law.statusLabel}</span>
                 </div>
              </div>
              <motion.h1 
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-7xl md:text-9xl font-staatliches text-slate-900 leading-[0.8] uppercase italic drop-shadow-2xl"
              >
                {law.title}
              </motion.h1>
           </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT BENTO GRID */}
      <div className="container mx-auto px-4 max-w-6xl -mt-20 relative z-20">
         <div className="bg-white rounded-[3.5rem] p-1 shadow-2xl border border-slate-100 ring-1 ring-slate-400/5">
            <div className="p-8 md:p-12 lg:p-20">
               <div className="max-w-4xl mb-24">
                  <p className="text-base font-black text-red-600 uppercase tracking-[0.3em] mb-6">Résumé du projet</p>
                  <p className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
                     {law.summary}
                  </p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                  {/* LEFT: DECRYPTAGE */}
                  <div className="space-y-12">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                           <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Décryptage</h2>
                     </div>

                     <div className="space-y-6">
                        {law.impacts.map((impact, idx) => (
                           <motion.div 
                             key={idx}
                             initial={{ opacity: 0, x: -20 }}
                             whileInView={{ opacity: 1, x: 0 }}
                             viewport={{ once: true }}
                             transition={{ delay: idx * 0.1 }}
                             className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex gap-6 items-start hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-500 group"
                           >
                              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-1 shadow-sm group-hover:border-blue-600 transition-colors">
                                 <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                              </div>
                              <p className="font-bold text-slate-700 text-lg md:text-xl leading-relaxed italic">« {impact} »</p>
                           </motion.div>
                        ))}
                     </div>
                  </div>

                  {/* RIGHT: CALENDAR */}
                  <div className="space-y-12">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shadow-sm">
                           <Calendar className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Calendrier</h2>
                     </div>

                     <div className="relative pl-10 space-y-16 border-l-4 border-slate-100 ml-6">
                        {law.calendar.map((item, idx) => (
                           <div key={idx} className="relative">
                              <div className="absolute -left-[54px] top-0 w-8 h-8 rounded-full bg-white border-[6px] border-red-600 shadow-xl" />
                              <span className="text-xs font-black text-red-600 uppercase tracking-widest block mb-2">{item.date}</span>
                              <p className="text-2xl font-bold text-slate-900 leading-none">{item.event}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 3. PREMIUM FLOATING PAYWALL */}
      {!isPremium && !premiumLoading && !isBannerDismissed && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-6 md:p-12 pointer-events-none">
          <motion.div 
            initial={{ y: 150 }}
            animate={{ y: 0 }}
            className="container mx-auto max-w-5xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 p-[1.5px] rounded-[3rem] shadow-[0_30px_100px_rgba(251,191,36,0.2)] pointer-events-auto overflow-hidden relative"
          >
              <div className="bg-slate-950/95 backdrop-blur-3xl p-5 md:p-8 rounded-[2.9rem] flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Close Button */}
                <button 
                  onClick={() => setIsBannerDismissed(true)}
                  className="absolute top-6 right-8 text-white/40 hover:text-white transition-colors group"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-8 text-left">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-amber-500/20">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1.5">Guide de vote complet</h4>
                      <p className="text-[10px] text-amber-400/80 uppercase tracking-[0.3em] font-black">Accès réservé aux membres Premium</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex flex-col items-end gap-1 px-8 border-r border-white/10 mr-2">
                        <span className="text-white text-xs font-bold leading-none">Vérifié par la rédaction</span>
                        <span className="text-white/40 text-[9px] uppercase tracking-widest leading-none">Source : Assemblée Nationale</span>
                    </div>
                    <Link 
                      href={getPremiumUrl(userId)}
                      className="px-10 py-5 bg-amber-400 text-slate-950 font-black rounded-2xl hover:bg-white transition-all text-sm flex items-center gap-3 group shadow-xl shadow-amber-400/20"
                    >
                      Débloquer le dossier
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                    </Link>
                </div>
              </div>
          </motion.div>
        </div>
      )}

      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-36 right-8 w-14 h-14 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl hover:bg-white transition-all z-10 group"
      >
        <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
      </button>
    </div>
  );
}
