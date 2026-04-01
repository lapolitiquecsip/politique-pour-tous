"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, FileText, Users, Zap } from "lucide-react";

const STATS = [
  { label: "Amendements déposés cette semaine à l'AN", value: "142", icon: FileText },
  { label: "Questions au gouvernement posées", value: "38", icon: Users },
  { label: "Textes adoptés ce mois-ci", value: "12", icon: TrendingUp },
];

const BONUS_FACTS = [
  {
    type: "Le saviez-vous ?",
    content: "La plus longue séance de l'Assemblée nationale a duré 25 heures lors du débat sur les retraites en 2023.",
  },
  {
    type: "Intox de la semaine",
    content: "\"La France est le pays qui taxe le plus en Europe\" — FAUX. Le Danemark et la Belgique ont un taux de prélèvement supérieur (source : Eurostat 2024).",
  },
];

export default function StatsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 leading-snug">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bouton déroulant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 py-3 border-t border-slate-100 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Zap className="w-4 h-4" />
        {isOpen ? "Masquer" : "Le saviez-vous ? + Intox de la semaine"}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Panel déroulant */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-t border-slate-100 bg-slate-50/50">
              {BONUS_FACTS.map((fact, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-5"
                >
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 mb-3">
                    {fact.type}
                  </span>
                  <p className="text-slate-700 text-sm leading-relaxed">{fact.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
