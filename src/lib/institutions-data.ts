export interface InstitutionGuide {
  slug: string;
  name: string;
  fullTitle: string;
  heroImage: string;
  role: string;
  history: string;
  keyPowers: { title: string; description: string }[];
  importance: string;
}

export const INSTITUTION_GUIDES: Record<string, InstitutionGuide> = {
  "assemblee": {
    slug: "assemblee",
    name: "Assemblée nationale",
    fullTitle: "Le Coeur Battant de la Démocratie Française",
    heroImage: "https://savoirs.unistra.fr/fileadmin/upload/Savoirs/Societe/Assemblee_nationale.JPG",
    role: "L'Assemblée nationale est la chambre basse du Parlement. Son rôle principal est de débattre, d'amender et de voter les lois, ainsi que de contrôler l'action du Gouvernement. Elle a le dernier mot en cas de désaccord avec le Sénat sur un texte de loi.",
    history: "Héritière de la Révolution française de 1789, l'Assemblée nationale siège au Palais Bourbon depuis 1798. Elle a traversé toutes les Républiques, s'affirmant comme le lieu où s'exprime la souveraineté nationale à travers les représentants élus au suffrage universel direct.",
    keyPowers: [
      {
        title: "Le vote de la loi",
        description: "Elle examine chaque année le budget de l'État et les projets de lois proposés par le Gouvernement ou les députés."
      },
      {
        title: "Le renversement du Gouvernement",
        description: "C'est le pouvoir le plus puissant : par le vote d'une 'motion de censure', l'Assemblée peut obliger le Premier ministre et son équipe à démissionner."
      },
      {
        title: "Les commissions d'enquête",
        description: "Elle peut créer des commissions pour enquêter sur des faits déterminés ou sur la gestion de services publics."
      }
    ],
    importance: "L'Assemblée est le contre-pouvoir essentiel à l'exécutif. C'est ici que les grands débats de société prennent vie et que la voix des citoyens est portée directement au sommet de l'État par les 577 députés."
  },
  "senat": {
    slug: "senat",
    name: "Sénat",
    fullTitle: "Le Gardien de la Stabilité et des Territoires",
    heroImage: "https://upload.wikimedia.org/wikipedia/commons/a/a2/S%C3%A9nat_fran%C3%A7ais_Luxembourg.jpg",
    role: "Le Sénat est la chambre haute du Parlement. Il représente les collectivités territoriales de la République (communes, départements, régions). Son rôle est d'assurer la qualité législative en apportant un regard complémentaire à celui de l'Assemblée.",
    history: "Installé au Palais du Luxembourg, le Sénat incarne la continuité républicaine. Contrairement à l'Assemblée, il ne peut pas être dissous par le Président, ce qui en fait un pôle de stabilité institutionnelle unique.",
    keyPowers: [
      {
        title: "La Navette Parlementaire",
        description: "Il examine les textes après l'Assemblée, proposant souvent des modifications techniques pour améliorer l'efficacité des lois."
      },
      {
        title: "Représentation Territoriale",
        description: "Les sénateurs sont élus par des 'grands électeurs' (maires, conseillers), assurant que les besoins des territoires ruraux et urbains sont entendus."
      },
      {
        title: "Contrôle de l'Exécutif",
        description: "Comme l'Assemblée, il interroge le gouvernement et produit des rapports d'expertise reconnus pour leur rigueur."
      }
    ],
    importance: "Le Sénat tempère l'immédiateté politique. Son président est le deuxième personnage de l'État : c'est lui qui assure l'intérim si le Président de la République ne peut plus exercer ses fonctions."
  },
  "gouvernement": {
    slug: "gouvernement",
    name: "Gouvernement",
    fullTitle: "L'Action et l'Exécution des Lois",
    heroImage: "https://upload.wikimedia.org/wikipedia/commons/d/db/Palais_de_l%27%C3%89lys%C3%A9e_2019.jpg",
    role: "Le Gouvernement détermine et conduit la politique de la Nation. Sous l'autorité du Premier ministre, il dispose de l'administration et de la force armée pour mettre en oeuvre les lois votées par le Parlement.",
    history: "La structure actuelle du gouvernement est définie par la Constitution de la Ve République (1958). Il siège à l'Hôtel de Matignon (Premier ministre) et dans les différents ministères.",
    keyPowers: [
      {
        title: "L'Initiative des Lois",
        description: "La majorité des lois votées proviennent de 'projets de loi' élaborés par les ministères et présentés en Conseil des ministres."
      },
      {
        title: "Le Pouvoir Règlementaire",
        description: "Il signe des décrets et des arrêtés qui précisent les modalités d'application concrètes des lois sur le terrain."
      },
      {
        title: "La Direction de l'État",
        description: "Il gère les services publics (Éducation, Santé, Sécurité) et assure la gestion quotidienne du pays."
      }
    ],
    importance: "Le Gouvernement est le moteur de l'action publique. Cependant, il est responsable devant le Parlement : il doit rendre des comptes et peut être sanctionné par les députés."
  }
};
