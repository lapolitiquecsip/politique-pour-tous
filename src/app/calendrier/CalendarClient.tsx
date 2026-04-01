"use client";

import { useState } from "react";
import { Calendar, Filter, ChevronDown } from "lucide-react";
import EventTimeline from "@/components/calendar/EventTimeline";
import { CalendarEvent } from "@/components/calendar/EventItem";

const INSTITUTIONS = ["Tous", "Assemblée nationale", "Sénat", "Gouvernement"];

export default function CalendarClient({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [showFilters, setShowFilters] = useState(false);

  const filteredEvents = activeFilter === "Tous"
    ? initialEvents
    : initialEvents.filter((e: any) => e.institution === activeFilter);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* En-tête + Filtres compacts sur une seule ligne */}
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          Agenda Parlementaire
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mb-6">
          Les prochains événements clés à l&apos;Assemblée nationale, au Sénat et au Gouvernement.
        </p>

        {/* Filtres compacts en ligne (pills) */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {INSTITUTIONS.map((inst) => (
            <button
              key={inst}
              onClick={() => setActiveFilter(inst)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeFilter === inst
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {inst}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu principal — le calendrier occupe toute la largeur */}
      <div className="w-full">
        <EventTimeline events={filteredEvents} />
      </div>
    </div>
  );
}
