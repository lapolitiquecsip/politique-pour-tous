"use client";

import { motion } from "framer-motion";

export function SketchyCardBorder({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <motion.path
        d="M 3,4 Q 50,1.5 97,3 Q 98.5,50 97,96 Q 50,98.5 4,97 Q 1.5,50 3,4"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="opacity-80"
      />
      <motion.path
        d="M 1,6 Q 50,3 99,5 Q 97,50 98,94 Q 50,97 2,93 Q 3,50 1,6"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
        className="opacity-45"
      />
    </svg>
  );
}

export function SketchyBallotBox({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-8 h-8 md:w-9 h-9" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M 22,50 L 78,50 L 74,86 L 26,86 Z"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d="M 18,44 L 82,44 L 82,50 L 18,50 Z"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />
      <motion.path
        d="M 38,47 L 62,47"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.4 }}
      />
      <motion.path
        d="M 44,22 L 56,22 L 56,38 L 44,38 Z"
        initial={{ y: -10, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />
      <motion.path
        d="M 50,12 L 50,20 M 46,16 L 50,20 L 54,16"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.8 }}
      />
    </svg>
  );
}

export function SketchyMoneyBag({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-8 h-8 md:w-9 h-9" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M 50,26 C 40,26 28,34 28,58 C 28,78 38,88 50,88 C 62,88 72,78 72,58 C 72,34 60,26 50,26 Z"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      />
      <motion.path
        d="M 36,32 Q 50,38 64,32"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.4 }}
      />
      <motion.path
        d="M 38,29 Q 50,23 62,29"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.5 }}
      />
      <motion.path
        d="M 56,48 C 50,47 44,50 44,57 C 44,64 50,67 56,66"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.7 }}
      />
      <motion.path
        d="M 40,54 L 52,54"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.9 }}
      />
      <motion.path
        d="M 40,59 L 50,59"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 1.0 }}
      />
    </svg>
  );
}

export function SketchyMegaphone({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-8 h-8 md:w-9 h-9" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M 26,46 L 56,28 L 62,72 L 26,54 Z"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d="M 42,54 L 42,76 L 50,76 L 51,60"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      <motion.path
        d="M 62,28 C 67,28 67,72 62,72"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.5 }}
      />
      <motion.path
        d="M 26,46 C 22,46 22,54 26,54 Z"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.7 }}
      />
      <motion.path
        d="M 72,42 Q 78,50 72,58"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.8 }}
      />
      <motion.path
        d="M 80,36 Q 88,50 80,64"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 1.0 }}
      />
    </svg>
  );
}

export function SketchyCircleCTA({ color = "#f59e0b" }: { color?: string }) {
  return (
    <svg className="absolute -inset-x-4 -inset-y-2 md:-inset-x-8 md:-inset-y-3 w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] h-[calc(100%+1rem)] md:h-[calc(100%+1.5rem)] pointer-events-none" viewBox="0 0 200 60" preserveAspectRatio="none">
      <motion.path
        d="M 8,30 C 10,12 185,8 192,28 C 196,44 20,52 8,36 C 5,24 85,15 188,20"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

export function SketchyUnderline({ color }: { color: string }) {
  return (
    <span className="absolute left-0 right-0 bottom-[-4px] md:bottom-[-6px] w-full h-[6px] md:h-[8px] pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 100 10" preserveAspectRatio="none">
        <motion.path
          d="M 2,3 Q 25,6 50,4 Q 75,2 98,4"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
        <motion.path
          d="M 5,6 Q 30,3 60,6 Q 80,4 95,5"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0, ease: "easeInOut", delay: 0.15 }}
          className="opacity-70"
        />
      </svg>
    </span>
  );
}

export function SketchyArrowDown({ color = "currentColor", className = "" }: { color?: string; className?: string }) {
  return (
    <svg className={`w-5 h-6 ${className}`} viewBox="0 0 30 50" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M 15,5 Q 12,25 15,45"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d="M 7,37 Q 15,45 23,37"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.4 }}
      />
    </svg>
  );
}
