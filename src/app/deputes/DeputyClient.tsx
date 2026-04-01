"use client";

import { useState } from "react";
import DeputySearch from "@/components/deputies/DeputySearch";
import DeputyGrid from "@/components/deputies/DeputyGrid";
import FranceMap from "@/components/deputies/FranceMap";
import { Deputy } from "@/components/deputies/DeputyCard";
import { getDepartmentName } from "@/lib/department-mapping";
import { motion, AnimatePresence } from "framer-motion";
import { Map, List } from "lucide-react";

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
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
          Que vote votre député ?
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Recherchez par nom, par parti politique ou cliquez sur votre département.
        </p>
      </div>

      {/* Toggle Map / List view */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-1 bg-secondary/50 border border-border rounded-xl p-1">
          <button
            onClick={() => setShowMap(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showMap
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Map className="w-4 h-4" />
            Carte
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
            Liste
          </button>
        </div>
      </div>

      {/* Map section */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 overflow-hidden"
          >
            <FranceMap
              selectedDepartment={selectedDepartment}
              onDepartmentSelect={setSelectedDepartment}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter indicator */}
      {selectedDepartment && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold">
            <Map className="w-4 h-4" />
            {getDepartmentName(selectedDepartment)} ({filteredDeputies.length} député{filteredDeputies.length > 1 ? "s" : ""})
          </span>
        </motion.div>
      )}

      <DeputySearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <DeputyGrid deputies={filteredDeputies} />
    </div>
  );
}
