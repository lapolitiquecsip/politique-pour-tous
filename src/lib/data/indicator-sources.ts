// Provenance lisible des indicateurs territoriaux (table territory_indicators).
// Chaque chiffre du comparateur est affiché avec son producteur et son année :
// un chiffre brut sans origine paraît plus objectif qu'il ne l'est.

const PRODUCTEURS: [RegExp, string][] = [
  [/insee\.fr/, "INSEE"],
  [/static\.data\.gouv\.fr\/resources\/bases-statistiques-communale/, "SSMSI (Intérieur)"],
  [/data\.education\.gouv\.fr/, "Éducation nationale"],
  [/drees/, "DREES"],
  [/atmo-france/, "Atmo France"],
  [/georisques/, "Géorisques"],
  [/dvf|data-pipeline-open/, "DVF (Etalab)"],
  [/statistiques\.developpement-durable\.gouv\.fr/, "SDES (RPLS)"],
  [/data\.gouv\.fr/, "data.gouv.fr"],
];

export function sourceLabel(url?: string | null): string {
  if (!url) return "Source non précisée";
  for (const [motif, nom] of PRODUCTEURS) if (motif.test(url)) return nom;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Source non précisée"; }
}

export type Provenance = { reference_year?: number | null; source_urls?: string[] | null };

/** « INSEE · 2022 » — ou null quand le chiffre n'a pas de provenance connue. */
export function provenanceLine(p?: Provenance | null): string | null {
  if (!p) return null;
  const source = sourceLabel(p.source_urls?.[0]);
  return p.reference_year ? `${source} · ${p.reference_year}` : source;
}
