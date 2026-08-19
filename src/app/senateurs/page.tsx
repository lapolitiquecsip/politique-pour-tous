import DiscoveryClient from "../deputes/DiscoveryClient";
import HemicycleChart from "@/components/lois/HemicycleChart";
import ChamberLegislation from "@/components/lois/ChamberLegislation";
import ChamberHero from "@/components/lois/ChamberHero";
import MemberFinderIntro from "@/components/lois/MemberFinderIntro";
import VideoFeed from "@/components/executif/VideoFeed";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PresidentPhoto from "@/components/shared/PresidentPhoto";

// Page dédiée au Sénat : composition + textes législatifs du Sénat + sénateurs.
export default async function SenateursPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <ChamberHero
        color="red"
        image="/images/senat_luxembourg_premium.png"
        title="SÉNA" accentLetter="T"
        eyebrow="Seconde chambre · 348 sénateurs"
        description="Les 348 sénateurs, élus au suffrage indirect par les grands électeurs, représentent les territoires (communes, départements, régions). Ils votent la loi avec l'Assemblée et contrôlent le Gouvernement. Sur cette page : trouvez votre sénateur, consultez ses votes, sa présence et ses initiatives, et suivez les textes examinés au Sénat."
        links={[
          { label: "Composition", href: "#composition" },
          { label: "Les sénateurs & leurs votes", href: "#membres" },
          { label: "Textes législatifs", href: "#textes" },
          { label: "En vidéo", href: "#videos" },
        ]}
      />
      {/* Président du Sénat — cliquable vers sa fiche */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link href="/senateurs/gerard-larcher" className="group flex items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50/60 p-5 transition hover:border-amber-300 hover:bg-amber-50">
          <PresidentPhoto src="https://www.senat.fr/senimg/larcher_gerard86034e.jpg" alt="Gérard Larcher" ring="ring-amber-300" gradient="from-amber-500 to-orange-500" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Président du Sénat</p>
            <p className="text-xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors">Gérard Larcher</p>
            <p className="text-sm text-slate-500">Deuxième personnage de l'État — voir sa fiche</p>
          </div>
          <ChevronRight className="ml-auto text-slate-300 group-hover:text-amber-500 transition-colors" />
        </Link>
      </div>
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
      <section id="videos" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-16">
        <VideoFeed source="senat" />
      </section>
    </div>
  );
}
