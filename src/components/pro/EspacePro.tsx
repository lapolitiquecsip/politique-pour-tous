"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Bell, Check, FilePenLine, Landmark, LayoutDashboard, Mail, MapPin, Newspaper, Rss, Settings, Star, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import NotificationsFeed from "@/components/dashboard/NotificationsFeed";
import PremiumPreferences from "@/components/dashboard/PremiumPreferences";
import AlertesPro from "@/components/dashboard/AlertesPro";
import CommuneFeedCard from "@/components/dashboard/CommuneFeedCard";
import CandidatesFollowFeed from "@/components/dashboard/CandidatesFollowFeed";
import CommissionsRegistre from "@/components/home/CommissionsRegistre";
import JournalOfficielDuJour from "@/components/home/JournalOfficielDuJour";
import TopicBrief from "@/components/pro/TopicBrief";
import AmendementsAN from "@/components/pro/AmendementsAN";
import FilActualitePro from "@/components/pro/FilActualitePro";

/**
 * L'espace de travail d'un abonné Pro, en onglets.
 *
 * Avant : sept rubriques empilées (18 000 pixels sur un téléphone), des argumentaires de
 * vente adressés à qui avait déjà payé, trois blocs « alertes ». Désormais une rubrique à
 * la fois, et un fil : « Aujourd'hui » dit ce qui a bougé et mène au reste ; chaque
 * outil a son onglet ; les réglages sont rangés au même endroit.
 *
 * L'onglet suit l'ancre de l'adresse : les liens des e-mails (/premium#journal-officiel,
 * #amendements, #preferences, #emails-pro…) ouvrent directement le bon.
 */
type IdOnglet = "aujourdhui" | "journal-officiel" | "commissions" | "amendements" | "fil-actualite" | "suivis" | "preferences";
const ONGLETS: { id: IdOnglet; label: string; court: string; Icone: typeof Bell; ancres: string[] }[] = [
  { id: "aujourdhui", label: "Aujourd'hui", court: "Aujourd'hui", Icone: LayoutDashboard, ancres: ["", "alertes", "tout-sur-un-sujet"] },
  { id: "journal-officiel", label: "Journal officiel", court: "JO", Icone: Newspaper, ancres: [] },
  { id: "commissions", label: "Commissions", court: "Commissions", Icone: Landmark, ancres: [] },
  { id: "amendements", label: "Amendements", court: "Amendements", Icone: FilePenLine, ancres: [] },
  { id: "fil-actualite", label: "Actualité", court: "Actualité", Icone: Rss, ancres: [] },
  { id: "suivis", label: "Mes suivis", court: "Suivis", Icone: Star, ancres: ["parrainage"] },
  { id: "preferences", label: "E-mails & réglages", court: "Réglages", Icone: Settings, ancres: ["emails-pro"] },
];
const ongletDeLAncre = (h: string): IdOnglet | null => {
  const a = h.replace(/^#/, "");
  return ONGLETS.find(o => o.id === a || o.ancres.includes(a))?.id ?? null;
};
const CLE_VISITE_AMDT = "lpcs_amendements_visite";
const jourLong = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default function EspacePro({ userId, nbSuivis, suivis, onTutoriel }: {
  userId: string; nbSuivis: number; suivis: ReactNode; onTutoriel: () => void;
}) {
  const [onglet, setOnglet] = useState<IdOnglet>("aujourdhui");
  const barre = useRef<HTMLDivElement>(null);
  // Repère posé juste avant la barre : la barre, collée, ne donne plus sa vraie place.
  const repere = useRef<HTMLDivElement>(null);

  // L'ancre décide de l'onglet, à l'arrivée comme en cours de visite (liens internes).
  useEffect(() => {
    const appliquer = () => {
      const id = ongletDeLAncre(window.location.hash);
      if (!id) return;
      setOnglet(id);
      const cible = window.location.hash.replace(/^#/, "");
      // Une ancre interne à l'onglet (#emails-pro) : on y descend une fois l'onglet rendu.
      if (cible && cible !== id) for (const ms of [500, 1600]) setTimeout(() => document.getElementById(cible)?.scrollIntoView({ block: "start" }), ms);
    };
    appliquer();
    window.addEventListener("hashchange", appliquer);
    return () => window.removeEventListener("hashchange", appliquer);
  }, []);

  const ouvrir = useCallback((id: IdOnglet) => {
    setOnglet(id);
    // L'adresse garde l'onglet (partage, retour arrière) sans faire sauter la page.
    history.replaceState(null, "", id === "aujourdhui" ? window.location.pathname + window.location.search : `#${id}`);
    const haut = repere.current ? repere.current.getBoundingClientRect().top + window.scrollY - 64 : 0;
    if (window.scrollY > haut) window.scrollTo({ top: haut });
  }, []);

  // L'onglet actif reste visible dans la barre qui défile au doigt.
  useEffect(() => {
    barre.current?.querySelector<HTMLElement>(`[data-onglet="${onglet}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [onglet]);

  return (
    <div className="relative z-20">
      <div ref={repere} aria-hidden />
      {/* Barre d'onglets, collée sous l'en-tête du site (h-16). */}
      <div ref={barre} className="sticky top-16 z-30 border-y border-white/[0.07] bg-[#0b1020]/90 backdrop-blur-md">
        <nav aria-label="Rubriques de l'espace Pro" className="container mx-auto max-w-6xl px-2 md:px-4">
          <div role="tablist" className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ONGLETS.map(({ id, label, court, Icone }) => {
              const actif = onglet === id;
              return (
                <button key={id} type="button" role="tab" aria-selected={actif} data-onglet={id} onClick={() => ouvrir(id)}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-bold transition ${actif ? "bg-white text-slate-950 shadow" : "text-white/65 hover:bg-white/[0.07] hover:text-white"}`}>
                  <Icone size={15} className={actif ? "text-fuchsia-600" : ""} />
                  <span className="md:hidden">{court}</span><span className="hidden md:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>{" "}

      <div className="container mx-auto max-w-6xl px-4 pt-6 md:pt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={onglet} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {onglet === "aujourdhui" && <Aujourdhui userId={userId} nbSuivis={nbSuivis} ouvrir={ouvrir} />}
            {onglet === "journal-officiel" && <JournalOfficielDuJour direct />}
            {onglet === "commissions" && <CommissionsRegistre direct />}
            {onglet === "amendements" && <AmendementsAN />}
            {onglet === "fil-actualite" && <FilActualitePro userId={userId} />}
            {onglet === "suivis" && (
              <div className="space-y-6">
                {suivis}
                <CandidatesFollowFeed />
                <CommuneFeedCard />
              </div>
            )}
            {onglet === "preferences" && (
              <div className="space-y-6">
                <AlertesPro userId={userId} />
                <div id="profil" className="scroll-mt-32"><PremiumPreferences userId={userId} /></div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 text-[13px] text-white/55">
                  <button type="button" onClick={onTutoriel} className="font-bold text-fuchsia-300 hover:text-fuchsia-200">Revoir le guide pas à pas</button>
                  <Link href="/dashboard" className="font-bold text-white/70 hover:text-white">Mon compte : adresse, mot de passe, abonnement →</Link>
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────── Aujourd'hui ───────────────────────── */

function Aujourdhui({ userId, nbSuivis, ouvrir }: { userId: string; nbSuivis: number; ouvrir: (id: IdOnglet) => void }) {
  const [prenom, setPrenom] = useState("");
  const [prefs, setPrefs] = useState<{ emails: number; ville: boolean } | null>(null);
  const [jo, setJo] = useState<{ date: string; n: number } | null>(null);
  const [com, setCom] = useState<{ date: string; n: number } | null>(null);
  const [amdt, setAmdt] = useState<{ n: number; depuis: string | null } | null>(null);

  useEffect(() => {
    let vivant = true;
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle()
      .then(({ data }) => { if (vivant) setPrenom(String(data?.display_name || "").split(" ")[0]); });
    supabase.from("user_preferences").select("abonnements_pro, city").eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (vivant) setPrefs({ emails: Object.values((data?.abonnements_pro as Record<string, string>) || {}).filter(v => v && v !== "aucun").length, ville: !!data?.city }); });
    api.getJorfEditions(1).then((r: any[]) => { if (vivant && r?.[0]) setJo({ date: r[0].date, n: r[0].text_count }); }).catch(() => {});
    api.getCommissionDays(80).then(r => { if (vivant && r[0]) setCom({ date: r[0].date, n: r[0].total }); }).catch(() => {});
    let visite: string | null = null;
    try { visite = localStorage.getItem(CLE_VISITE_AMDT); } catch { /* navigation privée */ }
    const depuis = visite || new Date(Date.now() - 864e5).toISOString();
    supabase.from("amendements_an").select("uid", { count: "exact", head: true }).gt("vu_le", depuis)
      .then(({ count }) => { if (vivant) setAmdt({ n: count ?? 0, depuis: visite }); });
    return () => { vivant = false; };
  }, [userId]);

  const etapes = prefs ? [
    { fait: prefs.emails > 0, titre: "Choisissez vos e-mails", texte: "Commissions, lois, JO, élus, Europe, territoire : chaque jour ou chaque semaine.", action: "Choisir", Icone: Mail, aller: () => { ouvrir("preferences"); setTimeout(() => document.getElementById("emails-pro")?.scrollIntoView({ block: "start" }), 450); } },
    { fait: nbSuivis > 0, titre: "Suivez vos élus", texte: "Leurs votes arrivent dans vos alertes et vos e-mails.", action: "Trouver un élu", Icone: Users, href: "/deputes" },
    { fait: prefs.ville, titre: "Indiquez votre commune", texte: "Pour l'actualité de votre territoire et les textes qui vous concernent.", action: "Renseigner", Icone: MapPin, aller: () => { ouvrir("preferences"); setTimeout(() => document.getElementById("profil")?.scrollIntoView({ block: "start" }), 450); } },
  ] : [];
  const restantes = etapes.filter(e => !e.fait);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">
          {prenom ? <>Bonjour <span className="text-fuchsia-300">{prenom}</span></> : <>Le point <span className="text-fuchsia-300">du jour</span></>}
        </h2>{" "}
        <p className="mt-1.5 text-sm text-white/60">Ce qui a bougé au Parlement et au Journal officiel, et ce qui vous concerne.</p>
      </div>{" "}

      {/* Pour bien démarrer : disparaît une fois tout fait. */}
      {restantes.length > 0 && (
        <section className="rounded-3xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/[0.12] to-purple-600/[0.04] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-fuchsia-200">Pour bien démarrer</h3>
            <span className="text-[12px] font-bold text-white/60">{etapes.length - restantes.length}/{etapes.length} fait{etapes.length - restantes.length > 1 ? "s" : ""}</span>
          </div>{" "}
          <ul className={`mt-3 grid gap-2 ${restantes.length > 1 ? "md:grid-cols-2" : ""} ${restantes.length > 2 ? "lg:grid-cols-3" : ""}`}>
            {restantes.map(({ fait, titre, texte, action, Icone, href, aller }) => (
              <li key={titre} className="flex items-start gap-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${fait ? "bg-emerald-500/20 text-emerald-300" : "bg-fuchsia-500/20 text-fuchsia-200"}`}>{fait ? <Check size={17} /> : <Icone size={17} />}</span>{" "}
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] font-bold ${fait ? "text-white/70 line-through decoration-white/30" : "text-white"}`}>{titre}</p>{" "}
                  {!fait && <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">{texte}</p>}{" "}
                  {!fait && (href
                    ? <Link href={href} className="mt-2 inline-flex items-center gap-1 text-[12px] font-black uppercase tracking-wider text-fuchsia-300 hover:text-fuchsia-200">{action} <ArrowRight size={13} /></Link>
                    : <button type="button" onClick={aller} className="mt-2 inline-flex items-center gap-1 text-[12px] font-black uppercase tracking-wider text-fuchsia-300 hover:text-fuchsia-200">{action} <ArrowRight size={13} /></button>)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}{" "}

      {/* Le point du jour : trois chiffres réels, chacun mène à sa rubrique. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tuile Icone={Newspaper} couleur="from-fuchsia-500 to-purple-600" titre="Journal officiel" court="JO"
          chiffre={jo?.n} legende={jo ? `textes publiés ${jourLong(jo.date)}` : "…"} action="Lire l'édition" onClick={() => ouvrir("journal-officiel")} />
        <Tuile Icone={Landmark} couleur="from-emerald-500 to-teal-600" titre="Commissions" court="Commissions"
          chiffre={com?.n} legende={com ? `réunion${com.n > 1 ? "s" : ""} ${jourLong(com.date)}` : "…"} action="Voir les réunions" onClick={() => ouvrir("commissions")} />
        <Tuile Icone={FilePenLine} couleur="from-sky-500 to-blue-600" titre="Amendements" court="Amendements"
          chiffre={amdt?.n} legende={amdt ? (amdt.depuis ? "nouveaux depuis votre dernière visite" : "repérés ces dernières 24 h") : "…"} action="Les parcourir" onClick={() => ouvrir("amendements")} />
      </div>{" "}

      <div id="alertes" className="scroll-mt-32"><NotificationsFeed userId={userId} /></div>{" "}
      <div id="tout-sur-un-sujet" className="scroll-mt-32"><TopicBrief /></div>
    </div>
  );
}

function Tuile({ Icone, couleur, titre, court, chiffre, legende, action, onClick }: {
  Icone: typeof Bell; couleur: string; titre: string; court: string; chiffre?: number; legende: string; action: string; onClick: () => void;
}) {
  // Sur mobile, trois tuiles côte à côte : icône, chiffre, nom ; la tuile entière est le bouton.
  return (
    <button type="button" onClick={onClick} aria-label={`${titre} : ${chiffre ?? ""} ${legende} — ${action}`}
      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-white/25 hover:bg-white/[0.07] sm:rounded-3xl sm:p-5">
      <span className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${couleur} text-white shadow-lg sm:h-9 sm:w-9`}><Icone size={16} /></span>{" "}
        <span className="hidden text-[11px] font-black uppercase tracking-[0.18em] text-white/60 sm:inline">{titre}</span>
      </span>{" "}
      <span className="mt-2.5 flex flex-col sm:mt-3 sm:flex-row sm:items-baseline sm:gap-2">
        <span className="font-staatliches text-3xl leading-none tabular-nums text-white sm:text-4xl">{chiffre == null ? "–" : chiffre.toLocaleString("fr-FR")}</span>{" "}
        <span className="mt-1 text-[11px] font-bold leading-tight text-white/70 sm:hidden">{court}</span>
        <span className="hidden text-[13px] leading-snug text-white/60 sm:inline">{legende}</span>
      </span>{" "}
      <span className="mt-3 hidden items-center gap-1 text-[12px] font-black uppercase tracking-wider text-fuchsia-300 group-hover:text-fuchsia-200 sm:inline-flex">
        {action} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
