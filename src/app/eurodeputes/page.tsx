import { api } from "@/lib/api";
import EurodeputesClient from "./EurodeputesClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberHeader from "@/components/lois/ChamberHeader";

export const dynamic = "force-static";

export default async function EurodeputesPage() {
  const meps = await api.getMeps();
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <ChamberHeader title="Europe" links={[
        { label: "Composition", href: "#composition" },
        { label: "Les eurodéputés", href: "#membres" },
      ]} />
      <section id="composition" className="scroll-mt-24 pt-4 pb-8">
        <HemicycleChart chamber="eu" subtitle="Parlement européen" title="Eurodéputés français" />
      </section>
      <section id="membres" className="scroll-mt-24">
        <EurodeputesClient meps={meps as any[]} />
      </section>
    </div>
  );
}
