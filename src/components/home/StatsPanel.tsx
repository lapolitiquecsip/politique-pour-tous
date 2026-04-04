"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Info, ChevronLeft, ChevronRight, ShieldAlert, AlertCircle } from "lucide-react";

const SLIDES = [
  { 
    id: 1,
    value: "142", 
    label: "amendements déposés cette semaine à l'Assemblée nationale", 
    color: "bg-red-600",
    icon: null
  },
  { 
    id: 2,
    value: "38", 
    label: "questions au gouvernement posées par vos députés", 
    color: "bg-blue-600",
    icon: null
  },
  { 
    id: 3,
    value: "12", 
    label: "textes de loi adoptés définitivement ce mois-ci", 
    color: "bg-indigo-600",
    icon: null
  },
  { 
    id: 4,
    type: "Le saviez-vous ?",
    content: "La plus longue séance de l'Assemblée nationale a duré 25 heures lors du débat sur les retraites en 2023.", 
    color: "bg-gradient-to-br from-emerald-600 to-teal-800",
    icon: <Info className="w-12 h-12 mb-4 opacity-30" />
  },
  { 
    id: 5,
    type: "Intox de la semaine",
    content: "\"La France est le pays qui taxe le plus en Europe\"",
    debunk: "Le Danemark et la Belgique ont un taux de prélèvement supérieur.", 
    color: "bg-gradient-to-br from-orange-600 to-red-800", 
    icon: <ShieldAlert className="w-14 h-14 mb-4 text-white opacity-40" />,
    isLive: true
  }
];

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
          {slide.value ? (
            <>
              <motion.span 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-7xl md:text-9xl font-black mb-4 tracking-tighter"
              >
                {slide.value}
              </motion.span>
              <p className="text-lg md:text-2xl font-bold max-w-2xl leading-tight opacity-90 uppercase tracking-wide">
                {slide.label}
              </p>
            </>
          ) : (
            <>
              {slide.icon}
              <div className="flex items-center gap-2 mb-8 uppercase tracking-[0.3em] text-[10px] font-black">
                {slide.isLive && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                )}
                <span className="px-4 py-1 rounded-full bg-white/20 border border-white/20 backdrop-blur-sm">
                  {slide.type}
                </span>
              </div>
              
              <h2 className="text-2xl md:text-5xl font-black max-w-5xl leading-[1.1] mb-8 uppercase tracking-tight">
                {slide.content}
              </h2>

              {slide.debunk && (
                <div className="bg-black/30 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl max-w-3xl transform hover:scale-105 transition-transform duration-500">
                  <p className="text-xl md:text-3xl font-black leading-tight flex flex-col md:flex-row items-center gap-4">
                    <span className="bg-white text-black px-4 py-1 rounded-full text-sm uppercase tracking-widest shrink-0">
                      RÉALITÉ
                    </span>
                    <span className="text-white/90">
                      {slide.debunk}
                    </span>
                  </p>
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
