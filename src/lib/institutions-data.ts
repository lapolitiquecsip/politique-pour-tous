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
    fullTitle: "L'institution garante du débat contradictoire et de la souveraineté populaire",
    heroImage: "https://savoirs.unistra.fr/fileadmin/upload/Savoirs/Societe/Assemblee_nationale.JPG",
    role: "L'Assemblée nationale est le poumon de la vie démocratique française. Composée de 577 députés, elle est actuellement dans sa 17ème législature. C'est ici que les lois sont forgées, débattues et votées. Elle dispose d'un pouvoir unique : celui d'engager la responsabilité du Gouvernement. Présidée par le Président de l'Assemblée (actuellement Yaël Braun-Pivet), elle assure l'équilibre des pouvoirs au sommet de l'État.",
    history: "Siégeant au Palais Bourbon depuis la Révolution française, l'Assemblée a vu naître les textes les plus fondamentaux de notre Histoire, de l'abolition de la peine de mort à la création de la Sécurité Sociale. Elle est le témoin permanent des mutations de la société française, transformant les aspirations des citoyens en normes juridiques.",
    keyPowers: [
      {
        title: "Le vote de la loi",
        description: "Elle détient le pouvoir législatif suprême. Si l'Assemblée et le Sénat ne s'entendent pas, c'est l'Assemblée qui a le dernier mot, car ses membres sont élus directement par le peuple."
      },
      {
        title: "La Motion de Censure",
        description: "L'Assemblée peut voter une motion de censure pour renverser le Gouvernement. C'est le seul contre-pouvoir capable de mettre fin immédiatement aux fonctions du Premier ministre."
      },
      {
        title: "Les 8 Commissions Permanentes",
        description: "Chaque projet de loi est d'abord scruté par l'une des 8 commissions (Finances, Lois, Affaires sociales, etc.) où les députés effectuent un travail technique de fond avant le débat public."
      },
      {
        title: "La Dissolution",
        description: "En contrepartie de son pouvoir de renverser le Gouvernement, l'Assemblée peut elle-même être dissoute par le Président de la République, provoquant de nouvelles élections législatives."
      },
      {
        title: "Questions au Gouvernement",
        description: "Chaque semaine, les ministres doivent répondre publiquement aux interrogations des députés, assurant une transparence totale de l'action publique."
      }
    ],
    importance: "L'Assemblée nationale est le seul lieu où toutes les sensibilités politiques de la France se rencontrent pour décider de l'avenir commun. C'est le miroir de la Nation : chaque député porte la voix de sa circonscription tout en agissant au nom de l'intérêt général. Elle est le coeur battant du contre-pouvoir législatif."
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
