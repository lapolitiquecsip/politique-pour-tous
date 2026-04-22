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

function EventAccordion({ event, idx }: { event: CalendarEvent; idx: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const isAN = event.institution === "Assemblée nationale";
  const isSenat = event.institution === "Sénat";
  const isElysee = event.institution === "Élysée";
  
  const brandColor = isAN ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10" : 
                     isSenat ? "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10" : 
                     isElysee ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10" : "border-slate-500/30 bg-slate-500/5";
  
  const textColor = isAN ? "text-blue-400" : isSenat ? "text-indigo-400" : isElysee ? "text-amber-400" : "text-slate-400";
  const badgeBg = isAN ? "bg-blue-500" : isSenat ? "bg-indigo-500" : isElysee ? "bg-amber-600" : "bg-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.5) }}
      className={`mb-3 rounded-2xl border ${brandColor} overflow-hidden transition-all`}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-start gap-4 text-left"
      >
        <div className={`mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${badgeBg} text-white whitespace-nowrap`}>
          {isAN ? "AN" : event.institution}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white leading-tight mb-1">{event.title}</h4>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.category || "Évènement"}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform mt-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line mb-4">
                {event.description}
              </p>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <MapPin className="w-3 h-3" />
                  <span>Paris</span>
                </div>
                <a 
                  href={event.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${textColor} hover:brightness-125 transition-all`}
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
    <div className="h-full bg-slate-950 rounded-[2.5rem] text-white shadow-2xl overflow-hidden flex flex-col border border-white/5">
      {/* Header Fixé */}
      <div className="p-8 pb-4 bg-slate-950/80 backdrop-blur-xl z-20 border-b border-white/5">
        <div className="mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2 block">Détails du jour</span>
          <h3 className="text-2xl font-black capitalize leading-tight">
            {formattedDate}
          </h3>
        </div>

        {/* Navigation Tabs Compacte */}
        <div className="flex bg-white/5 rounded-xl p-1">
          <button onClick={() => setActiveTab("Tous")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === "Tous" ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>Tous ({dayEvents.length})</button>
          <button onClick={() => setActiveTab("Assemblée nationale")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === "Assemblée nationale" ? "bg-blue-500/20 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}>AN ({eventsByInst["Assemblée nationale"].length})</button>
          <button onClick={() => setActiveTab("Sénat")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === "Sénat" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}>Sénat ({eventsByInst["Sénat"].length})</button>
          <button onClick={() => setActiveTab("Élysée")} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === "Élysée" ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-slate-300"}`}>Élysée ({eventsByInst["Élysée"].length})</button>
        </div>
      </div>

      {/* Liste défilante */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-blue">
        {currentEvents.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-5" />
            <p className="text-xs italic">Aucun évènement {activeTab !== "Tous" ? `pour ${activeTab}` : ""} pour cette date.</p>
          </div>
        ) : (
          <div>
            {currentEvents.map((event, idx) => (
              <EventAccordion key={event.id} event={event} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
