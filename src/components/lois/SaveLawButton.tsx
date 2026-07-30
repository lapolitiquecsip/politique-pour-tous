"use client";

import { useEffect, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

// Bouton « enregistrer ce texte législatif » — réservé aux membres premium. En overlay sur la
// carte (frère du lien cliquable, pas enfant : évite l'imbrication de boutons). Enregistre dans
// user_saved_items (type 'law') ; visible ensuite dans « Lois favorites » de l'espace premium.

// Cache partagé : on ne charge les favoris de l'utilisateur qu'UNE fois pour toutes les cartes.
let cache: { userId: string; ids: Set<string> } | null = null;
let inflight: Promise<Set<string>> | null = null;
function loadSavedLawIds(userId: string): Promise<Set<string>> {
  if (cache?.userId === userId) return Promise.resolve(cache.ids);
  if (!inflight) {
    inflight = api.getUserSavedItems(userId)
      .then((items: any[]) => {
        const ids = new Set(items.filter(i => i.item_type === "law").map(i => String(i.item_id)));
        cache = { userId, ids }; inflight = null; return ids;
      })
      .catch(() => { inflight = null; return new Set<string>(); });
  }
  return inflight;
}

export default function SaveLawButton({ itemId }: { itemId: string }) {
  const { isPremium, userId } = usePremium();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPremium || !userId || !itemId) return;
    let active = true;
    loadSavedLawIds(userId).then(ids => { if (active) setSaved(ids.has(String(itemId))); });
    return () => { active = false; };
  }, [isPremium, userId, itemId]);

  if (!isPremium || !userId) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();   // ne pas ouvrir la fiche en cliquant sur l'étoile
    if (busy) return;
    const next = !saved;
    setSaved(next); setBusy(true);
    try {
      if (next) { await api.saveItem(userId, String(itemId), "law"); cache?.ids.add(String(itemId)); }
      else { await api.unsaveItem(userId, String(itemId), "law"); cache?.ids.delete(String(itemId)); }
    } catch {
      setSaved(!next);   // échec réseau : on rétablit
    } finally { setBusy(false); }
  };

  return (
    <button
      onClick={toggle}
      title={saved ? "Retirer de mes favoris" : "Enregistrer ce texte"}
      aria-label={saved ? "Retirer de mes favoris" : "Enregistrer ce texte"}
      className={`absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition ${
        saved
          ? "border-amber-300 bg-amber-500 text-white shadow-amber-500/30"
          : "border-slate-200 bg-white/90 text-slate-400 hover:border-amber-300 hover:text-amber-500 dark:border-slate-700 dark:bg-slate-800/90"
      }`}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Bookmark size={15} className={saved ? "fill-current" : ""} />}
    </button>
  );
}
