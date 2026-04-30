"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Info, ChevronLeft, ChevronRight, ShieldAlert, AlertCircle } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function StatsPanel() {
  const [slides, setSlides] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('description')
        .eq('category', 'WeeklyStats')
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data[0]) {
        const parsedSlides = JSON.parse(data[0].description);
        setSlides(parsedSlides);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Fallback slides if fetch fails
      setSlides([
        { id: 1, value: "11", label: "groupes politiques : un record historique sous la Ve République", color: "bg-blue-600" },
        { id: 2, value: "1000", label: "heures de débats cumulées durant la première session", color: "bg-rose-600" },
        { id: 3, value: "47", label: "lois adoptées définitivement en un an malgré l'absence de majorité", color: "bg-slate-900" }
      ]);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isPaused && slides.length > 0) {
        setDirection(1);
        setIndex((prev) => (prev + 1) % slides.length);
      }
    }, 6000);
  }, [isPaused, slides.length]);
  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const nextSlide = () => {
    if (slides.length === 0) return;
    setDirection(1);
    setIndex((prev) => (prev + 1) % slides.length);
    startTimer();
  };

  const prevSlide = () => {
    if (slides.length === 0) return;
    setDirection(-1);
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
    startTimer();
  };

  const goToSlide = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
    startTimer();
  };

  const slide = slides[index];

  if (!slide) return null;

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
          animate={{ 
            x: 0, 
            opacity: 1,
            backgroundColor: slide.color?.startsWith('#') ? slide.color : undefined
          }}
          exit="exit"
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center text-white ${slide.color?.startsWith('bg-') ? slide.color : ''}`}
        >
          {slide.type === 'intox' && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
              <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-lg flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Intox de la semaine
              </span>
            </div>
          )}

          {!slide.value && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
              <span className="text-[12rem] md:text-[20rem] font-staatliches text-white/[0.05] uppercase tracking-tighter leading-none transform -rotate-6">
                {slide.type === 'intox' ? 'INTOX' : (slide.category_label?.split(' ')[0] || 'INFO')}
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
              
              <h2 className={`relative z-10 text-xl md:text-4xl font-bold max-w-3xl leading-[1.3] mb-10 tracking-tight ${slide.type === 'intox' ? 'text-red-100' : 'text-white/90'}`}>
                {slide.type === 'intox' ? `« ${slide.content} »` : slide.content}
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
            {slides.map((_, i) => (
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
