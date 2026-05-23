"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, type PanInfo } from "framer-motion"
import Image from "next/image"

const DEFAULT_IMAGES = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80",
    alt: "Assemblée Nationale",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=600&q=80",
    alt: "Palais du Luxembourg",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&w=600&q=80",
    alt: "Gouvernement",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=600&q=80",
    alt: "Elysée",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1577979749830-f1d742b9177b?auto=format&fit=crop&w=600&q=80",
    alt: "Marianne",
  },
]

export type VerticalImageStackProps = {
  items?: any[];
  renderCard?: (item: any, isCurrent: boolean) => React.ReactNode;
  height?: string;
};

export function VerticalImageStack({
  items = DEFAULT_IMAGES,
  renderCard,
  height = "h-[650px]",
}: VerticalImageStackProps) {
  // Use a high base value so scrolling backwards doesn't easily go below 0
  const BASE_INDEX = items.length * 1000
  const [currentIndex, setCurrentIndex] = useState(BASE_INDEX)
  const lastNavigationTime = useRef(0)
  const navigationCooldown = 400 // ms between navigations
  const containerRef = useRef<HTMLDivElement>(null)

  const navigate = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastNavigationTime.current < navigationCooldown) return
    
    // Empêcher le retour en arrière (vers le haut / index négatifs)
    if (newDirection <= 0) return
    
    lastNavigationTime.current = now
    setCurrentIndex((prev) => prev + newDirection)
  }, [])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    // Glisser vers le haut (info.offset.y négatif) fait défiler vers l'article suivant (en avant)
    if (info.offset.y < -threshold) {
      navigate(1)
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      // Défiler vers le bas (e.deltaY > 0) fait avancer la pile.
      // Défiler vers le haut (e.deltaY < 0) n'est pas intercepté pour permettre le défilement naturel de la page vers le haut.
      if (e.deltaY > 0) {
        if (Math.abs(e.deltaY) > 15) {
          e.preventDefault()
          navigate(1)
        }
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [navigate])

  const getCardStyle = (diff: number) => {
    if (diff === 0) {
      return { y: 0, scale: 1, opacity: 1, zIndex: 5, rotateX: 0 }
    } else if (diff === -1) {
      return { y: -130, scale: 0.85, opacity: 0.65, zIndex: 4, rotateX: 8 }
    } else if (diff === -2) {
      return { y: -230, scale: 0.72, opacity: 0.35, zIndex: 3, rotateX: 15 }
    } else if (diff === 1) {
      return { y: 130, scale: 0.85, opacity: 0.65, zIndex: 4, rotateX: -8 }
    } else if (diff === 2) {
      return { y: 230, scale: 0.72, opacity: 0.35, zIndex: 3, rotateX: -15 }
    } else {
      return { y: diff > 0 ? 350 : -350, scale: 0.6, opacity: 0, zIndex: 0, rotateX: diff > 0 ? -20 : 20 }
    }
  }

  // Get active item (handles infinite wrap around)
  const activeItem = items[currentIndex % items.length]

  // Determine active theme color based on institution
  const getThemeColor = () => {
    if (!activeItem) return "blue"
    const inst = activeItem.institution?.toLowerCase()
    if (inst === "assemblée") return "blue"
    if (inst === "sénat") return "purple"
    if (inst === "gouvernement") return "red"
    if (inst === "média") return "amber"
    
    // Sneakers fallback
    const fallbackColors = ["blue", "purple", "amber", "red", "emerald"]
    const itemId = activeItem.id || 0
    return fallbackColors[itemId % fallbackColors.length] || "blue"
  }

  const theme = getThemeColor()

  const bgColors = {
    blue: "bg-blue-50/30 border-blue-100/50",
    purple: "bg-purple-50/30 border-purple-100/50",
    red: "bg-rose-50/30 border-rose-100/50",
    amber: "bg-amber-50/30 border-amber-100/50",
    emerald: "bg-emerald-50/30 border-emerald-100/50",
  }[theme] || "bg-slate-50/20 border-slate-100/55"

  const glowColors = {
    blue: "bg-blue-500/10",
    purple: "bg-purple-500/10",
    red: "bg-red-500/10",
    amber: "bg-amber-500/10",
    emerald: "bg-emerald-500/10",
  }[theme] || "bg-slate-900/[0.01]"

  // Relative positions window in DOM (centered around current index)
  const relativePositions = [-2, -1, 0, 1, 2]

  return (
    <div 
      ref={containerRef}
      className={`relative flex ${height} w-full items-center justify-center overflow-hidden transition-all duration-500 rounded-[3rem] border shadow-inner ${bgColors}`}
    >
      {/* Dynamic ambient glow behind the deck */}
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-1/2 top-1/2 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-500 ${glowColors}`} />
      </div>

      {/* Card Stack */}
      <div className="relative flex h-[480px] w-[340px] items-center justify-center" style={{ perspective: "1200px" }}>
        {relativePositions.map((rel) => {
          const style = getCardStyle(rel)
          const isCurrent = rel === 0
          const absoluteIndex = currentIndex + rel
          const itemIndex = ((absoluteIndex % items.length) + items.length) % items.length
          const item = items[itemIndex]

          return (
            <motion.div
              key={absoluteIndex}
              className="absolute cursor-grab active:cursor-grabbing w-[280px]"
              animate={{
                y: style.y,
                scale: style.scale,
                opacity: style.opacity,
                rotateX: style.rotateX,
                zIndex: style.zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 26,
                mass: 1,
              }}
              drag={isCurrent ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{
                transformStyle: "preserve-3d",
                zIndex: style.zIndex,
              }}
            >
              {renderCard ? (
                renderCard(item, isCurrent)
              ) : (
                <div
                  className="relative h-[420px] w-[280px] overflow-hidden rounded-3xl bg-card ring-1 ring-border/20"
                  style={{
                    boxShadow: isCurrent
                      ? "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)"
                      : "0 10px 30px -10px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-black/20 via-transparent to-black/40 z-10" />

                  <Image
                    src={item.src || "/placeholder.svg"}
                    alt={item.alt || "Image"}
                    fill
                    className="object-cover w-full h-full"
                    draggable={false}
                    priority={isCurrent}
                  />

                  {/* Text Overlay for default images */}
                  <div className="absolute inset-x-0 bottom-0 p-6 z-20 text-white">
                    <h3 className="font-bold text-lg leading-tight">{item.alt || "La Politique"}</h3>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Instruction hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <div className="flex flex-col items-center gap-1.5 text-slate-400">
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
            <span className="text-[9px] font-black tracking-widest uppercase mb-1">Défiler pour voir la suite</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      {/* Infinite count counter (No limit denominator shown) */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 select-none pointer-events-none">
        <div className="flex flex-col items-center bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">ACTU</span>
          <span className="text-3xl font-black text-slate-800 tabular-nums">
            {String(currentIndex - BASE_INDEX + 1).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  )
}
