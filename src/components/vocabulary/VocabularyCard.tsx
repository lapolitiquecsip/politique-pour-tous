import { Star } from "lucide-react";

export interface VocabularyTerm {
  id: string;
  term: string;
  definition: string;
  example: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

const categoryColors: Record<string, string> = {
  "Constitution": "bg-blue-900 text-white",
  "Procédure": "bg-gray-500 text-white",
  "Budget": "bg-green-700 text-white",
  "Assemblée": "bg-blue-600 text-white",
  "Sénat": "bg-purple-800 text-white",
  "Partis": "bg-orange-600 text-white",
  "Élections": "bg-red-600 text-white",
};

export default function VocabularyCard({ term }: { term: VocabularyTerm }) {
  const badgeClass = categoryColors[term.category] || "bg-gray-200 text-gray-800";

  return (
    <div className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-heading font-bold text-foreground">{term.term}</h2>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
          {term.category}
        </span>
      </div>

      <div className="flex mb-4 text-accent">
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            size={18}
            fill={star <= term.difficulty ? "currentColor" : "none"}
            className={star <= term.difficulty ? "text-accent" : "text-gray-300"}
          />
        ))}
      </div>

      <p className="text-foreground/80 mb-6 flex-grow leading-relaxed">
        {term.definition}
      </p>

      {term.example && (
        <div className="bg-muted/50 p-4 rounded-xl mt-auto">
          <p className="italic text-foreground/90 text-sm">
            "{term.example}"
          </p>
        </div>
      )}
    </div>
  );
}
