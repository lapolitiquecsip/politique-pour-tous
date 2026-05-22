"use client";

import { motion } from "framer-motion";
import React from "react";

export interface MarkerHighlightProps {
  before?: string;
  highlight: string;
  after?: string;
  markerColor?: string;
  baseColor?: string;
  highlightedTextColor?: string;
  delay?: number;
  className?: string;
}

export function MarkerHighlight({
  before = "",
  highlight,
  after = "",
  markerColor = "#facc15",
  baseColor = "#171717",
  highlightedTextColor = "#ffffff",
  delay = 0,
  className = "",
}: MarkerHighlightProps) {
  return (
    <span className={className} style={{ color: baseColor }}>
      {before}
      <span className="relative inline-block whitespace-nowrap">
        {/* The highlight marker background */}
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ 
            duration: 0.6, 
            delay, 
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 1.5
          }}
          style={{
            position: "absolute",
            inset: "0 -0.05em",
            background: markerColor,
            transformOrigin: "left center",
            zIndex: 0,
            borderRadius: "0.1em",
          }}
          aria-hidden
        />
        {/* The highlighted text that changes color */}
        <motion.span
          initial={{ color: baseColor }}
          animate={{ color: highlightedTextColor }}
          transition={{ 
            duration: 0.3, 
            delay: delay + 0.2,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 1.8
          }}
          className="relative z-10"
        >
          {highlight}
        </motion.span>
      </span>
      {after}
    </span>
  );
}
