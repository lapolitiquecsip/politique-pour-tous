"use client";

import { useState } from "react";
import DeputySearch from "@/components/deputies/DeputySearch";
import DeputyGrid from "@/components/deputies/DeputyGrid";
import { Deputy } from "@/components/deputies/DeputyCard";

export default function DeputyClient({ initialDeputies }: { initialDeputies: Deputy[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDeputies = initialDeputies.filter((deputy) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${deputy.firstName} ${deputy.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (deputy.department && deputy.department.toLowerCase().includes(q)) ||
      (deputy.party && deputy.party.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-deep-blue mb-4">
          Que vote votre député ?
        </h1>
        <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
          Recherchez par nom, par parti politique ou par département.
        </p>
      </div>

      <DeputySearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <DeputyGrid deputies={filteredDeputies} />
    </div>
  );
}
