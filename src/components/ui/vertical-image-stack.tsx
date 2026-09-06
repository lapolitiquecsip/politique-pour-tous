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
  renderCard?: (item: any, isCurrent: boolean, index: number) => React.ReactNode;
  height?: string;
};

// Palette VIVE cyclique — le halo de fond et les particules changent à chaque scroll.
const VIVID_HEX = ["#d946ef", "#8b5cf6", "#0ea5e9", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#6366f1"];
const vividAt = (i: number) => VIVID_HEX[((i % VIVID_HEX.length) + VIVID_HEX.length) % VIVID_HEX.length];

// Transition mobile : fondu + très léger glissement directionnel (~22px). Douce et minimale.
const mobileCardVariants = {
  enter: (d: number) => ({ opacity: 0, y: d > 0 ? 22 : -22 }),
  center: { opacity: 1, y: 0 },
  exit: (d: number) => ({ opacity: 0, y: d > 0 ? -22 : 22 }),
};

// Carte de démo par défaut (quand aucun renderCard n'est fourni).
function DefaultDemoCard({ item, isCurrent }: { item: any; isCurrent: boolean }) {
  return (
    <div
      className="relative h-[420px] w-[280px] overflow-hidden rounded-3xl bg-card ring-1 ring-border/20"
      style={{ boxShadow: isCurrent ? "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)" : "0 10px 30px -10px rgba(0,0,0,0.1)" }}
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-black/20 via-transparent to-black/40 z-10" />
      <Image src={item.src || "/placeholder.svg"} alt={item.alt || "Image"} fill className="object-cover w-full h-full" draggable={false} priority={isCurrent} />
      <div className="absolute inset-x-0 bottom-0 p-6 z-20 text-white">
        <h3 className="font-bold text-lg leading-tight">{item.alt || "La Politique"}</h3>
      </div>
    </div>
  );
}

export function VerticalImageStack({
  items = DEFAULT_IMAGES,
  renderCard,
  height = "h-[650px]",
}: VerticalImageStackProps) {
  // Start indexing at 0
  const [currentIndex, setCurrentIndex] = useState(0)
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [milestone, setMilestone] = useState<{ id: number; value: number } | null>(null)
  const [dragDirection, setDragDirection] = useState<"up" | "down" | null>(null)
  const [dir, setDir] = useState(1) // sens du dernier passage (pour le sens du fondu mobile)

  // Mobile : on ALLÈGE tout (3 cartes au lieu de 5, aucune particule, aucune 3D, halo statique)
  // pour un défilement parfaitement fluide. Les effets riches restent sur desktop.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const on = () => setIsMobile(mq.matches)
    on(); mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  // Record personnel persistant : ressort à chaque visite (moteur de « battre son score »).
  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem("feed-best-combo") || "0", 10) || 0); } catch {}
  }, [])
  useEffect(() => {
    if (combo > best) { setBest(combo); try { localStorage.setItem("feed-best-combo", String(combo)); } catch {} }
  }, [combo, best])
  
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
  const navigationCooldown = 220 // ms entre deux navigations — assez court pour un swipe fluide
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

  // Plus de son au scroll. À la place, un retour HAPTIQUE discret (mobile) : dopamine tactile,
  // sans bruit. Ignoré silencieusement sur les appareils qui ne le supportent pas.
  const haptic = (pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch {}
  };

  // Paliers de combo qui déclenchent une célébration.
  const MILESTONES = [3, 5, 10, 15, 20, 30, 50];
  const nextMilestone = (c: number) => MILESTONES.find(m => m > c) ?? (c + 10);

  const spawnParticles = useCallback((count = 18, big = false, base?: string) => {
    if (isMobile) return; // pas de confettis sur mobile : c'est le principal facteur de saccades
    const colorsMap: Record<string, string[]> = {
      blue: ["#3b82f6", "#60a5fa", "#93c5fd", "#fbbf24"],
      purple: ["#a855f7", "#c084fc", "#d8b4fe", "#34d399"],
      red: ["#ef4444", "#f87171", "#fca5a5", "#f59e0b"],
      amber: ["#f59e0b", "#fbbf24", "#fcd34d", "#10b981"],
      emerald: ["#10b981", "#34d399", "#6ee7b7", "#3b82f6"],
    };
    const colors = base ? [base, base, "#ffffff", "#fbbf24"] : (colorsMap[theme] || ["#64748b", "#94a3b8", "#cbd5e1"]);

    const newParticles = Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const velocity = 60 + Math.random() * (big ? 200 : 100);
      return {
        id: Date.now() + i + Math.random(),
        x: 0,
        y: 0,
        tx: Math.cos(angle) * velocity,
        ty: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: (big ? 8 : 5) + Math.random() * (big ? 12 : 8),
      };
    });
    setParticles(newParticles);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  }, [theme, isMobile]);

  const navigate = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastNavigationTime.current < navigationCooldown) return
    
    lastNavigationTime.current = now
    
    setCurrentIndex((prev) => {
      const nextIndex = Math.max(0, Math.min(items.length - 1, prev + newDirection));
      const vivid = vividAt(nextIndex);
      if (nextIndex !== prev) {
        setDir(newDirection);
        if (newDirection > 0) {
          setCombo(c => {
            const nc = c + 1;
            if (MILESTONES.includes(nc)) {          // palier atteint → célébration
              setMilestone({ id: Date.now(), value: nc });
              spawnParticles(34, true, vivid);
              haptic([0, 30, 40, 30]);
            } else {
              spawnParticles(18, false, vivid);
              haptic(12);
            }
            return nc;
          });
        } else {
          setCombo(c => Math.max(0, c - 1));
          spawnParticles(18, false, vivid);
          haptic(8);
        }
      }
      return nextIndex;
    });
  }, [items.length, spawnParticles]);

  // Le toast de palier disparaît tout seul.
  useEffect(() => {
    if (!milestone) return;
    const t = setTimeout(() => setMilestone(null), 1400);
    return () => clearTimeout(t);
  }, [milestone]);

  const handleDrag = (_: any, info: PanInfo) => {
    const threshold = 15;
    const dir = info.offset.y < -threshold ? "up" : info.offset.y > threshold ? "down" : null;
    // Ne re-render que si la direction change vraiment (évite le jank au drag sur mobile).
    setDragDirection(prev => (prev === dir ? prev : dir));
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragDirection(null)
    // On valide soit sur la distance, soit sur un « flick » rapide (vélocité) → réactif.
    const threshold = 45
    if (info.offset.y < -threshold || info.velocity.y < -450) {
      navigate(1) // Glisser vers le haut = carte suivante
    } else if (info.offset.y > threshold || info.velocity.y > 450) {
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
    // Sur mobile : AUCUNE rotation 3D (rotateX), écarts un peu plus courts → 2 transforms simples
    // (y + scale) au lieu d'un rendu 3D coûteux à composer.
    const rx = (v: number) => (isMobile ? 0 : v)
    if (diff === 0) {
      return { y: 0, scale: 1, opacity: 1, zIndex: 5, rotateX: 0 }
    } else if (diff === -1) {
      return { y: isMobile ? -118 : -130, scale: 0.85, opacity: 0.65, zIndex: 4, rotateX: rx(8) }
    } else if (diff === -2) {
      return { y: -230, scale: 0.72, opacity: 0.35, zIndex: 3, rotateX: rx(15) }
    } else if (diff === 1) {
      return { y: isMobile ? 118 : 130, scale: 0.85, opacity: 0.65, zIndex: 4, rotateX: rx(-8) }
    } else if (diff === 2) {
      return { y: 230, scale: 0.72, opacity: 0.35, zIndex: 3, rotateX: rx(-15) }
    } else {
      return { y: diff > 0 ? 350 : -350, scale: 0.6, opacity: 0, zIndex: 0, rotateX: rx(diff > 0 ? -20 : 20) }
    }
  }

  const bgColors = {
    blue: "bg-blue-50/10 dark:bg-blue-950/20 border-blue-100/20 dark:border-blue-900/30",
    purple: "bg-purple-50/10 dark:bg-purple-950/20 border-purple-100/20 dark:border-purple-900/30",
    red: "bg-rose-50/10 dark:bg-rose-950/20 border-rose-100/20 dark:border-rose-900/30",
    amber: "bg-amber-50/10 dark:bg-amber-950/20 border-amber-100/20 dark:border-amber-900/30",
    emerald: "bg-emerald-50/10 dark:bg-emerald-950/20 border-emerald-100/20 dark:border-emerald-900/30",
  }[theme] || "bg-slate-50/10 dark:bg-slate-950/20 border-slate-100/20 dark:border-slate-900/30"

  const glowColors = {
    blue: "bg-blue-500/10 dark:bg-blue-500/15",
    purple: "bg-purple-500/10 dark:bg-purple-500/15",
    red: "bg-red-500/10 dark:bg-red-500/15",
    amber: "bg-amber-500/10 dark:bg-amber-500/15",
    emerald: "bg-emerald-500/10 dark:bg-emerald-500/15",
  }[theme] || "bg-slate-900/[0.01] dark:bg-slate-100/[0.02]"

  // Mobile : 3 cartes (courante + voisines) au lieu de 5 → 40 % d'éléments animés en moins.
  const relativePositions = isMobile ? [-1, 0, 1] : [-2, -1, 0, 1, 2]

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
      {/* Halo ambiant VIF derrière la pile — change de couleur à chaque scroll. Sur mobile : plus
          petit, flou plus léger, et SANS transition de couleur (la ré-rastérisation d'un gros flou
          à chaque frame était un gros facteur de saccades). */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${isMobile ? "h-[320px] w-[320px] blur-2xl" : "h-[550px] w-[550px] blur-3xl transition-colors duration-500"}`}
          style={{ backgroundColor: vividAt(currentIndex), opacity: 0.16 }}
        />
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
      {isMobile ? (
        // MOBILE : UNE seule carte, transition très douce (fondu + léger glissement, ~10px). Aucune
        // carte voisine qui bouge/scale → lecture confortable, pas de « trop-plein » de mouvement.
        <div className="relative flex h-[480px] w-[300px] items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={currentIndex}
              custom={dir}
              variants={mobileCardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute w-[280px] cursor-grab active:cursor-grabbing touch-pan-x"
              transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              onDragEnd={handleDragEnd}
              style={{ willChange: "transform, opacity" }}
            >
              {items[currentIndex] && (renderCard ? renderCard(items[currentIndex], true, currentIndex) : <DefaultDemoCard item={items[currentIndex]} isCurrent />)}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
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
              animate={{ y: style.y, scale: style.scale, opacity: style.opacity, rotateX: style.rotateX, zIndex: style.zIndex }}
              transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.7 }}
              drag={isCurrent ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.6}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              style={{ transformStyle: "preserve-3d", zIndex: style.zIndex, willChange: "transform, opacity" }}
            >
              {renderCard ? renderCard(item, isCurrent, absoluteIndex) : <DefaultDemoCard item={item} isCurrent={isCurrent} />}
            </motion.div>
          )
        })}
      </div>
      )}

      {/* Instruction hint / Tinder-style Controls merged */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 select-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-md">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          disabled={currentIndex === 0}
          className={`w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm`}
          title="Précédent"
        >
          <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.button>

        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[10px] font-black tracking-widest uppercase text-amber-500 select-none"
        >
          GLISSER / DÉFILER
        </motion.span>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(1)}
          disabled={currentIndex === items.length - 1}
          className={`w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm`}
          title="Suivant"
        >
          <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </motion.button>
      </div>



      {/* Combo Counter & Dopamine Streak meter */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 select-none hidden md:block w-40">
        <motion.div
          key={combo}
          animate={combo > 0 ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center gap-2 rounded-3xl border border-slate-100/60 bg-white/90 px-4 py-4 text-center shadow-xl shadow-amber-500/5 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/90"
        >
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-500">
            Combo {combo > 0 ? "🔥" : "💤"}
          </span>
          <span className="bg-gradient-to-b from-amber-500 to-orange-600 bg-clip-text text-5xl font-black leading-none tabular-nums text-transparent">
            {combo}
          </span>

          {/* Progression vers le prochain palier. */}
          <div className="w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                animate={{ width: `${Math.min(100, (combo / nextMilestone(combo)) * 100)}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
              />
            </div>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
              {combo >= (MILESTONES[MILESTONES.length - 1]) ? "Palier max 👑" : `Palier à ${nextMilestone(combo)}`}
            </span>
          </div>

          <span className="text-[9px] font-bold uppercase leading-tight tracking-tight text-slate-500 dark:text-slate-400">
            {getStreakMessage(combo)}
          </span>

          {best > 0 && (
            <span className="mt-0.5 flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:bg-amber-500/10">
              🏆 Record {best}
            </span>
          )}
        </motion.div>
      </div>

      {/* Points de progression dans le fil (drive de complétion). */}
      <div className="absolute left-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-1.5 md:flex">
        {items.slice(0, Math.min(items.length, 12)).map((_, i) => {
          const idx = items.length <= 12 ? i : Math.round((i / 11) * (items.length - 1));
          const active = idx === currentIndex;
          const done = idx < currentIndex;
          return (
            <span key={i} className={`rounded-full transition-all duration-300 ${active ? "h-5 w-1.5 bg-amber-500" : done ? "h-1.5 w-1.5 bg-amber-400/70" : "h-1.5 w-1.5 bg-slate-300 dark:bg-slate-700"}`} />
          );
        })}
      </div>

      {/* Célébration de palier (toast central). */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.3, y: -30 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="pointer-events-none absolute top-10 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-500/40"
          >
            {milestone.value} d'affilée · {getStreakMessage(milestone.value)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
