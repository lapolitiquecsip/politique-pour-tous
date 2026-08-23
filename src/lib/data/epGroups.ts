// Fiches des groupes politiques du Parlement européen (10e législature, 2024-2029).
// Données CURÉES et vérifiées (faits stables) — pas de génération IA. Les effectifs
// français et la liste des partis nationaux sont calculés EN DIRECT depuis la table `meps`
// (toujours à jour). Les sièges européens sont ceux de la constitution du Parlement (juillet
// 2024) et sont datés comme tels pour rester honnêtes sur leur fraîcheur.

export interface EpGroup {
  code: string;          // ep_group_code en base
  slug: string;
  short: string;         // sigle usuel
  name: string;          // intitulé officiel
  orientation: string;   // famille politique en un mot
  spectrum: number;      // 0 (gauche) → 100 (droite), pour la jauge
  founded: string;       // année de création du groupe
  europarty: string;     // parti politique européen affilié
  color: string;         // couleur hex (thème)
  gradient: string;      // dégradé Tailwind (cohérent avec la fiche eurodéputé)
  seats2024: number;     // sièges à la constitution du Parlement (juillet 2024)
  website: string | null;
  summary: string;       // paragraphe d'explication
  ideology: string[];    // repères programmatiques
}

export const EP_GROUPS: EpGroup[] = [
  {
    code: "PPE", slug: "parti-populaire-europeen", short: "PPE",
    name: "Groupe du Parti populaire européen (Démocrates-Chrétiens)",
    orientation: "Centre-droit / démocratie chrétienne", spectrum: 62,
    founded: "1953", europarty: "Parti populaire européen (PPE)",
    color: "#3b5faa", gradient: "from-blue-500 to-indigo-600", seats2024: 188,
    website: "https://www.eppgroup.eu/fr",
    summary: "Premier groupe du Parlement européen, le PPE rassemble les partis de centre-droit et de tradition démocrate-chrétienne. Force historique de la construction européenne, il défend une intégration européenne pragmatique, l'économie sociale de marché et un cadre de sécurité commun. C'est le groupe de la présidente de la Commission Ursula von der Leyen.",
    ideology: [
      "Économie sociale de marché, soutien aux entreprises et à la compétitivité",
      "Intégration européenne pro-active mais attachée à la subsidiarité",
      "Fermeté sur la sécurité, les frontières et l'immigration maîtrisée",
      "Valeurs chrétiennes-démocrates et attachement à l'État de droit",
    ],
  },
  {
    code: "SD", slug: "socialistes-democrates", short: "S&D",
    name: "Groupe de l'Alliance progressiste des socialistes et démocrates",
    orientation: "Centre-gauche / social-démocratie", spectrum: 32,
    founded: "1953", europarty: "Parti socialiste européen (PSE)",
    color: "#e2475f", gradient: "from-rose-500 to-red-600", seats2024: 136,
    website: "https://www.socialistsanddemocrats.eu/fr",
    summary: "Deuxième force du Parlement, le groupe S&D réunit les partis sociaux-démocrates et progressistes. Il met l'accent sur la justice sociale, la transition écologique juste, les droits des travailleurs et la défense de l'État-providence à l'échelle européenne.",
    ideology: [
      "Justice sociale, salaires décents et droits des travailleurs",
      "Transition écologique « juste » ne laissant personne de côté",
      "Services publics et protection sociale renforcés",
      "Défense des droits fondamentaux et de l'égalité",
    ],
  },
  {
    code: "RE", slug: "renew-europe", short: "Renew",
    name: "Groupe Renew Europe",
    orientation: "Centre / libéraux et macronistes", spectrum: 52,
    founded: "2019", europarty: "ALDE, Renaissance et affiliés (Renew Europe)",
    color: "#f0b429", gradient: "from-amber-400 to-yellow-500", seats2024: 77,
    website: "https://www.reneweuropegroup.eu/fr",
    summary: "Groupe centriste et libéral, Renew Europe est né en 2019 de l'alliance des libéraux (ALDE) et de la majorité présidentielle française. Pro-européen assumé, il se veut la force charnière du Parlement, favorable au marché unique, à l'innovation et à une Europe puissance.",
    ideology: [
      "Europe fédérale et pro-marché unique",
      "Libertés individuelles, État de droit et démocratie",
      "Innovation, numérique et compétitivité",
      "Souveraineté européenne en défense et en énergie",
    ],
  },
  {
    code: "VERTS", slug: "verts-ale", short: "Verts/ALE",
    name: "Groupe des Verts / Alliance libre européenne",
    orientation: "Écologie / régionalistes", spectrum: 25,
    founded: "1999", europarty: "Parti vert européen et Alliance libre européenne",
    color: "#3fa45b", gradient: "from-emerald-500 to-green-600", seats2024: 53,
    website: "https://www.greens-efa.eu/fr",
    summary: "Le groupe des Verts/ALE associe les partis écologistes et des mouvements régionalistes et minoritaires. Il porte l'ambition climatique la plus élevée du Parlement, la défense de la biodiversité, des libertés et des droits des minorités.",
    ideology: [
      "Ambition climatique maximale et sortie des énergies fossiles",
      "Protection de la biodiversité et de l'environnement",
      "Droits des minorités et des régions, libertés civiles",
      "Justice sociale et fiscale",
    ],
  },
  {
    code: "PfE", slug: "patriotes-pour-l-europe", short: "PfE",
    name: "Groupe « Patriotes pour l'Europe »",
    orientation: "Droite nationale / souverainiste", spectrum: 82,
    founded: "2024", europarty: "Patriots.eu",
    color: "#4b5563", gradient: "from-slate-600 to-slate-800", seats2024: 84,
    website: "https://patriots.eu/",
    summary: "Créé en juillet 2024 à l'initiative de Viktor Orbán, le groupe Patriotes pour l'Europe est devenu la troisième force du Parlement. Il rassemble les droites nationales et souverainistes, dont le Rassemblement national français. Il défend une « Europe des nations », s'oppose à l'immigration et conteste le fédéralisme européen.",
    ideology: [
      "« Europe des nations » contre le fédéralisme",
      "Fermeté migratoire et priorité aux frontières nationales",
      "Souveraineté des États sur Bruxelles",
      "Critique du Pacte vert jugé punitif",
    ],
  },
  {
    code: "ECR", slug: "conservateurs-reformistes", short: "ECR",
    name: "Groupe des Conservateurs et Réformistes européens",
    orientation: "Droite conservatrice et eurosceptique", spectrum: 74,
    founded: "2009", europarty: "Parti des conservateurs et réformistes européens (ECR)",
    color: "#2f6fb0", gradient: "from-sky-600 to-blue-800", seats2024: 78,
    website: "https://ecrgroup.eu/",
    summary: "Fondé en 2009, le groupe ECR réunit des partis conservateurs et eurosceptiques, dont le parti Fratelli d'Italia de Giorgia Meloni. En France, il accueille les élus de Reconquête. Il prône une Europe des coopérations plutôt qu'une union politique, avec fermeté sur l'immigration et la sécurité.",
    ideology: [
      "Réforme de l'UE vers une confédération d'États souverains",
      "Conservatisme sur les questions de société",
      "Fermeté migratoire et sécuritaire",
      "Libéralisme économique et baisse de la bureaucratie",
    ],
  },
  {
    code: "GUE", slug: "la-gauche", short: "La Gauche",
    name: "Groupe de la gauche au Parlement européen (GUE/NGL)",
    orientation: "Gauche radicale", spectrum: 12,
    founded: "1995", europarty: "Parti de la gauche européenne",
    color: "#c0243a", gradient: "from-red-600 to-rose-700", seats2024: 46,
    website: "https://left.eu/",
    summary: "Le groupe de la Gauche (GUE/NGL) réunit les partis de gauche radicale, communistes et anticapitalistes. En France, il accueille les élus de La France insoumise. Il combat l'austérité, défend les services publics et une rupture avec les traités jugés libéraux.",
    ideology: [
      "Rupture avec l'austérité et les politiques libérales",
      "Services publics, partage des richesses et fiscalité des plus riches",
      "Écologie anticapitaliste",
      "Paix, désarmement et anticolonialisme",
    ],
  },
  {
    code: "ESN", slug: "europe-nations-souveraines", short: "ESN",
    name: "Groupe « L'Europe des nations souveraines »",
    orientation: "Droite nationale radicale", spectrum: 90,
    founded: "2024", europarty: "Aucun parti européen unique",
    color: "#3730a3", gradient: "from-indigo-700 to-slate-900", seats2024: 25,
    website: null,
    summary: "Constitué en juillet 2024 autour du parti allemand AfD, le groupe L'Europe des nations souveraines rassemble les formations nationalistes les plus radicales du Parlement. Il conteste frontalement l'Union européenne, l'immigration et le Pacte vert.",
    ideology: [
      "Rejet du fédéralisme et retour de compétences aux États",
      "Opposition ferme à l'immigration",
      "Défense des identités et souverainetés nationales",
      "Euroscepticisme assumé",
    ],
  },
  {
    code: "NI", slug: "non-inscrits", short: "NI",
    name: "Députés non inscrits",
    orientation: "Sans groupe", spectrum: 50,
    founded: "—", europarty: "Aucun",
    color: "#64748b", gradient: "from-slate-400 to-slate-600", seats2024: 32,
    website: null,
    summary: "Les non-inscrits ne sont pas un groupe politique mais l'ensemble des députés n'appartenant à aucun groupe constitué. Ils disposent de moins de temps de parole et de moyens, et votent en toute indépendance, sans discipline de groupe.",
    ideology: [
      "Aucune ligne commune : positions individuelles",
      "Moindres moyens et temps de parole qu'un groupe constitué",
      "Indépendance totale de vote",
    ],
  },
];

export const groupBySlug = (slug: string): EpGroup | undefined =>
  EP_GROUPS.find(g => g.slug === slug);

export const groupByCode = (code: string | null | undefined): EpGroup | undefined =>
  code ? EP_GROUPS.find(g => g.code === code) : undefined;

export const EP_GROUP_SLUGS = EP_GROUPS.map(g => g.slug);
