"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, Check, Newspaper, ExternalLink, MapPin, Landmark, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { BallotBox } from "./BallotVote";
import { interestByCode } from "@/lib/data/interestDomains";
import DragScroller from "@/components/ui/DragScroller";

type Notif = {
  id: string; type: string; title: string; detail: string | null;
  position: string | null; domain?: string | null; url?: string | null; importance?: number | null;
  /** Commune, département ou région de l'actualité — sans lui, « la municipalité » ne dit pas laquelle. */
  place?: string | null;
  event_at: string | null; read: boolean; created_at: string;
  /** Pour un vote : l'élu qui a voté, joint par api.getNotifications. */
  elu?: { chambre: string; nom: string; parti?: string | null; couleur?: string | null; photos: string[]; href: string | null };
  /** Pour un vote : le NOM du texte voté (traduit en français pour le Parlement européen). */
  texte?: string | null;
  /** Pour un vote : ce que contient le texte, en une phrase. */
  resume?: string | null;
};

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Habillage d'un vote selon la position. Le vert, le rouge et le bleu disent le
 * sens du vote avant qu'on lise un mot ; le reste de la carte suit la couleur de
 * l'offre (dorée pour Premium, violette pour Pro).
 */
const POSITION: Record<string, { libelle: string; teinte: string; anneau: string; pastille: string }> = {
  POUR:       { libelle: "A voté pour",       teinte: "from-emerald-500/[0.16]", anneau: "ring-emerald-400/70", pastille: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30" },
  CONTRE:     { libelle: "A voté contre",     teinte: "from-rose-500/[0.16]",    anneau: "ring-rose-400/70",    pastille: "bg-rose-500/15 text-rose-200 ring-rose-400/30" },
  ABSTENTION: { libelle: "Abstention",        teinte: "from-sky-400/[0.12]",     anneau: "ring-sky-300/60",     pastille: "bg-sky-400/15 text-sky-200 ring-sky-300/30" },
  NON_VOTANT: { libelle: "N'a pas pris part", teinte: "from-slate-400/[0.10]",   anneau: "ring-slate-400/50",   pastille: "bg-white/10 text-white/70 ring-white/15" },
};

/**
 * Le portrait de l'élu, avec ses sources de repli : une photo officielle qui ne
 * répond pas laisse place à la suivante, puis aux initiales — jamais d'image cassée.
 */
function Portrait({ photos, nom, className }: { photos: string[]; nom: string; className: string }) {
  const [rang, setRang] = useState(0);
  const initiales = nom.split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0]?.toUpperCase()).join("");
  if (rang >= photos.length) {
    return (
      <span className={`flex items-center justify-center bg-gradient-to-br from-amber-400 to-yellow-600 text-lg font-black text-white ${className}`}>
        {initiales || "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- photos d'origines multiples (AN, Sénat, PE), servies telles quelles
    <img
      src={photos[rang]}
      alt={nom}
      draggable={false}
      loading="lazy"
      onError={() => setRang(r => r + 1)}
      className={`object-cover object-top ${className}`}
    />
  );
}

/**
 * La carte d'un vote. Elle se lit d'abord par QUI (le portrait), puis COMMENT (la
 * position, en couleur), puis SUR QUOI — et ouvre la fiche de l'élu directement
 * sur la fenêtre qui explique ce vote.
 */
function CarteVote({ n }: { n: Notif }) {
  const p = POSITION[String(n.position || "").toUpperCase()] ?? POSITION.ABSTENTION;
  const elu = n.elu;
  // D'abord le nom du texte voté, ENSUITE ce qu'il contient : « Ce texte vise
  // à… » ne veut rien dire tant que le texte n'a pas été nommé.
  const texte = n.texte || n.title;
  const resume = n.resume && n.resume !== texte ? n.resume : null;
  const contenu = (
    <>
      {/* Halo discret de la position, qui teinte le haut de la carte. */}
      <span aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${p.teinte} via-transparent to-transparent`} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white/75">
          <Landmark size={10} className="shrink-0 text-amber-300" />
          <span className="truncate">{elu?.chambre ?? "Vote"}</span>
        </span>
        {!n.read
          ? <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgb(var(--lueur-offre)/0.9)]" />
          : <Check size={13} className="shrink-0 text-emerald-400/70" />}
      </div>

      <div className="relative mt-3.5 flex items-center gap-3.5">
        <div className="relative shrink-0">
          {elu ? (
            <Portrait photos={elu.photos} nom={elu.nom} className={`h-16 w-16 rounded-2xl ring-2 ring-offset-2 ring-offset-slate-900 ${p.anneau}`} />
          ) : (
            <span className={`block h-16 w-16 rounded-2xl bg-white/10 ring-2 ring-offset-2 ring-offset-slate-900 ${p.anneau}`} />
          )}
          <span className="absolute -bottom-2 -right-2 rounded-lg bg-slate-900 p-0.5">
            <BallotBox vote={n.position || "ABSTENTION"} size={22} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black leading-tight text-white">{elu?.nom ?? n.detail}</p>
          {elu?.parti && (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/50">
              {elu.couleur && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: elu.couleur }} />}
              <span className="truncate">{elu.parti}</span>
            </p>
          )}
          <span className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ring-1 ring-inset ${p.pastille}`}>
            {p.libelle}
          </span>
        </div>
      </div>

      <p className="relative mt-3.5 text-[13px] font-bold leading-snug text-white line-clamp-2">{texte}</p>
      {resume && <p className="relative mt-1 text-[12px] leading-snug text-white/60 line-clamp-2">{resume}</p>}

      <div className="relative mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/35">{fmtDate(n.event_at || n.created_at)}</span>
        {elu?.href && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-300 transition-all group-hover:gap-1.5">
            Le vote expliqué <ArrowRight size={11} />
          </span>
        )}
      </div>
    </>
  );
  const classes = `group relative flex h-full select-none flex-col overflow-hidden rounded-2xl border bg-slate-900/80 p-4 transition ${
    n.read ? "border-white/10" : "border-amber-400/30 shadow-[0_8px_30px_rgb(var(--lueur-offre)/0.12)]"
  } ${elu?.href ? "hover:border-amber-400/70" : ""}`;
  return elu?.href
    ? <Link href={elu.href} draggable={false} className={classes}>{contenu}</Link>
    : <div className={classes}>{contenu}</div>;
}

/** La carte d'une actualité locale : le lieu d'abord, puis le fait. */
function CarteActu({ n }: { n: Notif }) {
  const dom = n.domain ? interestByCode(n.domain) : undefined;
  const classes = `flex h-full select-none flex-col rounded-2xl border p-4 transition ${
    n.read ? "border-white/10 bg-white/[0.03]" : "border-amber-400/25 bg-white/[0.07]"
  } ${n.url ? "hover:border-amber-400/60" : ""}`;
  const contenu = (
    <>
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: (dom?.color || "#64748b") + "33", color: dom?.color || "#cbd5e1" }}><Newspaper size={14} /></span>
        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
        {n.read && <Check size={13} className="shrink-0 text-emerald-400/70" />}
        {/* OÙ, avant QUOI : une alerte locale sans lieu ne se rattache à rien. */}
        {n.place && (
          <span className="ml-auto inline-flex min-w-0 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/85">
            <MapPin size={10} className="shrink-0 text-amber-300" />
            <span className="truncate">{n.place}</span>
          </span>
        )}
      </div>
      <p className="text-[13px] font-bold leading-snug text-white line-clamp-3">{n.title}</p>
      {n.detail && <p className="mt-1 text-[12px] leading-snug text-white/60 line-clamp-3">{n.detail}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        {dom && <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: dom.color }}>{dom.label}</span>}
        <span className="text-[10px] font-black uppercase tracking-widest text-white/35">{fmtDate(n.event_at || n.created_at)}</span>
        {n.url && <ExternalLink size={11} className="text-white/35" />}
      </div>
    </>
  );
  // draggable={false} : sans cela, la souris « attrape » le lien au lieu de faire glisser le rail.
  return n.url
    ? <a href={n.url} target="_blank" rel="noopener noreferrer" draggable={false} className={classes}>{contenu}</a>
    : <div className={classes}>{contenu}</div>;
}

/**
 * Fil d'alertes des abonnés : les votes des élus suivis, et l'actualité de leur
 * commune, département et région. L'ouverture marque les alertes comme lues,
 * façon boîte de réception.
 */
export default function NotificationsFeed({ userId }: { userId: string }) {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [list, count] = await Promise.all([
          api.getNotifications(userId, 50),
          api.getUnreadNotificationCount(userId),
        ]);
        if (!active) return;
        setItems(list as Notif[]);
        setUnread(count);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  // « Tout marquer lu » : les notifications restent visibles mais deviennent LUES → grisées et
  // estompées (« moins en valeur »), avec une animation en cascade. Le badge se remet à zéro.
  const markAllRead = async () => {
    if (unread === 0) return;
    setUnread(0);
    setItems(prev => prev.map(n => ({ ...n, read: true })));   // animation gérée par motion (voir plus bas)
    try { await api.markNotificationsRead(userId); } catch { /* silencieux : purement cosmétique */ }
  };

  if (loading) {
    return <div className="h-28 animate-pulse rounded-[2rem] bg-white/[0.06]" />;
  }
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-[2rem] border border-amber-400/20 bg-white/[0.04] p-6 text-white">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          <Bell size={24} />
        </div>
        <div className="min-w-0">
          <p className="font-bold">Aucune alerte pour l&apos;instant</p>
          <p className="mt-0.5 text-[12px] leading-snug text-white/50">Complétez votre profil (centres d&apos;intérêt, localisation) et suivez des élus : vos alertes personnalisées apparaîtront ici.</p>
        </div>
      </div>
    );
  }

  return (
    /* Cloche à gauche, alertes en rail horizontal à droite.
       Les couleurs sont celles de l'offre : écrites en doré (amber / yellow), elles
       basculent d'elles-mêmes au violet chez un abonné Pro, dont l'espace repeint
       cette palette (globals.css, [data-offre="pro"]). Le fil était auparavant
       violet pour tout le monde, Premium compris. */
    <div className="relative overflow-hidden rounded-[2rem] border-2 border-amber-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/70 p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* La cloche : elle sonne tant qu'il reste du non-lu, et se tait ensuite. */}
        <div className="flex shrink-0 items-center gap-4 sm:w-52 sm:flex-col sm:items-start">
          <motion.div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-[0_10px_30px_rgb(var(--lueur-offre)/0.45)] sm:h-20 sm:w-20"
            style={{ transformOrigin: "50% 10%" }}
            animate={reduce || unread === 0 ? undefined : { rotate: [0, -12, 10, -8, 6, -3, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          >
            <Bell size={30} className="text-white" fill={unread > 0 ? "currentColor" : "none"} />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-black text-white ring-2 ring-slate-950">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </motion.div>

          <div className="min-w-0">
            <h3 className="font-staatliches text-2xl uppercase leading-none tracking-tight">Mes alertes</h3>
            <p className="mt-1 text-[12px] text-white/55">
              {unread > 0 ? `${unread} nouvelle${unread > 1 ? "s" : ""}` : "Tout est lu"}
            </p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-200 transition hover:border-amber-400/70 hover:text-white"
              >
                <Check size={12} /> Tout marquer lu
              </button>
            )}
          </div>
        </div>

        {/* Rail : une alerte par carte, on glisse sur le côté — le même rail que
            partout ailleurs sur le site : défilement natif au doigt, glisser avec
            inertie à la souris, flèches sur grand écran. Les marges négatives
            laissent les cartes filer jusqu'au bord de l'écran sur téléphone. */}
        <div className="-mx-5 min-w-0 flex-1 sm:mx-0">
          <DragScroller ariaLabel="Mes alertes" sombre className="gap-3 px-5 pb-2 pt-0 sm:px-0 md:gap-3">
            {items.map((n, i) => (
              <motion.div
                key={n.id}
                className="w-[78vw] max-w-[320px] shrink-0 sm:w-[290px]"
                animate={{ opacity: n.read ? 0.55 : 1 }}
                transition={{ duration: 0.4, delay: n.read ? Math.min(i, 12) * 0.04 : 0 }}
              >
                {n.type === "vote" ? <CarteVote n={n} /> : <CarteActu n={n} />}
              </motion.div>
            ))}
          </DragScroller>

          <p className="px-5 pt-1 text-[10px] font-black uppercase tracking-widest text-white/25 sm:hidden">
            Glissez pour voir les suivantes →
          </p>
        </div>
      </div>
    </div>
  );
}
