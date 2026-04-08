"use client";

import { useState, memo } from "react";
import DeputyCard, { Deputy } from "./DeputyCard";
import { Plus, ArrowDown } from "lucide-react";

interface DeputyGridProps {
  deputies: Deputy[];
}

export const DeputyGrid = memo(function DeputyGrid({ deputies }: DeputyGridProps) {
  const [displayLimit, setDisplayLimit] = useState(24);

  const displayedDeputies = deputies.slice(0, displayLimit);
  const hasMore = displayLimit < deputies.length;

  if (deputies.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border transition-all">
        <p className="text-muted-foreground text-lg italic">Aucun député trouvé pour cette recherche.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {displayedDeputies.map((deputy, index) => (
          <DeputyCard key={deputy.id} deputy={deputy} />
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <p className="text-sm text-muted-foreground">
            Affichage de {displayLimit} sur {deputies.length} députés
          </p>
          <button
            onClick={() => setDisplayLimit((prev) => prev + 24)}
            className="flex items-center gap-2 px-8 py-3 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all group"
          >
            Charger 24 députés de plus
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      )}
    </div>
  );
});

export default DeputyGrid;
