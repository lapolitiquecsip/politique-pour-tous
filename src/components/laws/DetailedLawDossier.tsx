"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      className={`bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all mb-4 ${isOpen ? 'ring-2 ring-primary/10' : ''}`}
    >
      {/* 1. HEADER (TOUJOURS VISIBLE) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-6 md:p-8 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
            {law.category}
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight italic">
            {law.title}
          </h3>
        </div>
        
        <div className={`p-2 rounded-full bg-muted/50 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
          <ChevronDown className="w-6 h-6" />
        </div>
      </button>

      {/* 2. CONTENU DÉPLIABLE (ACCORDÉON) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-8 pb-12 pt-4 border-t border-border/50">
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
                  <h4 className="text-base font-black flex items-center gap-2 text-foreground uppercase tracking-widest">
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
                    <h4 className="text-base font-black flex items-center gap-2 text-foreground uppercase tracking-widest mb-6">
                      <Calendar className="w-5 h-5 text-primary" />
                      Calendrier législatif
                    </h4>
                    <div className="space-y-6 pl-4 border-l-2 border-border ml-2">
                      {law.calendar.map((item, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[22px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-primary" />
                          <p className="text-[10px] font-black uppercase text-primary tracking-tighter mb-1">{item.date}</p>
                          <p className="text-sm text-foreground font-semibold">{item.event}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deep Analysis (Clean non-premium version) */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl relative overflow-hidden group">
                    <h4 className="text-slate-900 font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-4">
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
        )}
      </AnimatePresence>
    </div>
  );
}
