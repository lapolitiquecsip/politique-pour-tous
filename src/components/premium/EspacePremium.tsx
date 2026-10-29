"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Bell, LayoutDashboard, LineChart, Settings, Star } from "lucide-react";
import NotificationsFeed from "@/components/dashboard/NotificationsFeed";
import PremiumPreferences from "@/components/dashboard/PremiumPreferences";
import CommuneFeedCard from "@/components/dashboard/CommuneFeedCard";
import CandidatesFollowFeed from "@/components/dashboard/CandidatesFollowFeed";

/**
 * L'espace d'un abonné Premium, en onglets (31/10/2026, sur le modèle de l'espace Pro).
 *
 * Avant, tout ce qu'offre le Premium vivait dans le tableau de bord, mêlé aux réglages du
 * compte, et /premium continuait de lui présenter les offres qu'il avait déjà souscrites.
 * Désormais /premium est son espace : « Aujourd'hui » (ses alertes, ses candidats, sa
 * commune), « Mon activité » (votes, élus suivis, lois favorites, territoires, parrainage),
 * « Réglages » ; le tableau de bord se réduit au compte. Les offres restent à un clic
 * (« Passer au Pro » → /premium/?offres=1).
 *
 * L'onglet suit l'ancre de l'adresse : /premium#preferences, #activite, #parrainage…
 */
type IdOnglet = "aujourdhui" | "activite" | "preferences";
const ONGLETS: { id: IdOnglet; label: string; court: string; Icone: typeof Bell; ancres: string[] }[] = [
  { id: "aujourdhui", label: "Aujourd'hui", court: "Alertes", Icone: LayoutDashboard, ancres: ["", "alertes"] },
  { id: "activite", label: "Mon activité", court: "Activité", Icone: Star, ancres: ["parrainage", "suivis", "votes"] },
  { id: "preferences", label: "Alertes & réglages", court: "Réglages", Icone: Settings, ancres: ["profil"] },
];
const ongletDeLAncre = (h: string): IdOnglet | null => {
  const a = h.replace(/^#/, "");
  return ONGLETS.find(o => o.id === a || o.ancres.includes(a))?.id ?? null;
};

export default function EspacePremium({ userId, activite }: { userId: string; activite: ReactNode }) {
  const [onglet, setOnglet] = useState<IdOnglet>("aujourdhui");
  const repere = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const appliquer = () => { const id = ongletDeLAncre(window.location.hash); if (id) setOnglet(id); };
    appliquer();
    window.addEventListener("hashchange", appliquer);
    return () => window.removeEventListener("hashchange", appliquer);
  }, []);

  const ouvrir = useCallback((id: IdOnglet) => {
    setOnglet(id);
    history.replaceState(null, "", id === "aujourdhui" ? window.location.pathname + window.location.search : `#${id}`);
    const haut = repere.current ? repere.current.getBoundingClientRect().top + window.scrollY - 64 : 0;
    if (window.scrollY > haut) window.scrollTo({ top: haut });
  }, []);

  return (
    <div className="relative z-20">
      <div ref={repere} aria-hidden />
      {/* Barre d'onglets collée sous l'en-tête ; « Passer au Pro » à droite, en violet. */}
      <div className="sticky top-16 z-30 border-y border-white/[0.07] bg-[#0b1020]/90 backdrop-blur-md">
        <nav aria-label="Rubriques de l'espace Premium" className="container mx-auto flex max-w-6xl items-center gap-1 px-2 md:px-4">
          <div role="tablist" className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ONGLETS.map(({ id, label, court, Icone }) => {
              const actif = onglet === id;
              return (
                <button key={id} type="button" role="tab" aria-selected={actif} onClick={() => ouvrir(id)}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-bold transition ${actif ? "bg-white text-slate-950 shadow" : "text-white/65 hover:bg-white/[0.07] hover:text-white"}`}>
                  <Icone size={15} className={actif ? "text-amber-600" : ""} />
                  <span className="md:hidden">{court}</span><span className="hidden md:inline">{label}</span>
                </button>
              );
            })}
          </div>{" "}
          <Link href="/premium/?offres=1" className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 text-[12px] font-black text-white shadow-lg shadow-fuchsia-500/25">
            <LineChart size={14} /> <span className="hidden sm:inline">Passer au</span> Pro
          </Link>
        </nav>
      </div>{" "}

      <div className="container mx-auto max-w-6xl px-4 pt-6 md:pt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={onglet} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {onglet === "aujourdhui" && (
              <div className="space-y-6">
                <div id="alertes" className="scroll-mt-32"><NotificationsFeed userId={userId} /></div>{" "}
                <CandidatesFollowFeed />{" "}
                <CommuneFeedCard />{" "}
                <button type="button" onClick={() => ouvrir("activite")}
                  className="flex w-full items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:bg-white/[0.06]">
                  <span>
                    <span className="block text-[15px] font-bold text-white">Votre activité</span>{" "}
                    <span className="block text-[13px] text-white/60">Vos votes, vos élus suivis, vos lois favorites, vos territoires et votre parrainage.</span>
                  </span>{" "}
                  <ArrowRight size={18} className="shrink-0 text-amber-300" />
                </button>
              </div>
            )}
            {onglet === "activite" && activite}
            {onglet === "preferences" && (
              <div className="space-y-6">
                <div id="profil" className="scroll-mt-32"><PremiumPreferences userId={userId} /></div>{" "}
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 text-[13px] text-white/55">
                  <Link href="/dashboard" className="font-bold text-white/70 hover:text-white">Mon compte : adresse, mot de passe, abonnement →</Link>{" "}
                  <Link href="/premium/?offres=1" className="font-bold text-fuchsia-300 hover:text-fuchsia-200">Comparer avec l&apos;offre Pro →</Link>
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
