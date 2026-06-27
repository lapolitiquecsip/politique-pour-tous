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
  X as CloseIcon,
  Star,
  XCircle,
  MinusCircle,
  Zap,
  FileText,
  Users,
  Building
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
      // 1. Check Mock Data
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
            color: "blue",
            promulgation_date: dbLaw.promulgation_date,
            amendments: dbLaw.amendments,
            premium_analysis: dbLaw.premium_analysis,
            voteData: dbLaw.voteData
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
        {law.backgroundImage ? (
          <div className="absolute inset-0 z-0">
             <img 
               src={law.backgroundImage} 
               alt="" 
               className="w-full h-full object-cover saturate-[1.2] brightness-[0.4] scale-110 lg:scale-100 transition-transform duration-[10s] transform-gpu motion-safe:hover:scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 to-slate-800" />
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
              <div className="flex flex-wrap items-center gap-4">
                 <span className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-xl shadow-blue-600/30">
                   {law.category}
                 </span>
                 <div className="flex items-center gap-2 px-4 py-1.5 bg-white/95 rounded-full text-slate-950 border border-white shadow-xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{law.statusLabel}</span>
                 </div>
                 {law.promulgation_date && (
                   <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full text-white border border-white/20 shadow-xl">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Promulguée le : {law.promulgation_date}</span>
                   </div>
                 )}
              </div>
              <motion.h1 
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-7xl md:text-8xl font-staatliches text-white leading-[0.8] uppercase italic drop-shadow-2xl"
              >
                {law.title}
              </motion.h1>
           </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT BENTO GRID */}
      <div className="container mx-auto px-4 max-w-6xl -mt-10 relative z-20">
         <div className="bg-white rounded-[3.5rem] p-1 shadow-2xl border border-slate-100 ring-1 ring-slate-400/5">
            <div className="p-8 md:p-12 lg:p-16">
               <div className="max-w-4xl mb-20">
                  <p className="text-base font-black text-red-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> 
                    Résumé du projet
                  </p>
                  <p className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
                     {law.summary}
                  </p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  {/* LEFT: DECRYPTAGE & AMENDEMENTS */}
                  <div className="space-y-16">
                     <div className="space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                             <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Décryptage</h2>
                       </div>
                       <div className="space-y-4">
                          {law.impacts.map((impact, idx) => (
                             <motion.div 
                               key={idx}
                               initial={{ opacity: 0, x: -20 }}
                               whileInView={{ opacity: 1, x: 0 }}
                               viewport={{ once: true }}
                               transition={{ delay: idx * 0.1 }}
                               className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex gap-4 items-start hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-500 group"
                             >
                                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-1 shadow-sm group-hover:border-blue-600 transition-colors">
                                   <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                </div>
                                <p className="font-bold text-slate-700 text-lg leading-relaxed italic">« {impact} »</p>
                             </motion.div>
                          ))}
                       </div>
                     </div>

                     {/* AMENDEMENTS (If present) */}
                     {law.amendments && law.amendments.length > 0 && (
                       <div className="space-y-8">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
                               <FileText className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Amendements Adoptés</h2>
                         </div>
                         <div className="space-y-4">
                            {law.amendments.map((amend, idx) => (
                               <div key={idx} className="p-6 bg-purple-50/30 rounded-3xl border border-purple-100/50">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg">
                                      {amend.result}
                                    </span>
                                    <h3 className="font-bold text-slate-900">{amend.title}</h3>
                                  </div>
                                  <p className="text-slate-600 text-sm leading-relaxed">{amend.description}</p>
                               </div>
                            ))}
                         </div>
                       </div>
                     )}
                  </div>

                  {/* RIGHT: CALENDAR & VOTES */}
                  <div className="space-y-16">
                     <div className="space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shadow-sm">
                             <Calendar className="w-7 h-7" />
                          </div>
                          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Parcours Législatif</h2>
                       </div>

                       {/* Mini-schema timeline */}
                       <div className="relative pl-12 space-y-12 py-4">
                          <div className="absolute left-6 top-8 bottom-8 w-[2px] bg-gradient-to-b from-red-600 via-slate-200 to-slate-200" />
                          {law.calendar.map((item, idx) => (
                             <div key={idx} className="relative">
                                <div className={`absolute -left-[54px] top-1 w-6 h-6 rounded-full border-[4px] border-white shadow-md z-10 ${idx === 0 ? "bg-red-600 scale-125" : "bg-slate-300"}`} />
                                <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${idx === 0 ? "text-red-600" : "text-slate-400"}`}>
                                  {item.date}
                                </span>
                                <p className={`text-xl font-bold leading-tight ${idx === 0 ? "text-slate-900" : "text-slate-600"}`}>
                                  {item.event}
                                </p>
                             </div>
                          ))}
                       </div>
                     </div>

                     {/* VOTE DETAILS */}
                     {law.voteData && (
                       <div className="space-y-8">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 shadow-sm">
                               <Users className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Détails des Votes</h2>
                         </div>
                         
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                           {/* Global Vote Bar */}
                           <div className="mb-8">
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Vote Global (Assemblée)</p>
                             <div className="flex h-6 rounded-full overflow-hidden mb-3">
                               <div style={{ width: `${(law.voteData.pour / (law.voteData.pour + law.voteData.contre + law.voteData.abstention)) * 100}%` }} className="bg-emerald-500" />
                               <div style={{ width: `${(law.voteData.contre / (law.voteData.pour + law.voteData.contre + law.voteData.abstention)) * 100}%` }} className="bg-red-500" />
                               <div style={{ width: `${(law.voteData.abstention / (law.voteData.pour + law.voteData.contre + law.voteData.abstention)) * 100}%` }} className="bg-slate-400" />
                             </div>
                             <div className="flex justify-between text-sm font-bold">
                               <span className="text-emerald-600">{law.voteData.pour} Pour</span>
                               <span className="text-slate-500">{law.voteData.abstention} Abst.</span>
                               <span className="text-red-600">{law.voteData.contre} Contre</span>
                             </div>
                           </div>

                           {/* By Party (optional) */}
                           {law.voteData.group_results && (
                             <div className="space-y-4">
                               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Répartition par Groupe</p>
                               {law.voteData.group_results.slice(0, 4).map((group, idx) => (
                                 <div key={idx} className="flex items-center gap-4">
                                   <div className="w-16 text-xs font-bold text-slate-600 truncate">{group.group_id.replace('PO', 'GRP ')}</div>
                                   <div className="flex-1 flex h-2 rounded-full overflow-hidden">
                                     <div style={{ width: `${(group.pour / group.total) * 100}%` }} className="bg-emerald-500" />
                                     <div style={{ width: `${(group.contre / group.total) * 100}%` }} className="bg-red-500" />
                                     <div style={{ width: `${(group.abstention / group.total) * 100}%` }} className="bg-slate-300" />
                                   </div>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       </div>
                     )}

                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 3. PREMIUM ANALYSIS BLOCK (INLINE) */}
      <div className="container mx-auto px-4 max-w-6xl mt-12 relative z-20">
         <div className="bg-slate-950 rounded-[3.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
            {/* Background glowing effect */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between relative z-10 mb-12">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-[#FDBE02] flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(253,190,2,0.3)] shrink-0">
                   <Zap className="w-8 h-8 fill-current" />
                 </div>
                 <div>
                   <h3 className="text-3xl font-staatliches text-[#FDBE02] tracking-wider uppercase">Analyse Détaillée</h3>
                   <p className="text-xs font-black text-[#FDBE02]/70 uppercase tracking-[0.2em]">Réservé aux Membres Premium</p>
                 </div>
               </div>
               
               {!isPremium && (
                 <Link href={getPremiumUrl(userId)} className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[#FDBE02] via-[#FFA000] to-[#FF8F00] text-white font-black text-lg shadow-xl shadow-orange-500/20 hover:scale-105 transition-transform uppercase tracking-wider whitespace-nowrap">
                   Devenir Premium
                 </Link>
               )}
            </div>

            {isPremium ? (
              <div className="space-y-8 bg-slate-900 p-8 rounded-3xl border border-slate-800">
                <p className="text-slate-300 leading-relaxed text-lg">
                  {/* Fake detailed content if law.premium_analysis is string or array */}
                  {Array.isArray(law.premium_analysis) ? (
                    <div className="space-y-6">
                      {law.premium_analysis.map((pa, idx) => (
                        <div key={idx}>
                          <h4 className="text-[#FDBE02] font-bold text-xl mb-2">{pa.title}</h4>
                          <p className="text-slate-300">{pa.content}</p>
                          {pa.metrics && (
                            <ul className="mt-3 grid grid-cols-2 gap-4">
                              {pa.metrics.map((m, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                                  <CheckCircle2 className="w-4 h-4 text-[#FDBE02]" /> {m}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : law.premium_analysis ? (
                    law.premium_analysis
                  ) : (
                    "L'analyse détaillée pour cette loi est en cours de rédaction par nos experts."
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {[
                  "Objectifs chiffrés et KPI de la loi",
                  "Impacts directs sur votre portefeuille",
                  "Analyse des amendements cachés",
                  "Explications simplifiées sans jargon"
                ].map((perk, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <CheckCircle2 className="w-5 h-5 text-[#FDBE02]" />
                    <span className="text-slate-300 font-bold">{perk}</span>
                  </div>
                ))}
              </div>
            )}
         </div>
      </div>

      {/* 4. VOTING MODULE (ELITE/CITIZEN) */}
      {userId && (
        <div className="container mx-auto px-4 max-w-6xl mt-12 relative z-20">
          <div className={`rounded-[3.5rem] p-12 md:p-16 text-white shadow-2xl relative overflow-hidden border ${isPremium ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-700 opacity-95"}`}>
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
            
            <div className="max-w-4xl relative z-10">
              <div className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase rounded-full mb-8 ${isPremium ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                <Star size={12} className={isPremium ? "fill-current" : ""} />
                {isPremium ? "Action Citoyenne Elite" : "Action Citoyenne (Membre)"}
              </div>
              <h2 className="text-4xl md:text-5xl font-staatliches uppercase mb-6 italic">Positionnement Personnel</h2>
              <p className="text-lg text-slate-400 mb-10 max-w-2xl leading-relaxed">
                {isPremium 
                  ? "En tant que membre Premium, votre voix compte. Enregistrez votre position sur ce projet de loi pour suivre l'écart avec le vote officiel des députés." 
                  : "Prenez position sur ce projet de loi. Pour comparer votre vote avec l'analyse détaillée des députés, passez à l'offre Elite."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "POUR", val: "POUR", color: "bg-emerald-500 hover:bg-emerald-400", icon: CheckCircle2 },
                  { label: "CONTRE", val: "CONTRE", color: "bg-red-500 hover:bg-red-400", icon: XCircle },
                  { label: "ABSTENTION", val: "ABSTENTION", color: "bg-slate-700 hover:bg-slate-600", icon: MinusCircle }
                ].map((btn) => (
                  <button
                    key={btn.val}
                    onClick={async () => {
                      if (!userId) return;
                      await api.saveUserVote(userId, id, btn.val);
                      alert("Votre vote a été enregistré dans votre dashboard !");
                    }}
                    className={`group relative overflow-hidden p-6 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 ${btn.color}`}
                  >
                    <btn.icon size={28} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-black text-xs tracking-[0.2em]">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl hover:bg-white transition-all z-40 group"
      >
        <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
      </button>
    </div>
  );
}
