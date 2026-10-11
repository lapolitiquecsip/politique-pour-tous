// Issue des primaires : qui a gagné, qui est battu.
//
// Deux sources, dans cet ordre. Le bloc `resultat` de primaires.json porte les scores vérifiés
// à la main. Avant qu'il soit rempli, le cron qui suit les primaires lit la presse et inscrit
// le vainqueur dans le champ `resume` du vote (« VAINQUEUR_AUTO|slug|médias|url|titre ») : la
// page annonce alors le résultat le soir même, sans les scores, au lieu d'afficher encore un
// second tour « à venir ».

import calendrier from "@/lib/data/primaires.json";

export type ScorePrimaire = { slug: string; nom: string; parti?: string; pct: number; voix?: number };

export type ResultatPrimaire = {
  primaire: string;
  camp: string;
  vainqueur: string;
  perdants: string[];
  /** Absent tant que seuls les titres de presse sont connus. */
  detail?: {
    proclame_le: string;
    tour: string;
    scores: ScorePrimaire[];
    votants?: number;
    exprimes?: number;
    inscrits_environ?: number;
    contexte?: string;
    note?: string;
    sources: { titre: string; url: string }[];
  };
  /** Présent quand le vainqueur vient de la veille de presse. */
  presse?: { medias: number; url: string; titre: string };
};

type Primaire = { nom: string; camp: string; candidats: string[]; resultat?: any };
const PRIMAIRES = (calendrier as { primaires: Primaire[] }).primaires;

/** Résultats vérifiés, inscrits au calendrier. */
export const RESULTATS_VERIFIES: ResultatPrimaire[] = PRIMAIRES.filter(p => p.resultat).map(p => {
  const { vainqueur, ...detail } = p.resultat;
  return {
    primaire: p.nom, camp: p.camp, vainqueur,
    perdants: p.candidats.filter(s => s !== vainqueur),
    detail,
  };
});

/**
 * Tous les résultats connus : les vérifiés, puis ceux que la presse vient d'annoncer pour une
 * primaire qui n'en a pas encore.
 */
export function resultatsPrimaires(
  evenements: { primaire: string; type: string; resume: string | null }[] | null,
): ResultatPrimaire[] {
  const faits = new Set(RESULTATS_VERIFIES.map(r => r.primaire));
  const auto: ResultatPrimaire[] = [];
  for (const e of evenements ?? []) {
    if (e.type !== "vote" || !e.resume?.startsWith("VAINQUEUR_AUTO|") || faits.has(e.primaire)) continue;
    const [, slug, medias, url, ...titre] = e.resume.split("|");
    const p = PRIMAIRES.find(x => x.nom === e.primaire);
    if (!p || !p.candidats.includes(slug)) continue;
    faits.add(e.primaire);
    auto.push({
      primaire: p.nom, camp: p.camp, vainqueur: slug,
      perdants: p.candidats.filter(s => s !== slug),
      presse: { medias: Number(medias) || 0, url, titre: titre.join("|") },
    });
  }
  return [...RESULTATS_VERIFIES, ...auto];
}
