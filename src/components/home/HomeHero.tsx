"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, Crown, MapPin, ScrollText, Sparkles, Users, type LucideIcon } from "lucide-react";
import { MarkerHighlight } from "@/components/ui/marker-highlight";
import Link from "next/link";
import { useTheme } from "@/components/providers";
import { usePremium } from "@/lib/hooks/usePremium";
import { mesurerAction, mesurerPuisPartir } from "@/lib/mesure";
import AccordAchat from "@/components/premium/AccordAchat";
import { PLANS, SALES_OPEN } from "@/lib/constants";
import { lienPaiementStripe } from "@/lib/utils";

// Premier écran. Un nouveau venu (souvent arrivé depuis Instagram, sur téléphone) doit
// comprendre en une phrase ce que fait le site et trouver tout de suite une première
// action utile. Les anciennes cartes (« Qui vote quoi ? », « L'argent public ? »…)
// posaient des questions sans dire où elles menaient, en 11 px sur mobile.
const ACTIONS: { href: string; Icone: LucideIcon; titre: string; texte: string; ton: string }[] = [
  { href: "/deputes", Icone: Users, titre: "Trouver mon député", texte: "Ses votes, sa présence et ses propositions",
    ton: "from-blue-500 to-indigo-600" },
  { href: "/lois", Icone: ScrollText, titre: "Comprendre une loi", texte: "Résumé, parcours et votes de chaque texte",
    ton: "from-rose-500 to-red-600" },
  // Troisième case : l'essai gratuit du Premium pour un visiteur (22/11/2026), remplacée
  // par « Aujourd'hui au Parlement » chez un abonné, à qui il n'y a rien à vendre.
  { href: "/premium", Icone: Crown, titre: "Essai gratuit Premium", texte: "7 jours offerts, sans engagement",
    ton: "dore" },
  { href: "/local", Icone: MapPin, titre: "Mes élus locaux", texte: "Maire, département, région et leurs budgets",
    ton: "from-emerald-500 to-teal-600" },
];

const PARLEMENT = { href: "#institutions", Icone: CalendarClock, titre: "Aujourd'hui au Parlement",
  texte: "Séances, auditions et Conseil des ministres du jour", ton: "from-amber-500 to-orange-600" };

// La carte dorée : fond or poli, reflet qui passe en boucle, pastille « 7 jours offerts ».
// Elle ouvre directement la fenêtre d'essai (vitrine + accord, AccordAchat), sans passer par
// la page /premium (22/11/2026, demande de l'éditeur). Vente fermée : lien vers /premium.
function CarteEssai({ href, titre, texte }: { href: string; titre: string; texte: string }) {
  const { userId } = usePremium();
  const [ouverte, setOuverte] = useState(false);
  return (
    <>
    {ouverte && (
      <AccordAchat cle="elite" offre={PLANS.elite.name} prix={`${PLANS.elite.monthly.toFixed(2).replace(".", ",")} €`} periode="mois" userId={userId}
        onFermer={() => setOuverte(false)}
        onContinuer={() => { void mesurerPuisPartir("clic_paiement", lienPaiementStripe(userId, "elite", "monthly")); }} />
    )}
    <Link
      href={href}
      onClick={e => {
        void mesurerAction("accueil_essai_premium");
        if (!SALES_OPEN) return;
        e.preventDefault();
        void mesurerAction("achat_choix_elite");
        setOuverte(true);
      }}
      className="group relative isolate flex h-full flex-col gap-2 overflow-hidden rounded-2xl border border-amber-300 bg-[linear-gradient(135deg,#fde68a_0%,#fbbf24_28%,#f59e0b_52%,#fcd34d_74%,#b45309_100%)] p-3.5 shadow-[0_8px_30px_-8px_rgba(217,119,6,0.65)] ring-1 ring-inset ring-white/40 transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_rgba(217,119,6,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[0.98] dark:border-amber-400/70 md:p-5"
    >
      {/* Reflet qui balaie la carte toutes les quelques secondes (coupé si l'appareil demande moins d'animations). */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 z-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden"
        animate={{ x: ["0%", "400%"] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
      />
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 z-0 h-20 w-20 rounded-full bg-white/30 blur-2xl" />
      <span className="relative z-10 flex items-start justify-between gap-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-900 to-yellow-950 text-amber-300 shadow-md ring-1 ring-amber-200/50 md:h-11 md:w-11">
          <Crown size={20} />
        </span>
        <span className="flex items-center gap-1 rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200 shadow-sm md:text-[11px]">
          <Sparkles size={11} /> Offert
        </span>
      </span>{" "}
      <span className="relative z-10 flex items-start justify-between gap-1 text-[15px] font-black uppercase leading-snug tracking-tight text-amber-950 md:text-base">
        {titre}
        <ArrowRight size={16} className="mt-0.5 shrink-0 text-amber-900 transition group-hover:translate-x-0.5" />
      </span>{" "}
      <span className="relative z-10 text-[13px] font-semibold leading-snug text-amber-950/85 max-[359px]:hidden md:text-sm">{texte}</span>
    </Link>
    </>
  );
}

export default function HomeHero() {
  // Entre deux passages du marqueur, « simple. » reprend sa couleur de base : un
  // bleu nuit fixe le rendait invisible sur le fond du thème sombre.
  const { resolvedTheme } = useTheme();
  // Habillage seulement : un abonné (même d'après la visite précédente) ne voit pas l'offre d'essai.
  const { tierAffiche } = usePremium();
  const actions = tierAffiche === "free" ? ACTIONS : ACTIONS.map(a => (a.ton === "dore" ? PARLEMENT : a));
  return (
    <div className="relative w-full bg-card pb-8 pt-4 dark:bg-slate-900/10 md:pb-12 md:pt-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4">

        {/* Titre — UN seul <h1> (trois balises de titre principal brouillaient les moteurs de recherche). */}
        <h1 className="mb-4 flex w-full flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center md:mb-6 md:gap-x-6">
          {["La politique,", "c'est"].map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="m-0 block text-[clamp(2.75rem,8vw,120px)] max-[359px]:text-[2.4rem] uppercase leading-[0.85] tracking-tight text-foreground dark:text-white"
              style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
            >
              {word}{" "}
            </motion.span>
          ))}{" "}
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="m-0 block text-[clamp(3rem,9vw,140px)] max-[359px]:text-[2.7rem] uppercase leading-[0.85] tracking-tight"
            style={{ fontFamily: '"Staatliches", "Arial Black", Impact, sans-serif' }}
          >
            <MarkerHighlight
              highlight="simple."
              markerColor="#3b82f6"
              colorList={["#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"]}
              baseColor={resolvedTheme === "dark" ? "#ffffff" : "#0f172a"}
              highlightedTextColor="#ffffff"
              delay={0.4}
            />
          </motion.span>
        </h1>{" "}

        {/* La promesse, dite simplement. */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-6 max-w-xl text-center text-base leading-relaxed text-slate-700 dark:text-slate-300 max-[359px]:mb-4 max-[359px]:text-[15px] md:mb-8 md:text-lg"
        >
          Les votes de vos élus, les lois et le travail du Parlement, expliqués simplement à partir des sources officielles.
        </motion.p>{" "}

        {/* Par où commencer : quatre actions explicites, faciles à toucher. */}
        <nav aria-label="Par où commencer" className="w-full">
          <p className="mb-2.5 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Par où commencer ?</p>{" "}
          <ul className="grid w-full grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
            {actions.map(({ href, Icone, titre, texte, ton }, i) => (
              <motion.li
                key={href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}
              >
                {ton === "dore" ? <CarteEssai href={href} titre={titre} texte={texte} /> : (
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 transition hover:border-slate-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-600 md:p-5"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${ton} text-white shadow-md md:h-11 md:w-11`}>
                    <Icone size={20} />
                  </span>{" "}
                  <span className="flex items-start justify-between gap-1 text-[15px] font-bold leading-snug text-foreground dark:text-white md:text-base">
                    {titre}
                    <ArrowRight size={16} className="mt-0.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </span>{" "}
                  {/* Sous 360 px de large, la description passe à la trappe : les quatre
                      actions tiennent ainsi dans le premier écran d'un petit téléphone. */}
                  <span className="text-[13px] leading-snug text-muted-foreground dark:text-slate-400 max-[359px]:hidden md:text-sm">{texte}</span>
                </Link>
                )}
              </motion.li>
            ))}
          </ul>
        </nav>{" "}

        {/* Ce qui est gratuit, dès le premier écran : la couronne flottante n'expliquait rien. */}
        <p className="mt-4 text-center text-[13px] leading-snug text-muted-foreground md:text-sm">
          L&apos;essentiel est gratuit, sans inscription.{" "}
          <Link href="/premium" className="font-semibold text-foreground underline decoration-amber-500 decoration-2 underline-offset-4 hover:text-amber-700 dark:text-white dark:hover:text-amber-300">
            Premium
          </Link>{" "}
          ajoute les décryptages détaillés et les alertes.
        </p>
      </div>
    </div>
  );
}
