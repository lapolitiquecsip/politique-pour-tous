"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export interface CardData {
  id: number;
  title: string;
  description: string;
  image?: string;
  color?: string;
  value?: string;
  label?: string;
  intoxContent?: string;
  intoxDebunk?: string;
}

const positionStyles = [
  { scale: 1, y: 12 },
  { scale: 0.95, y: -16 },
  { scale: 0.9, y: -44 },
]

const exitAnimation = {
  y: 450,
  scale: 1,
  zIndex: 10,
}

const enterAnimation = {
  y: -16,
  scale: 0.9,
}

const VIVID_COLORS = [
  "bg-pink-500",    // rose
  "bg-emerald-500", // vert
  "bg-blue-500",    // bleu
  "bg-purple-600",  // violet
  "bg-red-500"      // rouge
];

function CardContent({ data }: { data: CardData }) {
  const colorIndex = Math.max(0, (data.id || 1) - 1) % VIVID_COLORS.length;
  const bgColor = VIVID_COLORS[colorIndex];
  const isIntox = data.title === "Intox de la semaine";

  return (
    <div className={`flex h-full w-full flex-col justify-center items-center text-center p-4 sm:p-6 rounded-[1.625rem] ${bgColor} text-white shadow-inner relative overflow-hidden`}>
      {/* Decorative subtle ambient glows */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {data.value ? (
          <>
            <span className="text-[4rem] sm:text-[5.5rem] font-staatliches mb-1 tracking-tighter leading-none drop-shadow-md text-white">
              {data.value}
            </span>
            <span className={`font-bold max-w-sm leading-snug opacity-90 drop-shadow-sm text-balance ${
              (data.label || data.description || "").length > 120
                ? 'text-xs sm:text-sm tracking-normal normal-case'
                : (data.label || data.description || "").length > 80
                  ? 'text-[10px] sm:text-xs tracking-wider uppercase'
                  : 'text-xs sm:text-sm tracking-[0.15em] uppercase'
            }`}>
              {data.label || data.description}
            </span>
          </>
        ) : isIntox ? (() => {
          let content = data.intoxContent;
          let debunk = data.intoxDebunk;

          if (!content || !debunk) {
            const match = data.description.match(/^«\s*([\s\S]*?)\s*»\s*(?:\n|(?:\s*-\s*))?Réalité\s*:\s*([\s\S]*)$/i);
            if (match) {
              content = match[1];
              debunk = match[2];
            } else {
              const parts = data.description.split(/Réalité\s*:/i);
              if (parts.length > 1) {
                content = parts[0].replace(/^«\s*/, '').replace(/\s*»$/, '').trim();
                debunk = parts[1].trim();
              } else {
                content = data.description;
                debunk = "";
              }
            }
          }

          let verdict = "";
          let debunkText = debunk;

          if (debunkText) {
            const verdictMatch = debunkText.match(/^(faux|vrai|nuancé|exact|inexact|vrai\s+mais|faux\s+mais|partiellement\s+vrai|partiellement\s+faux)(\.|\s|:|,)/i);
            if (verdictMatch) {
              verdict = verdictMatch[1];
              verdict = verdict.charAt(0).toUpperCase() + verdict.slice(1).toLowerCase();
              const skipLength = verdictMatch[0].length;
              debunkText = debunkText.substring(skipLength).trim();
              debunkText = debunkText.replace(/^[.\s:-]+/, '').trim();
            }
          }

          const isFaux = verdict.toLowerCase().includes('faux') || verdict.toLowerCase().includes('inexact');
          const isVrai = verdict.toLowerCase().includes('vrai') || verdict.toLowerCase().includes('exact');

          return (
            <div className="flex flex-col items-center justify-between w-full h-full py-1">
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                <span className="bg-white/20 text-white/90 border border-white/10 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                  Fact-Checking
                </span>
                <h1 className="font-staatliches text-2xl sm:text-3xl tracking-wide uppercase leading-none text-white">
                  INTOX
                </h1>
              </div>

              {/* Rumeur Box */}
              <div className="bg-black/25 border border-white/5 rounded-xl px-4 py-2.5 text-left w-full mb-3 relative max-w-sm flex-1 flex flex-col justify-center">
                <span className="absolute -top-2 left-3 bg-rose-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest text-white shadow-sm border border-rose-400">
                  LA RUMEUR
                </span>
                <p className="text-white/90 italic font-medium leading-snug text-xs sm:text-sm line-clamp-3">
                  « {content} »
                </p>
              </div>

              {/* Réalité Box */}
              <div className={`bg-white text-slate-900 rounded-xl p-3 text-left w-full max-w-sm shadow-xl border-l-4 ${
                isFaux 
                  ? 'border-rose-500' 
                  : isVrai 
                    ? 'border-emerald-500' 
                    : 'border-amber-500'
              } flex flex-col justify-center`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    RÉALITÉ
                  </span>
                  
                  {verdict && (
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                      isFaux 
                        ? 'bg-rose-100 text-rose-800' 
                        : isVrai 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isFaux && (
                        <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {isVrai && (
                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {verdict}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-xs text-slate-700 leading-normal font-medium line-clamp-4">
                  {debunkText}
                </p>
              </div>
            </div>
          );
        })() : (
          <>
            <span className="bg-white/20 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4 backdrop-blur-sm">
              {data.title}
            </span>
            <span className={`font-bold max-w-md drop-shadow-sm text-balance text-white/95 ${
              data.description.length > 240
                ? 'text-[11px] sm:text-xs leading-snug'
                : data.description.length > 150 
                  ? 'text-xs sm:text-sm leading-normal' 
                  : data.description.length > 80 
                    ? 'text-sm sm:text-base leading-relaxed' 
                    : 'text-base sm:text-lg leading-relaxed'
            }`}>
              {data.description}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function AnimatedCard({
  card,
  index,
  isAnimating,
}: {
  card: CardData
  index: number
  isAnimating: boolean
}) {
  const { scale, y } = positionStyles[index] ?? positionStyles[2]
  const zIndex = index === 0 && isAnimating ? 10 : 3 - index

  const exitAnim = index === 0 ? exitAnimation : undefined
  const initialAnim = index === 2 ? enterAnimation : undefined

  return (
    <motion.div
      key={card.id}
      initial={initialAnim}
      animate={{ y, scale }}
      exit={exitAnim}
      transition={{
        type: "spring",
        duration: 1,
        bounce: 0,
      }}
      style={{
        zIndex,
        left: "50%",
        x: "-50%",
        bottom: 24,
      }}
      className="absolute flex h-[360px] w-[324px] items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-1.5 shadow-2xl will-change-transform sm:w-[512px]"
    >
      <CardContent data={card} />
    </motion.div>
  )
}

export default function AnimatedCardStack({ items = [] }: { items: CardData[] }) {
  // If we don't have enough items, we duplicate them to ensure smooth infinite sliding
  const safeItems = items.length > 0 ? items : [
    { id: 1, title: "Chargement...", description: "Récupération des données en cours...", image: "https://images.unsplash.com/photo-1549221530-5800fb7383a1?q=80&w=800&auto=format&fit=crop" }
  ];
  
  // Create an internal state with at least 3 cards to fill the stack
  const [cards, setCards] = useState<CardData[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextId, setNextId] = useState(4);
  const [dataIndex, setDataIndex] = useState(3 % safeItems.length);

  // Initialize cards when items change
  useEffect(() => {
    const initialCards = Array(3).fill(null).map((_, i) => ({
      ...safeItems[i % safeItems.length],
      id: i + 1 // Internal unique ID for animations
    }));
    setCards(initialCards);
    setNextId(4);
    setDataIndex(3 % safeItems.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleAnimate = () => {
    setIsAnimating(true);
    
    // Pick the next data item
    const nextDataItem = safeItems[dataIndex];
    
    setCards([...cards.slice(1), { ...nextDataItem, id: nextId }]);
    
    setNextId((prev) => prev + 1);
    setDataIndex((prev) => (prev + 1) % safeItems.length);
    setIsAnimating(false);
  };

  if (cards.length === 0) return null;

  return (
    <div className="flex w-full flex-col items-center justify-center pt-2 pb-6">
      <div className="relative h-[450px] w-full overflow-hidden sm:w-[644px]">
        <AnimatePresence initial={false}>
          {cards.slice(0, 3).map((card, index) => (
            <AnimatedCard key={card.id} card={card} index={index} isAnimating={isAnimating} />
          ))}
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center pt-2">
        <button
          onClick={handleAnimate}
          className="flex h-12 cursor-pointer select-none items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-slate-900 bg-white px-8 font-black text-slate-900 transition-all hover:bg-slate-900 hover:text-white active:scale-[0.98] shadow-[0_8px_0_rgba(15,23,42,1)] hover:translate-y-1 hover:shadow-[0_4px_0_rgba(15,23,42,1)] active:translate-y-2 active:shadow-none uppercase tracking-widest text-xs"
        >
          Voir le suivant
        </button>
      </div>
    </div>
  )
}
