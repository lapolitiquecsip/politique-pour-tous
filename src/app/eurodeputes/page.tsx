import { api } from "@/lib/api";
import EurodeputesClient from "./EurodeputesClient";
import HemicycleChart from "@/components/lois/HemicycleChart";

export const dynamic = "force-static";

export default async function EurodeputesPage() {
  const meps = await api.getMeps();
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="pt-10">
        <HemicycleChart chamber="eu" subtitle="Parlement européen" title="Eurodéputés français" />
      </div>
      <EurodeputesClient meps={meps as any[]} />
    </div>
  );
}
