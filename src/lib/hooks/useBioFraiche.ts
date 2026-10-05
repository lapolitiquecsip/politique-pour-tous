"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Bio d'une fiche générée en statique, relue à l'ouverture.
 *
 * Les pages statiques ne sont reconstruites qu'au déploiement : sans cette relecture,
 * une controverse ajoutée par la veille n'apparaissait qu'au prochain envoi de code.
 * La bio du build s'affiche d'abord, la version du jour la remplace dès qu'elle arrive.
 */
export function useBioFraiche(table: "meps" | "senators" | "department_presidents", slug: string | undefined, initiale: any) {
  const [bio, setBio] = useState(initiale);
  useEffect(() => {
    if (!slug) return;
    let actif = true;
    supabase.from(table).select("bio").eq("slug", slug).maybeSingle()
      .then(({ data }) => { if (actif && data?.bio) setBio(data.bio); });
    return () => { actif = false; };
  }, [table, slug]);
  return bio;
}
