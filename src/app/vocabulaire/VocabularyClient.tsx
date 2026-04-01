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
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-deep-blue mb-4">
          Vocabulaire Politique
        </h1>
        <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
          Un dictionnaire interactif pour comprendre le jargon politique simplement.
        </p>
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
