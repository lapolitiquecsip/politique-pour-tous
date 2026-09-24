"use client";

import { useEffect, useState } from "react";

/**
 * Les tracés des régions, chargés seulement quand on en a besoin.
 *
 * Le fichier regionPaths.ts pèse un méga-octet : plus que tout le reste d'une
 * page réunie. Importé en haut d'un fichier, il est téléchargé et analysé à
 * l'ouverture, même quand aucune région n'est affichée — et il ne sert qu'à
 * dessiner une silhouette décorative derrière une carte. C'était, à lui seul,
 * la moitié du poids de l'espace Pro et du tableau de bord.
 *
 * Le crochet le va chercher après le premier rendu, et une seule fois pour
 * toute l'application : le cache et la promesse vivent au niveau du module, si
 * bien que dix cartes affichées ensemble ne déclenchent qu'un seul import.
 *
 * Passez `actif` à faux quand la page n'affiche aucune région : rien ne part.
 */
type Traces = Record<string, string>;

let cache: Traces | null = null;
let enCours: Promise<Traces> | null = null;

export function useRegionPaths(actif = true): Traces {
  const [traces, setTraces] = useState<Traces>(() => cache ?? {});

  useEffect(() => {
    if (!actif || cache) return;
    let vivant = true;
    if (!enCours) {
      enCours = import("@/lib/data/regionPaths").then(m => {
        cache = m.regionPaths;
        return cache;
      });
    }
    enCours
      .then(t => { if (vivant) setTraces(t); })
      .catch(() => {
        // Ce n'est qu'un décor : la carte s'affichera sans silhouette. On remet
        // la promesse à zéro pour qu'un prochain montage puisse réessayer.
        enCours = null;
      });
    return () => { vivant = false; };
  }, [actif]);

  return traces;
}
