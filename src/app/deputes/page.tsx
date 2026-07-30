import { api } from "@/lib/api";
import DiscoveryClient from "./DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import AdoptedTextsFeed from "@/components/lois/AdoptedTextsFeed";
import ChamberHero from "@/components/lois/ChamberHero";
import MemberFinderIntro from "@/components/lois/MemberFinderIntro";
import VideoFeed from "@/components/executif/VideoFeed";

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
      <ChamberHero
        color="green"
        title="ASSEMBLÉE NATIONALE"
        eyebrow="Assemblée nationale · 577 députés"
        description="Les 577 députés, élus au suffrage direct dans chaque circonscription, votent la loi, votent le budget, contrôlent le Gouvernement et peuvent le renverser. Sur cette page : trouvez votre député, consultez ses votes, son assiduité et ses initiatives, et suivez les textes examinés par l'Assemblée."
        links={[
          { label: "Composition", href: "#composition" },
          { label: "Derniers textes adoptés", href: "#adoptes" },
          { label: "Les députés & leurs votes", href: "#membres" },
          { label: "Textes législatifs", href: "#textes" },
          { label: "Séances & auditions", href: "#videos" },
        ]}
      />
      <section id="composition" className="scroll-mt-24 pt-4 pb-8">
        <HemicycleChart chamber="an" subtitle="Assemblée nationale" title="Composition de l'Assemblée" />
      </section>
      <section id="adoptes" className="scroll-mt-24 pb-12">
        <AdoptedTextsFeed />
      </section>
      <section id="membres" className="scroll-mt-24">
        <MemberFinderIntro role="député" roleShort="député" accent="text-emerald-600" />
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
          <DiscoveryClient initialDeputies={mappedDeputies} single="deputies" />
        </Suspense>
      </section>
      <section id="textes" className="scroll-mt-24">
        <ChamberLegislation chamber="AN" chamberLabel="Assemblée nationale" />
      </section>
      <section id="videos" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-16">
        <VideoFeed source="an" />
      </section>
    </div>
  );
}
