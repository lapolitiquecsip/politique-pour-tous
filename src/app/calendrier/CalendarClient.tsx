"use client";

import { useState } from "react";
import { Calendar, ChevronDown, LayoutGrid, CalendarDays } from "lucide-react";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import CalendarDayDetail from "@/components/calendar/CalendarDayDetail";
import { CalendarEvent } from "@/components/calendar/EventItem";
import { motion } from "framer-motion";

export default function CalendarClient({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeFilter, setActiveFilter] = useState("Tous");

  const filteredEvents = activeFilter === "Tous"
    ? initialEvents
    : initialEvents.filter((e) => e.institution === activeFilter);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const years = [2024, 2025, 2026, 2027];

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* En-tête Dynamique avec Filtres Modernes */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-black uppercase mb-4">
            <CalendarDays className="w-3 h-3" /> Agenda Parlementaire
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
            Calendrier <span className="text-blue-600 italic">simplifié</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
            Visualisez les débats, votes et auditions clés au cœur de la vie politique française.
          </p>
        </div>
      </div>

      {/* Légende / Filtres Express */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex flex-wrap gap-6 p-5 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Assemblée Nationale</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(129,140,248,0.6)]" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Sénat</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Gouvernement</span>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start lg:self-auto">
          {["Tous", "Assemblée", "Sénat", "Gouvernement"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f === "Assemblée" ? "Assemblée nationale" : f)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                (activeFilter === f || (f === "Assemblée" && activeFilter === "Assemblée nationale"))
                  ? "bg-white text-slate-900 shadow-lg"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid + Side Panel Layout */}
      <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
        {/* Grille (75%) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-[3]"
        >
          <CalendarGrid 
            viewDate={viewDate}
            events={filteredEvents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </motion.div>

        {/* Panneau de Détails (25%) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-[1] min-w-[320px]"
        >
          <CalendarDayDetail 
            selectedDate={selectedDate}
            events={filteredEvents}
          />
        </motion.div>
      </div>
    </div>
  );
}
