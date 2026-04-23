"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarEvent } from "./EventItem";

interface CalendarGridProps {
  viewDate: Date;
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarGrid({
  viewDate,
  events,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth
}: CalendarGridProps) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Adjust for Monday start (JS 0=Sun, 1=Mon... -> We want 0=Mon, 6=Sun)
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month buffer days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      currentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      currentMonth: true
    });
  }

  // Next month buffer days (to fill 6 rows = 42 days)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      currentMonth: false
    });
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(e => 
      e.date.getDate() === date.getDate() &&
      e.date.getMonth() === date.getMonth() &&
      e.date.getFullYear() === date.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 overflow-hidden">
      {/* Header Interne Navigation */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-900 capitalize">
          {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(viewDate)}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={onPrevMonth}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={onNextMonth}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-4">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayObj, i) => {
          const dayEvents = getEventsForDay(dayObj.date);
          const active = isSelected(dayObj.date);
          const current = dayObj.currentMonth;
          const today = isToday(dayObj.date);

          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectDate(dayObj.date)}
              className={`
                relative h-20 md:h-28 p-2 rounded-2xl transition-all border-2 flex flex-col items-start gap-1
                ${current ? 'bg-white' : 'bg-slate-50/50 opacity-40'}
                ${active ? 'border-blue-500 shadow-lg z-10' : 'border-transparent hover:border-slate-200'}
                ${today ? 'bg-blue-50/50' : ''}
              `}
            >
              <span className={`text-sm font-black ${today ? 'text-blue-600' : 'text-slate-900'}`}>
                {dayObj.date.getDate()}
              </span>
              
              {/* Indicateurs d'évènements */}
              <div className="flex flex-wrap gap-1 mt-auto">
                {dayEvents.map((e, idx) => {
                  const inst = e.institution?.toLowerCase() || '';
                  const dotColor = inst.includes('assemblée') ? "bg-blue-500" : 
                                   inst.includes('sénat') ? "bg-indigo-500" : 
                                   inst.includes('élysée') ? "bg-amber-500" : "bg-slate-400";
                  return (
                    <div 
                      key={idx} 
                      className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${dotColor} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} 
                      title={e.title}
                    />
                  );
                })}
              </div>
              
              {today && (
                <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-blue-500" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
