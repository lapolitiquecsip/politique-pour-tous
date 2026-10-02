"use client";

import { useSyncExternalStore } from "react";

/** Droit d'opposition à la mesure d'audience : un réglage gardé dans ce navigateur. */
const CLE = "lpcs.sans-mesure";
const abonnes = new Set<() => void>();
const lire = () => { try { return window.localStorage.getItem(CLE) === "1"; } catch { return false; } };
const sAbonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };

export default function RefusMesure() {
  // null côté serveur (page pré-rendue) : le bouton n'apparaît qu'une fois le réglage lu.
  const refuse = useSyncExternalStore(sAbonner, lire, () => null);
  const basculer = () => {
    try {
      if (!refuse) window.localStorage.setItem(CLE, "1");
      else window.localStorage.removeItem(CLE);
    } catch { /* stockage indisponible */ }
    abonnes.forEach(f => f());
  };
  if (refuse === null) return null;
  return (
    <button onClick={basculer}
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted">
      {refuse ? "Mesure désactivée sur ce navigateur — la réactiver" : "Ne plus mesurer mes visites"}
    </button>
  );
}
