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
  const [demande, setDemande] = useState(false);   // accord RGPD affiché

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
  const sensible = kind === "parti" || kind === "candidat";
  const basculer = async () => {
    const avant = suivi;
    if (!avant && sensible && !(await api.consentementSuivis())) { setDemande(true); return; }
    setSuivi(!avant);
    try { if (avant) await api.retirerSuivi(kind, refId); else await api.ajouterSuivi(kind, refId, label); }
    catch { setSuivi(avant); }
  };
  if (demande) {
    return (
      <span className={`inline-flex max-w-md flex-col gap-2 rounded-2xl border border-fuchsia-400/40 bg-slate-950/90 p-3 text-left text-xs leading-relaxed text-white ${className}`}>
        Suivre un parti ou un candidat peut laisser deviner une opinion politique. Nous ne l&apos;utilisons que pour vous envoyer
        les informations qui les concernent, sans la partager ; vous pouvez retirer votre accord à tout moment depuis votre espace.
        <span className="flex gap-2">
          <button onClick={async () => { await api.donnerConsentementSuivis(); setDemande(false); setSuivi(true); await api.ajouterSuivi(kind, refId, label); }}
            className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest">J&apos;accepte et je suis</button>
          <button onClick={() => setDemande(false)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/70">Annuler</button>
        </span>
      </span>
    );
  }
  return (
    <button onClick={basculer} disabled={suivi === null} aria-pressed={!!suivi}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition ${suivi
        ? "bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white shadow-lg shadow-fuchsia-500/25"
        : "border border-border bg-card text-foreground hover:border-fuchsia-400"} ${className}`}>
      {suivi ? <><BellRing size={14} /> Suivi</> : <><BellPlus size={14} /> Suivre</>}
    </button>
  );
}
