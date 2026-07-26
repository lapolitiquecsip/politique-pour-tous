"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Loader2, Lock } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";

// Bouton « Suivre » réutilisable (eurodéputés, sénateurs). Réservé aux abonnés premium ;
// suivre déclenche des notifications sur les votes de l'élu (générées côté serveur).
export default function FollowButton({
  kind, id, label,
}: {
  kind: "mep" | "senator";
  id: string | null | undefined;
  label: string; // ex. « cet eurodéputé », « ce sénateur »
}) {
  const { userId, isPremium } = usePremium();
  const [following, setFollowing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId || !id) { setChecking(false); return; }
    api.checkFollowing(userId, kind, String(id)).then(f => { if (active) { setFollowing(f); setChecking(false); } }).catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [userId, id, kind]);

  if (!id) return null;

  // Non-premium : invite à passer premium.
  if (!isPremium) {
    return (
      <Link href="/premium" className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-amber-600 transition hover:bg-amber-400/20">
        <Lock size={14} /> Suivre ({label}) · Premium
      </Link>
    );
  }

  const toggle = async () => {
    if (!userId) return;
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    try {
      if (kind === "mep") { prev ? await api.unfollowMep(userId, String(id)) : await api.followMep(userId, String(id)); }
      else { prev ? await api.unfollowSenator(userId, String(id)) : await api.followSenator(userId, String(id)); }
    } catch (e) { setFollowing(prev); }
    finally { setLoading(false); }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading || checking}
      className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-widest transition disabled:opacity-60 ${
        following
          ? "bg-sky-600 text-white shadow-lg shadow-sky-600/25 hover:bg-sky-700"
          : "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-600"
      }`}
    >
      {loading || checking ? <Loader2 size={14} className="animate-spin" /> : following ? <BellRing size={14} /> : <Bell size={14} />}
      {following ? "Suivi·e — notifications activées" : `Suivre ${label}`}
    </button>
  );
}
