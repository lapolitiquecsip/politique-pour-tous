import { api } from "@/lib/api";
import DiscoveryClient from "./DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";

import { Suspense } from "react";

// React Server Component
export default async function DeputesPage() {
  const deputies = await api.getDeputies();
  
  // Transform db snake_case to camelCase expectations of frontend
  const mappedDeputies = deputies.map((d: any) => ({
    id: d.id,
    firstName: d.first_name || '',
    lastName: d.last_name || '',
    party: d.party || '',
    department: d.department || '',
    constituencyNumber: d.constituency_number,
    anId: d.an_id,
    slug: d.slug,
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="pt-10">
        <HemicycleChart chamber="an" subtitle="Assemblée nationale" title="Composition de l'Assemblée" />
      </div>
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
        <DiscoveryClient initialDeputies={mappedDeputies} single="deputies" />
      </Suspense>
      <ChamberLegislation chamber="AN" chamberLabel="Assemblée nationale" />
    </div>
  );
}
