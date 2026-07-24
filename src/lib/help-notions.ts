// Notions expliquées par la bulle d'aide, organisées par page (préfixe de route).
// Objectif : qu'un citoyen comprenne CHAQUE terme compliqué de la page qu'il consulte.
// `routes` = préfixes d'URL où la notion est pertinente ; "*" = pertinent partout.

export type Notion = {
  term: string;
  def: string;        // explication simple, 1-3 phrases
  example?: string;   // exemple concret facultatif
  routes: string[];   // préfixes de route
};

export const NOTIONS: Notion[] = [
  // ————— Notions générales (toutes les pages) —————
  { term: "Assemblée nationale", def: "Chambre basse du Parlement, composée de 577 députés élus au suffrage direct. Elle vote les lois et peut renverser le gouvernement.", routes: ["*"] },
  { term: "Sénat", def: "Chambre haute du Parlement, composée de 348 sénateurs élus au suffrage indirect (par des « grands électeurs »). Il vote aussi les lois mais ne peut pas renverser le gouvernement.", routes: ["*"] },
  { term: "Gouvernement", def: "L'équipe dirigée par le Premier ministre (ministres, secrétaires d'État) qui met en œuvre la politique nationale. Il est nommé par le président et responsable devant l'Assemblée.", routes: ["*"] },
  { term: "Groupe politique", def: "Rassemblement d'élus partageant les mêmes orientations au sein d'une assemblée. Les groupes structurent les débats et les votes.", routes: ["*"] },

  // ————— Votes des élus / lois —————
  { term: "Scrutin", def: "Un vote formel sur un texte. Le résultat indique combien d'élus ont voté pour, contre ou se sont abstenus.", routes: ["/deputes", "/lois", "/eurodeputes", "/dashboard"] },
  { term: "Pour / Contre / Abstention", def: "Les trois positions possibles lors d'un vote. L'abstention, c'est refuser de trancher : le bulletin n'est pas déposé dans un sens ou dans l'autre.", routes: ["/deputes", "/lois", "/eurodeputes", "/dashboard"] },
  { term: "Amendement", def: "Une proposition de modification d'un article de loi, discutée et votée avant le texte final. La grande majorité des votes portent sur des amendements.", routes: ["/deputes", "/lois", "/eurodeputes"] },
  { term: "Projet de loi", def: "Un texte de loi déposé par le gouvernement.", example: "Le projet de loi de finances (le budget) est déposé chaque automne par le gouvernement.", routes: ["/deputes", "/lois"] },
  { term: "Proposition de loi", def: "Un texte de loi déposé par des parlementaires (députés ou sénateurs), et non par le gouvernement.", routes: ["/deputes", "/lois"] },
  { term: "Navette parlementaire", def: "Le va-et-vient d'un texte entre l'Assemblée et le Sénat, jusqu'à ce qu'ils s'accordent sur une version identique.", routes: ["/lois", "/deputes"] },
  { term: "Commission", def: "Un groupe restreint de parlementaires spécialisés (lois, finances, affaires étrangères…) qui examine les textes en détail avant le vote en séance.", routes: ["/lois", "/deputes", "/eurodeputes"] },
  { term: "Promulgation", def: "L'acte par lequel le président rend une loi définitivement applicable, après son adoption par le Parlement.", routes: ["/lois"] },
  { term: "Circonscription", def: "Le territoire dont un député est l'élu. La France est découpée en 577 circonscriptions législatives.", routes: ["/deputes"] },
  { term: "Législature", def: "La période entre deux élections législatives (en principe 5 ans). La 17ᵉ législature a débuté en 2024.", routes: ["/deputes", "/lois"] },

  // ————— Exécutif / budget —————
  { term: "Premier ministre", def: "Chef du gouvernement, nommé par le président. Il dirige l'action du gouvernement et coordonne les ministres.", routes: ["/executif"] },
  { term: "Conseil des ministres", def: "Réunion hebdomadaire (le mercredi) présidée par le président de la République, où sont adoptés les projets de loi, décrets et nominations importantes.", routes: ["/executif"] },
  { term: "Décret", def: "Une décision réglementaire prise par le gouvernement ou le président pour appliquer une loi, sans passer par le Parlement.", routes: ["/executif"] },
  { term: "PLF (projet de loi de finances)", def: "Le budget de l'État pour l'année. Il fixe les recettes (impôts) et les dépenses par « mission ».", routes: ["/executif", "/local"] },
  { term: "Mission budgétaire", def: "Un grand domaine de dépense de l'État (Défense, Justice, Écologie…). Chaque ministère est rattaché à une ou plusieurs missions.", routes: ["/executif"] },
  { term: "49-3", def: "Article de la Constitution permettant au gouvernement d'adopter un texte sans vote, sauf si une motion de censure le renverse.", routes: ["/executif", "/lois", "/deputes"] },
  { term: "Motion de censure", def: "Vote par lequel les députés peuvent renverser le gouvernement. Elle doit réunir la majorité absolue des députés.", routes: ["/executif", "/deputes"] },
  { term: "Dissolution", def: "Décision du président de mettre fin par anticipation au mandat des députés, provoquant de nouvelles élections législatives.", routes: ["/executif"] },

  // ————— Local / finances locales —————
  { term: "Commune", def: "La plus petite collectivité territoriale, dirigée par un maire et un conseil municipal élus. Il y en a environ 35 000 en France.", routes: ["/local"] },
  { term: "EPCI (intercommunalité)", def: "Un regroupement de communes (communauté de communes, d'agglomération, métropole) qui gère ensemble des compétences comme les transports, les déchets ou l'eau.", routes: ["/local"] },
  { term: "Département / Région", def: "Deux échelons de collectivités au-dessus de la commune. Le département gère notamment l'action sociale (RSA, collèges) ; la région l'économie, les lycées et les transports.", routes: ["/local"] },
  { term: "Épargne brute", def: "Ce qui reste à une collectivité une fois ses dépenses de fonctionnement payées : recettes − dépenses de fonctionnement. Elle sert à investir et à rembourser la dette.", routes: ["/local"] },
  { term: "Encours de dette", def: "Le capital qu'il reste à rembourser sur les emprunts déjà contractés, au 31 décembre.", routes: ["/local", "/dashboard"] },
  { term: "Taxe foncière / d'habitation", def: "Impôts locaux. La taxe foncière est payée par les propriétaires ; la taxe d'habitation ne concerne plus que les résidences secondaires depuis 2023.", routes: ["/local"] },
  { term: "OFGL", def: "Observatoire des Finances et de la Gestion publique Locales : la source officielle des données financières des collectivités.", routes: ["/local"] },
  { term: "RSA / APA / PCH", def: "Aides sociales versées par le département : RSA (revenu de solidarité active), APA (autonomie des personnes âgées), PCH (compensation du handicap).", routes: ["/local"] },

  // ————— Parlement européen —————
  { term: "Parlement européen", def: "L'assemblée des députés européens (720 au total, dont 81 élus en France), qui vote les lois de l'Union européenne avec le Conseil de l'UE.", routes: ["/eurodeputes"] },
  { term: "Groupe politique européen", def: "Les eurodéputés se regroupent par famille politique à l'échelle européenne, au-delà de leur parti national. Ex. : PPE (droite), S&D (sociaux-démocrates), Renew (centristes), Les Verts, La Gauche, Patriotes.", routes: ["/eurodeputes"] },
  { term: "Vote nominal", def: "Un vote où la position de chaque député est enregistrée individuellement. C'est ce qui permet de savoir précisément comment chacun a voté.", routes: ["/eurodeputes"] },
  { term: "Taux de participation aux votes", def: "La proportion de scrutins où l'élu a exprimé une position. Attention : cela mesure la participation aux votes, pas la présence physique en séance.", routes: ["/eurodeputes"] },

  // ————— Pétitions —————
  { term: "Seuil des 100 000 signatures", def: "À partir de 100 000 signatures, une pétition de l'Assemblée peut être transmise à la Conférence des présidents, qui décide de la suite (examen, débat ou classement).", routes: ["/"] },
  { term: "Conférence des présidents", def: "L'instance qui organise le travail de l'Assemblée. Elle décide notamment du sort des pétitions ayant franchi le seuil.", routes: ["/"] },

  // ————— Présidentielles / élus —————
  { term: "Situation judiciaire", def: "Récapitulatif des affaires judiciaires connues concernant un élu (mises en cause, condamnations), avec leurs dates. « Dossier vierge » = aucune affaire signalée.", routes: ["/eurodeputes", "/deputes", "/senateurs", "/presidentielles-2027", "/executif"] },
  { term: "Programme", def: "L'ensemble des engagements pris par un candidat pendant sa campagne. Un engagement peut ensuite être tenu, en cours, ou abandonné.", routes: ["/presidentielles-2027", "/executif"] },

  // ————— Compte / dashboard —————
  { term: "Élus suivis", def: "Les députés et sénateurs que vous suivez. Vous êtes notifié de leurs votes importants dans votre fil.", routes: ["/dashboard"] },
];
