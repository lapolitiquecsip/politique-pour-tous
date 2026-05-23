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
  const [currentIndex, setCurrentIndex] = useState(0)
  const lastNavigationTime = useRef(0)
  const navigationCooldown = 400 // ms between navigations
  const containerRef = useRef<HTMLDivElement>(null)

  const navigate = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastNavigationTime.current < navigationCooldown) return
    lastNavigationTime.current = now

    setCurrentIndex((prev) => {
      if (newDirection > 0) {
        return prev === items.length - 1 ? 0 : prev + 1
      }
      return prev === 0 ? items.length - 1 : prev - 1
    })
  }, [items.length])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    if (info.offset.y < -threshold) {
      navigate(1)
    } else if (info.offset.y > threshold) {
      navigate(-1)
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 15) {
        const isScrollingDown = e.deltaY > 0
        const isAtEnd = currentIndex === items.length - 1
        const isAtStart = currentIndex === 0

        // Hijack scroll only if actively sliding between cards.
        // Once start or end is reached, allow regular page scrolling.
        if ((isScrollingDown && !isAtEnd) || (!isScrollingDown && !isAtStart)) {
          e.preventDefault()
          navigate(isScrollingDown ? 1 : -1)
        }
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [navigate, currentIndex, items.length])

  const getCardStyle = (index: number) => {
    const total = items.length
    let diff = index - currentIndex
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total

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

  const isVisible = (index: number) => {
    const total = items.length
    let diff = index - currentIndex
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return Math.abs(diff) <= 2
  }

  return (
    <div 
      ref={containerRef}
      className={`relative flex ${height} w-full items-center justify-center overflow-hidden bg-transparent rounded-[3rem] border border-slate-100/55 shadow-inner bg-slate-50/20`}
    >
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/[0.01] blur-3xl" />
      </div>

      {/* Card Stack */}
      <div className="relative flex h-[480px] w-[340px] items-center justify-center" style={{ perspective: "1200px" }}>
        {items.map((item, index) => {
          if (!isVisible(index)) return null
          const style = getCardStyle(index)
          const isCurrent = index === currentIndex

          return (
            <motion.div
              key={item.id || index}
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

      {/* Navigation dots */}
      <div className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentIndex) {
                setCurrentIndex(index)
              }
            }}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "h-6 bg-slate-800" : "bg-slate-400/40 hover:bg-slate-500"
            }`}
            aria-label={`Go to item ${index + 1}`}
          />
        ))}
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
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
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
              <path d="M18 15l-6-6-6 6" />
            </svg>
            <span className="text-[9px] font-black tracking-widest uppercase mt-1">Glisser ou défiler</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-1"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      {/* Counter */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-extralight text-slate-800 tabular-nums">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="my-2 h-px w-8 bg-slate-300" />
          <span className="text-xs text-slate-400 tabular-nums">{String(items.length).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  )
}
