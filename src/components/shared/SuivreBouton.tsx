"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellPlus, BellRing, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Suivre un parti, un ministère, un candidat ou une commission (alertes Pro).
 * Les élus ont leur propre bouton (FollowButton) : leurs votes passent par une autre table.
 */
export default function SuivreBouton({ kind, refId, label, className = "" }: {
  kind: "parti" | "ministere" | "candidat" | "commission"; refId: string; label: string; className?: string;
}) {
  const { isPro, loading } = usePremium();
  const [suivi, setSuivi] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isPro) return;
    api.getSuivis().then(l => setSuivi(l.some(s => s.kind === kind && s.ref === refId))).catch(() => setSuivi(false));
  }, [isPro, kind, refId]);

  if (loading) return null;
  if (!isPro) {
    return (
      <Link href="/premium" className={`inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-fuchsia-700 transition hover:bg-fuchsia-500/20 dark:text-fuchsia-300 ${className}`}>
        <Lock size={13} /> Suivre · Pro
      </Link>
    );
  }
  const basculer = async () => {
    const avant = suivi;
    setSuivi(!avant);
    try { if (avant) await api.retirerSuivi(kind, refId); else await api.ajouterSuivi(kind, refId, label); }
    catch { setSuivi(avant); }
  };
  return (
    <button onClick={basculer} disabled={suivi === null} aria-pressed={!!suivi}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition ${suivi
        ? "bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white shadow-lg shadow-fuchsia-500/25"
        : "border border-border bg-card text-foreground hover:border-fuchsia-400"} ${className}`}>
      {suivi ? <><BellRing size={14} /> Suivi</> : <><BellPlus size={14} /> Suivre</>}
    </button>
  );
}
