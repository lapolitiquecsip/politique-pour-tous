"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface GlossaryTooltipProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export default function GlossaryTooltip({ term, definition, children }: GlossaryTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="cursor-help border-b border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all px-0.5 rounded-sm decoration-skip-ink">
        {children}
      </span>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[110] bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl pointer-events-none"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 rounded-lg bg-blue-500/20 text-blue-400">
                <HelpCircle size={14} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
                  Définition • {term}
                </h4>
                <p className="text-xs leading-relaxed text-slate-200">
                  {definition}
                </p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
