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
  backgroundImage?: string;
}

export const FREE_LAWS: LawDossier[] = [
  {
    id: "climat-resilience",
    title: "Loi Climat & Résilience",
    category: "Environnement",
    color: "emerald",
    status: "application",
    statusLabel: "En application",
    backgroundImage: "https://images.pexels.com/photos/32975423/pexels-photo-32975423.jpeg",
    summary: "Issue de la Convention Citoyenne pour le Climat, cette loi chamboule notre quotidien : du logement à nos assiettes, en passant par nos trajets. C'est l'un des textes les plus denses du quinquennat.",
    impacts: [
      "Interdiction de louer les 'passoires thermiques' (G en 2025, F en 2028, E en 2034).",
      "Mise en place des ZFE (Zones à Faibles Émissions) dans les agglomérations de +150 000 hab.",
      "Suppression des vols intérieurs s'il existe une alternative en train de <2h30."
    ],
    premiumPoints: [
      "Calendrier de gel des loyers : Les logements G sont interdits à la relocation depuis 2023, mais saviez-vous que la reconduction tacite du bail est aussi concernée ?",
      "MaPrimeRénov' 2024 : Le passage par un 'Accompagnateur Rénov' devient obligatoire pour les rénovations d'ampleur (gain de 2 niveaux de DPE).",
      "ZFE : Le calendrier de restriction Crit'Air 3 par ville et le fonctionnement du 'Pass 24h' pour les véhicules occasionnellement exclus.",
      "Audit énergétique : Détail des obligations lors de la vente de maisons F ou G et leviers de négociation sur les devis de travaux.",
      "Espaces Verts : L'obligation d'un Coefficient de Biotope (CBS) pour tout nouveau permis de construire en zone urbaine dense.",
      "Rénovation globale : Comparatif des aides entre le parcours 'Pilier Performance' et les gestes de travaux isolés."
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
    backgroundImage: "https://images.pexels.com/photos/19250066/pexels-photo-19250066.jpeg",
    summary: "Le gouvernement transforme Pôle Emploi en 'France Travail'. L'objectif : centraliser tous les acteurs de l'insertion et conditionner le RSA à une activité hebdomadaire.",
    impacts: [
      "Inscription automatique de tous les allocataires du RSA à France Travail.",
      "Contrat d'engagement réciproque avec 15 à 20 heures d'activité obligatoire par semaine.",
      "Sanctions simplifiées en cas de non-respect du contrat d'engagement."
    ],
    premiumPoints: [
      "Contrat d'Engagement : Les 7 motifs légitimes de dispense des 15h d'activité (santé, garde d'enfant, situation de handicap).",
      "Algorithme France Travail : Comment l'orientation est décidée entre parcours 'Accompagnement', 'Social' ou 'Emploi'.",
      "Sanctions : Le mécanisme de 'suspension-remise' du RSA permettant de récupérer les sommes perdues si régularisation.",
      "Mode de Garde : L'obligation pour les communes de devenir 'Autorité Organisatrice' de l'accueil du jeune enfant d'ici 2025.",
      "Travailleurs Handicapés : L'alignement inédit des droits des travailleurs en ESAT sur ceux des salariés classiques.",
      "Contrôle : Le rôle renforcé des départements dans le suivi effectif des heures d'activité déclarées."
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
    backgroundImage: "https://images.pexels.com/photos/20289796/pexels-photo-20289796.jpeg",
    summary: "Un effort financier colossal (413 milliards €) pour moderniser nos armées face aux nouvelles menaces mondiales. C'est le budget le plus élevé de la Ve République.",
    impacts: [
      "Modernisation de la dissuasion nucléaire française.",
      "Achat de nouveaux Rafale au standard F4 et modernisation des chars Leclerc.",
      "Doublement du nombre de réservistes (objectif 105 000 en 2030)."
    ],
    premiumPoints: [
      "Dissuasion : Financement secret-défense du premier prototype de SNLE 3G (Sous-marin de 3ème génération).",
      "Standard Rafale F4.2 : Focus sur la connectivité de combat collaboratif et l'intégration du nouveau missile MICA NG.",
      "Cyberdéfense : Création d'une réserve citoyenne de cyber-combattants accessible sous conditions de compétences.",
      "Économie de Guerre : Le pouvoir du Ministre d'ordonner la priorité de production militaire sur les commandes civiles.",
      "Fonds Spéciaux : Augmentation de 30% des moyens de la DGSE pour la lutte anti-terroriste internationale.",
      "Espace : Lancement du programme de satellites de surveillance et protection 'ARES' pour 2028."
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
    backgroundImage: "https://images.pexels.com/photos/30646922/pexels-photo-30646922.jpeg",
    summary: "Une loi complexe qui divise, visant à 'mieux intégrer' par le travail et 'mieux expulser' les profils délinquants. Elle crée un nouveau titre de séjour spécifique.",
    impacts: [
      "Création du titre de séjour 'Métiers en tension' (BTP, restauration, aide à domicile).",
      "Simplification drastique des procédures d'OQTF (Obligation de Quitter le Territoire).",
      "Exigences de maîtrise du français renforcées pour la carte pluriannuelle."
    ],
    premiumPoints: [
      "Métiers en Tension : La liste des 20 secteurs (BTP, Santé, Hôtellerie) permettant d'obtenir le titre sans accord employeur.",
      "Contrat d'Intégration (CIR) : L'obligation d'atteindre le niveau A2 (et non plus A1) pour le premier titre pluriannuel.",
      "Regroupement Familial : Durée de séjour du demandeur portée à 24 mois et exigence renforcée de ressources stables.",
      "Quotas Migratoires : Comprendre le mécanisme annuel de plafonnement qui sera débattu chaque année au Parlement.",
      "AME (Aide Médicale d'État) : Ce qui change vraiment après les débats parlementaires sur sa transformation en AMU.",
      "Déchéance de Nationalité : Élargissement des cas possibles pour les binationaux condamnés pour homicide volontaire."
    ],
    calendar: [
      { date: "Janv 2024", event: "Promulgation après censure Conseil Constitutionnel" },
      { date: "Fév 2024", event: "Premières circulaires d'application" },
      { date: "2025", event: "Mise en place des nouveaux tests de français" }
    ]
  }
];
