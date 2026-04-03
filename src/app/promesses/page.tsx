"use client";

import { useEffect, useState } from "react";
import PoliticianCard from "@/components/promises/PoliticianCard";
import { Search, Loader2 } from "lucide-react";

import { api } from "@/lib/api";

export default function PromisesPage() {
  const [politicians, setPoliticians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRole, setActiveRole] = useState("Tous");

  const roles = ["Tous", "Président", "Ministre", "Député", "Sénateur", "Chef de file"];

  useEffect(() => {
    async function fetchPoliticians() {
      try {
        const data = await api.getPoliticians();
        setPoliticians(data);
      } catch (error) {
        console.error("Failed to fetch politicians:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPoliticians();
  }, []);

  const filteredPoliticians = politicians.filter((pol) => {
    const matchesRole = activeRole === "Tous" || pol.role.includes(activeRole);
    const searchString = `${pol.first_name} ${pol.last_name}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* 1. SECTION HEADER (POSTER STYLE REBORN) */}
      <div className="py-20 px-4 mb-12">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="relative mb-10">
            <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none relative z-10">
              <span className="text-slate-900 opacity-[0.08] absolute -top-8 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap">
                PAROLES • ENGAGEMENTS
              </span>
              Ils avaient <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">dit que...</span>
            </h1>
            <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-6 rounded-full mx-auto" />
          </div>
          
          <p className="text-xl md:text-2xl font-staatliches italic tracking-tight text-slate-500 mt-8 max-w-2xl mx-auto leading-relaxed">
            Le baromètre transparent pour suivre, jour après jour, les engagements de la classe politique.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border shadow-sm ${
                  activeRole === role
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input 
              type="text" 
              placeholder="Rechercher par nom..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-full border border-input bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary opacity-50" />
            <p className="font-medium text-lg">Recherche des archives...</p>
          </div>
        ) : filteredPoliticians.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border shadow-sm">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold font-heading mb-2">Aucun résultat trouvé</h3>
            <p className="text-muted-foreground">Oups, nous n'avons trouvé aucun profil correspondant à "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPoliticians.map((pol: any) => (
              <PoliticianCard key={pol.id} politician={pol} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
