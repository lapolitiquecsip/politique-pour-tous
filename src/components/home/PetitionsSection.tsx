"use client";
// Version 1.1.2 - Mise à jour des synchronisations pétitions et IA

import { useEffect, useState } from "react";
import PetitionStatus from "./PetitionStatus";

import { motion } from "framer-motion";
import { 
  FileSignature, 
  Users, 
  ArrowUpRight, 
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import DragScroller from "@/components/ui/DragScroller";

interface Petition {
  id: string;
  title: string;
  description: string;
  signatures: number;
  threshold: number;
  category: string;
  url: string;
}

// Data is now fetched from Supabase

// Sub-component for individual petition cards
function PetitionCard({ petition, idx }: { petition: Petition, idx: number }) {
  let dynamicThreshold = petition.threshold || 100000;
  if (petition.signatures >= 100000 && dynamicThreshold === 100000) {
    dynamicThreshold = 500000;
  }
  const realPercentage = Math.round((petition.signatures / dynamicThreshold) * 100);
  const cappedPercentage = Math.min(realPercentage, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 200px" }}
      // Le décalage est plafonné : à raison d'un dixième de seconde par carte,
      // la cinquantième d'un rail serait apparue au bout de cinq secondes. On
      // garde l'effet de cascade sur les premières, et plus rien au-delà.
      transition={{ duration: 0.3, delay: Math.min(idx, 4) * 0.06 }}
      className="group bg-card dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] border border-border dark:border-slate-800 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col h-full"
    >
      <div className="p-5 sm:p-8 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3 sm:mb-6">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-muted-foreground dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full">
            {petition.category}
          </span>
          <FileSignature className="text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" size={24} />
        </div>

        <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 italic leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 sm:line-clamp-3">
          {petition.title}
        </h3>

        <div className="text-muted-foreground dark:text-slate-400 text-sm mb-4 sm:mb-8 flex-1 font-medium leading-relaxed line-clamp-2 sm:line-clamp-4 whitespace-pre-line">
          {petition.description}
        </div>

        <div className="space-y-3 sm:space-y-4 mt-auto">
          <div className="flex justify-between text-[11px] font-black uppercase tracking-wider mb-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-400" />
              <span>{petition.signatures.toLocaleString()} Votants</span>
            </div>
            <span className="text-blue-600 dark:text-blue-400">{cappedPercentage}% du palier</span>
          </div>

          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${cappedPercentage}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
            />
          </div>

          {/* Statut factuel dans le processus AN (examinée ? transmise ? en collecte ?) */}
          <PetitionStatus status={(petition as any).status ?? null} signatures={petition.signatures} threshold={petition.threshold} />

          <a 
            href={petition.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 sm:py-4 mt-2 sm:mt-4 bg-slate-950 dark:bg-slate-800 text-white dark:text-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all group-hover:shadow-[0_10px_20px_rgba(37,99,235,0.2)] dark:group-hover:shadow-[0_10px_20px_rgba(37,99,235,0.1)]"
          >
            Détails & Signer
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/** Plafond par rail. Au-delà, on ne défile plus, on erre. */
const MAX_PAR_RAIL = 50;

export default function PetitionsSection() {
  const [mobilisees, setMobilisees] = useState<Petition[]>([]);
  const [recentes, setRecentes] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivant = true;
    // Les deux listes sont indépendantes et peuvent se recouper : une pétition
    // déposée hier et déjà très signée a sa place dans les deux. L'ancienne
    // version retirait des « dernières déposées » celles qui figuraient parmi
    // les plus mobilisées, si bien que la rubrique ne montrait pas les
    // dernières déposées — elle montrait les dernières des autres.
    Promise.all([
      api.getPetitions(MAX_PAR_RAIL),
      api.getRecentPetitions(MAX_PAR_RAIL),
    ])
      .then(([populaires, dernieres]) => {
        if (!vivant) return;
        setMobilisees((populaires as Petition[]) ?? []);
        setRecentes((dernieres as Petition[]) ?? []);
      })
      .catch(() => {})
      .finally(() => { if (vivant) setLoading(false); });
    return () => { vivant = false; };
  }, []);

  return (
    <section className="py-14 sm:py-24 px-4 bg-muted dark:bg-slate-950/20 relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none overflow-hidden">
        <span className="absolute -top-10 -left-10 text-[20rem] font-staatliches leading-none rotate-12">PÉTITIONS</span>
        <span className="absolute -bottom-10 -right-10 text-[20rem] font-staatliches leading-none -rotate-12">POUVOIR</span>
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between mb-8 md:mb-16 gap-8">
          <div className="max-w-2xl text-center md:text-left">
            <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Démocratie Participative</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none mb-6">
              Le pouvoir <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">citoyen</span>
            </h2>
            <p className="text-lg text-muted-foreground dark:text-slate-400 font-medium leading-relaxed italic">
              L&apos;Assemblée Nationale permet aux citoyens de proposer des lois. Voici les pétitions qui mobilisent la France aujourd&apos;hui.
            </p>
          </div>

          {/* Comment ça marche ? */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="bg-card dark:bg-slate-900 p-6 rounded-[2rem] border border-blue-100 dark:border-slate-800 shadow-xl shadow-blue-500/5 dark:shadow-none max-w-sm"
          >
            <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
              <Info size={20} />
              <h4 className="text-sm font-black uppercase tracking-widest">Comment ça marche ?</h4>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 leading-relaxed font-semibold">
                  <span className="text-foreground dark:text-slate-100 font-black">100 000 signatures :</span> La pétition est examinée par une commission de l&apos;Assemblée.
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle size={12} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 leading-relaxed font-semibold">
                  <span className="text-foreground dark:text-slate-100 font-black">500 000 signatures :</span> Elle peut faire l&apos;objet d&apos;un débat obligatoire au Parlement.
                </p>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Grille des Pétitions */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={40} />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Récupération des pétitions en cours...</p>
          </div>
        ) : (
          <div className="space-y-16">
            {[
              { titre: "Les plus mobilisées", teinte: "text-blue-600 dark:text-blue-400", liste: mobilisees },
              { titre: "Dernières déposées par les citoyens", teinte: "text-indigo-600 dark:text-indigo-400", liste: recentes },
            ].map(rail => (
              <div key={rail.titre}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <h3 className={`text-center text-xl font-staatliches uppercase tracking-widest italic ${rail.teinte}`}>
                    {rail.titre}
                    {rail.liste.length > 0 && (
                      <span className="ml-2 not-italic opacity-50">({rail.liste.length})</span>
                    )}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
                <DragScroller ariaLabel={rail.titre}>
                  {rail.liste.map((petition, idx) => (
                    // Largeur fixe : dans un rail, une carte qui se dimensionne
                    // sur son contenu donne des colonnes inégales et un
                    // défilement qui accroche.
                    <div key={petition.id} className="w-[17.5rem] shrink-0 sm:w-[21rem]">
                      <PetitionCard petition={petition} idx={idx} />
                    </div>
                  ))}
                </DragScroller>
                <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 md:hidden">
                  Faites glisser pour en voir plus →
                </p>
              </div>
            ))}
          </div>
      )}

        <div className="mt-16 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Portail Officiel</p>
          <a 
            href="https://petitions.assemblee-nationale.fr/initiatives"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-foreground dark:text-slate-100 font-extrabold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Découvrir toutes les pétitions en cours
            <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
