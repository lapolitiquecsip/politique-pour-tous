"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  CheckCircle2, 
  ChevronDown,
  Sparkles, 
  ArrowRight
} from "lucide-react";
import { type LawDossier } from "@/data/free-laws-dossiers";

interface DetailedLawDossierProps {
  law: LawDossier;
}

export default function DetailedLawDossier({ law }: DetailedLawDossierProps) {
  const [isOpen, setIsOpen] = useState(false);

  const colorMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  const badgeColor = colorMap[law.color] || "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <div 
      className={`relative bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all mb-4 transform-gpu ${isOpen ? 'ring-2 ring-primary/10' : ''}`}
    >
      {/* Background Image Layer (Immersive) */}
      {law.backgroundImage && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[2rem]">
          <img 
            src={law.backgroundImage} 
            alt="" 
            decoding="async"
            className="w-full h-full object-cover opacity-[0.28] scale-105 transition-transform duration-[2s] group-hover:scale-110 saturate-[1.1] transform-gpu backface-visibility-hidden will-change-transform" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-card/30 via-transparent to-card/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-card/10 via-transparent to-card/30" />
        </div>
      )}

      {/* 1. HEADER (TOUJOURS VISIBLE) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-10 w-full text-left p-6 md:p-8 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transform-gpu"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
            {law.category}
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight italic">
            {law.title}
          </h3>
        </div>
        
        <motion.div 
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "circOut" }}
          className="p-2 rounded-full transform-gpu bg-muted/50 text-foreground"
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </button>

      {/* 2. CONTENU DÉPLIABLE (ACCORDÉON OPTIMISÉ POUR L'INP) */}
      <motion.div
        initial={false}
        animate={{ 
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ 
          duration: 0.25, 
          ease: "circOut" // Transition plus sèche et réactive
        }}
        className="overflow-hidden transform-gpu will-change-[height,opacity]"
      >
        <div className="relative z-10 px-8 pb-12 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-100/80 px-4 py-1.5 rounded-full capitalize w-fit mb-8">
            <span className={`w-2 h-2 rounded-full ${law.status === 'application' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            {law.statusLabel}
          </div>

          <p className="text-lg md:text-xl text-slate-800 font-medium leading-relaxed mb-10 max-w-4xl">
            {law.summary}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Impacts */}
            <div className="space-y-6">
              <h4 className="text-lg font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-6">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Décryptage : ce que ça change
              </h4>
              <div className="space-y-4">
                {law.impacts.map((impact, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-5 bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <p className="text-slate-700 text-base font-medium leading-relaxed">{impact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline & Analysis */}
            <div className="space-y-10">
              <div>
                <h4 className="text-lg font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-6">
                  <Calendar className="w-5 h-5 text-primary" />
                  Calendrier législatif
                </h4>
                <div className="space-y-7 pl-6 border-l-2 border-slate-200 ml-2">
                  {law.calendar.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-primary" />
                      <p className="text-xs font-bold uppercase text-primary tracking-widest mb-1.5">{item.date}</p>
                      <p className="text-base text-slate-800 font-semibold">{item.event}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Analysis */}
              <div className="p-7 bg-blue-50/50 border border-blue-100 rounded-3xl relative overflow-hidden group shadow-sm">
                <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-5">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Analyse approfondie de la rédaction
                </h4>
                <ul className="space-y-4">
                  {law.premiumPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-base text-slate-700 font-medium">
                      <ArrowRight className="w-5 h-5 text-amber-500/60 shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
