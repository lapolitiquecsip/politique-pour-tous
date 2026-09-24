"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, CalendarDays, Play, ChevronDown, Loader2, Lock, ExternalLink, Vote } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Les débats et votes des primaires.
 *
 * Le calendrier est annoncé à la main — aucune API ne publie « LR débattra le 12
 * novembre sur LCI » — et la retransmission est retrouvée toute seule après coup.
 * Un rendez-vous à venir s'affiche donc sans vidéo, ce qui est normal et non une
 * donnée manquante : l'interface le dit plutôt que de laisser un trou.
 *
 * Le résumé écrit est réservé à l'offre Pro. Il n'existe que si l'on a pu obtenir
 * le son par une voie légitime : les conditions de YouTube interdisent d'extraire
 * l'audio de ses vidéos, et nous ne le faisons pas.
 */

type Evenement = {
  id: string;
  primaire: string;
  camp: string | null;
  type: "debat" | "vote";
  titre: string;
  date_prevue: string;
  heure: string | null;
  diffuseur: string | null;
  participants: string[] | null;
  statut: "a_venir" | "diffuse" | "annule";
  video_id: string | null;
  video_url: string | null;
  video_title: string | null;
  resume: string | null;
  source_url: string | null;
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function jourLong(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const semaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getUTCDay()];
  return `${semaine} ${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}`;
}

/** Teinte par camp. La couleur ne porte jamais seule : le camp est toujours écrit. */
const CAMPS: Record<string, string> = {
  droite: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  gauche: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  ecologistes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  centre: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

function Ligne({ e, isPro, noms }: { e: Evenement; isPro: boolean; noms: Map<string, string> }) {
  const [ouvert, setOuvert] = useState(false);
  const passe = e.statut === "diffuse";
  const Icone = e.type === "vote" ? Vote : Mic2;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card transition hover:shadow-lg">
      <button
        onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${CAMPS[e.camp ?? ""] ?? "bg-muted text-muted-foreground"}`}>
          <Icone size={18} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-widest">
            <span className={`rounded-full px-2 py-0.5 ${CAMPS[e.camp ?? ""] ?? "bg-muted text-muted-foreground"}`}>{e.primaire}</span>
            <span className="text-muted-foreground">{jourLong(e.date_prevue)}{e.heure ? ` · ${e.heure}` : ""}</span>
            {!passe && (
              <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300">
                À venir
              </span>
            )}
          </span>
          <span className="mt-1 block text-sm font-bold leading-snug text-foreground">{e.titre}</span>
          {e.diffuseur && <span className="mt-0.5 block text-[11px] text-muted-foreground">Sur {e.diffuseur}</span>}
          {!!e.participants?.length && (
            <span className="mt-1.5 block text-[11px] text-muted-foreground">
              Avec {e.participants.map(s => noms.get(s) ?? s).join(", ")}
            </span>
          )}
        </span>

        {e.video_id && (
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white sm:inline-flex">
            <Play size={11} fill="currentColor" /> Revoir
          </span>
        )}
        <ChevronDown size={18} className={`mt-1 shrink-0 text-muted-foreground transition-transform ${ouvert ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-4">
              {e.video_id ? (
                <div className="overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "16 / 9" }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${e.video_id}`}
                    title={e.video_title ?? e.titre}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="h-full w-full border-0"
                  />
                </div>
              ) : passe ? (
                <p className="text-sm italic text-muted-foreground">
                  La retransmission n&apos;a pas encore été retrouvée. Elle s&apos;affichera ici dès
                  qu&apos;elle sera mise en ligne.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays size={15} /> Rendez-vous le {jourLong(e.date_prevue)}
                  {e.heure ? ` à ${e.heure}` : ""}{e.diffuseur ? `, sur ${e.diffuseur}` : ""}.
                </p>
              )}

              {/* Résumé écrit : réservé à l'offre Pro. */}
              {passe && (
                <div className="mt-4">
                  {!isPro ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10">
                      <Lock size={16} className="shrink-0 text-fuchsia-600 dark:text-fuchsia-300" />
                      <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
                        Le compte rendu écrit de ce débat est réservé à l&apos;abonnement Pro.
                      </p>
                      <Link href="/premium"
                        className="shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                        Découvrir le Pro
                      </Link>
                    </div>
                  ) : e.resume ? (
                    <div className="rounded-2xl bg-muted p-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">Ce qui s&apos;est dit</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{e.resume}</p>
                    </div>
                  ) : (
                    <p className="text-[13px] italic leading-snug text-muted-foreground">
                      Aucun compte rendu écrit pour ce débat : il n&apos;est disponible qu&apos;en vidéo,
                      et les conditions d&apos;utilisation de la plateforme de diffusion interdisent
                      d&apos;en extraire le son pour le transcrire.
                    </p>
                  )}
                </div>
              )}

              {e.source_url && (
                <a href={e.source_url} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  <ExternalLink size={12} /> Annonce officielle
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PrimaryDebates({ candidateSlug }: { candidateSlug?: string }) {
  const { isPro } = usePremium();
  const [events, setEvents] = useState<Evenement[] | null>(null);
  const [noms, setNoms] = useState<Map<string, string>>(new Map());
  const [primaire, setPrimaire] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    api.getPrimaryEvents(40)
      .then(r => { if (vivant) setEvents(r as Evenement[]); })
      .catch(() => { if (vivant) setEvents([]); });
    api.getCandidates()
      .then((r: any[]) => { if (vivant) setNoms(new Map(r.map(c => [c.slug, c.full_name]))); })
      .catch(() => {});
    return () => { vivant = false; };
  }, []);

  // Sur une fiche de candidat, on ne garde que ses rendez-vous.
  const siens = useMemo(
    () => (events ?? []).filter(e => !candidateSlug || (e.participants ?? []).includes(candidateSlug)),
    [events, candidateSlug],
  );
  const primaires = useMemo(() => [...new Set(siens.map(e => e.primaire))], [siens]);
  const visibles = primaire ? siens.filter(e => e.primaire === primaire) : siens;

  if (events === null) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-fuchsia-500" /></div>;
  }
  // Tant qu'aucun rendez-vous n'est annoncé, la rubrique s'efface.
  if (!siens.length) return null;

  const aVenir = siens.filter(e => e.statut === "a_venir").length;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-5 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg">
          <Mic2 size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-staatliches text-3xl uppercase tracking-tight text-foreground">
            {candidateSlug ? "Ses " : "Les "}<span className="text-fuchsia-600">débats de primaire</span>
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Débats et votes des primaires, avec la retransmission dès qu&apos;elle est en ligne.
            {aVenir > 0 && <strong className="font-bold text-foreground"> {aVenir} rendez-vous à venir.</strong>}
          </p>
        </div>
      </div>

      {!candidateSlug && primaires.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setPrimaire(null)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${primaire === null ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            Toutes
          </button>
          {primaires.map(p => (
            <button key={p} onClick={() => setPrimaire(p === primaire ? null : p)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${primaire === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {visibles.map(e => <Ligne key={e.id} e={e} isPro={isPro} noms={noms} />)}
      </div>
    </section>
  );
}
