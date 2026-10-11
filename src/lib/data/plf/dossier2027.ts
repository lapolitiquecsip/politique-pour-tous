// Dossier du PLF 2027 — tout ce qui suit est repris du rapport « Orientations générales et équilibre
// budgétaire » et des exposés des motifs du texte n° 3210 (lu le 10-11/10/2026). Aucun chiffre de presse.

import articles from "./articles-2027.json";

export const ARTICLES_2027 = articles as { n: number; titre: string }[];

/** Regroupement des 89 articles selon le plan du texte. */
export const PLAN_2027: { titre: string; de: number; a: number; resume: string }[] = [
  { titre: "Impôts et mesures fiscales", de: 1, a: 33, resume: "Barème de l'impôt sur le revenu, abattement des retraités, donations, logement, industrie, grandes entreprises, fiscalité des véhicules et de l'énergie, lutte contre la fraude." },
  { titre: "Collectivités territoriales", de: 34, a: 41, resume: "Dotation globale de fonctionnement, FCTVA, TVA affectée, contribution des collectivités à l'effort budgétaire." },
  { titre: "Affectations de recettes et Union européenne", de: 42, a: 56, resume: "Ressources affectées à des tiers, comptes spéciaux, relations avec la Sécurité sociale, contribution au budget de l'UE." },
  { titre: "Équilibre du budget", de: 57, a: 57, resume: "Article d'équilibre : solde, tableau de financement, plafond d'emplois." },
  { titre: "Crédits et plafonds d'emplois pour 2027", de: 58, a: 67, resume: "Crédits du budget général (état B), budgets annexes, comptes spéciaux, plafonds d'emplois de l'État et des opérateurs." },
  { titre: "Dispositions permanentes et articles rattachés", de: 68, a: 89, resume: "Garanties de l'État (Unédic, nouveau nucléaire), APL et prime d'activité, chèque énergie, dotations aux collectivités, France compétences, CPF." },
];

/** Passage du solde de l'État d'une année à l'autre, en Md€ (signe = effet sur le solde). */
export const PASSAGE_SOLDE: Record<2027 | 2026, { de: string; depart: number; arrivee: number; lignes: { label: string; v: number; detail?: string }[] }> = {
  2027: {
    de: "prévision révisée pour 2026", depart: -137.2, arrivee: -156.4,
    lignes: [
      { label: "Recettes fiscales nettes", v: 18.0, detail: "impôt sur le revenu +5,7 ; TVA +7,3 ; autres recettes +4,9" },
      { label: "Recettes non fiscales", v: -16.9, detail: "dont 13,0 Md€ de recettes exceptionnelles de 2026 non reconduites" },
      { label: "Dépenses du budget général", v: -18.4, detail: "charge de la dette +9,6 ; crédits des ministères +8,0 (surtout Défense) ; pensions +0,8" },
      { label: "Prélèvements sur recettes", v: -1.4, detail: "Union européenne +2,8 ; collectivités −1,4" },
      { label: "Comptes spéciaux et budgets annexes", v: -0.5 },
    ],
  },
  2026: {
    de: "prévision révisée pour 2025", depart: -130.5, arrivee: -124.4,
    lignes: [
      { label: "Recettes fiscales nettes", v: 19.1 },
      { label: "Recettes non fiscales", v: 5.5 },
      { label: "Dépenses du budget général", v: -13.5, detail: "charge de la dette +7,3 ; crédits des ministères +3,7 (Défense +6,7) ; pensions +2,7" },
      { label: "Prélèvements sur recettes", v: -9.2, detail: "Union européenne +5,7 ; collectivités +3,4 (dont mesure de périmètre)" },
      { label: "Comptes spéciaux", v: 4.3 },
    ],
  },
};

/** Scénario économique retenu par le Gouvernement pour 2027 (variations annuelles en %). */
export const SCENARIO_2027: { label: string; v2026: string; v2027: string }[] = [
  { label: "Croissance du PIB", v2026: "+0,5 %", v2027: "+1,0 %" },
  { label: "Inflation (IPC)", v2026: "+2,1 %", v2027: "+1,8 %" },
  { label: "Inflation sous-jacente", v2026: "+1,2 %", v2027: "+2,1 %" },
  { label: "Consommation des ménages", v2026: "—", v2027: "+0,8 %" },
  { label: "Investissement des ménages", v2026: "−0,7 %", v2027: "+2,5 %" },
  { label: "Investissement des entreprises", v2026: "+0,1 %", v2027: "+1,6 %" },
  { label: "Salaires", v2026: "+2,0 %", v2027: "+2,7 %" },
  { label: "Masse salariale (secteur marchand)", v2026: "+1,6 %", v2027: "+2,4 %" },
  { label: "Emploi salarié marchand", v2026: "−0,3 %", v2027: "−0,3 %" },
  { label: "Croissance mondiale", v2026: "+3,0 %", v2027: "+3,2 %" },
  { label: "Demande mondiale adressée à la France", v2026: "+3,5 %", v2027: "+2,5 %" },
];

export const ALEAS_2027 = [
  "Le scénario suppose une désescalade du conflit au Proche et Moyen-Orient à l'automne 2026 et une réouverture progressive du détroit d'Ormuz ; à défaut, les prix des hydrocarbures resteraient plus élevés.",
  "L'attentisme des ménages et des entreprises est présenté comme le principal aléa national ; le texte lie sa levée à l'adoption rapide d'un budget.",
  "De nouveaux événements climatiques extrêmes pourraient peser sur l'activité, comme la sécheresse de l'été 2026 (−0,1 point de PIB).",
  "La relance budgétaire allemande pourrait soutenir davantage les exportations ; une correction boursière des valeurs technologiques est citée comme risque.",
];

/** Ce qui s'est passé en 2026, selon le PLF 2027. */
export const ANNEE_2026 = [
  "Déficit public 2026 révisé de 5,0 % (loi de finances) à 5,4 % du PIB : −0,3 point lié à la conjoncture, −0,1 point à la charge de la dette.",
  "Croissance 2026 ramenée de +1,0 % à +0,5 % (conflit au Proche et Moyen-Orient, sécheresse estivale).",
  "Deux comités d'alerte des finances publiques (21 avril et 7 juillet 2026) : 4,0 Md€ d'autorisations d'engagement et 2,9 Md€ de crédits de paiement régulés, puis 1,9 Md€ d'économies notifiées aux ministères.",
  "Décret d'annulation de 0,5 Md€ le 10 septembre 2026.",
  "Solde de l'État 2026 révisé à −137,2 Md€ (−134,6 Md€ en loi de finances) : charge de la dette +4,1 Md€, recettes fiscales −5,9 Md€, compensées en partie par +4,7 Md€ de recettes non fiscales.",
];

export const AUTRES_SECTEURS_2027 = [
  { titre: "Sécurité sociale", texte: "La progression de la dépense serait ramenée de plus de 3 % à environ 2 % (un peu plus de 13 Md€) ; l'objectif de dépenses d'assurance maladie (Ondam) est limité à +2,0 %. Le détail relève du PLFSS." },
  { titre: "Collectivités territoriales", texte: "Leurs dépenses de fonctionnement devraient progresser au niveau de l'inflation. Les prélèvements sur recettes en leur faveur reculent de 1,4 Md€ par rapport à 2026 révisé." },
  { titre: "Règles européennes", texte: "Le texte indique que la croissance de la dépense primaire nette respecte la recommandation du Conseil pour 2027 et, en cumul, sur 2023-2027." },
  { titre: "Outre-mer", texte: "Plus de 1 Md€ (hors soutien au nickel calédonien) pour la reconstruction de Mayotte et le soutien à la Nouvelle-Calédonie." },
];

export const EMPLOIS_2027 = [
  "Point d'indice gelé ; mesures catégorielles « extrêmement limitées ».",
  "Emplois de l'État et des opérateurs en baisse, hors réforme de la formation initiale des enseignants (+4 742 ETP) et hors loi de programmation militaire (+2 150 ETP).",
  "Intérieur : 235 gendarmes et 970 policiers supplémentaires ; Justice : près de 300 magistrats et 300 greffiers.",
  "Près de 2 000 créations d'emploi pour la protection des victimes de violences sexistes et sexuelles (enquête, écoles, structures spécialisées).",
  "Opérateurs : France compétences (≈ 1 Md€ de taxes affectées en moins, pas de subvention d'équilibre) et France Travail (baisse des emplois et des prestations externalisées).",
];

export const RESERVE_2027 = "Réserve de précaution : 4 % des crédits hors masse salariale et 0,5 % de la masse salariale, soit un gel d'environ 9,1 Md€ de crédits de paiement (8,3 Md€ + 0,8 Md€).";
