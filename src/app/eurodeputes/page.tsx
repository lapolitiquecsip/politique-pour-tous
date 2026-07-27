import { api } from "@/lib/api";
import EurodeputesClient from "./EurodeputesClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import EuropeHero from "@/components/lois/EuropeHero";
import EuFranceBudget from "@/components/lois/EuFranceBudget";
import EuFranceProjects from "@/components/lois/EuFranceProjects";
import EuFranceDecisionsFeed from "@/components/lois/EuFranceDecisionsFeed";

export const dynamic = "force-static";

export default async function EurodeputesPage() {
  const meps = await api.getMeps();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003399]/[0.05] via-white to-[#FFCC00]/[0.05] dark:from-[#003399]/20 dark:via-slate-950 dark:to-slate-950">
      <EuropeHero
        description="Les eurodéputés français siègent au Parlement européen, à Strasbourg et Bruxelles. Ils votent les lois de l'Union européenne (climat, numérique, commerce, agriculture…), le budget de l'UE et contrôlent la Commission européenne. Sur cette page : la composition par groupe, chaque eurodéputé, ses votes par thème et sa présence."
        links={[
          { label: "Composition", href: "#composition" },
          { label: "France & budget de l'UE", href: "#budget" },
          { label: "Projets financés par l'UE", href: "#projets" },
          { label: "Décisions concernant la France", href: "#decisions" },
          { label: "Les eurodéputés & leurs votes", href: "#membres" },
        ]}
      />
      <section id="composition" className="scroll-mt-24 pt-4 pb-8">
        <HemicycleChart chamber="eu" subtitle="Parlement européen" title="Eurodéputés français" />
      </section>

      {/* Bande bleu nuit UE : budget France↔UE + projets financés + fil des décisions. */}
      <div className="bg-gradient-to-b from-[#0a1a3f] to-[#050d24] py-16 space-y-16">
        <section id="budget" className="scroll-mt-24">
          <EuFranceBudget />
        </section>
        <section id="projets" className="scroll-mt-24">
          <EuFranceProjects />
        </section>
        <section id="decisions" className="scroll-mt-24">
          <EuFranceDecisionsFeed />
        </section>
      </div>

      <section id="membres" className="scroll-mt-24">
        <EurodeputesClient meps={meps as any[]} />
      </section>
    </div>
  );
}
