"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

// Bouton de partage UNIQUE. Au clic : partage natif du lien de la fiche (navigator.share sur
// mobile → l'utilisateur choisit lui-même l'appli) ; sinon copie du lien dans le presse-papier
// (avec retour visuel « Lien copié ! »). Aucun réseau social imposé, aucun script tiers.
export default function ShareButtons({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${title} · La Politique C'est Simple`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: text, url }); return; } catch { /* annulé → on tente la copie */ }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard bloqué */ }
  };

  return (
    <button
      onClick={share}
      aria-label="Partager cette fiche"
      className={`inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 ${className}`}
    >
      {copied ? <><Check size={14} className="text-emerald-500" /> Lien copié !</> : <><Share2 size={14} /> Partager</>}
    </button>
  );
}
