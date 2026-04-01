import { Search } from "lucide-react";

interface VocabularySearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function VocabularySearch({
  searchQuery,
  setSearchQuery,
}: VocabularySearchProps) {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue sm:text-sm shadow-sm"
        placeholder="Rechercher un terme..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
