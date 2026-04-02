"use client";

import { useState } from "react";
import DeputySearch from "@/components/deputies/DeputySearch";
import DeputyGrid from "@/components/deputies/DeputyGrid";
import FranceMap from "@/components/deputies/FranceMap";
import { Deputy } from "@/components/deputies/DeputyCard";
import DeputyCard from "@/components/deputies/DeputyCard";
import { getDepartmentName } from "@/lib/department-mapping";
import { motion, AnimatePresence } from "framer-motion";
import { Map, List, Users } from "lucide-react";

export default function DeputyClient({ initialDeputies }: { initialDeputies: Deputy[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const filteredDeputies = initialDeputies.filter((deputy) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${deputy.firstName} ${deputy.lastName}`.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      fullName.includes(q) ||
      (deputy.department && deputy.department.toLowerCase().includes(q)) ||
      (deputy.party && deputy.party.toLowerCase().includes(q));

    const matchesDepartment =
      !selectedDepartment ||
      (deputy.department &&
        deputy.department.toLowerCase() ===
          getDepartmentName(selectedDepartment).toLowerCase());

    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl animate-in fade-in duration-700">
      {/* 1. SECTION HEADER (POSTER STYLE REBORN) */}
      <div className="mb-16">
        <div className="relative mb-10 text-center">
          <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none relative z-10">
            <span className="text-slate-900 opacity-[0.08] absolute -top-8 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap">
              RÉPUBLIQUE • ÉLUS
            </span>
            Que vote <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">votre député ?</span>
          </h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-6 rounded-full mx-auto" />
          <p className="text-xl md:text-2xl font-staatliches italic tracking-tight text-slate-500 mt-8 max-w-2xl mx-auto">
            Recherchez par nom, par parti politique ou par département.
          </p>
        </div>
      </div>

      {/* Toggle View & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <div className="inline-flex items-center gap-1 bg-secondary/50 border border-border rounded-xl p-1 shrink-0">
          <button
            onClick={() => setShowMap(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showMap
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Map className="w-4 h-4" />
            Vue Carte
          </button>
          <button
            onClick={() => setShowMap(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !showMap
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
            Vue Liste
          </button>
        </div>

        <div className="w-full max-w-md">
          <DeputySearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {showMap ? (
          <motion.div
            key="map-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-12"
          >
            <div className="bg-card/30 backdrop-blur-sm border border-border rounded-3xl p-2">
              <FranceMap
                selectedDepartment={selectedDepartment}
                onDepartmentSelect={setSelectedDepartment}
              />
            </div>

            {/* Display deputies directly under the map when a department is selected */}
            <AnimatePresence>
              {selectedDepartment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-8 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      <Users className="w-6 h-6 text-red-500" />
                      Députés du {getDepartmentName(selectedDepartment)}
                      <span className="text-sm font-medium bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full ml-2">
                        {filteredDeputies.length}
                      </span>
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDeputies.map((deputy) => (
                      <DeputyCard key={deputy.id} deputy={deputy} />
                    ))}
                  </div>

                  {filteredDeputies.length === 0 && (
                    <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border">
                      <p className="text-muted-foreground">Aucun député trouvé pour ce département.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <DeputyGrid deputies={filteredDeputies} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
