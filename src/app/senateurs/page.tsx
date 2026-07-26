import DiscoveryClient from "../deputes/DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import ChamberHero from "@/components/lois/ChamberHero";
import MemberFinderIntro from "@/components/lois/MemberFinderIntro";
import { Suspense } from "react";

// Page dédiée au Sénat : composition + textes législatifs du Sénat + sénateurs.
export default async function SenateursPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <ChamberHero
        color="red"
        title="SÉNA" accentLetter="T"
        eyebrow="Seconde chambre · 348 sénateurs"
        description="Les 348 sénateurs, élus au suffrage indirect par les grands électeurs, représentent les territoires (communes, départements, régions). Ils votent la loi avec l'Assemblée et contrôlent le Gouvernement. Sur cette page : trouvez votre sénateur, consultez ses votes, sa présence et ses initiatives, et suivez les textes examinés au Sénat."
        links={[
          { label: "Composition", href: "#composition" },
          { label: "Les sénateurs & leurs votes", href: "#membres" },
          { label: "Textes législatifs", href: "#textes" },
        ]}
      />
      <section id="composition" className="scroll-mt-24 pt-4 pb-8">
        <HemicycleChart chamber="senat" subtitle="Sénat" title="Composition du Sénat" />
      </section>
      <section id="membres" className="scroll-mt-24">
        <MemberFinderIntro role="sénateur" roleShort="sénateur" />
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
          <DiscoveryClient initialDeputies={[]} single="senators" />
        </Suspense>
      </section>
      <section id="textes" className="scroll-mt-24">
        <ChamberLegislation chamber="SENAT" chamberLabel="Sénat" />
      </section>
    </div>
  );
}
