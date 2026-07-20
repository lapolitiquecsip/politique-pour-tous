"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Landmark,
  Vote,
  CheckCircle2,
  XCircle,
  Calendar,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  Quote,
  Users,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePremium } from "@/lib/hooks/usePremium";
import { getFullPartyName } from "@/lib/party-utils";
import { api } from "@/lib/api";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";


export default function SenatorClient({ senator }: { senator: any }) {
  const { isPremium } = usePremium();
  const [isBioExpanded, setIsBioExpanded] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [candidateLink, setCandidateLink] = useState<{ slug: string } | null>(null);
  const [partyLink, setPartyLink] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    api.findCandidateByName(`${senator.first_name} ${senator.last_name}`).then(c => setCandidateLink(c)).catch(() => {});
    api.findPartyByAlias(senator.party).then(p => setPartyLink(p)).catch(() => {});
  }, [senator.first_name, senator.last_name, senator.party]);

  const isLegalClean = useMemo(() => {
    const issues = senator?.legal_issues || "";
    if (!issues) return true;
    return issues.toLowerCase().includes("aucune") || issues.toLowerCase().includes("casier vierge");
  }, [senator]);

  const name = `${senator.first_name} ${senator.last_name}`;
  // Vrais votes du Sénat (rapprochés par nom + chambre), plus de données factices.
  const [votes, setVotes] = useState<any[]>([]);
  useEffect(() => {
    api.getSenatorVotes(senator.first_name, senator.last_name, 12)
      .then(v => setVotes(v as any[]))
      .catch(() => setVotes([]));
  }, [senator.first_name, senator.last_name]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header Navigation */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            href="/deputes" 
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à la carte
          </Link>
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profil Officiel Sénat</span>
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
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-amber-200 dark:border-slate-800 overflow-hidden shadow-2xl relative">
              <div className="absolute top-4 right-4 z-10">
                 <div className="bg-amber-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg">Premium Exclusive</div>
              </div>
              
              <div className="relative aspect-[4/5] bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                <img 
                  src={senator.photo_url} 
                  alt={name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h1 className="text-4xl font-staatliches text-white tracking-tight uppercase leading-none mb-2">
                    {name}
                  </h1>
                  <p className="text-amber-400 font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                    <Landmark className="w-3 h-3" />
                    Membre du Sénat
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                 {(() => {
                   const inner = (
                     <>
                       <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
                         <Users className="w-6 h-6" />
                       </div>
                       <div className="min-w-0">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Groupe Politique</p>
                         <p className="font-bold text-slate-900 dark:text-white truncate">
                           {getFullPartyName(senator.party)}
                         </p>
                         {partyLink && (
                           <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 inline-flex items-center gap-1 mt-1.5 bg-amber-50 px-2 py-1 rounded-lg group-hover/party:bg-amber-100 transition-colors">Voir la fiche du parti <ArrowRight className="w-3 h-3" /></span>
                         )}
                       </div>
                     </>
                   );
                   return partyLink ? (
                     <Link href={`/partis/${partyLink.slug}`} className="flex items-center gap-4 p-4 rounded-3xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 transition hover:border-amber-400 group/party">
                       {inner}
                     </Link>
                   ) : (
                     <div className="flex items-center gap-4 p-4 rounded-3xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700">
                       {inner}
                     </div>
                   );
                 })()}

                <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                   <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                     <MapPin className="w-6 h-6" />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Représentation</p>
                     <p className="font-bold text-slate-900 dark:text-white truncate">
                       {senator.department}
                     </p>
                   </div>
                </div>
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

            {/* Integrity Badge Section */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group transition-all duration-500"
            >
               <div className={`absolute top-0 left-0 w-2 h-full transition-colors duration-500 ${isLegalClean ? 'bg-emerald-500' : 'bg-amber-500'}`} />
               <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Intégrité & Transparence</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">Historique Juridique</h4>
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

            <div className="bg-amber-600 rounded-[2rem] p-8 text-white shadow-xl shadow-amber-600/20">
               <h4 className="text-xl font-staatliches uppercase mb-4 tracking-tight">Contact Sénat</h4>
               <p className="text-sm opacity-90 leading-relaxed mb-6">
                 Les sénateurs représentent les collectivités territoriales de la République.
               </p>
               <button className="w-full py-4 rounded-2xl bg-white text-amber-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  Site officiel du Sénat
               </button>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Biography & Votes */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-10"
          >
            {/* Biography Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group pb-2">
              <button 
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="w-full text-left p-8 md:px-12 md:py-10 relative z-10 flex items-center justify-between"
              >
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                    <Quote className="w-6 h-6 opacity-50" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                      Portrait & <span className="text-amber-600">Engagement</span>
                    </h3>
                  </div>
                </div>
                <ChevronDown className={`w-6 h-6 transition-transform ${isBioExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isBioExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden px-8 pb-10 md:px-12"
                  >
                    <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 italic font-playfair text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                      {senator.biography}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Votes Section */}
            <div>
              <h2 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-6">
                Positions <span className="text-amber-600">législatives</span>
              </h2>
              <div className="space-y-4">
                {votes.length === 0 && (
                  <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm italic text-slate-400">
                    Aucun scrutin public récent au Sénat pour cet élu, ou vote non encore synchronisé.
                  </div>
                )}
                {votes.map((vote: any) => (
                  <div 
                    key={vote.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-amber-500 transition-all"
                  >
                    <div className="flex-1 flex items-center gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                          <Vote className="w-6 h-6" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vote.date}</p>
                          <h4 className="text-xl font-bold">{vote.title}</h4>
                       </div>
                    </div>
                    <div className={`px-6 py-3 rounded-xl ${vote.bg} ${vote.color} font-black text-sm`}>
                       VOTE : {vote.vote}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <LegalStatusModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
        deputy={senator} 
      />
    </div>
  );
}
