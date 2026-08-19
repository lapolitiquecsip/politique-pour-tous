// Rémunérations officielles des élus — 100 % sourcé, calcul automatique.
//
// Députés & sénateurs : indemnité parlementaire (identique pour les deux), constante depuis
// janvier 2024. Source : Assemblée nationale / Sénat.
//
// Maires : indemnité de FONCTION = taux légal (barème CGCT art. L2123-23, par strate de
// population) × valeur mensuelle de l'indice brut terminal 1027 (4 110,52 € depuis janvier 2024).
// Calculée AUTOMATIQUEMENT à partir de la population de la commune (donnée RNE, tenue à jour) :
// elle se met donc à jour toute seule quand la population évolue. Le barème (taux + IB1027) ne
// change qu'en cas de réforme / revalorisation du point d'indice (rare) — millésime indiqué.
// C'est le MAXIMUM légal : le conseil municipal peut voter un montant inférieur.

export const PARLIAMENTARY_INDEMNITY = {
  gross: 7637.39,        // brut mensuel
  net: 5676.12,          // net avant impôt (indicatif)
  base: 5931.95,
  residence: 177.96,
  fonction: 1527.48,
  since: "janvier 2024",
  source: "Assemblée nationale & Sénat — indemnité parlementaire (base + résidence + fonction).",
  sourceUrl: "https://www.assemblee-nationale.fr/dyn/synthese/deputes-groupes-parlementaires/la-situation-materielle-du-depute",
};

// Valeur mensuelle de l'indice brut terminal 1027 (fonction publique) — depuis le 1er janvier 2024.
export const IB_1027_MONTHLY = 4110.52;
export const REMUNERATION_REFERENCE = "barème 2026 · IB 1027 depuis janv. 2024";

// Barème des maires : [population maximale de la strate, taux en % de l'IB 1027].
const MAYOR_SCALE: Array<[number, number]> = [
  [499, 25.5],
  [999, 40.3],
  [3499, 51.6],
  [9999, 55],
  [19999, 65],
  [49999, 90],
  [99999, 110],
  [Infinity, 145],
];

// Indemnité de fonction MAXIMALE (brute mensuelle) d'un maire selon la population.
export function mayorIndemnity(population?: number | null): { rate: number; gross: number } | null {
  if (population == null || !isFinite(population) || population < 0) return null;
  const rate = MAYOR_SCALE.find(([max]) => population <= max)![1];
  return { rate, gross: Math.round(rate / 100 * IB_1027_MONTHLY * 100) / 100 };
}

export const MAYOR_INDEMNITY_SOURCE = "Barème légal (CGCT art. L2123-23) × indice brut 1027 (4 110,52 €). Maximum légal — le conseil municipal peut voter moins.";
export const MAYOR_INDEMNITY_SOURCE_URL = "https://www.collectivites-locales.gouv.fr/connaitre-les-acteurs-et-les-institutions/elus-locaux/conditions-dexercice-des-mandats-locaux/indemnite-de-fonction";

// Formatage € brut/mois.
export const fmtEurMonth = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €/mois";
