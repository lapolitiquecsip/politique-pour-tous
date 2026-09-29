"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mic2, CalendarDays, Play, Loader2, Lock, ExternalLink, Vote, X } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import DragScroller from "@/components/ui/DragScroller";

/**
 * Les débats et votes des primaires.
 *
 * Le calendrier est annoncé à la main — aucune API ne publie « LR débattra le 12
 * novembre sur LCI » — et la retransmission est retrouvée toute seule après coup.
 * Un rendez-vous à venir s'affiche donc sans vidéo, ce qui est normal et non une
 * donnée manquante : l'interface le dit plutôt que de laisser un trou.
 *
 * MISE EN PAGE — les rendez-vous se parcourent à l'horizontale, d'un geste, au
 * lieu d'empiler des bandeaux sur toute la hauteur de la page. Le détail ne
 * s'ouvre donc plus DANS la carte : une carte qui se déplierait pour loger une
 * vidéo de seize neuvièmes ferait bondir la hauteur du rail et casserait le
 * défilement qu'on vient de lancer. Il s'ouvre SOUS le rail, à place fixe, et la
 * carte choisie reste visible et marquée.
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

/** Version courte pour la carte, où la place manque : « jeu. 1er oct. ». */
function jourCourt(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const semaine = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][d.getUTCDay()];
  const abrege = ["janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc."][+m[2] - 1];
  return `${semaine} ${+m[3] === 1 ? "1er" : +m[3]} ${abrege}`;
}

/**
 * Dans combien de temps, dit en français.
 *
 * « J‑10 » parle aux habitués des campagnes, pas au lecteur qui passe. On écrit
 * donc « aujourd'hui », « demain », « dans 3 jours », et la semaine au-delà.
 * Le calcul se fait en jours de calendrier, pas en heures : un débat ce soir à
 * 21 h est « aujourd'hui », même s'il reste moins de vingt-quatre heures.
 */
function dansCombien(iso: string): { texte: string; imminent: boolean } | null {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const cible = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const now = new Date();
  const aujourdhui = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const jours = Math.round((cible - aujourdhui) / 86400000);
  if (jours < 0) return null;
  if (jours === 0) return { texte: "aujourd'hui", imminent: true };
  if (jours === 1) return { texte: "demain", imminent: true };
  if (jours < 7) return { texte: `dans ${jours} jours`, imminent: jours <= 3 };
  const semaines = Math.round(jours / 7);
  return { texte: semaines <= 1 ? "dans une semaine" : `dans ${semaines} semaines`, imminent: false };
}

/** Teinte par camp. La couleur ne porte jamais seule : le camp est toujours écrit. */
const CAMPS: Record<string, string> = {
  droite: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  gauche: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  ecologistes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  centre: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

/** Un scrutin s'étale : « du vendredi 9 octobre 8h au samedi 10 octobre 20h »
 *  dit déjà le jour, et le faire précéder de la date le répéterait. */
const estIntervalle = (e: Evenement) => /^du\s/i.test(e.heure ?? "");

/* ─────────────────────────────── La carte ──────────────────────────────── */

function Carte({
  e, actif, onChoisir, noms,
}: { e: Evenement; actif: boolean; onChoisir: () => void; noms: Map<string, string> }) {
  const passe = e.statut === "diffuse";
  const vote = e.type === "vote";
  const Icone = vote ? Vote : Mic2;
  const quand = estIntervalle(e) ? String(e.heure) : `${jourCourt(e.date_prevue)}${e.heure ? ` · ${e.heure}` : ""}`;
  const compte = passe ? null : dansCombien(e.date_prevue);

  return (
    <button
      type="button"
      onClick={onChoisir}
      aria-pressed={actif}
      className={`flex w-[82vw] shrink-0 flex-col rounded-3xl border p-4 text-left transition sm:w-[22rem] ${
        actif
          ? "border-fuchsia-400 bg-fuchsia-50/60 shadow-lg dark:border-fuchsia-500/50 dark:bg-fuchsia-500/10"
          : passe
            ? "border-border bg-card hover:border-fuchsia-200 hover:shadow-md dark:hover:border-fuchsia-500/30"
            : "border-fuchsia-200 bg-card shadow-sm hover:border-fuchsia-300 hover:shadow-md dark:border-fuchsia-500/30"
      }`}
    >
      {/* Le « à venir » tenait dans une pastille pâle, perdue au milieu de trois
          autres étiquettes : c'est pourtant la seule information qui dit au
          lecteur s'il doit noter la date. Il prend désormais toute la largeur,
          en couleur pleine, et annonce l'échéance en clair. Le point qui bat est
          réservé à ce qui arrive sous trois jours — sinon il bat pour rien et
          on cesse de le voir. */}
      {!passe && (
        <span className="mb-3 -mt-0.5 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 py-1.5 text-white shadow-sm shadow-fuchsia-500/30">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
            {compte?.imminent && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
            )}
            À venir
          </span>
          {compte && (
            <span className="truncate text-[10px] font-black uppercase tracking-widest text-white/90">
              {compte.texte}
            </span>
          )}
        </span>
      )}

      <span className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${CAMPS[e.camp ?? ""] ?? "bg-muted text-muted-foreground"}`}>
          <Icone size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px] font-black uppercase tracking-widest">
            <span className={`rounded-full px-2 py-0.5 ${CAMPS[e.camp ?? ""] ?? "bg-muted text-muted-foreground"}`}>{e.primaire}</span>
          </span>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{quand}</span>
        </span>
      </span>

      {/* Deux lignes au plus : au-delà, les cartes n'ont plus la même hauteur et
          le rail se met à onduler d'une carte à l'autre. */}
      <span className="mt-2.5 line-clamp-2 block text-sm font-bold leading-snug text-foreground">{e.titre}</span>
      {e.diffuseur && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Sur {e.diffuseur}</span>}
      {!!e.participants?.length && (
        <span className="mt-1.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">
          Avec {e.participants.map(s => noms.get(s) ?? s).join(", ")}
        </span>
      )}

      <span className="mt-auto flex items-center gap-2 pt-3">
        {e.video_id ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
            <Play size={11} fill="currentColor" /> Revoir
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <CalendarDays size={11} /> {passe ? "Détails" : "Le rendez-vous"}
          </span>
        )}
        {actif && (
          <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-300">
            Affiché
          </span>
        )}
      </span>
    </button>
  );
}

/* ────────────────────────── Le détail, sous le rail ─────────────────────── */

function Detail({ e, isPro, onFermer }: { e: Evenement; isPro: boolean; onFermer: () => void }) {
  const passe = e.statut === "diffuse";
  const vote = e.type === "vote";

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {estIntervalle(e) ? e.heure : `${jourLong(e.date_prevue)}${e.heure ? ` · ${e.heure}` : ""}`}
          </p>
          <h3 className="mt-0.5 text-base font-bold leading-snug text-foreground">{e.titre}</h3>
        </div>
        <button
          type="button" onClick={onFermer} aria-label="Fermer le détail"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

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
          {vote
            ? "Aucune vidéo du dépouillement n’a encore été trouvée. Elle s’affichera ici dès qu’elle sera en ligne."
            : "La retransmission n’a pas encore été retrouvée. Elle s’affichera ici dès qu’elle sera mise en ligne."}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays size={15} />
          {estIntervalle(e)
            ? `Scrutin ouvert ${e.heure}, en ligne.`
            : `Rendez-vous le ${jourLong(e.date_prevue)}${e.heure ? ` à ${e.heure}` : ""}${e.diffuseur ? `, sur ${e.diffuseur}` : ""}.`}
        </p>
      )}

      {/* Résumé écrit : réservé à l'offre Pro, et propre aux débats — un scrutin
          n'a pas de compte rendu, il a un résultat. */}
      {passe && !vote && (
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
  );
}

/* ───────────────────────────────── Section ──────────────────────────────── */

export default function PrimaryDebates({ candidateSlug }: { candidateSlug?: string }) {
  const { isPro } = usePremium();
  const [events, setEvents] = useState<Evenement[] | null>(null);
  const [noms, setNoms] = useState<Map<string, string>>(new Map());
  const [primaire, setPrimaire] = useState<string | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null);

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
  //
  // L'ordre est celui d'un calendrier : le prochain rendez-vous en tête, du plus
  // proche au plus lointain, puis ce qui a déjà eu lieu du plus récent au plus
  // ancien. Tout trier par date décroissante placerait le second tour au-dessus
  // du premier, ce qui se lit à l'envers.
  const siens = useMemo(() => {
    const gardes = (events ?? []).filter(
      e => !candidateSlug || (e.participants ?? []).includes(candidateSlug),
    );
    const parDate = (a: Evenement, b: Evenement) => a.date_prevue.localeCompare(b.date_prevue);
    return [
      ...gardes.filter(e => e.statut === "a_venir").sort(parDate),
      ...gardes.filter(e => e.statut !== "a_venir").sort((a, b) => parDate(b, a)),
    ];
  }, [events, candidateSlug]);
  const primaires = useMemo(() => [...new Set(siens.map(e => e.primaire))], [siens]);
  const visibles = primaire ? siens.filter(e => e.primaire === primaire) : siens;
  // Le détail suit le filtre : garder ouvert un rendez-vous que le filtre vient
  // de masquer laisserait un panneau sans carte correspondante.
  const actif = visibles.find(e => e.id === choisi) ?? null;

  if (events === null) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-fuchsia-500" /></div>;
  }
  // Tant qu'aucun rendez-vous n'est annoncé, la rubrique s'efface.
  if (!siens.length) return null;

  const aVenir = siens.filter(e => e.statut === "a_venir").length;

  return (
    // Ancre visée par les débats de primaire du fil « Mes candidats suivis ».
    <section id="primaires" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10">
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

      <DragScroller ariaLabel="Débats et votes des primaires" className="gap-3 pb-2">
        {visibles.map(e => (
          <Carte
            key={e.id} e={e} noms={noms}
            actif={actif?.id === e.id}
            onChoisir={() => setChoisi(c => (c === e.id ? null : e.id))}
          />
        ))}
      </DragScroller>

      <AnimatePresence initial={false} mode="wait">
        {actif && (
          <motion.div
            key={actif.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-4"
          >
            <Detail e={actif} isPro={isPro} onFermer={() => setChoisi(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
