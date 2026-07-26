import DiscoveryClient from "../deputes/DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import ChamberHeader from "@/components/lois/ChamberHeader";
import { Suspense } from "react";

// Page dédiée au Sénat : composition + textes législatifs du Sénat + sénateurs.
export default async function SenateursPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <ChamberHeader title="Sénat" links={[
        { label: "Composition", href: "#composition" },
        { label: "Textes législatifs", href: "#textes" },
        { label: "Les sénateurs", href: "#membres" },
      ]} />
      <section id="composition" className="scroll-mt-24 pt-4 pb-8">
        <HemicycleChart chamber="senat" subtitle="Sénat" title="Composition du Sénat" />
      </section>
      <section id="textes" className="scroll-mt-24">
        <ChamberLegislation chamber="SENAT" chamberLabel="Sénat" />
      </section>
      <section id="membres" className="scroll-mt-24">
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
          <DiscoveryClient initialDeputies={[]} single="senators" />
        </Suspense>
      </section>
    </div>
  );
}
