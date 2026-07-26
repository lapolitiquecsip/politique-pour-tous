import { api } from "@/lib/api";
import DiscoveryClient from "./DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import ChamberHeader from "@/components/lois/ChamberHeader";

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
      <ChamberHeader title="Assemblée nationale" links={[
        { label: "Composition", href: "#composition" },
        { label: "Textes législatifs", href: "#textes" },
        { label: "Les députés", href: "#membres" },
      ]} />
      <section id="composition" className="scroll-mt-24 pt-4 pb-8">
        <HemicycleChart chamber="an" subtitle="Assemblée nationale" title="Composition de l'Assemblée" />
      </section>
      <section id="textes" className="scroll-mt-24">
        <ChamberLegislation chamber="AN" chamberLabel="Assemblée nationale" />
      </section>
      <section id="membres" className="scroll-mt-24">
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
          <DiscoveryClient initialDeputies={mappedDeputies} single="deputies" />
        </Suspense>
      </section>
    </div>
  );
}
