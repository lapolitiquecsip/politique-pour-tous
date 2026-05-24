"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
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
  // Start indexing at 0
  const [currentIndex, setCurrentIndex] = useState(0)
  const [combo, setCombo] = useState(0)
  const [dragDirection, setDragDirection] = useState<"up" | "down" | null>(null)
  
  interface Particle {
    id: number;
    x: number;
    y: number;
    tx: number;
    ty: number;
    color: string;
    size: number;
  }
  const [particles, setParticles] = useState<Particle[]>([])

  const lastNavigationTime = useRef(0)
  const navigationCooldown = 400 // ms between navigations
  const containerRef = useRef<HTMLDivElement>(null)

  // Get active item (handles infinite wrap around)
  const activeItem = items[currentIndex % items.length]

  // Determine active theme color based on institution
  const getThemeColor = useCallback(() => {
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
  }, [activeItem])

  const theme = getThemeColor()

  const playPopSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      
      // Crisp retro-pop synth chime (chord C5 to E5 / G5 to C6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = "sine";
      osc2.type = "triangle";
      
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
      
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6
      
      gainNode.gain.setValueAtTime(0.06, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.2);
    } catch (e) {
      console.warn("Audio Context blocked or unsupported");
    }
  };

  const spawnParticles = useCallback(() => {
    const colorsMap: Record<string, string[]> = {
      blue: ["#3b82f6", "#60a5fa", "#93c5fd", "#fbbf24"],
      purple: ["#a855f7", "#c084fc", "#d8b4fe", "#34d399"],
      red: ["#ef4444", "#f87171", "#fca5a5", "#f59e0b"],
      amber: ["#f59e0b", "#fbbf24", "#fcd34d", "#10b981"],
      emerald: ["#10b981", "#34d399", "#6ee7b7", "#3b82f6"],
    };
    const colors = colorsMap[theme] || ["#64748b", "#94a3b8", "#cbd5e1"];

    const newParticles = Array.from({ length: 18 }).map((_, i) => {
      const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const velocity = 60 + Math.random() * 100;
      return {
        id: Date.now() + i + Math.random(),
        x: 0,
        y: 0,
        tx: Math.cos(angle) * velocity,
        ty: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 8,
      };
    });
    setParticles(newParticles);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  }, [theme]);

  const navigate = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastNavigationTime.current < navigationCooldown) return
    
    lastNavigationTime.current = now
    
    setCurrentIndex((prev) => {
      const nextIndex = Math.max(0, Math.min(items.length - 1, prev + newDirection));
      if (nextIndex !== prev) {
        if (newDirection > 0) {
          setCombo(c => c + 1);
        } else {
          setCombo(c => Math.max(0, c - 1));
        }
        playPopSound();
        spawnParticles();
      }
      return nextIndex;
    });
  }, [items.length, spawnParticles]);

  const handleDrag = (_: any, info: PanInfo) => {
    const threshold = 15;
    if (info.offset.y < -threshold) {
      setDragDirection("up")
    } else if (info.offset.y > threshold) {
      setDragDirection("down")
    } else {
      setDragDirection(null)
    }
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragDirection(null)
    const threshold = 50
    if (info.offset.y < -threshold) {
      navigate(1) // Glisser vers le haut = carte suivante
    } else if (info.offset.y > threshold) {
      navigate(-1) // Glisser vers le bas = carte précédente
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 15) {
        const direction = e.deltaY > 0 ? 1 : -1
        
        // N'intercepter le scroll que si on peut effectivement naviguer dans la pile
        if (
          (direction === 1 && currentIndex < items.length - 1) ||
          (direction === -1 && currentIndex > 0)
        ) {
          e.preventDefault()
          navigate(direction)
        }
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [navigate, currentIndex, items.length])

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

  const relativePositions = [-2, -1, 0, 1, 2]

  const getStreakMessage = (val: number) => {
    if (val === 0) return "Explorez l'actualité !";
    if (val < 3) return "C'est parti ! 🚀";
    if (val < 6) return "Super combo ! 🔥";
    if (val < 10) return "Tu t'informes bien ! 🧠";
    if (val < 15) return "Incroyable focus ! ⚡";
    return "Expert politique ! 👑";
  };

  return (
    <div 
      ref={containerRef}
      className={`relative flex ${height} w-full items-center justify-center overflow-hidden transition-all duration-500 rounded-[3rem] border shadow-inner ${bgColors}`}
    >
      {/* Dynamic ambient glow behind the deck */}
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-1/2 top-1/2 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-500 ${glowColors}`} />
      </div>

      {/* Swipe Overlay Indicators (Tinder style visual feedback) */}
      <AnimatePresence>
        {dragDirection === "up" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className={`absolute z-40 pointer-events-none bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-2xl flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest`}
          >
            <span>SUIVANT</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </motion.div>
        )}
        {dragDirection === "down" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`absolute z-40 pointer-events-none bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-2xl flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest`}
          >
            <span>PRÉCÉDENT</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles Container for dopamine confetti */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex items-center justify-center">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
            animate={{ 
              x: p.tx, 
              y: p.ty, 
              scale: 0.1, 
              opacity: 0,
              rotate: Math.random() * 360 
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 10px ${p.color}`,
            }}
          />
        ))}
      </div>

      {/* Card Stack */}
      <div className="relative flex h-[480px] w-[340px] items-center justify-center" style={{ perspective: "1200px" }}>
        {relativePositions.map((rel) => {
          const style = getCardStyle(rel)
          const isCurrent = rel === 0
          const absoluteIndex = currentIndex + rel
          
          if (absoluteIndex < 0 || absoluteIndex >= items.length) return null;

          const item = items[absoluteIndex]

          if (!item) return null;

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
                stiffness: 300,
                damping: 24,
                mass: 0.8,
              }}
              drag={isCurrent ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.25}
              onDrag={handleDrag}
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

      {/* Instruction hint / Tinder-style Controls merged */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 select-none bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-100 shadow-md">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          disabled={currentIndex === 0}
          className={`w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm`}
          title="Précédent"
        >
          <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.button>

        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 select-none">
          GLISSER / DÉFILER
        </span>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(1)}
          disabled={currentIndex === items.length - 1}
          className={`w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm`}
          title="Suivant"
        >
          <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </motion.button>
      </div>

      {/* Infinite count counter (No limit denominator shown) */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 select-none pointer-events-none hidden md:block">
        <div className="flex flex-col items-center bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-md border border-slate-100/50">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">ACTU</span>
          <span className="text-3xl font-black text-slate-800 tabular-nums">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Combo Counter & Dopamine Streak meter */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 select-none hidden md:block w-36">
        <motion.div 
          animate={combo > 0 ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] } : {}}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="flex flex-col items-center bg-white/90 backdrop-blur-md px-3 py-3 rounded-2xl shadow-md border border-slate-100/50 text-center"
        >
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-1">
            COMBO {combo > 0 ? "🔥" : "💤"}
          </span>
          <span className="text-3xl font-black text-slate-800 tabular-nums mb-1 leading-none">
            {combo}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-tight">
            {getStreakMessage(combo)}
          </span>
        </motion.div>
      </div>
    </div>
  )
}
