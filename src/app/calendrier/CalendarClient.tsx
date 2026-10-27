"use client";

import { useState } from "react";
import { CalendarDays, List, LayoutGrid } from "lucide-react";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import CalendarDayDetail from "@/components/calendar/CalendarDayDetail";
import { CalendarEvent } from "@/components/calendar/EventItem";
import { motion } from "framer-motion";
import ElectionsBanner from "@/components/calendar/ElectionsBanner";
import { upcomingElections } from "@/data/electionsData";
import ProchainsEvenements from "@/components/calendar/ProchainsEvenements";

export default function CalendarClient({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeFilter, setActiveFilter] = useState("Tous");
  // Téléphone : la liste des prochains rendez-vous d'abord (la grille n'y montre que des
  // points de couleur). Grand écran : grille et détail du jour, comme avant.
  const [vue, setVue] = useState<"liste" | "calendrier">("liste");

  // Inject upcoming elections as calendar events
  const electionEvents: CalendarEvent[] = upcomingElections.map(e => ({
    id: e.id,
    date: e.exactDate,
    title: e.title,
    description: e.description,
    institution: "Élection",
    category: "Scrutin"
  }));

  const allEvents = [...initialEvents, ...electionEvents];

  const filteredEvents = activeFilter === "Tous"
    ? allEvents
    : allEvents.filter((e) => e.institution === activeFilter);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // months and years removed as they were unused

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* En-tête Dynamique avec Filtres Modernes */}
      {/* 1. SECTION HEADER (POSTER STYLE REBORN) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
        <div className="relative flex-1">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-black uppercase mb-6 relative z-20">
            <CalendarDays className="w-3 h-3" /> Agenda Parlementaire
          </div>{" "}
          
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none relative z-10 inline-flex items-center gap-2 md:gap-3 flex-wrap">
              <span className="text-foreground dark:text-slate-100 opacity-[0.08] absolute -top-8 left-0 select-none hidden md:block whitespace-nowrap">
                DIRECT • AGENDA
              </span>{" "}
              <span className="text-black dark:text-white">Calendrier</span>{" "}
              <span className="bg-emerald-700 text-white px-4 pt-1.5 pb-0.5 md:pt-3 md:pb-1 rounded-xl md:rounded-2xl shadow-sm">simplifié</span>
            </h1>{" "}
            <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-6 rounded-full" />
          </div>{" "}

          <p className="text-xl md:text-2xl font-staatliches italic tracking-tight text-muted-foreground mt-8 max-w-2xl leading-relaxed">
            Visualisez les débats, votes et auditions clés au cœur de la vie politique.
          </p>
        </div>
      </div>{" "}

      {/* 2. ELECTIONS BANNER */}
      <ElectionsBanner />{" "}

      {/* Légende / Filtres Express */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex flex-wrap gap-6 p-5 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md rounded-3xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />{" "}
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Assemblée Nationale</span>
          </div>{" "}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(129,140,248,0.6)]" />{" "}
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Sénat</span>
          </div>{" "}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />{" "}
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Élysée</span>
          </div>
        </div>{" "}

        <div className="-mx-4 flex gap-1 self-stretch overflow-x-auto bg-slate-100 dark:bg-slate-500/10 p-1 px-4 [scrollbar-width:none] sm:mx-0 sm:self-start sm:rounded-2xl sm:border sm:border-border lg:self-auto [&::-webkit-scrollbar]:hidden">
          {["Tous", "Assemblée", "Sénat", "Élysée", "Élection"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f === "Assemblée" ? "Assemblée nationale" : f)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                (activeFilter === f || (f === "Assemblée" && activeFilter === "Assemblée nationale"))
                  ? "bg-card text-foreground shadow-lg"
                  : "text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              {f === "Élection" ? "Élections" : f}{" "}
            </button>
          ))}
        </div>
      </div>{" "}

      {/* Bascule de vue (téléphone et tablette). */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-slate-100 p-1 dark:bg-slate-500/10 lg:hidden" role="tablist" aria-label="Affichage de l'agenda">
        {([["liste", "À venir", List], ["calendrier", "Calendrier", LayoutGrid]] as const).map(([v, libelle, Icone]) => (
          <button key={v} role="tab" aria-selected={vue === v} onClick={() => setVue(v)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${vue === v ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
            <Icone size={16} /> {libelle}
          </button>
        ))}
      </div>{" "}

      {vue === "liste" && (
        <div className="mb-8 lg:hidden">
          <ProchainsEvenements events={filteredEvents} />
        </div>
      )}{" "}

      {/* Grid + Side Panel Layout */}
      <div className={`${vue === "liste" ? "hidden lg:flex" : "flex"} flex-col lg:flex-row gap-8 lg:min-h-[600px]`}>
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
        </motion.div>{" "}

        {/* Panneau de Détails (25%) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-[1] min-w-0 lg:min-w-[320px]"
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
