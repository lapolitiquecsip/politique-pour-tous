"use client";

import { useState } from "react";
import VocabularyCard, { VocabularyTerm } from "@/components/vocabulary/VocabularyCard";
import VocabularyFilters from "@/components/vocabulary/VocabularyFilters";
import VocabularySearch from "@/components/vocabulary/VocabularySearch";

const CATEGORIES = [
  "Tous",
  "Assemblée",
  "Sénat",
  "Constitution",
  "Budget",
  "Procédure",
  "Partis",
  "Élections",
];

export default function VocabularyClient({ initialTerms }: { initialTerms: VocabularyTerm[] }) {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTerms = initialTerms.filter((term) => {
    const matchesCategory = activeCategory === "Tous" || term.category === activeCategory;
    const matchesSearch = term.term.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (term.definition && term.definition.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* 1. SECTION HEADER (POSTER STYLE REBORN) */}
      <div className="mb-20">
        <div className="relative mb-10 text-center">
          <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none relative z-10">
            <span className="text-slate-900 opacity-[0.08] absolute -top-8 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap">
              DÉCODEZ • LEXIQUE
            </span>
            Vocabulaire <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">Politique</span>
          </h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-6 rounded-full mx-auto" />
          <p className="text-xl md:text-2xl font-staatliches italic tracking-tight text-slate-500 mt-8 max-w-2xl mx-auto">
            Un dictionnaire interactif pour comprendre le jargon politique.
          </p>
        </div>
      </div>

      <VocabularySearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <VocabularyFilters 
        categories={CATEGORIES} 
        activeCategory={activeCategory} 
        onSelectCategory={setActiveCategory} 
      />

      {filteredTerms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {filteredTerms.map((term) => (
            <VocabularyCard key={term.id} term={term} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed">
          <p className="text-gray-500">Aucun terme trouvé.</p>
        </div>
      )}
    </div>
  );
}
