"use client";
import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Landmark, CalendarDays, Clock, MousePointerClick } from "lucide-react";

import Link from "next/link";
import { api } from "@/lib/api";
import { Marquee } from "@/components/ui/marquee";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

interface Institution {
  id: string;
  name: string;
  shortName: string;
  image: string;
  summary: string;
  details: string[];
  color: string;
  dbInstitution: string; // Mapping for Supabase events table
  memberCount?: number;
  directoryUrl?: string;
}

const INSTITUTIONS: Institution[] = [
  {
    id: "assemblee",
    name: "Assemblée nationale",
    shortName: "Assemblée",
    dbInstitution: "AN",
    memberCount: 577,
    directoryUrl: "/deputes",
    image: "https://savoirs.unistra.fr/fileadmin/upload/Savoirs/Societe/Assemblee_nationale.JPG",
    summary: "L'hémicycle examine les textes de loi et contrôle le gouvernement.",
    color: "from-blue-600",
    details: [
      "577 sièges de députés au Palais Bourbon",
      "Examen des projets et propositions de loi",
      "Questions au gouvernement chaque mardi et mercredi",
    ],
  },
  {
    id: "senat",
    name: "Sénat",
    shortName: "Sénat",
    dbInstitution: "Sénat",
    memberCount: 348,
    directoryUrl: "/senateurs",
    image: "/images/senat_luxembourg_premium.png",
    summary: "",
    color: "from-indigo-600",
    details: [
      "348 sénateurs composent la chambre haute",
      "Navette parlementaire sur le Budget",
    ],
  },
  {
    id: "gouvernement",
    name: "Gouvernement",
    shortName: "Élysée",
    dbInstitution: "Élysée",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/db/Palais_de_l%27%C3%89lys%C3%A9e_2019.jpg",
    summary: "L'exécutif dirige la politique de la nation depuis l'Élysée.",
    color: "from-red-600",
    details: [
      "Le Premier ministre coordonne l'action gouvernementale",
      "Conseil des ministres chaque mercredi à 10h",
    ],
  },
];

const imageDe = (inst: Institution) =>
  inst.image.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${inst.image}` : inst.image;

// Heure d'un événement : accepte le format français [11h30] comme [11:30]. Renvoie "11h30" ou null.
const extractTime = (title: string) => {
  const m = String(title || "").match(/^\[(\d{1,2})[h:](\d{2})\]/);
  return m ? `${m[1]}h${m[2]}` : null;
};
const minutesDe = (heure: string | null | undefined) => {
  const m = String(heure || "").match(/^(\d{1,2})[h:](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * Ce que l'institution fait aujourd'hui, d'après son agenda du jour. « En direct » était
 * écrit en dur sur les trois cartes, y compris un jour sans aucune séance : l'état affiché
 * est désormais calculé. « En cours » = un événement a commencé il y a moins de deux heures.
 */
type Etat = { nombre: number; enCours: boolean };
function etatDuJour(evenements: any[], institution: string): Etat {
  const liste = evenements.filter(e => e.institution === institution && e.category !== "DailySummary");
  const maintenant = new Date();
  const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
  const enCours = liste.some(e => {
    const debut = minutesDe(extractTime(e.title) || e.time);
    return debut != null && debut <= minutes && minutes < debut + 120;
  });
  return { nombre: liste.length, enCours };
}

function Badge({ etat, clair = false }: { etat: Etat | undefined; clair?: boolean }) {
  if (!etat) return <span className="inline-block h-6 w-28 animate-pulse rounded-full bg-white/15" />;
  if (etat.enCours) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{" "}En cours
      </span>
    );
  }
  const texte = etat.nombre ? `${etat.nombre} événement${etat.nombre > 1 ? "s" : ""} aujourd'hui` : "Rien de prévu aujourd'hui";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${clair
      ? (etat.nombre ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200" : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300")
      : (etat.nombre ? "bg-white/90 text-slate-900" : "bg-black/40 text-white/85")}`}>
      {texte}
    </span>
  );
}

// Carte grand écran (défilement automatique).
const InstitutionCard = memo(({ inst, index, etat, onClick }: { inst: Institution; index: number; etat?: Etat; onClick: () => void }) => {
  return (
    <motion.button
      key={inst.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      aria-label={`${inst.name} : voir le programme du jour`}
      style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
      className={`group relative h-[420px] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl ${inst.id === 'assemblee' ? 'hover:shadow-red-500/50' : inst.id === 'senat' ? 'hover:shadow-blue-500/50' : 'hover:shadow-purple-500/50'} transition-all duration-500 cursor-pointer text-left w-full border border-border/50`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 group-hover:scale-110 group-hover:saturate-[1.5]"
        style={{ backgroundImage: `url(${imageDe(inst)})`, opacity: 0.9 }}
      />{" "}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent group-hover:from-slate-900 group-hover:via-slate-900/20 transition-colors duration-500" />{" "}
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.25)] text-white transition-all duration-500 group-hover:bg-white/20 group-hover:ring-white/60">
          <MousePointerClick className="h-[18px] w-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
        </div>
      </div>{" "}
      <div className="relative z-10 flex flex-col justify-end h-full p-10">
        <div className="mb-3"><Badge etat={etat} /></div>{" "}
        <h3 className="text-4xl font-staatliches uppercase tracking-tighter text-white mb-6 group-hover:text-blue-400 transition-colors">
          {inst.name}
        </h3>{" "}
        <div className="flex items-center gap-3 text-white font-bold text-xs uppercase tracking-widest self-start transition-all group-hover:translate-x-2">
          Que se passe-t-il aujourd&apos;hui ? <ChevronRight className="w-4 h-4 text-blue-500" />
        </div>
      </div>{" "}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
    </motion.button>
  );
});
InstitutionCard.displayName = "InstitutionCard";

export default function InstitutionsGrid() {
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [evenementsDuJour, setEvenementsDuJour] = useState<any[] | null>(null);
  const fermer = useRef<HTMLButtonElement>(null);

  // Retire les liens Markdown [libellé](url) en gardant le libellé lisible, et les URLs nues.
  // → l'utilisateur voit « Déplacement au Royaume des Pays-Bas. » et non l'URL Élysée brute.
  const stripLinks = (s: string) =>
    s.replace(/\[([^\]]+)\]\(\s*<?https?:\/\/[^)]*>?\s*\)/g, '$1').replace(/https?:\/\/\S+/g, '');

  const cleanTitle = (title: string) => {
    if (!title) return "";
    return stripLinks(title)
      .replace(/^\[\d{1,2}[h:]\d{2}\]\s*/, '')
      .replace(/^-+\s*/, '')
      .replace(/\s*,-+\s*/g, ' • ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const cleanDescription = (desc: string) => {
    if (!desc) return null;
    if (typeof desc !== 'string') return desc;
    if (desc.startsWith('[') && desc.endsWith(']')) {
      try {
        const parsed = JSON.parse(desc);
        if (Array.isArray(parsed)) return parsed.join(' • ');
      } catch {}
    }
    const text = stripLinks(desc)
      .replace(/^-+\s*/, '')
      .replace(/[ \t]*\r?\n[ \t]*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return text || null;
  };

  // L'agenda du jour, lu une fois : il sert aux pastilles d'état ET au contenu des fenêtres.
  useEffect(() => {
    let vivant = true;
    api.getEvenementsDuJour(new Date().toLocaleDateString("en-CA"))
      .then(d => { if (vivant) setEvenementsDuJour(d); })
      .catch(() => { if (vivant) setEvenementsDuJour([]); });
    return () => { vivant = false; };
  }, []);

  const etats: Record<string, Etat> | null = evenementsDuJour
    ? Object.fromEntries(INSTITUTIONS.map(i => [i.id, etatDuJour(evenementsDuJour, i.dbInstitution)]))
    : null;
  const duJour = (inst: Institution) => (evenementsDuJour ?? []).filter(e => e.institution === inst.dbInstitution);
  const events = selectedInst
    ? duJour(selectedInst).filter(e => e.category !== "DailySummary").sort((a, b) =>
        (extractTime(a.title) || a.time || "99h99").localeCompare(extractTime(b.title) || b.time || "99h99"))
    : [];
  const dailySummary = selectedInst ? duJour(selectedInst).find(e => e.category === "DailySummary")?.description || null : null;
  const loading = selectedInst !== null && evenementsDuJour === null;

  // Fenêtre ouverte : l'arrière-plan est figé (iPhone compris) et la page reprend à la même
  // position à la fermeture ; la croix reçoit le focus pour le clavier et les lecteurs d'écran.
  const ouverte = selectedInst !== null;
  useEffect(() => {
    if (!ouverte) return;
    lockScroll();
    const t = setTimeout(() => fermer.current?.focus({ preventScroll: true }), 50);
    return () => { clearTimeout(t); unlockScroll(); };
  }, [ouverte]);
  // Changer d'institution (ou fermer) referme toujours le détail d'événement ouvert.
  const choisir = (inst: Institution | null) => { setSelectedEvent(null); setSelectedInst(inst); };

  const handleNext = () => {
    if (!selectedInst) return;
    const currentIndex = INSTITUTIONS.findIndex(i => i.id === selectedInst.id);
    choisir(INSTITUTIONS[(currentIndex + 1) % INSTITUTIONS.length]);
  };

  const handlePrev = () => {
    if (!selectedInst) return;
    const currentIndex = INSTITUTIONS.findIndex(i => i.id === selectedInst.id);
    choisir(INSTITUTIONS[(currentIndex - 1 + INSTITUTIONS.length) % INSTITUTIONS.length]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedInst) return;
      if (e.key === "Escape") { if (selectedEvent) setSelectedEvent(null); else choisir(null); }
      if (selectedEvent) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const indexCourant = selectedInst ? INSTITUTIONS.findIndex(i => i.id === selectedInst.id) : 0;

  return (
    <div className="w-full">
      {/* MOBILE : une liste verticale de trois lignes. Le carrousel horizontal ne montrait
          qu'un bout de la carte suivante : on ne devinait pas qu'il y avait trois institutions. */}
      <ul className="space-y-2.5 md:hidden">
        {INSTITUTIONS.map(inst => (
          <li key={inst.id}>
            <button
              onClick={() => choisir(inst)}
              className="group flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-2.5 pr-3 text-left transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="h-16 w-16 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${imageDe(inst)})` }} aria-hidden="true" />{" "}
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold leading-tight text-foreground dark:text-white">{inst.name}</span>{" "}
                <span className="mt-1.5 block"><Badge etat={etats?.[inst.id]} clair /></span>
              </span>{" "}
              <ChevronRight size={20} className="shrink-0 text-muted-foreground transition group-active:translate-x-0.5" />
            </button>
          </li>
        ))}
      </ul>{" "}

      {/* ÉCRAN LARGE : défilement automatique, mis en pause au survol. */}
      <div className="relative hidden w-full overflow-hidden md:block">
        <div className="pointer-events-none absolute top-0 left-0 z-10 h-full w-16 bg-gradient-to-r from-background to-transparent" />{" "}
        <div className="pointer-events-none absolute top-0 right-0 z-10 h-full w-16 bg-gradient-to-l from-background to-transparent" />{" "}
        <Marquee className="[--gap:1.5rem]" pauseOnHover>
          {INSTITUTIONS.map((inst, index) => (
            <div key={inst.id} className="w-[380px] shrink-0">
              <InstitutionCard inst={inst} index={index} etat={etats?.[inst.id]} onClick={() => choisir(inst)} />{" "}
            </div>
          ))}
        </Marquee>
      </div>{" "}

      {/* ── FENÊTRE DE DÉTAIL ── */}
      <AnimatePresence mode="wait">
        {selectedInst && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4 md:p-8"
            role="dialog" aria-modal="true" aria-label={`${selectedInst.name} : programme du jour`}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => choisir(null)}
              className="fixed inset-0"
            />{" "}

            <motion.div
              key={selectedInst.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              /* Balayage horizontal (mobile) : glisser pour passer d'une institution à l'autre. */
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              dragMomentum={false}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -60 || info.velocity.x < -450) handleNext();
                else if (info.offset.x > 60 || info.velocity.x > 450) handlePrev();
              }}
              className="relative w-full max-w-5xl touch-pan-y"
            >
              {/* Flèches d'écran large : à l'extérieur de la fenêtre. Sur téléphone elles
                  vivent dans l'en-tête de la fenêtre (elles recouvraient le texte). */}
              <div className="absolute inset-y-0 -left-20 z-50 hidden items-center md:flex">
                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} aria-label="Institution précédente"
                  className="rounded-full bg-slate-900 p-4 text-white shadow-2xl ring-1 ring-white/25 transition-all hover:bg-rose-500">
                  <ChevronLeft className="h-6 w-6" />
                </button>
              </div>{" "}
              <div className="absolute inset-y-0 -right-20 z-50 hidden items-center md:flex">
                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} aria-label="Institution suivante"
                  className="rounded-full bg-slate-900 p-4 text-white shadow-2xl ring-1 ring-white/25 transition-all hover:bg-rose-500">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>{" "}

              <div className="relative flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-background shadow-2xl sm:max-h-[85vh] sm:rounded-[2.5rem] md:flex-row">

                <button
                  ref={fermer}
                  onClick={() => choisir(null)}
                  aria-label="Fermer"
                  className="absolute right-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/60 text-white ring-1 ring-white/30 backdrop-blur-md transition hover:bg-amber-500 md:right-6 md:top-6 md:bg-slate-100 md:text-foreground md:ring-border md:dark:bg-slate-800"
                >
                  <X className="h-6 w-6" />
                </button>{" "}

                {/* En-tête image : 160 px sur téléphone (le texte avait la moitié de l'écran). */}
                <div className="relative h-40 w-full shrink-0 overflow-hidden md:h-auto md:min-h-full md:w-2/5">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageDe(selectedInst)})` }} />{" "}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/45 to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/10" />{" "}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 md:bottom-8 md:left-8 md:right-8">
                    <div>
                      <div className="mb-2 hidden h-12 w-12 items-center justify-center rounded-xl bg-amber-500 shadow-xl md:flex">
                        <Landmark className="h-6 w-6 text-white" />
                      </div>{" "}
                      <h3 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white md:text-5xl">{selectedInst.name}</h3>{" "}
                      <div className="mt-2 h-1 w-16 rounded-full bg-amber-500 md:mt-4 md:w-20" />
                    </div>{" "}
                    {/* Navigation mobile : précédent · position · suivant. */}
                    <div className="flex shrink-0 items-center gap-1.5 md:hidden">
                      <button onClick={handlePrev} aria-label="Institution précédente" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 text-white ring-1 ring-white/30 backdrop-blur-md">
                        <ChevronLeft size={20} />
                      </button>{" "}
                      <span className="px-1 text-xs font-bold tabular-nums text-white">{indexCourant + 1}/{INSTITUTIONS.length}</span>{" "}
                      <button onClick={handleNext} aria-label="Institution suivante" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 text-white ring-1 ring-white/30 backdrop-blur-md">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>{" "}

                {/* Contenu */}
                <div className="custom-scrollbar-blue flex-1 overflow-y-auto overscroll-contain bg-background p-5 pb-8 md:p-12">
                  <div className="mb-6 md:mb-10">
                    <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-6">
                      <span className="inline-block rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
                        Institution officielle
                      </span>{" "}
                      <Badge etat={etats?.[selectedInst.id]} clair />
                    </div>{" "}
                    {(dailySummary || selectedInst.summary) && (
                      <p className="text-pretty text-[15px] font-medium leading-relaxed text-slate-700 dark:text-slate-300 md:text-base">
                        {cleanDescription(dailySummary || selectedInst.summary)}
                      </p>
                    )}
                  </div>{" "}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <CalendarDays size={18} />
                      </div>{" "}
                      <h4 className="text-base font-bold text-foreground dark:text-white">Au programme aujourd&apos;hui</h4>
                    </div>{" "}

                    <div className="grid grid-cols-1 gap-3">
                      {loading ? (
                        Array(3).fill(0).map((_, i) => (
                          <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
                        ))
                      ) : events.length > 0 ? (
                        events.map((event, i) => {
                          const displayTime = extractTime(event.title) || event.time || "Jour";
                          const displayTitle = event.short_title || cleanTitle(event.title);
                          const displayDescription = event.short_summary || cleanDescription(event.description);
                          return (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + i * 0.04 }}
                              onClick={() => setSelectedEvent(event)}
                              className="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-3.5 text-left transition-all hover:border-blue-200 hover:shadow-md dark:hover:border-blue-500/50"
                            >
                              <div className="flex h-12 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/20 dark:text-blue-300">
                                <span className="text-xs font-black leading-none">{displayTime}</span>
                              </div>{" "}
                              <div className="min-w-0 flex-1">
                                <span className="mb-0.5 block text-[15px] font-bold leading-snug text-foreground dark:text-white">{displayTitle}</span>{" "}
                                {displayDescription && (
                                  <span className="line-clamp-2 text-[13px] leading-snug text-muted-foreground dark:text-slate-400">{displayDescription}</span>
                                )}
                              </div>{" "}
                              <ChevronRight size={18} className="shrink-0 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-blue-500 dark:text-slate-500" />
                            </motion.button>
                          );
                        })
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-muted-foreground dark:bg-slate-800 dark:text-slate-400">
                              <Landmark size={20} />
                            </div>{" "}
                            <div className="flex-1">
                              <p className="text-[15px] font-bold text-foreground dark:text-white">
                                {selectedInst.id === "gouvernement" ? "Aucune activité publique prévue" : "Aucune séance prévue aujourd'hui"}
                              </p>{" "}
                              <p className="mt-0.5 text-[13px] text-muted-foreground dark:text-slate-400">
                                {selectedInst.id === "gouvernement"
                                  ? "L'agenda de l'exécutif ne mentionne pas de rendez-vous public pour ce jour."
                                  : "Le calendrier de l'institution ne prévoit pas d'activité publique ce jour."}
                              </p>
                            </div>
                          </div>{" "}

                          <div className="grid grid-cols-2 gap-3">
                            <Link href={`/institutions/${selectedInst.id}`} className="group relative overflow-hidden rounded-2xl bg-blue-600 p-4 text-white shadow-lg shadow-blue-500/20 md:rounded-[2rem] md:p-8">
                              <Landmark className="absolute -bottom-5 -right-5 h-24 w-24 rotate-12 text-white/10" />{" "}
                              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100">Guide pédagogique</p>{" "}
                              <p className="mt-1 text-lg font-bold leading-tight md:text-2xl">Comprendre {selectedInst.shortName}</p>{" "}
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold">Découvrir <ChevronRight size={14} /></span>
                            </Link>{" "}
                            <Link href="/calendrier" className="group relative overflow-hidden rounded-2xl bg-slate-900 p-4 text-white shadow-lg shadow-slate-900/20 md:rounded-[2rem] md:p-8">
                              <CalendarDays className="absolute -bottom-5 -right-5 h-24 w-24 rotate-12 text-white/10" />{" "}
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Agenda complet</p>{" "}
                              <p className="mt-1 text-lg font-bold leading-tight md:text-2xl">Prochaines séances</p>{" "}
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold">Calendrier <ChevronRight size={14} /></span>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>{" "}

                  {selectedInst.directoryUrl && (
                    <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                      <span className="text-sm font-bold text-muted-foreground">{selectedInst.memberCount} membres</span>{" "}
                      <Link href={selectedInst.directoryUrl} className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400">
                        Voir l&apos;annuaire <ChevronRight size={16} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>{" "}

            {/* --- Détail d'un événement --- */}
            <AnimatePresence>
              {selectedEvent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 backdrop-blur-md sm:items-center sm:p-4"
                  onClick={() => setSelectedEvent(null)}
                  role="dialog" aria-modal="true" aria-label="Détail de l'événement"
                >
                  <motion.div
                    initial={{ y: 24 }}
                    animate={{ y: 0 }}
                    exit={{ y: 24 }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-card shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-[2rem]"
                  >
                    <div className="flex items-center justify-between gap-3 px-5 pt-5 md:px-10 md:pt-10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <Clock size={20} />
                        </div>{" "}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Horaire prévu</p>{" "}
                          <p className="font-bold text-foreground dark:text-white">{extractTime(selectedEvent.title) || selectedEvent.time || "Non spécifié"}</p>
                        </div>
                      </div>{" "}
                      <button onClick={() => setSelectedEvent(null)} aria-label="Fermer le détail"
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-muted-foreground transition-all hover:bg-rose-500 hover:text-white dark:bg-slate-800 dark:text-slate-400">
                        <X size={20} />
                      </button>
                    </div>{" "}

                    <div className="overflow-y-auto overscroll-contain px-5 pb-6 pt-4 md:px-10 md:pb-10">
                      <h4 className="mb-5 text-xl font-bold leading-snug text-foreground dark:text-white md:text-3xl">{cleanTitle(selectedEvent.title)}</h4>{" "}
                      {selectedEvent.short_summary ? (
                        <div>
                          <p className="text-[17px] font-semibold leading-relaxed text-foreground dark:text-white">{selectedEvent.short_summary}</p>{" "}
                          <details className="group mt-6">
                            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-blue-500">
                              <ChevronRight size={14} className="transition-transform group-open:rotate-90" /> Voir le texte original
                            </summary>{" "}
                            <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-border bg-muted p-4 text-sm leading-relaxed text-muted-foreground dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                              {cleanDescription(selectedEvent.description) || "Aucune information supplémentaire."}
                            </div>
                          </details>
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Détails de l&apos;événement</p>{" "}
                          <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-700 dark:text-slate-300">
                            {cleanDescription(selectedEvent.description) || "Aucune description détaillée disponible."}
                          </div>
                        </>
                      )}

                      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-5 dark:border-slate-800">
                        {selectedEvent.source_url && !/\/agenda\/?$/.test(selectedEvent.source_url) ? (
                          <a href={selectedEvent.source_url} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-bold text-blue-700 hover:underline dark:text-blue-300">
                            Page officielle ↗
                          </a>
                        ) : <span />}{" "}
                        <button onClick={() => setSelectedEvent(null)}
                          className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-600 dark:bg-white dark:text-slate-900">
                          Retour
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
