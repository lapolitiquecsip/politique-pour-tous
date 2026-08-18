import { api } from "@/lib/api";
import DiscoveryClient from "./DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import AdoptedTextsFeed from "@/components/lois/AdoptedTextsFeed";
import ChamberHero from "@/components/lois/ChamberHero";
import MemberFinderIntro from "@/components/lois/MemberFinderIntro";
import VideoFeed from "@/components/executif/VideoFeed";
import CommissionAuditions from "@/components/executif/CommissionAuditions";
import PresidentPhoto from "@/components/shared/PresidentPhoto";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
    photoUrl: d.photo_url || null,
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
      {/* Présidente de l'Assemblée nationale — cliquable vers sa fiche */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link href="/deputes/yael-braun-pivet" className="group flex items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <PresidentPhoto src="https://www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/721908.jpg" alt="Yaël Braun-Pivet" ring="ring-emerald-300" gradient="from-emerald-500 to-teal-600" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Présidente de l'Assemblée nationale</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors">Yaël Braun-Pivet</p>
            <p className="text-sm text-slate-500">Quatrième personnage de l'État — voir sa fiche</p>
          </div>
          <ChevronRight className="ml-auto text-slate-300 group-hover:text-emerald-500 transition-colors" />
        </Link>
      </div>
      <section id="composition" className="scroll-mt-24 pt-4 pb-8">
        <HemicycleChart chamber="an" subtitle="Assemblée nationale" title="Composition de l'Assemblée" />
      </section>
      <section id="membres" className="scroll-mt-24">
        <MemberFinderIntro role="député" roleShort="député" accent="text-emerald-600" />
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
          <DiscoveryClient initialDeputies={mappedDeputies} single="deputies" />
        </Suspense>
      </section>
      <section id="adoptes" className="scroll-mt-24 pb-12">
        <AdoptedTextsFeed />
      </section>
      <section id="textes" className="scroll-mt-24">
        <ChamberLegislation chamber="AN" chamberLabel="Assemblée nationale" />
      </section>
      <section id="videos" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-16">
        <VideoFeed source="an" />
        <CommissionAuditions />
      </section>
    </div>
  );
}
