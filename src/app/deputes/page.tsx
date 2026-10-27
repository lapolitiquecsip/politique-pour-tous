import { api } from "@/lib/api";
import DiscoveryClient from "./DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import AdoptedTextsFeed from "@/components/lois/AdoptedTextsFeed";
import ChamberHero from "@/components/lois/ChamberHero";
import MemberFinderIntro from "@/components/lois/MemberFinderIntro";
import VideoFeed from "@/components/executif/VideoFeed";
import CommissionTracker from "@/components/commissions/CommissionTracker";
import PresidentPhoto from "@/components/shared/PresidentPhoto";
import SectionNav from "@/components/lois/SectionNav";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Suspense } from "react";

export const metadata = {
  title: "Les 577 députés : votes, positions, parcours",
  description: "Retrouvez votre député : ses votes sur chaque loi, ses prises de position, ses propositions de loi et son parcours, d'après les données de l'Assemblée nationale.",
};

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

  // Parcours d'un visiteur sur téléphone : trouver son député d'abord (c'est ce qu'on vient
  // chercher), puis ce que l'Assemblée vient de voter, ce qu'elle examine, qui y siège, et
  // les outils pour aller plus loin. Le sommaire collant dit à tout moment où l'on est.
  return (
    <div className="min-h-screen bg-card dark:bg-slate-950">
      <ChamberHero
        color="green"
        image="/images/assemblee_nationale_premium.jpg"
        title="ASSEMBLÉE NATIONALE"
        eyebrow="Assemblée nationale · 577 sièges"
        description="Les députés, élus au suffrage direct dans les 577 circonscriptions, votent la loi, votent le budget, contrôlent le Gouvernement et peuvent le renverser. Sur cette page : trouvez votre député, consultez ses votes, son assiduité et ses initiatives, et suivez les textes examinés par l'Assemblée."
        descriptionCourte="Trouvez votre député, ses votes réels, et ce que l'Assemblée vote en ce moment."
        actions={[
          { label: "Trouver mon député", href: "#membres", focus: "recherche-elu" },
          { label: "Les derniers votes", href: "#adoptes" },
        ]}
        links={[
          { label: "Les députés & leurs votes", href: "#membres" },
          { label: "Derniers textes adoptés", href: "#adoptes" },
          { label: "Textes en cours", href: "#textes" },
          { label: "Composition", href: "#composition" },
          { label: "Commissions & auditions", href: "#commissions" },
          { label: "Séances en vidéo", href: "#videos" },
        ]}
      />{" "}
      <SectionNav items={[
        { id: "membres", label: "Mon député" },
        { id: "adoptes", label: "Derniers votes" },
        { id: "textes", label: "Textes en cours" },
        { id: "composition", label: "Composition" },
        { id: "commissions", label: "Commissions" },
        { id: "videos", label: "Vidéos" },
      ]} />{" "}
      <section id="membres" className="scroll-mt-32">
        <MemberFinderIntro role="député" roleShort="député" accent="text-emerald-700 dark:text-emerald-400" />
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
          <DiscoveryClient initialDeputies={mappedDeputies} single="deputies" />
        </Suspense>
      </section>{" "}
      <section id="adoptes" className="scroll-mt-32 pb-12">
        <AdoptedTextsFeed />
      </section>{" "}
      <section id="textes" className="scroll-mt-32">
        <ChamberLegislation chamber="AN" chamberLabel="Assemblée nationale" />
      </section>{" "}
      <section id="composition" className="scroll-mt-32 pt-4 pb-8">
        <HemicycleChart chamber="an" subtitle="Assemblée nationale" title="Composition de l'Assemblée" />
      </section>{" "}
      {/* Suivi détaillé des commissions — cœur de l'abonnement Pro (porte l'ancre #commissions). */}
      <section className="mx-auto max-w-6xl px-4">
        <CommissionTracker chamber="AN" chamberLabel="Assemblée nationale" accent="emerald" />
      </section>{" "}
      <section id="videos" className="scroll-mt-32 mx-auto max-w-6xl px-4 pb-10">
        <VideoFeed source="an" />
      </section>{" "}
      {/* Aller plus loin : la présidente et le comparateur, en fin de parcours. */}
      <section aria-label="Aller plus loin" className="mx-auto grid max-w-6xl gap-3 px-4 pb-16 md:grid-cols-2">
        <Link href="/deputes/yael-braun-pivet" className="group flex items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 md:p-5">
          <PresidentPhoto src="https://www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/721908.jpg" alt="Yaël Braun-Pivet" ring="ring-emerald-300" gradient="from-emerald-500 to-teal-600" />{" "}
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Présidente de l'Assemblée</p>{" "}
            <p className="text-lg font-bold text-foreground dark:text-white group-hover:text-emerald-700 transition-colors">Yaël Braun-Pivet</p>{" "}
            <p className="text-sm text-muted-foreground">Quatrième personnage de l'État</p>
          </div>{" "}
          <ChevronRight className="ml-auto shrink-0 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
        </Link>{" "}
        <Link href="/comparateur-parlementaires" className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 transition hover:border-slate-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl">⚖️</span>{" "}
          <div className="min-w-0">
            <p className="font-black text-foreground dark:text-white">Comparer deux parlementaires</p>{" "}
            <p className="text-sm text-muted-foreground">Participation, amendements, loyauté — côte à côte</p>
          </div>{" "}
          <ChevronRight className="ml-auto shrink-0 text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}
