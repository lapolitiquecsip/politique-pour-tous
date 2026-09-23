"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, Check, Vote, Newspaper, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { BallotBox } from "./BallotVote";
import { interestByCode } from "@/lib/data/interestDomains";

type Notif = {
  id: string; type: string; title: string; detail: string | null;
  position: string | null; domain?: string | null; url?: string | null; importance?: number | null;
  event_at: string | null; read: boolean; created_at: string;
};

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Fil de notifications de l'utilisateur premium : les votes solennels de ses élus suivis.
 * L'ouverture marque les notifications comme lues, façon boîte de réception.
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
      <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-white">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white/40">
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
       L'empilement vertical faisait scroller sans fin à l'intérieur d'un cadre qui
       scrollait déjà : deux barres imbriquées, que le doigt confond sur téléphone. Le
       rail se fait au pouce, dans le sens où l'on glisse naturellement. */
    <div className="relative overflow-hidden rounded-[2rem] border-2 border-fuchsia-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* La cloche : elle sonne tant qu'il reste du non-lu, et se tait ensuite. */}
        <div className="flex shrink-0 items-center gap-4 sm:w-52 sm:flex-col sm:items-start">
          <motion.div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/40 sm:h-20 sm:w-20"
            style={{ transformOrigin: "50% 10%" }}
            animate={reduce || unread === 0 ? undefined : { rotate: [0, -12, 10, -8, 6, -3, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          >
            <Bell size={30} className="text-white" fill={unread > 0 ? "currentColor" : "none"} />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black text-white ring-2 ring-slate-950">
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
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <Check size={12} /> Tout marquer lu
              </button>
            )}
          </div>
        </div>

        {/* Rail : une alerte par carte, on glisse sur le côté. Les marges négatives
            laissent les cartes filer jusqu'au bord de l'écran sur téléphone. */}
        <div className="-mx-5 min-w-0 flex-1 sm:mx-0">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] [touch-action:pan-x] sm:px-0">
            {items.map((n, i) => {
              const isVote = n.type === "vote";
              const dom = n.domain ? interestByCode(n.domain) : undefined;
              const Wrapper: any = n.url ? "a" : "div";
              const wrapperProps = n.url ? { href: n.url, target: "_blank", rel: "noopener noreferrer" } : {};
              return (
                <motion.div
                  key={n.id}
                  className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[290px]"
                  animate={{ opacity: n.read ? 0.5 : 1 }}
                  transition={{ duration: 0.4, delay: n.read ? Math.min(i, 12) * 0.04 : 0 }}
                >
                  <Wrapper {...wrapperProps}
                    className={`flex h-full flex-col rounded-2xl border p-4 transition ${
                      n.read ? "border-white/10 bg-white/[0.03]" : "border-fuchsia-400/25 bg-white/[0.07]"
                    } ${n.url ? "cursor-pointer hover:border-fuchsia-400/60" : ""}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {isVote
                        ? <BallotBox vote={n.position || "ABSTENTION"} size={26} />
                        : <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: (dom?.color || "#64748b") + "33", color: dom?.color || "#cbd5e1" }}><Newspaper size={14} /></span>}
                      {!n.read && <span className="h-2 w-2 rounded-full bg-fuchsia-400" />}
                      {n.read && <Check size={13} className="text-emerald-400/70" />}
                    </div>

                    {isVote ? (
                      <>
                        <p className="text-[13px] font-bold leading-snug text-white">{n.detail}</p>
                        <p className="mt-1 text-[12px] leading-snug text-white/60 line-clamp-3">« {n.title} »</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-bold leading-snug text-white line-clamp-3">{n.title}</p>
                        {n.detail && <p className="mt-1 text-[12px] leading-snug text-white/60 line-clamp-3">{n.detail}</p>}
                      </>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      {dom && <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: dom.color }}>{dom.label}</span>}
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/35">{fmtDate(n.event_at || n.created_at)}</span>
                      {n.url && <ExternalLink size={11} className="text-white/35" />}
                    </div>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>

          <p className="px-5 pt-1 text-[10px] font-black uppercase tracking-widest text-white/25 sm:hidden">
            Glissez pour voir les suivantes →
          </p>
        </div>
      </div>
    </div>
  );
}