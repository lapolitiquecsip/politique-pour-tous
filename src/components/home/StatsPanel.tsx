"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertCircle, Info } from "lucide-react";

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
    color: "bg-emerald-600",
    icon: <Info className="w-8 h-8 mb-4 opacity-50" />
  },
  { 
    id: 5,
    type: "Intox de la semaine",
    content: "\"La France est le pays qui taxe le plus en Europe\" — FAUX. Le Danemark et la Belgique ont un taux de prélèvement supérieur.", 
    color: "bg-orange-500",
    icon: <Zap className="w-8 h-8 mb-4 opacity-50 text-white" />
  }
];

export default function StatsPanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 2300); // 2.3 seconds
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="relative w-full h-[280px] md:h-[320px] rounded-[2.5rem] overflow-hidden shadow-2xl transition-colors duration-700">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center text-white ${slide.color}`}
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
              <p className="text-lg md:text-2xl font-bold max-w-2xl leading-tight opacity-90">
                {slide.label}
              </p>
            </>
          ) : (
            <>
              {slide.icon}
              <span className="inline-block px-4 py-1 rounded-full text-xs font-bold bg-white/20 mb-6 uppercase tracking-widest">
                {slide.type}
              </span>
              <p className="text-xl md:text-3xl font-extrabold max-w-3xl leading-snug">
                {slide.content}
              </p>
            </>
          )}

          {/* Dots indicators */}
          <div className="absolute bottom-6 flex gap-2">
            {SLIDES.map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
