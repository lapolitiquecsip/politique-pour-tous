"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';

interface GlossaryTerm {
  term: string;
  definition: string;
}

interface GlossaryContextType {
  wrapWithGlossary: (text: string) => ReactNode;
  loading: boolean;
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
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTerms() {
      try {
        const data = await api.getVocabulary();
        setTerms(data || []);
      } catch (err) {
        console.error("Error loading glossary terms:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTerms();
  }, []);
  
  /**
   * Helper to wrap terms in a text string with Tooltips.
   */
  const wrapWithGlossary = (text: string): ReactNode => {
    if (!text || loading || terms.length === 0) return text;

    // Sort terms by length descending to avoid partial matches
    const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length);
    
    // Build regex
    const termsPattern = sortedTerms.map(t => escapeRegex(t.term)).join('|');
    const regex = new RegExp(`\\b(${termsPattern})\\b`, 'gi'); // Added \b for word boundaries

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
    <GlossaryContext.Provider value={{ wrapWithGlossary, loading }}>
      {children}
    </GlossaryContext.Provider>
  );
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
