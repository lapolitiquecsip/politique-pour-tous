"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

export interface MarkerHighlightProps {
  before?: string;
  highlight: string;
  after?: string;
  markerColor?: string;
  baseColor?: string;
  highlightedTextColor?: string;
  delay?: number;
  className?: string;
  colorList?: string[];
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
  colorList,
}: MarkerHighlightProps) {
  const colors = colorList && colorList.length > 0 ? colorList : [markerColor];
  const [currentColor, setCurrentColor] = useState(colors[0]);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let colorIdx = 0;

    const runLoop = async () => {
      // Initial delay before starting the first animation
      await new Promise((r) => setTimeout(r, delay * 1000));
      if (!isMounted) return;

      while (isMounted) {
        // Draw marker
        setIsHighlighted(true);
        await new Promise((r) => setTimeout(r, 600 + 1800)); // draw (0.6s) + hold (1.8s)
        if (!isMounted) return;

        // Hide marker
        setIsHighlighted(false);
        await new Promise((r) => setTimeout(r, 600 + 500)); // hide (0.6s) + wait empty (0.5s)
        if (!isMounted) return;

        // Change color silently while hidden
        colorIdx = (colorIdx + 1) % colors.length;
        setCurrentColor(colors[colorIdx]);
      }
    };

    runLoop();
    return () => {
      isMounted = false;
    };
  }, [colors, delay]);

  return (
    <span className={className} style={{ color: baseColor }}>
      {before}
      <span className="relative inline-block whitespace-nowrap">
        {/* The highlight marker background */}
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHighlighted ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: "0 -0.05em",
            background: currentColor,
            transformOrigin: "left center",
            zIndex: 0,
            borderRadius: "0.1em",
          }}
          aria-hidden
        />
        {/* The highlighted text that changes color */}
        <motion.span
          initial={{ color: baseColor }}
          animate={{ color: isHighlighted ? highlightedTextColor : baseColor }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          {highlight}
        </motion.span>
      </span>
      {after}
    </span>
  );
}
