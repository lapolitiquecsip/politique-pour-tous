"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, Bookmark, ChevronDown, User } from "lucide-react";
import { CalendarEvent } from "./EventItem";

function highlightText(text: string) {
  // Regex to match titles and names
  // 1. Classic prefixes: M., Mme, etc.
  // 2. Official titles: Président, Prince, Premier ministre, Roi, etc.
  // 3. Sequences of capitalized words after "avec", "de", "par"
  const regex = /(M\.|Mme|MM\.|Mmes|Président|Prince|Premier ministre|Roi|Reine|Chancelier)\s+([A-ZÀ-ÿ][a-zà-ÿ-]+(\s+[A-ZÀ-ÿ][a-zà-ÿ-]+)*)|(avec|de)\s+([A-ZÀ-ÿ][a-zà-ÿ-]+(\s+[A-ZÀ-ÿ][a-zà-ÿ-]+)+)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // We want to highlight only the name part if it was a preposition match
    const fullMatch = match[0];
    let highlightPart = fullMatch;
    let prefixPart = "";

    if (match[4]) { // Preposition match (avec/de)
      prefixPart = match[4] + " ";
      highlightPart = fullMatch.substring(prefixPart.length);
    }

    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add prefix if any
    if (prefixPart) {
      parts.push(prefixPart);
    }

    // Add the highlighted match (Yellow/Amber pastel)
    parts.push(
      <span key={match.index} className="inline-block px-1 rounded-sm bg-amber-500/20 border-b-2 border-amber-400/30 text-amber-100">
        {highlightPart}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function SubSection({ label, events, color }: { label: string, events: CalendarEvent[], color: string }) {
  const [isOpen, setIsOpen] = useState(false);
  if (events.length === 0) return null;

  return (
    <div className="mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 px-3 flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{label}</span>
        </div>
        <span className={`text-[10px] font-bold ${color}`}>{events.length}</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-3 pl-4 space-y-4">
              {events.map((event) => (
                <div key={event.id} className="group/item">
                  <div className="flex justify-between items-start gap-4">
                    <h5 className="text-[11px] font-bold text-slate-200 leading-snug flex-1 group-hover/item:text-white transition-colors">
                      {highlightText(event.title)}
                    </h5>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CalendarDayDetailProps {
  selectedDate: Date | null;
  events: CalendarEvent[];
}

function InstitutionSection({ 
  label, 
  events, 
  color, 
  badgeBg,
  icon: Icon
}: { 
  label: string; 
  events: CalendarEvent[]; 
  color: string; 
  badgeBg: string;
  icon: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (events.length === 0) return null;

  const categorize = (evs: CalendarEvent[]) => {
    const categories: Record<string, CalendarEvent[]> = {
      "Auditions": evs.filter(e => e.title.toLowerCase().includes('audition')),
      "Examens de textes": evs.filter(e => e.title.toLowerCase().includes('examen') || e.title.toLowerCase().includes('loi')),
      "Tables rondes": evs.filter(e => e.title.toLowerCase().includes('table ronde')),
      "Séances Publiques": evs.filter(e => e.title.toLowerCase().includes('séance') || e.title.toLowerCase().includes('public')),
      "Divers": evs.filter(e => 
        !e.title.toLowerCase().includes('audition') && 
        !e.title.toLowerCase().includes('examen') && 
        !e.title.toLowerCase().includes('loi') && 
        !e.title.toLowerCase().includes('table ronde') && 
        !e.title.toLowerCase().includes('séance') && 
        !e.title.toLowerCase().includes('public')
      )
    };
    return categories;
  };

  const cats = categorize(events);

  return (
    <div className={`mb-4 rounded-3xl border-2 ${isOpen ? 'border-white/20 bg-white/5' : 'border-white/5 hover:border-white/10'} transition-all overflow-hidden`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-2xl ${badgeBg} flex items-center justify-center text-white shadow-lg`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-black uppercase tracking-widest text-white">{label}</h4>
            <span className={`text-[10px] font-bold ${color}`}>{events.length} évènements</span>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6"
          >
            <div className="pt-4 border-t border-white/5 space-y-1">
              <SubSection label="Auditions" events={cats["Auditions"]} color={color} />
              <SubSection label="Examens de textes" events={cats["Examens de textes"]} color={color} />
              <SubSection label="Tables rondes" events={cats["Tables rondes"]} color={color} />
              <SubSection label="Séances Publiques" events={cats["Séances Publiques"]} color={color} />
              <SubSection label="Divers" events={cats["Divers"]} color={color} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CalendarDayDetail({ selectedDate, events }: CalendarDayDetailProps) {
  if (!selectedDate) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 rounded-full bg-slate-200/50 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Sélectionnez un jour</h3>
        <p className="text-slate-500 text-sm">Cliquez sur une date pour voir les évènements.</p>
      </div>
    );
  }

  const dayEvents = events.filter(e => 
    e.date.getDate() === selectedDate.getDate() &&
    e.date.getMonth() === selectedDate.getMonth() &&
    e.date.getFullYear() === selectedDate.getFullYear()
  );

  const anEvents = dayEvents.filter(e => e.institution === "Assemblée nationale" || e.institution === "Assemblée");
  const senatEvents = dayEvents.filter(e => e.institution === "Sénat");
  const elyseeEvents = dayEvents.filter(e => e.institution === "Élysée");

  const formattedDate = new Intl.DateTimeFormat('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(selectedDate);

  return (
    <div className="h-full bg-slate-950 rounded-[2.5rem] text-white shadow-2xl overflow-hidden flex flex-col border border-white/5">
      <div className="p-8 pb-6 bg-slate-950/80 backdrop-blur-xl z-20 border-b border-white/5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2 block">Détails du jour</span>
        <h3 className="text-2xl font-black capitalize leading-tight">
          {formattedDate}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-blue">
        {dayEvents.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-5" />
            <p className="text-xs italic">Aucun évènement pour cette date.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <InstitutionSection 
              label="Assemblée Nationale" 
              events={anEvents} 
              color="text-blue-400" 
              badgeBg="bg-blue-600" 
              icon={User}
            />
            <InstitutionSection 
              label="Sénat" 
              events={senatEvents} 
              color="text-indigo-400" 
              badgeBg="bg-indigo-600" 
              icon={Calendar}
            />
            <InstitutionSection 
              label="Élysée" 
              events={elyseeEvents} 
              color="text-amber-400" 
              badgeBg="bg-amber-600" 
              icon={Clock}
            />
          </div>
        )}
      </div>
    </div>
  );
}
