import { api } from "@/lib/api";
import DiscoveryClient from "./DiscoveryClient";

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
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Chargement...</div>}>
      <DiscoveryClient initialDeputies={mappedDeputies} />
    </Suspense>
  );
}
