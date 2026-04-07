import { api } from "@/lib/api";
import Link from "next/link";
import { 
  BookOpen, 
  CalendarDays, 
  CheckSquare, 
  Mail, 
  Newspaper, 
  MessageSquare,
  ArrowRight,
  Landmark
} from "lucide-react";
import FeedItemCard from "@/components/home/FeedItemCard";
import InstitutionsGrid from "@/components/home/InstitutionsGrid";
import StatsPanel from "@/components/home/StatsPanel";
import HomeHero from "@/components/home/HomeHero";
import FaqSection from "@/components/home/FaqSection";
import NewsletterBanner from "@/components/home/NewsletterBanner";
import PetitionsSection from "@/components/home/PetitionsSection";

export default async function Home() {
  const latestContent = await api.getContent(6);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION (POSTER IMPACT) */}
      <HomeHero />

      {/* 2. LES 3 INSTITUTIONS (POSTER IMPACT REBORN) */}
      <section id="institutions" className="scroll-mt-24 py-20 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="relative mb-16 text-center">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
              <span className="text-slate-900 opacity-[0.08] absolute -top-10 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap text-8xl font-staatliches tracking-widest">
                RÉPUBLIQUE • SYSTÈME
              </span>
              
              <div className="flex items-center gap-4">
                <span className="relative flex h-4 w-4 md:h-6 md:w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 md:h-6 md:w-6 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"></span>
                </span>
                
                <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none inline">
                  Institutions <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">au quotidien</span>
                </h2>
              </div>
            </div>
            <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-8 rounded-full mx-auto" />
          </div>
          <InstitutionsGrid />
        </div>
      </section>

      {/* 3. STATS + LE SAVIEZ-VOUS (fusionnés) */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <StatsPanel />
        </div>
      </section>

      {/* 4. FIL D'ACTUALITÉ (POSTER IMPACT REBORN) */}
      <section id="actualites" className="scroll-mt-24 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="relative mb-16 text-center md:text-left">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <span className="text-slate-900 opacity-[0.08] absolute -top-10 left-0 select-none hidden md:block whitespace-nowrap text-8xl font-staatliches tracking-widest">
                ACTUALITÉ • DIRECT
              </span>
              
              <div className="flex items-center gap-4">
                <span className="relative flex h-4 w-4 md:h-6 md:w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 md:h-6 md:w-6 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"></span>
                </span>
                
                <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none inline">
                  Récemment <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">en politique</span>
                </h2>
              </div>
            </div>
            <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-8 rounded-full mx-auto md:mx-0" />
          </div>

          {!latestContent || latestContent.length === 0 ? (
            <div className="bg-card text-center p-12 rounded-3xl border shadow-sm flex flex-col items-center justify-center max-w-3xl mx-auto">
              <Landmark className="w-16 h-16 text-muted-foreground/30 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Les actualités arrivent bientôt</h3>
              <p className="text-muted-foreground text-lg">
                Nos robots sont en train de lire les textes du Parlement. 
                Revenez dans quelques instants pour l&apos;essentiel de la journée politique.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {latestContent.map((item: any) => (
                <FeedItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NEW: SECTION PÉTITIONS CITOYENNES */}
      <PetitionsSection />

      {/* 5. F.A.Q. INTERACTIVE (POSTER IMPACT REBORN) */}
      <div id="faq" className="scroll-mt-24">
        <FaqSection />
      </div>

      {/* 6. ENCART NEWSLETTER PREMIUM DYNAMIQUE */}
      <NewsletterBanner />

    </div>
  );
}

