"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, ExternalLink, Bookmark, ChevronDown, User } from "lucide-react";
import { CalendarEvent } from "./EventItem";

interface InstitutionTabProps {
  id: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}

function InstitutionTab({ id, label, count, active, onClick, color }: InstitutionTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 py-3 transition-all relative ${
        active ? "text-white" : "text-slate-500 hover:text-slate-300"
      }`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className={`text-xs font-bold ${active ? color : "text-slate-600"}`}>{count}</span>
      {active && (
        <motion.div
          layoutId="activeTab"
          className={`absolute bottom-0 left-0 right-0 h-1 ${color.replace('text', 'bg')}`}
        />
      )}
    </button>
  );
}

interface CalendarDayDetailProps {
  selectedDate: Date | null;
  events: CalendarEvent[];
}


export default function CalendarDayDetail({ selectedDate, events }: CalendarDayDetailProps) {
  if (!selectedDate) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 rounded-full bg-slate-200/50 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Sélectionnez un jour</h3>
        <p className="text-slate-500 text-sm">Cliquez sur une date pour voir les évènements parlementaires prévus.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("Tous");

  const dayEvents = events.filter(e => 
    e.date.getDate() === selectedDate.getDate() &&
    e.date.getMonth() === selectedDate.getMonth() &&
    e.date.getFullYear() === selectedDate.getFullYear()
  );

  const eventsByInst = {
    "Tous": dayEvents,
    "Assemblée nationale": dayEvents.filter(e => e.institution === "Assemblée nationale"),
    "Sénat": dayEvents.filter(e => e.institution === "Sénat"),
    "Élysée": dayEvents.filter(e => e.institution === "Élysée")
  };

  const currentEvents = activeTab === "Tous" ? dayEvents : eventsByInst[activeTab as keyof typeof eventsByInst] || [];

  const formattedDate = new Intl.DateTimeFormat('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(selectedDate);

  return (
    <div className="h-full bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-y-auto custom-scrollbar-blue">
      <div className="mb-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2 block">Détails du jour</span>
        <h3 className="text-3xl font-black capitalize leading-tight">
          {formattedDate}
        </h3>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/5 mb-8">
        <InstitutionTab 
          id="Tous" label="Tous" count={dayEvents.length} 
          active={activeTab === "Tous"} onClick={() => setActiveTab("Tous")} color="text-white" 
        />
        <InstitutionTab 
          id="Assemblée nationale" label="AN" count={eventsByInst["Assemblée nationale"].length} 
          active={activeTab === "Assemblée nationale"} onClick={() => setActiveTab("Assemblée nationale")} color="text-blue-400" 
        />
        <InstitutionTab 
          id="Sénat" label="Sénat" count={eventsByInst["Sénat"].length} 
          active={activeTab === "Sénat"} onClick={() => setActiveTab("Sénat")} color="text-indigo-400" 
        />
        <InstitutionTab 
          id="Élysée" label="Élysée" count={eventsByInst["Élysée"].length} 
          active={activeTab === "Élysée"} onClick={() => setActiveTab("Élysée")} color="text-amber-400" 
        />
      </div>

      {currentEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Bookmark className="w-10 h-10 mx-auto mb-4 opacity-10" />
          <p className="text-sm italic">Aucun évènement {activeTab !== "Tous" ? `pour ${activeTab}` : ""} pour cette date.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentEvents.map((event, idx) => {
            const isAN = event.institution === "Assemblée nationale";
            const isSenat = event.institution === "Sénat";
            const isElysee = event.institution === "Élysée";
            
            const brandColor = isAN ? "border-blue-500 bg-blue-500/10" : 
                               isSenat ? "border-indigo-500 bg-indigo-500/10" : 
                               isElysee ? "border-amber-500 bg-amber-500/10" : "border-slate-500 bg-slate-500/10";
            
            const textColor = isAN ? "text-blue-400" : isSenat ? "text-indigo-400" : isElysee ? "text-amber-400" : "text-slate-400";
            const badgeBg = isAN ? "bg-blue-500" : isSenat ? "bg-indigo-500" : isElysee ? "bg-amber-600" : "bg-slate-500";

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-6 rounded-[2rem] border-2 ${brandColor} relative overflow-hidden group`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeBg} text-white`}>
                    {event.institution}
                  </span>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${textColor}`} />
                    <span className="text-[10px] font-bold text-slate-400">
                      {event.category || 'Évènement'}
                    </span>
                  </div>
                </div>

                <h4 className="text-lg font-bold mb-3 leading-snug group-hover:text-white transition-colors">
                  {event.title}
                </h4>

                {event.description && (
                  <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line line-clamp-4 group-hover:line-clamp-none transition-all">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Paris</span>
                  </div>
                  <a 
                    href={event.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white hover:text-blue-400 transition-colors"
                  >
                    Source <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
