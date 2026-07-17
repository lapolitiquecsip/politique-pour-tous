"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Vote } from "lucide-react";
import { api } from "@/lib/api";
import { BallotBox } from "./BallotVote";

type Notif = {
  id: string; type: string; title: string; detail: string | null;
  position: string | null; event_at: string | null; read: boolean; created_at: string;
};

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Fil de notifications de l'utilisateur premium : les votes solennels de ses élus suivis.
 * L'ouverture marque les notifications comme lues, façon boîte de réception.
 */
export default function NotificationsFeed({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [list, count] = await Promise.all([
          api.getNotifications(userId, 30),
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

  const markAllRead = async () => {
    if (unread === 0) return;
    setUnread(0);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.markNotificationsRead(userId); } catch { /* silencieux : cosmétique */ }
  };

  if (loading) {
    return <div className="h-24 rounded-[2rem] bg-slate-100 animate-pulse" />;
  }
  if (items.length === 0) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
          <Bell size={20} />
        </div>
        <div>
          <p className="font-bold text-slate-900">Aucune notification pour l'instant</p>
          <p className="text-xs text-slate-500">Suivez des élus : vous serez prévenu ici à chaque vote important.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm">Activité de vos élus</h3>
            <p className="text-[11px] text-slate-500">{unread > 0 ? `${unread} nouvelle${unread > 1 ? "s" : ""}` : "À jour"}</p>
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-amber-300 hover:text-amber-600"
          >
            <Check size={12} /> Tout marquer lu
          </button>
        )}
      </div>

      <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
        {items.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-4 transition ${n.read ? "" : "bg-amber-50/40"}`}>
            <div className="mt-0.5 shrink-0">
              {n.type === "vote" ? <BallotBox vote={n.position || "ABSTENTION"} size={30} /> : <Vote size={20} className="text-slate-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{n.detail}</p>
              <p className="mt-0.5 text-xs leading-snug text-slate-600 line-clamp-2">« {n.title} »</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{fmtDate(n.event_at || n.created_at)}</p>
            </div>
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}
