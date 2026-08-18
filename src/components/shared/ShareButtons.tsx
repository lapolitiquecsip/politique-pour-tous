"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

// Boutons de partage d'une fiche — pensés pour la communication (partage du lien).
// Partage natif sur mobile (navigator.share) + X / Facebook / WhatsApp + copie du lien.
// Aucune dépendance externe, aucun script tiers (compatible export statique + CSP).

export default function ShareButtons({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `${title} · La Politique C'est Simple`;

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: text, url }); } catch { /* annulé */ }
    } else {
      copy();
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard bloqué */ }
  };

  const e = encodeURIComponent;
  const links: { label: string; href: string; bg: string }[] = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`, bg: "bg-black hover:bg-slate-800" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`, bg: "bg-[#1877F2] hover:brightness-110" },
    { label: "WhatsApp", href: `https://wa.me/?text=${e(text + " " + url)}`, bg: "bg-[#25D366] hover:brightness-110" },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button onClick={nativeShare}
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
        <Share2 size={13} /> Partager
      </button>
      {links.map(l => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`Partager sur ${l.label}`}
          className={`inline-flex h-8 items-center rounded-full px-3 text-[10px] font-black uppercase tracking-widest text-white transition ${l.bg}`}>
          {l.label}
        </a>
      ))}
      <button onClick={copy} aria-label="Copier le lien"
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-300 px-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-300">
        {copied ? <><Check size={13} className="text-emerald-500" /> Copié</> : <><Link2 size={13} /> Lien</>}
      </button>
    </div>
  );
}
