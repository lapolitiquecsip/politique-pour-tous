"use client";

import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  cubicBezier,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Curated Unsplash images for political/civic design.
 */
export const DEFAULT_GRID_IMAGES: readonly string[] = [
  "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1575037614876-c38a4d44f5b8?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1577979749830-f1d742b9177b?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
];

const easeIntoFocus = cubicBezier(0.22, 1, 0.36, 1);
const easeOutOfFocus = cubicBezier(0, 0, 0.58, 1);
const focusEase: [typeof easeIntoFocus, typeof easeOutOfFocus] = [
  easeIntoFocus,
  easeOutOfFocus,
];

export type MaxWidthToken =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "none";

export type GapToken = 4 | 6 | 8 | 10 | 12 | 14;

const MAX_WIDTH_CLASS: Record<MaxWidthToken, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  none: "",
};

const GAP_CLASS: Record<GapToken, string> = {
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  14: "gap-14",
};

type Side = "L" | "R";

type TileConfig = {
  aspectRatio?: string;
  perspective: number;
  maxTilt: number;
  maxBlur: number;
  rounded: string;
};

function Tile({
  src,
  children,
  side,
  config,
}: {
  src?: string;
  children?: React.ReactNode;
  side: Side;
  config: TileConfig;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const reduce = useReducedMotion();
  const sign = side === "L" ? -1 : 1;
  const { aspectRatio, perspective, maxTilt, maxBlur, rounded } = config;

  const blur     = useTransform(p, [0, 0.5, 1], [maxBlur, 0, maxBlur], { ease: focusEase });
  const bright   = useTransform(p, [0, 0.5, 1], [0.85, 1, 0.85],             { ease: focusEase });
  const contrast = useTransform(p, [0, 0.5, 1], [1.1, 1, 1.1],             { ease: focusEase });

  const ty = useTransform(p, [0, 0.5, 1], ["25%", "0%", "-25%"], { ease: focusEase });
  const tz = useTransform(p, [0, 0.5, 1], [100, 0, 100],           { ease: focusEase });
  const rx = useTransform(p, [0, 0.5, 1], [maxTilt, 0, -maxTilt],  { ease: focusEase });

  const tx = useTransform(p, [0, 0.5, 1],
    [`${sign * 10}%`, "0%", `${sign * 10}%`], { ease: focusEase });
  const rot = useTransform(p, [0, 0.5, 1], [-sign * 2, 0, sign * 2],   { ease: focusEase });
  const sk  = useTransform(p, [0, 0.5, 1], [sign * 5, 0, -sign * 5], { ease: focusEase });

  const innerSY = useTransform(p, [0, 0.5, 1], [1.2, 1, 1.2], { ease: focusEase });

  const filter = useMotionTemplate`blur(${blur}px) brightness(${bright}) contrast(${contrast})`;

  if (reduce) {
    return (
      <figure ref={ref} className="relative z-10 m-0 w-full h-full">
        <div
          className="relative w-full h-full overflow-hidden"
          style={{ aspectRatio, borderRadius: rounded }}
        >
          {children ? (
            children
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${src}")` }}
            />
          )}
        </div>
      </figure>
    );
  }

  return (
    <motion.figure
      ref={ref}
      className="relative z-10 m-0 w-full h-full"
      style={{ perspective, willChange: "transform" }}
    >
      <motion.div
        className="relative w-full h-full overflow-hidden will-change-[filter,transform]"
        style={{
          aspectRatio,
          borderRadius: rounded,
          filter,
          x: tx,
          y: ty,
          z: tz,
          rotate: rot,
          rotateX: rx,
          skewX: sk,
        }}
      >
        {children ? (
          <div className="h-full w-full">{children}</div>
        ) : (
          <motion.div
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{
              backgroundImage: `url("${src}")`,
              scaleY: innerSY,
              backfaceVisibility: "hidden",
            }}
          />
        )}
      </motion.div>
    </motion.figure>
  );
}

export type ScrollTiltedGridProps = {
  /** Custom React nodes to render as tiles instead of images. */
  children?: React.ReactNode[];
  /** Image URLs to render. Falls back to {@link DEFAULT_GRID_IMAGES}. */
  images?: readonly string[];
  /**
   * Cycle the source list and append more pairs as the user nears the bottom —
   * a perceptually infinite scroll. Default `false`.
   */
  loop?: boolean;
  /** Initial number of cycles to render when `loop` is on. Default `3`. */
  initialCycles?: number;
  /** CSS `aspect-ratio` value for each tile, e.g. `"3/4"`, `"2/3"`. Default `undefined` for flex/children. */
  aspectRatio?: string;
  /** Tailwind `max-w-*` token controlling the column width. Default `"none"`. */
  maxWidth?: MaxWidthToken;
  /** Tailwind `gap-*` token between tiles. Default `10`. */
  gap?: GapToken;
  /** CSS `perspective` in pixels applied to each tile. Default `900`. */
  perspective?: number;
  /**
   * Maximum `rotateX` tilt magnitude (in degrees) at the entry and exit poses.
   * Symmetric — entry tilts forward `+maxTilt`, exit tilts back `-maxTilt`.
   * Default `15` for text cards, `70` for images.
   */
  maxTilt?: number;
  /** Maximum blur (px) at the entry and exit poses. Default `2`. */
  maxBlur?: number;
  /**
   * CSS `border-radius` for the tile clipping mask. Accepts any CSS length value.
   * Default `"1.5rem"` (large rounded for modern cards).
   */
  rounded?: string;
  /** Additional className applied to the outer `<section>`. */
  className?: string;
};

/**
 * Editorial scroll-tilted grid. Pairs of images or custom content nodes rise from below tipped
 * forward, settle into a clean focus, then tilt back over the top edge as they
 * exit. Optionally loops infinitely via an IntersectionObserver-driven append.
 */
export function ScrollTiltedGrid({
  children,
  images = DEFAULT_GRID_IMAGES,
  loop = false,
  initialCycles = 3,
  aspectRatio,
  maxWidth = "none",
  gap = 8,
  perspective = 900,
  maxTilt = 15,
  maxBlur = 2,
  rounded = "1.5rem",
  className,
}: ScrollTiltedGridProps = {}) {
  const [cycles, setCycles] = useState(loop ? initialCycles : 1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loop) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCycles((c) => c + 2);
        }
      },
      { rootMargin: "1500px 0px 1500px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loop]);

  const items = useMemo(() => {
    if (children && children.length > 0) {
      return loop
        ? Array.from({ length: cycles }, () => children).flat()
        : [...children];
    }
    return loop
      ? Array.from({ length: cycles }, () => images).flat()
      : [...images];
  }, [loop, cycles, images, children]);

  const config = useMemo<TileConfig>(
    () => ({ aspectRatio, perspective, maxTilt, maxBlur, rounded }),
    [aspectRatio, perspective, maxTilt, maxBlur, rounded],
  );

  const gridClass = [
    "mx-auto mt-[4vh] mb-[4vh] grid w-full grid-cols-1 sm:grid-cols-2 px-2 py-[4vh]",
    MAX_WIDTH_CLASS[maxWidth],
    GAP_CLASS[gap],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={["relative w-full", className].filter(Boolean).join(" ")}
    >
      <div className={gridClass}>
        {items.map((item, i) => {
          const isChild = children && children.length > 0;
          return (
            <div key={`${i}-${isChild ? i : item}`} className="flex justify-center items-stretch py-4">
              <Tile
                src={isChild ? undefined : (item as string)}
                children={isChild ? (item as React.ReactNode) : undefined}
                side={i % 2 === 0 ? "L" : "R"}
                config={config}
              />
            </div>
          );
        })}
      </div>
      {loop ? (
        <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      ) : null}
    </section>
  );
}
