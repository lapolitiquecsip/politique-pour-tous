"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Info, ChevronLeft, ChevronRight, ShieldAlert, AlertCircle } from "lucide-react";

const SLIDES = [
  { 
    id: 1,
    value: "11", 
    label: "groupes politiques : un record historique sous la Ve République", 
    color: "bg-blue-600"
  },
  { 
    id: 2,
    value: "1000", 
    label: "heures de débats cumulées durant la première session", 
    color: "bg-rose-600"
  },
  { 
    id: 3,
    value: "47", 
    label: "lois adoptées définitivement en un an malgré l'absence de majorité", 
    color: "bg-slate-900"
  },
  { 
    id: 4,
    type: "DÉCISION",
    content: "Le Bureau de l'Assemblée a voté le gel exceptionnel des pensions des anciens députés pour l'année 2026.", 
    color: "bg-[#2d0a15]" // Dark Burgundy
  },
  { 
    id: 5,
    type: "HISTORIQUE",
    content: "Yaël Braun-Pivet est la première femme de l'histoire à être réélue à la Présidence de l'Assemblée nationale.",
    color: "bg-slate-950", 
    isLive: true
  }
];

import { CheckSquare, Landmark } from "lucide-react";

export default function StatsPanel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setDirection(1);
        setIndex((prev) => (prev + 1) % SLIDES.length);
      }
    }, 6000);
  }, [isPaused]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const nextSlide = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % SLIDES.length);
    startTimer(); // Reset timer on manual click
  };

  const prevSlide = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    startTimer(); // Reset timer on manual click
  };

  const goToSlide = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
    startTimer(); // Reset timer on manual click
  };

  const slide = SLIDES[index];

  const variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0
    })
  };

  return (
    <div 
      className="relative w-full h-[320px] md:h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl group transition-all duration-500"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center text-white ${slide.color} transition-colors duration-700`}
        >
          {!slide.value && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
              <span className="text-[12rem] md:text-[20rem] font-staatliches text-white/[0.03] uppercase tracking-tighter leading-none transform -rotate-6">
                {slide.type?.split(' ')[0]}
              </span>
            </div>
          )}

          {slide.value ? (
            <>
              <motion.span 
                initial={{ scale: 0.8, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="relative z-10 text-8xl md:text-[9rem] font-staatliches mb-2 tracking-tighter leading-none"
              >
                {slide.value}
              </motion.span>
              <p className="relative z-10 text-sm md:text-xl font-bold max-w-xl leading-snug opacity-70 uppercase tracking-[0.2em]">
                {slide.label}
              </p>
            </>
          ) : (
            <>
              {/* Category tag and live badge removed */}
              
              <h2 className="relative z-10 text-xl md:text-4xl font-bold max-w-3xl leading-[1.3] mb-10 tracking-tight text-white/90">
                {slide.content}
              </h2>

              {slide.debunk && (
                <div className="relative z-10 bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl max-w-2xl">
                  <div className="flex items-start gap-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] uppercase tracking-[0.2em] font-black mt-1">
                      RÉALITÉ
                    </span>
                    <p className="text-base md:text-xl font-medium leading-relaxed text-white/80 italic">
                      &ldquo;{slide.debunk}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Dots indicators */}
          <div className="absolute bottom-6 flex gap-2">
            {SLIDES.map((_, i) => (
              <button 
                key={i} 
                onClick={() => goToSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-10 bg-white" : "w-2 bg-white/30"}`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0"
      >
        <ChevronRight className="w-8 h-8" />
      </button>
    </div>
  );
}
