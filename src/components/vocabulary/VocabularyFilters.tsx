interface VocabularyFiltersProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function VocabularyFilters({
  categories,
  activeCategory,
  onSelectCategory,
}: VocabularyFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border shadow-sm ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-foreground border-gray-300 hover:bg-muted"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
