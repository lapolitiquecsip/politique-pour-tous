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
import Senatoriales2026 from "@/components/senat/Senatoriales2026";
import CommissionTracker from "@/components/commissions/CommissionTracker";
import SectionNav from "@/components/lois/SectionNav";
import SectionRepliable from "@/components/lois/SectionRepliable";

export const metadata = {
  title: "Les sénateurs : votes, positions, parcours",
  description: "Retrouvez les sénateurs de votre département : leurs votes, leurs propositions de loi et leur parcours, d'après les données du Sénat.",
};

// Page dédiée au Sénat. Parcours d'un visiteur sur téléphone (même fil que la page
// Assemblée) : trouver son sénateur d'abord, puis ce que le Sénat examine, les sénatoriales
// (repliées : une carte courte, le détail à la demande), qui y siège, les commissions, les
// vidéos, et le président et le comparateur en fin de parcours.
export default async function SenateursPage() {
  return (
    <div className="min-h-screen bg-card dark:bg-slate-950">
      <ChamberHero
        color="red"
        image="/images/senat_luxembourg_premium.png"
        title="SÉNA" accentLetter="T"
        eyebrow="Seconde chambre · 348 sénateurs"
        description="Les 348 sénateurs, élus au suffrage indirect par les grands électeurs, représentent les territoires (communes, départements, régions). Ils votent la loi avec l'Assemblée et contrôlent le Gouvernement. Sur cette page : trouvez votre sénateur, consultez ses votes, sa présence et ses initiatives, et suivez les textes examinés au Sénat."
        descriptionCourte="Trouvez le sénateur de votre département, ses votes, et les textes que le Sénat examine."
        actions={[
          { label: "Trouver mon sénateur", href: "#membres", focus: "recherche-elu" },
          { label: "Les textes en cours", href: "#textes" },
        ]}
        links={[
          { label: "Les sénateurs & leurs votes", href: "#membres" },
          { label: "Textes en cours", href: "#textes" },
          { label: "Sénatoriales 2026", href: "#senatoriales" },
          { label: "Composition", href: "#composition" },
          { label: "Commissions & auditions", href: "#commissions" },
          { label: "En vidéo", href: "#videos" },
        ]}
      />{" "}
      <SectionNav accent="bg-red-600" items={[
        { id: "membres", label: "Mon sénateur" },
        { id: "textes", label: "Textes en cours" },
        { id: "senatoriales", label: "Sénatoriales 2026" },
        { id: "composition", label: "Composition" },
        { id: "commissions", label: "Commissions" },
        { id: "videos", label: "Vidéos" },
      ]} />{" "}
      <section id="membres" className="scroll-mt-32">
        <MemberFinderIntro role="sénateur" roleShort="sénateur" />
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Chargement...</div>}>
          <DiscoveryClient initialDeputies={[]} single="senators" />
        </Suspense>
      </section>{" "}
      <section id="textes" className="scroll-mt-32">
        <ChamberLegislation chamber="SENAT" chamberLabel="Sénat" />
      </section>{" "}
      {/* Élections sénatoriales du 27 septembre 2026 (série 2) : repliées, le détail à la demande. */}
      <SectionRepliable
        id="senatoriales"
        badge={<span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Sénatoriales 2026 · résultats officiels</span>}
        titre={<>Le nouveau Sénat, élu le <span className="text-red-700 dark:text-red-400">27 septembre</span></>}
        texte="Qui a été élu dans votre département, les nouveaux visages et ce que chaque groupe a gagné ou perdu."
        libelle="Voir les résultats"
      >
        <Senatoriales2026 />
      </SectionRepliable>{" "}
      <section id="composition" className="scroll-mt-32 pt-4 pb-8">
        <HemicycleChart chamber="senat" subtitle="Sénat" title="Composition du Sénat" />
      </section>{" "}
      {/* Suivi détaillé des commissions — cœur de l'abonnement Pro (porte l'ancre #commissions). */}
      <section className="mx-auto max-w-6xl px-4">
        <CommissionTracker chamber="SENAT" chamberLabel="Sénat" accent="red" />
      </section>{" "}
      <section id="videos" className="scroll-mt-32 mx-auto max-w-6xl px-4 pb-10">
        <VideoFeed source="senat" />
      </section>{" "}
      {/* Aller plus loin : le président et le comparateur, en fin de parcours. */}
      <section aria-label="Aller plus loin" className="mx-auto grid max-w-6xl gap-3 px-4 pb-16 md:grid-cols-2">
        <Link href="/senateurs/gerard-larcher" className="group flex items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50/60 p-4 transition hover:border-amber-300 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/[0.08] md:p-5">
          <PresidentPhoto src="https://www.senat.fr/senimg/larcher_gerard86034e.jpg" alt="Gérard Larcher" ring="ring-amber-300" gradient="from-amber-500 to-orange-500" />{" "}
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Président du Sénat</p>{" "}
            <p className="text-lg font-bold text-foreground group-hover:text-amber-700 transition-colors">Gérard Larcher</p>{" "}
            <p className="text-sm text-muted-foreground">Deuxième personnage de l'État</p>
          </div>{" "}
          <ChevronRight className="ml-auto shrink-0 text-muted-foreground group-hover:text-amber-500 transition-colors" />
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
