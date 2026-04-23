"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { glossaryTerms } from '@/data/glossaryTerms';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';

interface GlossaryContextType {
  wrapWithGlossary: (text: string) => ReactNode;
}

const GlossaryContext = createContext<GlossaryContextType | undefined>(undefined);

export function useGlossary() {
  const context = useContext(GlossaryContext);
  if (!context) {
    throw new Error('useGlossary must be used within a GlossaryProvider');
  }
  return context;
}

export default function GlossaryProvider({ children }: { children: ReactNode }) {
  
  /**
   * Helper to wrap terms in a text string with Tooltips.
   * This uses a simple regex approach for identified terms.
   */
  const wrapWithGlossary = (text: string): ReactNode => {
    if (!text) return text;

    // Sort terms by length descending to avoid partial matches (e.g., matching "scrutin" before "scrutin proportionnel")
    const sortedTerms = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length);
    
    // Build a regex that matches any of the terms (case insensitive)
    const termsPattern = sortedTerms.map(t => escapeRegex(t.term)).join('|');
    const regex = new RegExp(`(${termsPattern})`, 'gi');

    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          const matchingTerm = sortedTerms.find(t => t.term.toLowerCase() === part.toLowerCase());
          if (matchingTerm) {
            return (
              <GlossaryTooltip key={i} term={matchingTerm.term} definition={matchingTerm.definition}>
                {part}
              </GlossaryTooltip>
            );
          }
          return part;
        })}
      </>
    );
  };

  return (
    <GlossaryContext.Provider value={{ wrapWithGlossary }}>
      {children}
    </GlossaryContext.Provider>
  );
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
