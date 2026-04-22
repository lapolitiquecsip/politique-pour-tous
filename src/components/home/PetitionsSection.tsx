"use client";
// Version 1.1.2 - Mise à jour des synchronisations pétitions et IA

import { useEffect, useState } from "react";

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

export default function PetitionsSection() {
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await api.getPetitions();
      if (data && data.length > 0) {
        // 1. Get Top 3 most voted
        const popular = [...data]
          .sort((a, b) => b.signatures - a.signatures)
          .slice(0, 3);
        
        const popularIds = new Set(popular.map(p => p.id));
        
        // 2. Get Top 3 most recent (not already in popular)
        // Note: data from api is already sorted by signatures, 
        // but we want the newest available in the DB for the "Recent" slots
        const recent = [...data]
          .filter(p => !popularIds.has(p.id))
          .sort((a, b) => {
            // Compare IDs or creation dates if available. 
            // In Decidim, higher IDs are usually newer, 
            // but we'll use a secondary sort or just the natural order if it matches
            return b.id.localeCompare(a.id); 
          })
          .slice(0, 3);

        setPetitions([...popular, ...recent]);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section className="py-24 px-4 bg-slate-50 relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none overflow-hidden">
        <span className="absolute -top-10 -left-10 text-[20rem] font-staatliches leading-none rotate-12">PÉTITIONS</span>
        <span className="absolute -bottom-10 -right-10 text-[20rem] font-staatliches leading-none -rotate-12">POUVOIR</span>
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl text-center md:text-left">
            <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600">Démocratie Participative</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none mb-6">
              Le pouvoir <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">citoyen</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium leading-relaxed italic">
              L&apos;Assemblée Nationale permet aux citoyens de proposer des lois. Voici les pétitions qui mobilisent la France aujourd&apos;hui.
            </p>
          </div>

          {/* Comment ça marche ? */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-xl shadow-blue-500/5 max-w-sm"
          >
            <div className="flex items-center gap-3 mb-4 text-blue-600">
              <Info size={20} />
              <h4 className="text-sm font-black uppercase tracking-widest">Comment ça marche ?</h4>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-blue-600" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  <span className="text-slate-900 font-black">100 000 signatures :</span> La pétition est examinée par une commission de l&apos;Assemblée.
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle size={12} className="text-indigo-600" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  <span className="text-slate-900 font-black">500 000 signatures :</span> Elle peut faire l&apos;objet d&apos;un débat obligatoire au Parlement.
                </p>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Grille des Pétitions */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Récupération des pétitions en cours...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {petitions.map((petition, idx) => {
              const percentage = Math.min(Math.round((petition.signatures / petition.threshold) * 100), 100);
            return (
              <motion.div
                key={petition.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col h-full"
              >
                <div className="p-8 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                      {petition.category}
                    </span>
                    <FileSignature className="text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" size={24} />
                  </div>

                  <h3 className="text-2xl font-bold mb-4 italic leading-tight group-hover:text-blue-600 transition-colors">
                    {petition.title}
                  </h3>
                  
                  <p className="text-slate-500 text-sm mb-8 flex-1 font-medium leading-relaxed">
                    {petition.description}
                  </p>

                  <div className="space-y-4 mt-auto">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider mb-2">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span>{petition.signatures.toLocaleString()} Votants</span>
                      </div>
                      <span className="text-blue-600">{percentage}% du palier</span>
                    </div>

                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percentage}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      />
                    </div>

                    <a 
                      href={petition.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-4 mt-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all group-hover:shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
                    >
                      Détails & Signer
                      <ArrowUpRight size={16} />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

        <div className="mt-16 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Portail Officiel</p>
          <a 
            href="https://petitions.assemblee-nationale.fr/initiatives"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-slate-900 font-extrabold hover:text-blue-600 transition-colors"
          >
            Découvrir toutes les pétitions en cours
            <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
