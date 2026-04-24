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
    fullTitle: "Le sanctuaire de la loi et le miroir de la Nation",
    heroImage: "https://savoirs.unistra.fr/fileadmin/upload/Savoirs/Societe/Assemblee_nationale.JPG",
    role: "L'Assemblée nationale est l'institution centrale de la Ve République. Composée de 577 députés élus au suffrage universel direct, elle est la seule chambre du Parlement à pouvoir renverser le Gouvernement. Son rôle dépasse le simple vote de la loi : elle est le lieu où se règlent les conflits politiques par la parole et le débat démocratique.",
    history: "Héritière de la Révolution française de 1789, l'Assemblée nationale siège au Palais Bourbon depuis 1798. Elle a traversé toutes les Républiques, s'affirmant comme le lieu où s'exprime la souveraineté nationale. Chaque brique du Palais Bourbon raconte une lutte pour la liberté, de la proclamation de la République aux grandes lois sociales qui ont façonné la France moderne.",
    keyPowers: [
      {
        title: "Le vote de la loi",
        description: "Elle détient le 'dernier mot' législatif. En cas de désaccord avec le Sénat, c'est la volonté des députés, élus directement par le peuple, qui l'emporte."
      },
      {
        title: "La Motion de Censure",
        description: "Un pouvoir unique : les députés peuvent voter une motion de censure pour renverser le Gouvernement s'ils désapprouvent sa politique. C'est l'arme suprême du contrôle parlementaire."
      },
      {
        title: "Le Contrôle et l'Évaluation",
        description: "Questions au gouvernement, commissions d'enquête, rapports d'information... Les députés scrutent chaque euro dépensé et chaque décision prise par l'exécutif."
      },
      {
        title: "La Représentation Nationale",
        description: "Chaque député, bien qu'élu dans une circonscription, représente la Nation tout entière. Il est le relais entre les citoyens et la loi."
      }
    ],
    importance: "Sans l'Assemblée, il n'y a pas de contre-pouvoir efficace. Elle est le rempart contre l'arbitraire et le garant que chaque loi est passée au crible du débat contradictoire. Elle peut être dissoute par le Président, mais elle seule peut renvoyer son Premier ministre : c'est l'équilibre fragile et vital de notre démocratie."
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
