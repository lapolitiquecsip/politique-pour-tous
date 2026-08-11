// Finances publiques & administration — DATA 100 % OFFICIELLE ET SOURCÉE.
// Le compteur de dette « en direct » n'est PAS un scraping d'un site tiers (impossible en export
// statique, et ces horloges sont elles-mêmes des extrapolations) : il EXTRAPOLE, seconde par
// seconde, à partir de la DERNIÈRE donnée officielle INSEE (dette fin 2025) et du déficit 2025.

// --- Base du compteur (dernière donnée officielle INSEE) ---------------------------------
export const DEBT_BASE_EUR = 3_460_500_000_000;      // dette publique fin 2025 (INSEE)
export const DEBT_BASE_DATE = "2025-12-31T00:00:00Z";
export const DEBT_ANNUAL_INCREASE_EUR = 152_500_000_000; // déficit public 2025 ≈ hausse annuelle (INSEE)
export const POPULATION = 68_600_000;                // population France (INSEE, 1er janv. 2026)
export const DEBT_RATIO_GDP = 115.6;                 // % du PIB, fin 2025 (INSEE)
export const DEBT_SOURCE = "INSEE — dette publique fin 2025 (3 460,5 Md€, 115,6 % du PIB) ; déficit 2025 (152,5 Md€). Compteur extrapolé à partir de ces données officielles.";
export const DEBT_SOURCE_URL = "https://www.insee.fr/fr/statistiques/8955019";

// Rythme d'augmentation par seconde (dérivé du déficit annuel officiel).
export const DEBT_PER_SECOND = DEBT_ANNUAL_INCREASE_EUR / (365.25 * 24 * 3600); // ≈ 4 831 €/s

// --- Hausse de la dette par président (points de PIB = mesure comparable) -----------------
// Source : INSEE (ratio dette/PIB en fin d'exercice). Le montant en € est indicatif (arrondi).
export const DEBT_BY_PRESIDENT = [
  { name: "Sarkozy", slug: "nicolas-sarkozy", years: "2007 → 2012", startPct: 64.5, endPct: 90.6, addedEur: 620_000_000_000, color: "#4ea1ff" },
  { name: "Hollande", slug: "francois-hollande", years: "2012 → 2017", startPct: 90.6, endPct: 98.5, addedEur: 425_000_000_000, color: "#f5b301" },
  { name: "Macron", slug: "emmanuel-macron", years: "2017 → 2025", startPct: 98.5, endPct: 115.6, addedEur: 1_200_000_000_000, color: "#e11d48" },
];
export const DEBT_BY_PRESIDENT_NOTE = "Hausse du ratio dette/PIB entre le début et la fin de mandat (source INSEE). Le quinquennat de Sarkozy et de Hollande couvre 5 ans ; la période Macron en couvre 8 (2017-2025). Les montants en euros sont indicatifs.";

// --- Dépenses publiques ------------------------------------------------------------------
export const PUBLIC_SPENDING = {
  ratioGdp: 57.2,                    // % du PIB (2025, INSEE) — parmi les plus élevés de l'UE
  approxEur: 1_713_000_000_000,      // ≈ 57,2 % d'un PIB ~2 994 Md€
  deficitEur: 152_500_000_000,       // déficit public 2025 (INSEE)
  source: "INSEE — comptes des administrations publiques 2025 (dépenses 57,2 % du PIB, déficit 152,5 Md€).",
  sourceUrl: "https://www.insee.fr/fr/statistiques/8997691",
};

// --- Taux d'emprunt de l'État à 10 ans — comparaison européenne (données réelles) ---------
// Source : Eurostat, taux d'intérêt à long terme (critère de Maastricht, obligations d'État 10 ans).
export const BORROWING_RATES = {
  month: "juin 2026",
  source: "Eurostat — taux d'intérêt à long terme (critère de convergence de Maastricht, obligations d'État à 10 ans).",
  sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/irt_lt_mcby_m/default/table",
  rows: [
    { label: "Allemagne", pct: 2.96 },
    { label: "Pays-Bas", pct: 3.08 },
    { label: "Zone euro", pct: 3.37, avg: true },
    { label: "Espagne", pct: 3.42 },
    { label: "Belgique", pct: 3.51 },
    { label: "France", pct: 3.68, self: true },
    { label: "Italie", pct: 3.73 },
  ] as { label: string; pct: number; avg?: boolean; self?: boolean }[],
};

// --- Postes de la dépense publique TOTALE (toutes administrations, COFOG) -----------------
// Source : Eurostat, dépenses des administrations publiques par fonction (COFOG), France 2024.
// = État + Sécurité sociale + collectivités (pas seulement le budget de l'État).
export const SPENDING_BREAKDOWN = {
  year: "2024",
  totalEur: 1_671_800_000_000,
  source: "Eurostat — dépenses des administrations publiques par fonction (COFOG), France 2024.",
  sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table",
  note: "Dépense publique TOTALE (État + Sécurité sociale + collectivités), pas seulement le budget du gouvernement. La « protection sociale » regroupe retraites, chômage, famille et dépendance.",
  items: [
    { label: "Protection sociale", sub: "retraites, chômage, famille, dépendance", eur: 693_000_000_000, color: "bg-rose-500" },
    { label: "Santé", sub: "hôpital, assurance maladie", eur: 261_200_000_000, color: "bg-emerald-500" },
    { label: "Services généraux", sub: "dont 58,9 Md€ d'intérêts de la dette", eur: 181_100_000_000, color: "bg-slate-500" },
    { label: "Affaires économiques", sub: "transports, énergie, soutien aux entreprises", eur: 166_100_000_000, color: "bg-amber-500" },
    { label: "Éducation", sub: "écoles, universités", eur: 148_600_000_000, color: "bg-blue-500" },
    { label: "Défense", sub: "armées", eur: 54_200_000_000, color: "bg-indigo-500" },
    { label: "Ordre & sécurité", sub: "police, gendarmerie, justice", eur: 52_100_000_000, color: "bg-purple-500" },
    { label: "Autres", sub: "logement, environnement, culture…", eur: 115_700_000_000, color: "bg-slate-300" },
  ] as { label: string; sub?: string; eur: number; color: string }[],
};

// --- Administration & fonction publique --------------------------------------------------
export const GOVERNANCE = [
  { label: "Agents publics", value: "5,9 millions", sub: "dans les 3 fonctions publiques (État, territoriale, hospitalière)", year: "fin 2024", source: "INSEE / DGAFP", url: "https://www.insee.fr/fr/statistiques/8732435" },
  { label: "Part de l'emploi public", value: "19,8 %", sub: "de l'emploi total en France — près d'1 emploi sur 5", year: "2024", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/8732435" },
];

// --- Emploi public — comparaison européenne (base OCDE homogène) --------------------------
// Source : OCDE, Government at a Glance 2025 — emploi des administrations publiques (S13) en %
// de l'emploi total. Base comparable entre pays (léger écart avec l'INSEE 19,8 %, qui compte
// les 3 fonctions publiques françaises). Dernières données comparables (2022-2023).
export const PUBLIC_EMPLOYMENT_EU = {
  year: "2023",
  source: "OCDE — Government at a Glance 2025 (emploi des administrations publiques en % de l'emploi total).",
  sourceUrl: "https://www.oecd.org/en/topics/government-at-a-glance.html",
  note: "Base OCDE, comparable entre pays (l'INSEE mesure 19,8 % pour la France, avec une définition un peu différente).",
  rows: [
    { label: "Norvège", pct: 30.1 },
    { label: "Suède", pct: 28.1 },
    { label: "Danemark", pct: 27.3 },
    { label: "France", pct: 20.7, self: true },
    { label: "Belgique", pct: 18.3 },
    { label: "Espagne", pct: 15.2 },
    { label: "Italie", pct: 13.7 },
    { label: "Pays-Bas", pct: 12.3 },
    { label: "Allemagne", pct: 11.5 },
  ] as { label: string; pct: number; self?: boolean }[],
};

// Affiché sur la fiche du Premier ministre (Matignon), pas sur le panneau finances.
export const PM_CABINET = { label: "Conseillers du Premier ministre", value: "≈ 50", sub: "cabinet de Matignon, encadré par le décret du 14 juin 2017 ; varie selon les gouvernements", year: "2025", source: "Arrêtés de composition (Légifrance)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051836957" };
