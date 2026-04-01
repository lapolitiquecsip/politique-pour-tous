import { Search } from "lucide-react";

interface DeputySearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function DeputySearch({ searchQuery, setSearchQuery }: DeputySearchProps) {
  return (
    <div className="relative max-w-2xl mx-auto mb-10">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-4 border border-border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue sm:text-lg shadow-sm"
        placeholder="Rechercher par nom, parti ou département..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
