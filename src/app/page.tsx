"use client";

import { api } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
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
import JournalOfficielBook from "@/components/home/JournalOfficielBook";
import NewsletterBanner from "@/components/home/NewsletterBanner";
import PetitionsSection from "@/components/home/PetitionsSection";
import { VerticalImageStack } from "@/components/ui/vertical-image-stack";

export default function Home() {
  const [latestContent, setLatestContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getContent(100);
        setLatestContent(data || []);
      } catch (err) {
        console.error("Error loading home content:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION (POSTER IMPACT) */}
      <HomeHero />

      {/* 2. LES 3 INSTITUTIONS (POSTER IMPACT REBORN) */}
      <section id="institutions" className="scroll-mt-24 py-20 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="relative mb-16 text-center">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
              <span className="text-slate-900 dark:text-slate-100 opacity-[0.08] absolute -top-10 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap text-8xl font-staatliches tracking-widest">
                RÉPUBLIQUE • SYSTÈME
              </span>
              
              <div className="flex items-center gap-4">
                <span className="relative flex h-4 w-4 md:h-6 md:w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 md:h-6 md:w-6 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"></span>
                </span>
                
                <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none inline-flex items-center">
                  <span className="bg-rose-500 text-white px-6 pt-2 pb-1 md:pt-4 md:pb-2 rounded-2xl md:rounded-3xl shadow-lg">AUJOURD'HUI</span>
                </h2>
              </div>
            </div>
            <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-8 rounded-full mx-auto" />
          </div>
          <InstitutionsGrid />
        </div>
      </section>

      {/* JOURNAL OFFICIEL — livre feuilletable (une page = un jour + une loi promulguée). */}
      <section id="journal-officiel" className="scroll-mt-24 py-20 px-4 bg-gradient-to-b from-amber-50/40 to-transparent dark:from-slate-900/40">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-red-600">Ce qui est devenu loi</p>
            <h2 className="mt-2 text-4xl md:text-6xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">Le Journal Officiel</h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto">Feuilletez les dernières lois promulguées — une page par jour et par texte. Cliquez pour voir le parcours complet de chaque loi.</p>
            <p className="mx-auto mt-4 max-w-md rounded-2xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-bold leading-6 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              ✅ Publiée au Journal officiel = la loi <strong>entre en vigueur</strong> et devient applicable.
            </p>
          </div>
          <JournalOfficielBook />
        </div>
      </section>

      {/* 4. FIL D'ACTUALITÉ — placé juste sous le Journal Officiel. */}
      <section id="actualites" className="scroll-mt-24 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="relative mb-16 text-center md:text-left">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <span className="text-slate-900 dark:text-slate-100 opacity-[0.08] absolute -top-10 left-0 select-none hidden md:block whitespace-nowrap text-8xl font-staatliches tracking-widest">
                ACTUALITÉ • DIRECT
              </span>
              
              <div className="flex items-center gap-4">
                <span className="relative flex h-4 w-4 md:h-6 md:w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 md:h-6 md:w-6 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"></span>
                </span>
                
                <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none inline-flex items-center gap-2 md:gap-3 flex-wrap">
                  <span className="text-black dark:text-white">Récemment en</span>
                  <span className="bg-yellow-300 text-black px-4 pt-1.5 pb-0.5 md:pt-3 md:pb-1 rounded-xl md:rounded-2xl shadow-sm">politique</span>
                </h2>
              </div>
            </div>
            <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-8 rounded-full mx-auto md:mx-0" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : !latestContent || latestContent.length === 0 ? (
            <div className="bg-card text-center p-12 rounded-3xl border shadow-sm flex flex-col items-center justify-center max-w-3xl mx-auto">
              <Landmark className="w-16 h-16 text-muted-foreground/30 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Les actualités arrivent bientôt</h3>
              <p className="text-muted-foreground text-lg">
                Nos robots sont en train de lire les textes du Parlement. 
                Revenez dans quelques instants pour l&apos;essentiel de la journée politique.
              </p>
            </div>
          ) : (
            <VerticalImageStack
              items={latestContent}
              height="h-[600px]"
              renderCard={(item, isCurrent, index) => (
                <div
                  className={`h-[420px] w-[280px] rounded-3xl overflow-hidden transition-all duration-300 ${
                    isCurrent
                      ? "shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5 scale-100"
                      : "shadow-md ring-1 ring-slate-900/5 opacity-80 scale-95"
                  }`}
                >
                  <FeedItemCard item={item} colorIndex={index} />
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* 3. STATS + LE SAVIEZ-VOUS (fusionnés) — déplacé sous le fil d'actualité. */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <StatsPanel />
        </div>
      </section>

      {/* 4.5 CALENDAR CTA SECTION (NEW) */}
      <section className="py-12 px-4 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="container mx-auto max-w-6xl">
          <Link href="/calendrier" className="block group">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none flex flex-col md:flex-row items-center justify-between gap-8 group-hover:border-amber-200 dark:group-hover:border-amber-500/30 transition-all duration-500 overflow-hidden relative"
            >
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <CalendarDays size={40} />
                </div>
                <div className="text-center md:text-left space-y-2">
                  <h3 className="text-3xl md:text-4xl font-staatliches uppercase tracking-tighter leading-none">
                    L'agenda <span className="text-amber-500">Complet</span> de la république
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-lg italic">
                    Découvrez toutes les séances, auditions et événements politiques à venir.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 relative z-10">
                <div className="px-10 py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center gap-3 group-hover:bg-amber-600 transition-all shadow-2xl shadow-slate-900/20 group-hover:shadow-amber-500/40">
                  Voir le calendrier
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AN • SÉNAT • GOUVERNEMENT</span>
              </div>
            </motion.div>
          </Link>
        </div>
      </section>

      {/* NEW: SECTION PÉTITIONS CITOYENNES */}
      <PetitionsSection />




    </div>
  );
}
