import DiscoveryClient from "../deputes/DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import { Suspense } from "react";

// Page dédiée au Sénat : composition + sénateurs + textes législatifs du Sénat.
export default async function SenateursPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="pt-10">
        <HemicycleChart chamber="senat" subtitle="Sénat" title="Composition du Sénat" />
      </div>
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
        <DiscoveryClient initialDeputies={[]} single="senators" />
      </Suspense>
      <ChamberLegislation chamber="SENAT" chamberLabel="Sénat" />
    </div>
  );
}
