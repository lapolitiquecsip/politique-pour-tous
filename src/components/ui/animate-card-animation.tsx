"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight } from "lucide-react"

export interface CardData {
  id: number;
  title: string;
  description: string;
  image?: string;
  color?: string;
  value?: string;
  label?: string;
}

const positionStyles = [
  { scale: 1, y: 12 },
  { scale: 0.95, y: -16 },
  { scale: 0.9, y: -44 },
]

const exitAnimation = {
  y: 340,
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
    <div className={`flex h-full w-full flex-col justify-center items-center text-center p-6 rounded-[1rem] ${bgColor} text-white shadow-inner relative overflow-hidden`}>
      {/* Decorative subtle ambient glows */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {data.value ? (
          <>
            <span className="text-[5rem] sm:text-[7rem] font-staatliches mb-2 tracking-tighter leading-none drop-shadow-md text-white">
              {data.value}
            </span>
            <span className="text-sm sm:text-base font-bold max-w-sm leading-snug opacity-90 uppercase tracking-[0.2em] drop-shadow-sm text-balance">
              {data.label || data.description}
            </span>
          </>
        ) : isIntox ? (
          <>
            <h1 className="font-staatliches text-4xl sm:text-5xl mb-4 tracking-tight uppercase leading-none text-red-200">
              INTOX
            </h1>
            <span className="text-base sm:text-lg font-bold max-w-sm leading-relaxed drop-shadow-sm italic text-balance text-white/95">
              {data.description}
            </span>
          </>
        ) : (
          <>
            <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 backdrop-blur-sm">
              {data.title}
            </span>
            <span className="text-xl sm:text-2xl font-bold max-w-md leading-relaxed drop-shadow-sm text-balance text-white/95">
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
        bottom: 0,
      }}
      className="absolute flex h-[310px] w-[324px] items-center justify-center overflow-hidden rounded-t-[1.5rem] border-x border-t border-slate-200 bg-white p-1.5 shadow-2xl will-change-transform sm:w-[512px]"
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
      <div className="relative h-[400px] w-full overflow-hidden sm:w-[644px]">
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
