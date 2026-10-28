import { api } from "@/lib/api";
import EurodeputesClient from "./EurodeputesClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import EuropeHero from "@/components/lois/EuropeHero";
import EuFranceBudget from "@/components/lois/EuFranceBudget";
import EuFranceProjects from "@/components/lois/EuFranceProjects";
import EuFranceDecisionsFeed from "@/components/lois/EuFranceDecisionsFeed";
import UkraineAidTracker from "@/components/lois/UkraineAidTracker";
import SectionNav from "@/components/lois/SectionNav";

export const metadata = {
  title: "Les eurodéputés français",
  description: "Les 81 députés européens élus en France : leurs votes au Parlement européen, leur groupe politique et leur parcours.",
};

export const dynamic = "force-static";

// Parcours d'un visiteur sur téléphone (même fil que les pages Assemblée et Sénat) : trouver
// son eurodéputé, puis ce que l'UE décide pour la France, l'argent (budget, projets), l'aide
// à l'Ukraine, et la composition du groupe français. Sommaire collant ; sections lourdes repliées.
export default async function EurodeputesPage() {
  const meps = await api.getMeps();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003399]/[0.05] via-white to-[#FFCC00]/[0.05] dark:from-[#003399]/20 dark:via-slate-950 dark:to-slate-950">
      <EuropeHero
        description="Les eurodéputés français siègent au Parlement européen, à Strasbourg et Bruxelles. Ils votent les lois de l'Union européenne (climat, numérique, commerce, agriculture…), le budget de l'UE et contrôlent la Commission européenne. Sur cette page : la composition par groupe, chaque eurodéputé, ses votes par thème et sa présence."
        descriptionCourte="Vos 81 eurodéputés et leurs votes, ce que l'Union décide pour la France, et ce qu'elle coûte ou rapporte."
        actions={[
          { label: "Trouver mon eurodéputé", href: "#membres", focus: "recherche-elu" },
          { label: "Ce que l'UE décide pour la France", href: "#decisions" },
        ]}
        links={[
          { label: "Les eurodéputés & leurs votes", href: "#membres" },
          { label: "Décisions concernant la France", href: "#decisions" },
          { label: "France & budget de l'UE", href: "#budget" },
          { label: "Projets financés par l'UE", href: "#projets" },
          { label: "Aide à l'Ukraine", href: "#ukraine" },
          { label: "Composition", href: "#composition" },
        ]}
      />{" "}
      <SectionNav accent="bg-[#003399]" items={[
        { id: "membres", label: "Eurodéputés" },
        { id: "decisions", label: "Décisions UE" },
        { id: "budget", label: "Budget" },
        { id: "projets", label: "Projets" },
        { id: "ukraine", label: "Ukraine" },
        { id: "composition", label: "Composition" },
      ]} />{" "}
      <section id="membres" className="scroll-mt-32">
        <EurodeputesClient meps={meps as any[]} />
      </section>{" "}

      {/* Bande bleu nuit UE : décisions, budget, projets, Ukraine — chacune repliée sur l'essentiel. */}
      <div className="space-y-10 bg-gradient-to-b from-[#0a1a3f] to-[#050d24] py-10 md:space-y-16 md:py-16">
        <section id="decisions" className="scroll-mt-32">
          <EuFranceDecisionsFeed />
        </section>{" "}
        <section id="budget" className="scroll-mt-32">
          <EuFranceBudget />
        </section>{" "}
        <section id="projets" className="scroll-mt-32">
          <EuFranceProjects />
        </section>{" "}
        <section id="ukraine" className="scroll-mt-32">
          <UkraineAidTracker />
        </section>
      </div>{" "}
      <section id="composition" className="scroll-mt-32 pt-10 pb-16">
        <HemicycleChart chamber="eu" subtitle="Parlement européen" title="Eurodéputés français" />
      </section>
    </div>
  );
}
