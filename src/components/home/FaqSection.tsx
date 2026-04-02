"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, HelpCircle, X } from "lucide-react";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  color: "red" | "white";
  position: { top: string; left: string };
  delay: number;
}

const faqData: FaqItem[] = [
  {
    id: 1,
    question: "D'où proviennent les données ?",
    answer: "Nos algorithmes analysent les journaux officiels de l'Assemblée nationale et du Sénat en temps réel pour extraire l'essentiel.",
    color: "red",
    position: { top: "15%", left: "10%" },
    delay: 0,
  },
  {
    id: 2,
    question: "Le site est-il neutre ?",
    answer: "Totalement. Notre mission est de décrypter les faits et les votes officiels, sans aucune prise de position politique.",
    color: "white",
    position: { top: "25%", left: "45%" },
    delay: 0.5,
  },
  {
    id: 3,
    question: "Pourquoi un abonnement Premium ?",
    answer: "Le Premium nous aide à financer l'infrastructure IA nécessaire pour analyser des milliers de pages de rapports législatifs chaque jour.",
    color: "red",
    position: { top: "10%", left: "80%" },
    delay: 1.2,
  },
  {
    id: 4,
    question: "Puis-je suivre mon député ?",
    answer: "Oui ! Utilisez la section 'Députés' pour trouver votre circonscription et voir exactement ce que votre élu a voté récemment.",
    color: "white",
    position: { top: "60%", left: "20%" },
    delay: 0.8,
  },
  {
    id: 5,
    question: "Qui êtes-vous ?",
    answer: "Nous sommes Hippolyte et Teva, deux étudiants de 19 ans. Nous avons créé ce site car nous étions frustrés par le manque de transparence politique et le déclin de notre démocratie.",
    color: "red",
    position: { top: "70%", left: "60%" },
    delay: 1.5,
  },
  {
    id: 6,
    question: "Comment nous aider ?",
    answer: "En partageant le site autour de vous ou en souscrivant au Premium pour soutenir notre indépendance.",
    color: "white",
    position: { top: "50%", left: "85%" },
    delay: 0.3,
  },
];

export default function FaqSection() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-32 px-4 bg-slate-50 overflow-hidden group border-t border-slate-200">
      {/* Decorative background elements (subtle for light mode) */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-20" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Poster Title (CLEAN BLACK STYLE) */}
        <div className="relative mb-24 text-center">
          <div className="relative z-10">
            <span className="text-slate-900 opacity-[0.06] absolute -top-12 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap text-9xl font-staatliches tracking-widest leading-none">
              QUESTIONS • RÉPONSES
            </span>
            
            <h2 className="text-7xl md:text-9xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
              F.A.Q.
            </h2>
          </div>
          <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-8 rounded-full mx-auto" />
        </div>

        {/* Floating FAQ Bubbles Area */}
        <div className="relative h-[600px] md:h-[500px] w-full mt-12">
          {faqData.map((item) => (
            <motion.div
              key={item.id}
              className="absolute cursor-pointer"
              style={{ top: item.position.top, left: item.position.left }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: item.delay, duration: 0.5 }}
            >
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 4 + item.id, 
                  ease: "easeInOut" 
                }}
                whileHover={{ scale: 1.1, rotate: 0 }}
                onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                className={`relative px-6 py-4 rounded-3xl shadow-2xl max-w-[200px] md:max-w-[250px] select-none text-center
                  ${item.color === "red" 
                    ? "bg-red-600 text-white border-red-500" 
                    : "bg-white text-slate-900 border-slate-200"}
                  border-b-4 border transform transition-all active:scale-95
                `}
              >
                {/* Speech Bubble "Tail" */}
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px]
                  ${item.color === "red" ? "border-t-red-600" : "border-t-white"}
                `} />

                <p className="font-bold text-sm md:text-base leading-tight">
                  {item.question}
                </p>
              </motion.div>
            </motion.div>
          ))}

          {/* Modal / Answer Panel Overlaid */}
          <AnimatePresence>
            {selectedId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-xl mx-4 pointer-events-auto border border-blue-100 relative group overflow-hidden">
                   {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent -mr-12 -mt-12 rounded-full" />
                  
                  <button 
                    onClick={() => setSelectedId(null)}
                    className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                  >
                    <X size={24} />
                  </button>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
                      <HelpCircle size={32} />
                    </div>
                    <h3 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 mb-4 leading-none">
                      {faqData.find(f => f.id === selectedId)?.question}
                    </h3>
                    <p className="text-xl text-slate-600 leading-relaxed font-medium italic">
                      &quot;{faqData.find(f => f.id === selectedId)?.answer}&quot;
                    </p>
                  </div>

                  <div className="mt-8 flex items-center gap-2 text-blue-500/40 font-black text-[10px] uppercase tracking-[0.3em] justify-center">
                    <div className="w-8 h-px bg-blue-500/20" />
                    Réponse Citoyenne
                    <div className="w-8 h-px bg-blue-500/20" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Closing phrase inspired by poster design */}
        <div className="text-center mt-12 text-white/40 font-staatliches tracking-[0.4em] uppercase text-xs">
          Comprendre • Décrypter • Agir
        </div>
      </div>
    </section>
  );
}
