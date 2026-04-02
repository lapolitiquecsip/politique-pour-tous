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
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src={law.backgroundImage} 
            alt="" 
            className="w-full h-full object-cover opacity-[0.12] scale-105 transition-transform duration-[2s] group-hover:scale-110 saturate-[0.8] blur-[0.5px]" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-card/40 via-transparent to-card/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-card/20 via-transparent to-card/40" />
        </div>
      )}

      {/* 1. HEADER (TOUJOURS VISIBLE) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-10 w-full text-left p-6 md:p-8 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`p-2 rounded-full transform-gpu ${isOpen ? 'bg-primary/10 text-primary' : 'bg-muted/50'}`}
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </button>

      {/* 2. CONTENU DÉPLIABLE (ACCORDÉON OPTIMISÉ) */}
      <motion.div
        initial={false}
        animate={{ 
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ 
          duration: 0.35, 
          ease: [0.04, 0.62, 0.23, 0.98] // Ease optimisé pour la fluidité visuelle
        }}
        className="overflow-hidden transform-gpu"
      >
        <div className="relative z-10 px-8 pb-12 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full capitalize italic w-fit mb-8">
            <span className={`w-2 h-2 rounded-full ${law.status === 'application' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            {law.statusLabel}
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-4xl">
            {law.summary}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Impacts */}
            <div className="space-y-6">
              <h4 className="text-base font-black flex items-center gap-2 text-foreground uppercase tracking-widest leading-none">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Décryptage : ce que ça change
              </h4>
              <div className="space-y-3">
                {law.impacts.map((impact, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-4 bg-muted/20 rounded-2xl border border-border/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p className="text-muted-foreground text-sm leading-relaxed">{impact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline & Analysis */}
            <div className="space-y-8">
              <div>
                <h4 className="text-base font-black flex items-center gap-2 text-foreground uppercase tracking-widest mb-6 leading-none">
                  <Calendar className="w-5 h-5 text-primary" />
                  Calendrier législatif
                </h4>
                <div className="space-y-6 pl-4 border-l-2 border-border ml-2">
                  {law.calendar.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[22px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-primary" />
                      <p className="text-[10px] font-black uppercase text-primary tracking-tighter mb-1">{item.date}</p>
                      <p className="text-sm text-foreground font-semibold line-clamp-2">{item.event}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Analysis */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl relative overflow-hidden group shadow-inner">
                <h4 className="text-slate-900 font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-4 leading-none">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Analyse approfondie de la rédaction
                </h4>
                <ul className="space-y-3">
                  {law.premiumPoints.map((point, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-slate-600 font-medium italic">
                      <ArrowRight className="w-4 h-4 text-primary opacity-40 shrink-0" />
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
