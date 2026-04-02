export interface LawDossier {
  id: string;
  title: string;
  category: string;
  summary: string;
  impacts: string[];
  calendar: { date: string; event: string }[];
  premiumPoints: string[];
  status: "vote" | "application" | "debat";
  statusLabel: string;
  color: string;
}

export const FREE_LAWS: LawDossier[] = [
  {
    id: "climat-resilience",
    title: "Loi Climat & Résilience",
    category: "Environnement",
    color: "emerald",
    status: "application",
    statusLabel: "En application",
    summary: "Issue de la Convention Citoyenne pour le Climat, cette loi chamboule notre quotidien : du logement à nos assiettes, en passant par nos trajets. C'est l'un des textes les plus denses du quinquennat.",
    impacts: [
      "Interdiction de louer les 'passoires thermiques' (G en 2025, F en 2028, E en 2034).",
      "Mise en place des ZFE (Zones à Faibles Émissions) dans les agglomérations de +150 000 hab.",
      "Suppression des vols intérieurs s'il existe une alternative en train de <2h30."
    ],
    premiumPoints: [
      "Le calendrier ultra-précis des interdictions de location pour les propriétaires.",
      "Comment obtenir les aides 'MaPrimeRénov' selon votre nouveau DPE.",
      "Le guide des aides pour changer de véhicule face aux ZFE."
    ],
    calendar: [
      { date: "Août 2021", event: "Promulgation de la loi" },
      { date: "Janv 2023", event: "Interdiction location G les plus énergivores" },
      { date: "Janv 2025", event: "Interdiction location TOUT le niveau G" }
    ]
  },
  {
    id: "plein-emploi",
    title: "Loi Plein Emploi",
    category: "Économie & Social",
    color: "blue",
    status: "application",
    statusLabel: "Réforme en cours",
    summary: "Le gouvernement transforme Pôle Emploi en 'France Travail'. L'objectif : centraliser tous les acteurs de l'insertion et conditionner le RSA à une activité hebdomadaire.",
    impacts: [
      "Inscription automatique de tous les allocataires du RSA à France Travail.",
      "Contrat d'engagement réciproque avec 15 à 20 heures d'activité obligatoire par semaine.",
      "Sanctions simplifiées en cas de non-respect du contrat d'engagement."
    ],
    premiumPoints: [
      "La liste complète des activités acceptées (stages, formations, bénévolat).",
      "Quelles exceptions permettent de descendre sous les 15h d'activité ?",
      "Le nouveau barème des sanctions progressives."
    ],
    calendar: [
      { date: "Déc 2023", event: "Promulgation de la loi" },
      { date: "Janv 2024", event: "Lancement de France Travail" },
      { date: "Janv 2025", event: "Généralisation des 15h d'activité RSA" }
    ]
  },
  {
    id: "loi-militaire",
    title: "Loi Programmation Militaire",
    category: "Défense & Sécurité",
    color: "slate",
    status: "vote",
    statusLabel: "Votée (Budget long terme)",
    summary: "Un effort financier colossal (413 milliards €) pour moderniser nos armées face aux nouvelles menaces mondiales. C'est le budget le plus élevé de la Ve République.",
    impacts: [
      "Modernisation de la dissuasion nucléaire française.",
      "Achat de nouveaux Rafale au standard F4 et modernisation des chars Leclerc.",
      "Doublement du nombre de réservistes (objectif 105 000 en 2030)."
    ],
    premiumPoints: [
      "Détail du budget par année : où va vraiment l'argent ?",
      "Le focus sur la cyberdéfense : comment l'État se protège.",
      "Les opportunités de recrutement et de réserve pour les civils."
    ],
    calendar: [
      { date: "Juill 2023", event: "Adoption définitive au Parlement" },
      { date: "2024-2030", event: "Période d'exécution du budget" },
      { date: "2027", event: "Évaluation intermédiaire des capacités" }
    ]
  },
  {
    id: "loi-immigration",
    title: "Loi Immigration",
    category: "Justice & Société",
    color: "red",
    status: "application",
    statusLabel: "Application partielle",
    summary: "Une loi complexe qui divise, visant à 'mieux intégrer' par le travail et 'mieux expulser' les profils délinquants. Elle crée un nouveau titre de séjour spécifique.",
    impacts: [
      "Création du titre de séjour 'Métiers en tension' (BTP, restauration, aide à domicile).",
      "Simplification drastique des procédures d'OQTF (Obligation de Quitter le Territoire).",
      "Exigences de maîtrise du français renforcées pour la carte pluriannuelle."
    ],
    premiumPoints: [
      "La liste officielle des métiers dits 'en tension' éligibles au titre de séjour.",
      "Décryptage de l'Aide Médicale d'État (AME) : ce qui change vraiment.",
      "Le guide des nouveaux recours juridiques possibles."
    ],
    calendar: [
      { date: "Janv 2024", event: "Promulgation après censure Conseil Constitutionnel" },
      { date: "Fév 2024", event: "Premières circulaires d'application" },
      { date: "2025", event: "Mise en place des nouveaux tests de français" }
    ]
  }
];
