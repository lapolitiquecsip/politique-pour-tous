"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Département et région devinés à partir de la ville et du code postal (geo.api.gouv.fr,
 * API officielle et gratuite) : le membre saisit sa ville ou son code postal, le reste se
 * remplit. Quand un code postal couvre plusieurs communes, ou qu'un nom en désigne plusieurs
 * (Saint-Denis), les propositions s'affichent : un clic, et tout est rempli.
 */
export type Commune = { nom: string; codesPostaux: string[]; codeDep: string; nomDep: string; region: string };

const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const CHAMPS = "fields=nom,codesPostaux,departement,region&format=json";
type CommuneApi = { nom: string; codesPostaux?: string[]; departement?: { code: string; nom: string }; region?: { nom: string } };
const versCommune = (c: CommuneApi): Commune => ({ nom: c.nom, codesPostaux: c.codesPostaux || [], codeDep: c.departement?.code || "", nomDep: c.departement?.nom || "", region: c.region?.nom || "" });

export function useCommuneAuto(ville: string, codePostal: string, onTrouve: (c: Commune) => void) {
  const [propositions, setPropositions] = useState<Commune[]>([]);
  const rappel = useRef(onTrouve);
  useEffect(() => { rappel.current = onTrouve; });

  useEffect(() => {
    const cp = codePostal.replace(/\D/g, "");
    const v = plat(ville);
    if (cp.length !== 5 && v.length < 3) return;
    const stop = new AbortController();
    const minuterie = setTimeout(async () => {
      try {
        const url = cp.length === 5
          ? `https://geo.api.gouv.fr/communes?codePostal=${cp}&${CHAMPS}`
          : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(ville.trim())}&boost=population&limit=6&${CHAMPS}`;
        const liste: Commune[] = ((await (await fetch(url, { signal: stop.signal })).json()) || []).map(versCommune);
        // Par code postal : la commune nommée, ou la seule ; par nom : les communes de ce nom exact.
        const exactes = liste.filter(c => plat(c.nom) === v);
        const trouvee = cp.length === 5 ? (exactes[0] ?? (liste.length === 1 ? liste[0] : null)) : (exactes.length === 1 ? exactes[0] : null);
        if (trouvee) { setPropositions([]); rappel.current(trouvee); }
        else setPropositions(cp.length === 5 ? liste : exactes.length ? exactes : liste.slice(0, 4));
      } catch { /* réseau indisponible : saisie manuelle, comme avant */ }
    }, 350);
    return () => { clearTimeout(minuterie); stop.abort(); };
  }, [ville, codePostal]);

  // Champs vidés : plus de propositions (sans réécrire l'état dans l'effet).
  const actif = codePostal.replace(/\D/g, "").length === 5 || plat(ville).length >= 3;
  return { propositions: actif ? propositions : [], choisir: (c: Commune) => { setPropositions([]); rappel.current(c); } };
}

/** Les communes possibles, à choisir d'un clic (code postal partagé, homonymes). */
export function PropositionsCommune({ propositions, choisir }: { propositions: Commune[]; choisir: (c: Commune) => void }) {
  if (!propositions.length) return null;
  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-[11px] font-bold text-white/60">Quelle commune ?</p>{" "}
      <div className="flex flex-wrap gap-1.5">
        {propositions.map(c => (
          <button key={`${c.nom}${c.codeDep}`} type="button" onClick={() => choisir(c)}
            className="min-h-[34px] rounded-full bg-white/10 px-3 text-[12px] font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20">
            {c.nom} <span className="font-normal text-white/55">({c.codeDep})</span>{" "}
          </button>
        ))}
      </div>
    </div>
  );
}
