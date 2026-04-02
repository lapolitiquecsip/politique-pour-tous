"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, ExternalLink, Bookmark } from "lucide-react";
import { CalendarEvent } from "./EventItem";

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

  const dayEvents = events.filter(e => 
    e.date.getDate() === selectedDate.getDate() &&
    e.date.getMonth() === selectedDate.getMonth() &&
    e.date.getFullYear() === selectedDate.getFullYear()
  );

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

      {dayEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Bookmark className="w-10 h-10 mx-auto mb-4 opacity-10" />
          <p className="text-sm italic">Aucun évènement public répertorié pour cette date.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayEvents.map((event, idx) => {
            const isAN = event.institution === "Assemblée";
            const isSenat = event.institution === "Sénat";
            const brandColor = isAN ? "border-blue-500 bg-blue-500/10" : 
                               isSenat ? "border-indigo-500 bg-indigo-500/10" : "border-red-500 bg-red-500/10";
            const textColor = isAN ? "text-blue-400" : isSenat ? "text-indigo-400" : "text-red-400";
            const badgeBg = isAN ? "bg-blue-500" : isSenat ? "bg-indigo-500" : "bg-red-500";

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-6 rounded-[2rem] border-2 ${brandColor} relative overflow-hidden group`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeBg} text-white`}>
                    {event.institution === "Assemblée" ? "Assemblée Nationale" : event.institution}
                  </span>
                  <Clock className={`w-5 h-5 ${textColor}`} />
                </div>

                <h4 className="text-xl font-bold mb-4 leading-snug group-hover:text-blue-400 transition-colors">
                  {event.title}
                </h4>

                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  {event.description}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Paris, France</span>
                  </div>
                  <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white hover:text-blue-400 transition-colors">
                    Détails <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
