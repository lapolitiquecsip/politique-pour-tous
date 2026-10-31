// Enjeux clés de la campagne présidentielle 2027 : ce fichier ne porte plus AUCUN chiffre (31/10/2026).
// Tous viennent de la table `indicators` (scripts/update-indicators.ts, sources officielles). Les chiffres
// et les commentaires écrits ici vieillissaient en silence : « 115,6 % de dette » s'affichait au
// chargement, et restait dans le commentaire, alors que l'INSEE publiait 119,0 %.

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
  summary: string;     // 1 phrase de cadrage neutre, sans chiffre
  stats: ThemeStat[];
  perspective?: string;
};

export const CAMPAIGN_THEMES: CampaignTheme[] = [
  { slug: "economie", title: "Économie & finances publiques", icon: "TrendingUp", accent: "#f5b301", stats: [],
    summary: "Croissance, prix, emploi et dette : l'état de l'économie et des comptes publics." },
  { slug: "retraites", title: "Retraites", icon: "Hourglass", accent: "#4ea1ff", stats: [],
    summary: "Âge de départ, poids démographique, emploi des seniors et dépense de retraite." },
  { slug: "immigration", title: "Immigration", icon: "Globe2", accent: "#a78bfa", stats: [],
    summary: "Population immigrée, entrées, titres de séjour et demandes d'asile." },
  { slug: "ecologie", title: "Écologie & énergie", icon: "Leaf", accent: "#34d399", stats: [],
    summary: "D'où vient notre électricité, et combien elle émet de CO₂." },
  { slug: "securite", title: "Sécurité & justice", icon: "ShieldCheck", accent: "#fb7185", stats: [],
    summary: "Violences aux personnes et évolution de la délinquance enregistrée." },
  { slug: "education", title: "Éducation", icon: "GraduationCap", accent: "#60a5fa", stats: [],
    summary: "Effectifs d'élèves, taille des classes et résultats au baccalauréat." },
  { slug: "sante", title: "Santé", icon: "HeartPulse", accent: "#f472b6", stats: [],
    summary: "Combien de médecins exercent en France, et l'évolution de leur nombre." },
  { slug: "europe", title: "France & Union européenne", icon: "Landmark", accent: "#38bdf8", stats: [],
    summary: "La France comparée aux autres pays de l'Union : dette, dépense, recettes et chômage." },
];
