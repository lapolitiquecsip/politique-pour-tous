import { Search } from "lucide-react";

interface DeputySearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function DeputySearch({ searchQuery, setSearchQuery }: DeputySearchProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>{" "}
      <input
        id="recherche-elu"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Rechercher un député par nom, parti ou département"
        className="block w-full pl-10 pr-3 py-4 text-base border border-border rounded-xl leading-5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-lg shadow-sm transition-all"
        placeholder="Nom, parti ou département…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
