"use client";

import { motion } from "framer-motion";
import { 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  AlertCircle 
} from "lucide-react";
import { type LawDossier } from "@/data/free-laws-dossiers";

interface DetailedLawDossierProps {
  law: LawDossier;
}

export default function DetailedLawDossier({ law }: DetailedLawDossierProps) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  const badgeColor = colorMap[law.color] || "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all mb-12"
    >
      <div className="p-8 md:p-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${badgeColor}`}>
            {law.category}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full capitalize italic">
            <span className={`w-2 h-2 rounded-full ${law.status === 'application' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            {law.statusLabel}
          </div>
        </div>

        <h3 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6 leading-tight">
          {law.title}
        </h3>

        <p className="text-xl text-muted-foreground leading-relaxed mb-10">
          {law.summary}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Main Impacts */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Ce que ça change pour vous
            </h4>
            <div className="space-y-4">
              {law.impacts.map((impact, idx) => (
                <div key={idx} className="flex gap-3 items-start p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-muted-foreground text-sm leading-relaxed">{impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline & Premium */}
          <div className="space-y-8">
            {/* Timeline */}
            <div>
              <h4 className="text-lg font-bold flex items-center gap-2 text-foreground mb-6">
                <Calendar className="w-5 h-5 text-primary" />
                Calendrier d&apos;application
              </h4>
              <div className="space-y-6 pl-4 border-l-2 border-border ml-2">
                {law.calendar.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[22px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-primary" />
                    <p className="text-xs font-black uppercase text-primary tracking-tighter mb-1">{item.date}</p>
                    <p className="text-sm text-foreground font-semibold">{item.event}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Teaser (The "Hook") */}
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Sparkles className="w-12 h-12 text-amber-600" />
              </div>
              <h4 className="text-amber-800 font-black text-sm uppercase tracking-widest flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4" />
                Inclus dans votre abonnement Premium
              </h4>
              <ul className="space-y-3">
                {law.premiumPoints.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-amber-900/80 font-medium italic">
                    <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
