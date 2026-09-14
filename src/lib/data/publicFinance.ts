// Finances publiques & administration — DATA 100 % OFFICIELLE ET SOURCÉE.
// Le compteur de dette « en direct » n'est PAS un scraping d'un site tiers (impossible en export
// statique, et ces horloges sont elles-mêmes des extrapolations) : il EXTRAPOLE, seconde par
// seconde, à partir de la DERNIÈRE donnée officielle INSEE (dette fin 2025) et du déficit 2025.

// Date de dernière vérification manuelle des chiffres annuels (dette, déficit, population,
// dépenses). Les taux d'emprunt à 10 ans, eux, se rafraîchissent seuls TOUS LES JOURS
// (cron CNBC + BCE → voir BORROWING_RATES plus bas). À mettre à jour à chaque revue INSEE.
export const FINANCE_LAST_VERIFIED = "août 2026";

// --- Base du compteur (dernière donnée officielle INSEE) ---------------------------------
export const DEBT_BASE_EUR = 3_460_500_000_000;      // dette publique fin 2025 (INSEE)
export const DEBT_BASE_DATE = "2025-12-31T00:00:00Z";
export const DEBT_ANNUAL_INCREASE_EUR = 152_500_000_000; // déficit public 2025 ≈ hausse annuelle (INSEE)
export const POPULATION = 69_082_000;                // population France au 1er janv. 2026 (INSEE, bilan démographique 2025 : 69,1 M)
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
  { name: "Macron", slug: "emmanuel-macron", years: "2017 → 2025", startPct: 98.5, endPct: 115.7, addedEur: 1_200_000_000_000, color: "#e11d48" },
];
export const DEBT_BY_PRESIDENT_NOTE = "Hausse du ratio dette/PIB entre le début et la fin de mandat (source INSEE). Le quinquennat de Sarkozy et de Hollande couvre 5 ans ; la période Macron en couvre 8 (2017-2025). Les montants en euros sont indicatifs.";

// --- Dépenses publiques ------------------------------------------------------------------
export const PUBLIC_SPENDING = {
  ratioGdp: 57.3,                    // % du PIB (2025, INSEE) — parmi les plus élevés de l'UE
  approxEur: 1_716_000_000_000,      // ≈ 57,3 % d'un PIB ~2 994 Md€
  deficitEur: 152_500_000_000,       // déficit public 2025 (INSEE)
  source: "INSEE — comptes des administrations publiques 2025 (dépenses 57,3 % du PIB, déficit 152,5 Md€).",
  sourceUrl: "https://www.insee.fr/fr/statistiques/8997691",
};

// --- Taux d'emprunt de l'État à 10 ans — comparaison internationale (données réelles) ------
// Mise à jour QUOTIDIENNE (auto) : cron `scripts/update-borrowing-rates.js` → Supabase, lu par
// `api.getBorrowingRates()`. Sources : CNBC (taux de marché des obligations d'État à 10 ans,
// France/US/UK/DE/IT/ES/BE/NL) + BCE (agrégat zone euro). Les valeurs ci-dessous ne servent que
// de REPLI (avant le 1er passage du cron, ou si Supabase est injoignable) — triées croissant.
export const BORROWING_RATES = {
  asOf: "9 septembre 2026",
  sourceLabel: "Taux de marché à 10 ans — CNBC & BCE",
  sourceUrl: "https://www.cnbc.com/bonds/",
  rows: [
    { label: "Allemagne", pct: 3.45 },
    { label: "Pays-Bas", pct: 3.52 },
    { label: "Zone euro", pct: 3.80, avg: true },
    { label: "Espagne", pct: 3.90 },
    { label: "Belgique", pct: 4.04 },
    { label: "Italie", pct: 4.29 },
    { label: "France", pct: 4.34, self: true },
    { label: "États-Unis", pct: 4.84 },
    { label: "Royaume-Uni", pct: 5.26 },
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
  { label: "Part de l'emploi public", value: "19,8 %", sub: "de l'emploi total en France — près d'1 emploi sur 5", year: "2024", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/8732435" },
];

// NOTE — les données OCDE d'emploi public comparé (« Government at a Glance ») et la carte
// « agents publics » ont été retirées : elles dataient respectivement de 2023 et de fin 2024.
// L'INSEE publie l'emploi public avec environ un an de décalage : au 14/09/2026, fin 2024
// reste le dernier millésime existant. Rétablir ces blocs dès qu'un millésime plus récent
// paraît (Insee Première « L'emploi dans la fonction publique »).
// Affiché sur la fiche du Premier ministre (Matignon), pas sur le panneau finances.
export const PM_CABINET = { label: "Conseillers du Premier ministre", value: "≈ 50", sub: "cabinet de Matignon, encadré par le décret du 14 juin 2017 ; varie selon les gouvernements", year: "2025", source: "Arrêtés de composition (Légifrance)", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051836957" };
