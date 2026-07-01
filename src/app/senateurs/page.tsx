import { api } from "@/lib/api";
import DiscoveryClient from "../deputes/DiscoveryClient";
import { Suspense } from "react";

// React Server Component
export default async function SenateursPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Chargement...</div>}>
      <DiscoveryClient initialDeputies={[]} />
    </Suspense>
  );
}
