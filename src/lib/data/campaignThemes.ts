// Enjeux clés de la campagne présidentielle 2027 — DATA 100 % RÉELLE ET SOURCÉE.
// Chaque chiffre porte son année et sa source officielle (INSEE, RTE, CNCCFP, COR, SSMSI,
// ministères, Commission européenne). Aucune estimation maison. À réviser à chaque nouvelle
// publication officielle (les indicateurs macro évoluent lentement, en général annuellement).

export type ThemeStat = {
  label: string;       // ce que mesure le chiffre
  value: string;       // valeur mise en avant
  sub?: string;        // précision / contexte factuel
  year: string;        // millésime de la donnée
  source: string;      // institution
  url?: string;        // lien vérifiable
  // Mini-historique pour visualiser l'évolution (sparkline). Valeurs numériques officielles.
  history?: { year: number; value: number }[];
  unit?: string;       // unité affichée au survol de l'historique (ex. "% du PIB", "Md€")
  betterWhen?: "down" | "up"; // sens favorable (colore la tendance)
};

export type CampaignTheme = {
  slug: string;
  title: string;
  icon: string;        // nom d'icône lucide-react
  accent: string;      // couleur d'accent (hex)
  summary: string;     // 1 phrase de cadrage neutre
  stats: ThemeStat[];
  perspective?: string; // horizon / trajectoire, factuel
};

export const CAMPAIGN_THEMES: CampaignTheme[] = [
  {
    slug: "economie",
    title: "Économie & finances publiques",
    icon: "TrendingUp",
    accent: "#f5b301",
    summary: "Déficit, dette et emploi : l'état des comptes publics et du marché du travail.",
    stats: [
      { label: "Déficit public", value: "5,1 % du PIB", sub: "après 5,8 % en 2024", year: "2025", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/8956575", unit: "% du PIB", betterWhen: "down",
        history: [{ year: 2021, value: 6.5 }, { year: 2022, value: 4.7 }, { year: 2023, value: 5.5 }, { year: 2024, value: 5.8 }, { year: 2025, value: 5.1 }] },
      { label: "Dette publique", value: "115,6 % du PIB", sub: "après 113,0 % fin 2024", year: "fin 2025", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/8956575", unit: "% du PIB", betterWhen: "down",
        history: [{ year: 2021, value: 112.9 }, { year: 2022, value: 111.6 }, { year: 2023, value: 110.6 }, { year: 2024, value: 113.0 }, { year: 2025, value: 115.6 }] },
      { label: "Taux de chômage", value: "7,9 %", sub: "en hausse de 0,6 point sur un an (BIT)", year: "T4 2025", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/8735266", unit: "%", betterWhen: "down",
        history: [{ year: 2022, value: 7.2 }, { year: 2023, value: 7.5 }, { year: 2024, value: 7.3 }, { year: 2025, value: 7.9 }] },
    ],
    perspective: "La dette a continué de monter à 115,6 % du PIB fin 2025 ; le déficit se réduit lentement (5,1 % du PIB en 2025).",
  },
  {
    slug: "retraites",
    title: "Retraites",
    icon: "Hourglass",
    accent: "#4ea1ff",
    summary: "Âge de départ, équilibre financier et poids démographique du système.",
    stats: [
      { label: "Âge légal de départ", value: "64 ans", sub: "montée en charge progressive jusqu'en 2030 (réforme 2023)", year: "2023", source: "Réforme des retraites", url: "https://www.vie-publique.fr/eclairage/287916-reforme-des-retraites-2023-ce-que-contient-la-loi" },
      { label: "Population de 60 ans et plus", value: "27,7 %", sub: "de la population française, contre 19,6 % en 1994", year: "1ᵉʳ janv. 2024", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/2381474" },
      { label: "Solde du système", value: "≈ −0,4 % du PIB en 2030", sub: "dette du régime général projetée à 350 Md€ à l'horizon 2045", year: "proj. 2024", source: "COR (juin 2024)", url: "https://www.vie-publique.fr/en-bref/289993-malgre-la-reforme-des-retraites-des-comptes-en-deficit-selon-le-cor" },
    ],
    perspective: "Malgré la réforme de 2023, le Conseil d'orientation des retraites projette un système durablement déficitaire.",
  },
  {
    slug: "immigration",
    title: "Immigration",
    icon: "Globe2",
    accent: "#a78bfa",
    summary: "Population immigrée, flux migratoires et demande d'asile.",
    stats: [
      { label: "Personnes immigrées", value: "8,0 millions", sub: "soit 11,6 % de la population, après 11,2 % en 2024", year: "2025", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/8998082", unit: "% de la population",
        history: [{ year: 2023, value: 10.7 }, { year: 2024, value: 11.2 }, { year: 2025, value: 11.6 }] },
      { label: "Solde migratoire", value: "+152 000", sub: "principale composante de la croissance démographique", year: "2024", source: "INSEE", url: "https://www.insee.fr/fr/statistiques/8327319" },
      { label: "Demandes d'asile", value: "≈ 140 000 / an", sub: "enregistrées en guichet unique (GUDA)", year: "2023", source: "Ministère de l'Intérieur", url: "https://www.immigration.interieur.gouv.fr/Info-ressources/Etudes-et-statistiques/Les-chiffres-de-l-immigration-en-France/Asile" },
    ],
  },
  {
    slug: "ecologie",
    title: "Écologie & énergie",
    icon: "Leaf",
    accent: "#34d399",
    summary: "Émissions de CO₂, mix électrique et trajectoire climatique.",
    stats: [
      { label: "Intensité carbone de l'électricité", value: "21,7 gCO₂/kWh", sub: "niveau le plus bas de l'histoire (mix très décarboné)", year: "2024", source: "RTE", url: "https://analysesetdonnees.rte-france.com/bilan-electrique-2024/emissions" },
      { label: "Émissions du secteur électrique", value: "11,7 MtCO₂eq", sub: "−30 % en un an, plus bas niveau depuis 1945", year: "2024", source: "RTE", url: "https://analysesetdonnees.rte-france.com/bilan-electrique-2024/emissions", unit: "MtCO₂eq", betterWhen: "down",
        history: [{ year: 2023, value: 16.7 }, { year: 2024, value: 11.7 }] },
      { label: "Objectif climatique 2030", value: "270 MtCO₂e", sub: "hors puits de carbone — réduction requise de ≈ 4,7 %/an", year: "cible 2030", source: "SNBC / Citepa", url: "https://www.citepa.org/fr/2024_07_a01/" },
    ],
    perspective: "Le nucléaire (+13 % de production en 2024) et l'hydraulique tirent la baisse des émissions ; l'effort doit s'étendre aux transports et au bâtiment.",
  },
  {
    slug: "securite",
    title: "Sécurité & justice",
    icon: "ShieldCheck",
    accent: "#fb7185",
    summary: "Violences aux personnes et évolution de la délinquance.",
    stats: [
      { label: "Coups et blessures volontaires (15 ans +)", value: "+1 %", sub: "rupture après des hausses de ≈ 7 %/an entre 2016 et 2023", year: "2024", source: "SSMSI (Intérieur)", url: "https://www.interieur.gouv.fr/Interstats/Actualites/Insecurite-et-delinquance-en-2024-bilan-statistique-et-atlas-departemental" },
      { label: "Homicides", value: "976 victimes", sub: "−2 % en 2024, première baisse depuis 2020", year: "2024", source: "SSMSI (Intérieur)", url: "https://www.interieur.gouv.fr/Interstats/Actualites/Insecurite-et-delinquance-en-2024-bilan-statistique-et-atlas-departemental", betterWhen: "down" },
      { label: "Violences sexuelles (viols et tentatives)", value: "+9 %", sub: "poursuite d'une hausse rapide des faits enregistrés", year: "2024", source: "SSMSI (Intérieur)", url: "https://www.interieur.gouv.fr/Interstats/Actualites/Insecurite-et-delinquance-en-2024-bilan-statistique-et-atlas-departemental" },
      { label: "Trafic de stupéfiants", value: "+6 %", sub: "usage +10 % ; en partie lié à la mobilisation pour les JOP 2024", year: "2024", source: "SSMSI (Intérieur)", url: "https://www.interieur.gouv.fr/Interstats/Actualites/Insecurite-et-delinquance-en-2024-bilan-statistique-et-atlas-departemental" },
    ],
    perspective: "Sur les 17 indicateurs suivis par le SSMSI en 2024 : 7 en hausse, 5 stables et 5 en baisse (dont les homicides, pour la première fois depuis 2020).",
  },
  {
    slug: "education",
    title: "Éducation",
    icon: "GraduationCap",
    accent: "#60a5fa",
    summary: "Niveau des élèves, effectifs et dépense éducative.",
    stats: [
      { label: "Score PISA en mathématiques", value: "474 points", sub: "moyenne OCDE : 472 — recul de 21 points depuis 2018", year: "2022", source: "OCDE / PISA", url: "https://www.vie-publique.fr/eclairage/19539-resultats-des-eleves-la-france-et-le-classement-pisa-2022", unit: "points", betterWhen: "up",
        history: [{ year: 2012, value: 495 }, { year: 2015, value: 493 }, { year: 2018, value: 495 }, { year: 2022, value: 474 }] },
      { label: "Dépense intérieure d'éducation", value: "197,1 Md€", sub: "soit 6,8 % du PIB", year: "2024", source: "Ministère de l'Éducation nationale (DEPP)", url: "https://www.education.gouv.fr/depp/l-education-nationale-en-chiffres-edition-2024-414935" },
      { label: "Élèves scolarisés", value: "≈ 12 millions", sub: "6,34 M en primaire, 3,40 M au collège, 2,25 M au lycée", year: "2024", source: "Ministère de l'Éducation nationale (DEPP)", url: "https://www.education.gouv.fr/depp/l-education-nationale-en-chiffres-edition-2024-414935" },
    ],
  },
  {
    slug: "sante",
    title: "Santé",
    icon: "HeartPulse",
    accent: "#f472b6",
    summary: "Accès aux soins, démographie médicale et comptes sociaux.",
    stats: [
      { label: "Français en désert médical", value: "plus de 30 %", sub: "11 % des plus de 17 ans n'ont pas de médecin traitant", year: "2024", source: "vie-publique / Assurance maladie", url: "https://www.vie-publique.fr/eclairage/24080-sante-quelle-politique-publique-contre-les-deserts-medicaux" },
      { label: "Densité de médecins généralistes", value: "145 / 100 000 hab.", sub: "de 90 (Eure-et-Loir) à 298 (Hautes-Alpes) selon les départements", year: "2024", source: "CNAM / Sécurité sociale", url: "https://evaluation.securite-sociale.fr/home/maladie/261-inegalites-territoriales-de.html" },
      { label: "Déficit de la Sécurité sociale", value: "15,3 Md€", sub: "0,5 % du PIB, +29 % par rapport à 2023", year: "2024", source: "Sécurité sociale", url: "https://www.vie-publique.fr/en-bref/298946-comptes-de-la-securite-sociale-un-deficit-qui-se-creuse-en-2024", unit: "Md€", betterWhen: "down",
        history: [{ year: 2023, value: 10.8 }, { year: 2024, value: 15.3 }] },
    ],
  },
  {
    slug: "europe",
    title: "Europe & institutions",
    icon: "Landmark",
    accent: "#38bdf8",
    summary: "Place de la France dans le budget de l'Union européenne.",
    stats: [
      { label: "La France verse à l'UE", value: "22,3 Md€", sub: "contribution au budget de l'Union", year: "2024", source: "Commission européenne", url: "https://www.touteleurope.eu/economie-et-social/budget-ou-va-l-argent-de-l-union-europeenne-en-france/" },
      { label: "L'UE dépense en France", value: "16,4 Md€", sub: "hors plan de relance ; solde net −5,9 Md€", year: "2024", source: "Commission européenne", url: "https://www.touteleurope.eu/economie-et-social/budget-ou-va-l-argent-de-l-union-europeenne-en-france/" },
    ],
    perspective: "Avec le plan de relance NextGenerationEU (+8,9 Md€), la France est bénéficiaire nette en 2024 (+3,0 Md€). Détail sur la page « Lois & Europe ».",
  },
];
