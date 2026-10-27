"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import InstitutionsGrid from "@/components/home/InstitutionsGrid";
import StatsPanel from "@/components/home/StatsPanel";
import HomeHero from "@/components/home/HomeHero";
import JournalOfficielBook from "@/components/home/JournalOfficielBook";
import PetitionsSection from "@/components/home/PetitionsSection";

/** En-tête de section commun : sur-titre, titre court, une phrase qui dit à quoi sert la section. */
function EnTete({ surTitre, titre, phrase, ton = "text-red-700 dark:text-red-400" }: { surTitre: string; titre: React.ReactNode; phrase?: string; ton?: string }) {
  return (
    <div className="mb-6 text-center md:mb-10">
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${ton}`}>{surTitre}</p>{" "}
      {/* Marge haute : les titres en pastille (« Aujourd'hui », « politique ») débordent de
          leur ligne et recouvraient le sur-titre. */}
      <h2 className="mt-4 font-staatliches text-[2.6rem] uppercase leading-none tracking-tight text-foreground dark:text-white md:mt-7 md:text-6xl">{titre}</h2>{" "}
      {phrase && <p className="mx-auto mt-2.5 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">{phrase}</p>}
    </div>
  );
}

export default function Home() {
  // Ordre de la page : ce qu'un nouveau venu cherche d'abord (que faire, que se passe-t-il
  // aujourd'hui), puis les lois, l'agenda, les pétitions, et la culture générale en dernier.
  // Le fil d'actualité défilant a été retiré (personne ne le parcourait) : la collecte
  // continue et nourrit l'espace Pro (fil filtré, e-mails élus suivis et territoire).
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. PREMIER ÉCRAN : la promesse et quatre actions. */}
      <HomeHero />{" "}

      {/* 2. AUJOURD'HUI dans les trois institutions — liste compacte sur téléphone. */}
      <section id="institutions" className="scroll-mt-24 bg-background px-4 py-10 md:py-20">
        <div className="container mx-auto max-w-6xl">
          <EnTete
            surTitre="En ce moment"
            titre={<span className="rounded-2xl bg-rose-600 px-4 pb-0.5 pt-1.5 text-white md:px-6 md:pb-1 md:pt-3">Aujourd&apos;hui</span>}
            phrase="Le programme du jour à l'Assemblée nationale, au Sénat et au Gouvernement. Touchez une institution pour le détail."
          />{" "}
          <InstitutionsGrid />
        </div>
      </section>{" "}

      {/* 3. LOIS PROMULGUÉES — livre feuilletable (une page = un jour + une loi). */}
      <section id="journal-officiel" className="scroll-mt-24 bg-gradient-to-b from-amber-50/40 to-transparent px-4 py-10 dark:from-slate-900/40 md:py-20">
        <div className="container mx-auto max-w-6xl">
          {/* Le Journal officiel intégral et le suivi des commissions sont réservés à
              l'abonnement Pro : ils vivent dans l'espace de l'abonné. Ne reste ici que le
              livre des lois promulguées, ouvert à tous. */}
          <EnTete
            surTitre="Ce que le Parlement a définitivement adopté"
            titre="Dernières lois promulguées"
            phrase="Une page par loi. Touchez « Lire la loi » pour son résumé, puis son parcours, ses amendements et ses votes."
          />{" "}
          <p className="mx-auto -mt-2 mb-6 max-w-md rounded-2xl bg-emerald-50 px-4 py-2.5 text-center text-sm leading-6 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 md:mb-10">
            ✅ Publiée au Journal officiel, la loi <strong>entre en vigueur</strong> à la date qu&apos;elle fixe, sinon le lendemain. Les articles qui attendent un décret d&apos;application ne s&apos;appliquent qu&apos;une fois ce décret publié.
          </p>{" "}
          <JournalOfficielBook />
        </div>
      </section>{" "}

      {/* 4. AGENDA */}
      <section className="bg-slate-50/50 px-4 py-8 dark:bg-slate-950/20 md:py-12">
        <div className="container mx-auto max-w-6xl">
          <Link href="/calendrier" className="group block">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative flex flex-col items-center justify-between gap-5 overflow-hidden rounded-[2rem] border border-border bg-card p-5 shadow-xl shadow-slate-200/20 transition-all duration-500 group-hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:group-hover:border-amber-500/30 md:flex-row md:gap-8 md:rounded-[3rem] md:p-12"
            >
              <div className="relative z-10 flex items-center gap-4 md:gap-8">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 md:h-20 md:w-20 md:rounded-3xl">
                  <CalendarDays className="h-7 w-7 md:h-10 md:w-10" />
                </div>{" "}
                <div className="space-y-1 text-left">
                  <h3 className="font-staatliches text-2xl uppercase leading-none tracking-tight md:text-4xl">
                    L&apos;agenda <span className="text-amber-700 dark:text-amber-400">complet</span> de la République
                  </h3>{" "}
                  <p className="text-[15px] text-muted-foreground dark:text-slate-400 md:text-lg">
                    Les prochaines séances, auditions et élections, jour par jour.
                  </p>
                </div>
              </div>{" "}
              <div className="relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all group-hover:bg-amber-600 md:w-auto md:px-10 md:py-5">
                Voir l&apos;agenda <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          </Link>
        </div>
      </section>{" "}

      {/* 5. PÉTITIONS CITOYENNES */}
      <PetitionsSection />{" "}

      {/* 6. LE SAVIEZ-VOUS — culture générale, en fin de page. */}
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-6xl">
          <StatsPanel />
        </div>
      </section>
    </div>
  );
}
