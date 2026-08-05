// Parcours éducatifs de la bulle d'aide : un cheminement d'étapes par page qui explique
// le FONCTIONNEMENT (comment ça marche), pas de simples définitions de mots.
// Chaque étape a une illustration (emoji) pour rester intuitif et visuel.

export type Step = { emoji: string; title: string; text: string; diagram?: string };
export type Parcours = { title: string; intro: string; steps: Step[] };

// Clé = préfixe de route. On choisit le parcours dont la clé (la plus longue) préfixe l'URL.
export const PARCOURS: Record<string, Parcours> = {
  "/presidentielles-2027": {
    title: "L'élection présidentielle, comment ça marche ?",
    intro: "Du dépôt de candidature au remboursement des frais : les grandes étapes.",
    steps: [
      { emoji: "✍️", title: "Les 500 parrainages", text: "Pour se présenter, un candidat doit réunir 500 parrainages d'élus (maires, parlementaires, conseillers…), issus d'au moins 30 départements différents, sans que plus de 50 viennent du même département. Le Conseil constitutionnel les vérifie et publie la liste." },
      { emoji: "🗳️", title: "Deux tours, tous les 5 ans", text: "L'élection a lieu tous les 5 ans, en avril, au suffrage universel direct. Si personne n'obtient plus de 50 % au 1er tour, les deux premiers s'affrontent au 2ᵉ tour, deux semaines plus tard.", diagram: "deux-tours" },
      { emoji: "💶", title: "Un plafond de dépenses", text: "Chaque candidat ne peut pas dépenser ce qu'il veut : les dépenses de campagne sont plafonnées (environ 16,9 M€ au 1er tour, plus pour les deux finalistes) et strictement contrôlées." },
      { emoji: "🧾", title: "Le remboursement par l'État", text: "Après l'élection, l'État rembourse une partie des frais de campagne, selon le score : un candidat qui dépasse 5 % des voix est remboursé bien plus (environ la moitié du plafond) qu'un candidat en dessous (environ 4,75 %)." },
      { emoji: "⚖️", title: "Casier & transparence", text: "Le panneau « situation judiciaire » recense les affaires connues d'un candidat (mises en cause, condamnations), avec leurs dates et sources. « Dossier vierge » = aucune affaire signalée." },
      { emoji: "📋", title: "Suivre un programme", text: "Un programme rassemble les engagements pris en campagne. Après l'élection, chacun peut être tenu, en cours, partiel ou abandonné — c'est ce que le site suit, preuves à l'appui." },
    ],
  },

  "/eurodeputes": {
    title: "L'Union européenne, comment ça marche ?",
    intro: "Le rôle de chaque institution — et où votent vos eurodéputés.",
    steps: [
      { emoji: "🇪🇺", title: "27 pays, des institutions communes", text: "L'Union européenne réunit 27 États qui décident ensemble de sujets communs (marché unique, commerce, climat, numérique…). Trois institutions se partagent le pouvoir : la Commission propose, le Parlement et le Conseil décident.", diagram: "eu-triangle" },
      { emoji: "🏛️", title: "La Commission européenne", text: "C'est l'exécutif de l'UE (un commissaire par pays). Elle PROPOSE les lois européennes, veille à leur application et gère le budget — mais elle ne les vote pas. Elle est approuvée, puis contrôlée, par le Parlement." },
      { emoji: "🗳️", title: "Le Parlement européen", text: "Les 720 eurodéputés, élus DIRECTEMENT par les citoyens (81 pour la France), votent les lois et le budget de l'UE, et contrôlent la Commission — qu'ils peuvent même renverser. C'est la voix directe des citoyens." },
      { emoji: "🤝", title: "Le Conseil de l'UE", text: "Ce sont les ministres des 27 États. Ils votent les lois AVEC le Parlement : une loi européenne doit être adoptée par les DEUX (la « co-décision »). À ne pas confondre avec le Conseil européen, qui réunit les chefs d'État et fixe les grandes orientations." },
      { emoji: "🔵", title: "Des groupes, pas des partis", text: "Au Parlement, les élus se regroupent par familles européennes au-delà de leur parti national : PPE (droite), S&D (sociaux-démocrates), Renew (centristes), Verts/ALE, La Gauche, Patriotes (PFE)…" },
      { emoji: "📊", title: "Sur cette page", text: "Retrouvez chaque eurodéputé français, ses votes par thème (Ukraine, environnement, commerce…), sa présence aux votes comparée aux autres, et son parcours." },
    ],
  },

  "/local": {
    title: "Les collectivités locales, comment ça marche ?",
    intro: "De la commune à la région : qui est élu comment, qui décide, et comment lire les finances.",
    steps: [
      { emoji: "🗳️", title: "Élire le conseil municipal", text: "Tous les 6 ans, les habitants élisent le conseil municipal. Dans les communes de 1 000 habitants et plus, on vote pour une liste : celle qui arrive en tête reçoit la moitié des sièges (« prime majoritaire »), le reste étant réparti à la proportionnelle — ce qui donne des sièges à l'opposition." },
      { emoji: "👤", title: "Le maire et l'opposition", text: "Le conseil élu élit ensuite le maire (en général la tête de la liste gagnante) et ses adjoints. Les élus des autres listes forment l'opposition : ils siègent, débattent et votent, mais sont minoritaires." },
      { emoji: "⚖️", title: "Comment se prennent les décisions", text: "Les décisions (projets, subventions, urbanisme…) sont votées en conseil municipal à la majorité des présents. Les séances sont publiques ; le maire prépare et exécute, le conseil décide." },
      { emoji: "💶", title: "Voter le budget communal", text: "Chaque année, le conseil municipal vote le budget : d'abord les grandes orientations, puis le budget lui-même (recettes et dépenses). Il doit être voté à l'équilibre — la commune ne peut pas voter un budget en déficit." },
      { emoji: "🔗", title: "L'intercommunalité (EPCI)", text: "Les communes se regroupent en intercommunalités (~1 250 en France : communautés de communes, d'agglomération, métropoles) pour gérer ensemble transports, déchets, eau… Les conseillers communautaires qui y siègent ne sont pas élus à part : ce sont des conseillers municipaux, désignés lors des municipales (leur nom est « fléché » sur le bulletin dans les communes de 1 000 habitants et plus). Ils élisent le président de l'intercommunalité." },
      { emoji: "🏛️", title: "Le département", text: "Les conseillers départementaux sont élus par canton, par binôme femme-homme, tous les 6 ans. Le conseil départemental ainsi formé élit son président. Le département gère surtout l'action sociale (RSA, APA, PCH) et les collèges." },
      { emoji: "🤝", title: "Le rôle de l'État dans le budget départemental", text: "Le département vote son budget, mais une grande part de ses recettes vient de l'État : dotations (dont la DGF) et compensations pour les aides sociales qu'il verse pour le compte de l'État (le RSA notamment). L'État ne vote pas le budget, mais il en conditionne fortement les moyens." },
      { emoji: "🌍", title: "La région", text: "Élue à la proportionnelle de liste (avec prime majoritaire), la région gère l'économie, les lycées et les transports régionaux (TER). Elle élit aussi son président." },
      { emoji: "💰", title: "Lire les finances", text: "Recettes − dépenses de fonctionnement = épargne brute (ce qui reste pour investir et rembourser). L'encours de dette est le capital restant à rembourser. Source officielle : l'OFGL." },
      { emoji: "🧾", title: "La fiscalité locale", text: "Les communes votent la taxe foncière (payée par les propriétaires) et la taxe d'habitation (résidences secondaires uniquement depuis 2023). Départements et régions ne votent plus ces taux (compensés en TVA)." },
    ],
  },

  "/executif": {
    title: "Le pouvoir exécutif, comment ça marche ?",
    intro: "Du président au budget : qui décide quoi.",
    steps: [
      { emoji: "🇫🇷", title: "Président & Premier ministre", text: "Le président nomme le Premier ministre, qui dirige le gouvernement. Le président préside le Conseil des ministres et fixe les grandes orientations." },
      { emoji: "📜", title: "Le Conseil des ministres", text: "Chaque mercredi, le gouvernement adopte les projets de loi, les décrets et les nominations importantes. Le site en publie les comptes rendus résumés." },
      { emoji: "🖋️", title: "Le décret", text: "Pour appliquer une loi, le gouvernement prend des décrets — des décisions réglementaires qui ne passent pas par le Parlement." },
      { emoji: "💶", title: "Le budget (PLF)", text: "Chaque automne, le projet de loi de finances fixe les recettes et les dépenses de l'État par « mission » (Défense, Justice, Écologie…). Chaque ministère est rattaché à des missions." },
      { emoji: "⚔️", title: "49-3 & motion de censure", text: "Le 49-3 permet d'adopter un texte sans vote — mais l'Assemblée peut riposter par une motion de censure qui, si elle réunit la majorité, renverse le gouvernement." },
    ],
  },

  "/lois": {
    title: "Comment une loi est adoptée ?",
    intro: "Le parcours d'un texte, du dépôt à la promulgation.",
    steps: [
      { emoji: "📝", title: "Qui propose ?", text: "Un projet de loi vient du gouvernement ; une proposition de loi vient de parlementaires (députés ou sénateurs)." },
      { emoji: "🔍", title: "L'examen en commission", text: "Avant le vote, une commission spécialisée étudie le texte en détail et l'amende (le modifie)." },
      { emoji: "🔁", title: "La navette", text: "Le texte fait des allers-retours entre l'Assemblée et le Sénat jusqu'à une version identique. En cas de désaccord persistant, l'Assemblée a le dernier mot.", diagram: "navette" },
      { emoji: "🗳️", title: "Le vote solennel", text: "Les élus votent l'ensemble du texte. C'est ce vote « sur l'ensemble » qui compte vraiment — la plupart des autres votes portent sur des amendements." },
      { emoji: "✅", title: "La promulgation", text: "Une fois adoptée, la loi est promulguée par le président, puis publiée au Journal officiel : elle devient applicable." },
    ],
  },

  "/senateurs": {
    title: "Le Sénat, comment ça marche ?",
    intro: "Qui sont les sénateurs, comment ils sont élus et ce qu'ils font.",
    steps: [
      { emoji: "🏛️", title: "348 sénateurs", text: "Le Sénat est la seconde chambre du Parlement. Il compte 348 sénateurs, élus pour 6 ans, renouvelés par moitié tous les 3 ans." },
      { emoji: "🗳️", title: "Un suffrage indirect", text: "Contrairement aux députés, les sénateurs ne sont pas élus par tous les citoyens : ils sont élus par environ 162 000 « grands électeurs » (maires, conseillers municipaux, départementaux, régionaux, députés). C'est un scrutin indirect." },
      { emoji: "🌍", title: "Représenter les territoires", text: "Le Sénat représente les collectivités territoriales (communes, départements, régions). Il porte particulièrement la voix des zones rurales et des élus locaux." },
      { emoji: "🔁", title: "Voter la loi (la navette)", text: "Le Sénat vote les lois avec l'Assemblée : le texte fait des allers-retours entre les deux chambres (la « navette ») jusqu'à un accord. En cas de désaccord persistant, c'est l'Assemblée qui tranche en dernier." },
      { emoji: "🔍", title: "Contrôler, sans renverser", text: "Le Sénat contrôle le gouvernement (questions, commissions d'enquête, rapports) mais, à la différence de l'Assemblée, il NE PEUT PAS le renverser : le gouvernement n'est responsable que devant les députés." },
      { emoji: "📊", title: "Sur cette page", text: "Trouvez votre sénateur, sa présence aux votes comparée aux autres, ses initiatives législatives, et les textes actuellement examinés au Sénat." },
    ],
  },

  "/deputes": {
    title: "L'Assemblée nationale, comment ça marche ?",
    intro: "Qui sont les députés, comment ils sont élus et ce qu'ils font.",
    steps: [
      { emoji: "🏛️", title: "577 députés", text: "L'Assemblée nationale est la chambre élue directement par les citoyens. Elle compte 577 députés, élus pour 5 ans, un par circonscription." },
      { emoji: "🗳️", title: "Élus au suffrage direct", text: "Chaque député est élu au scrutin majoritaire à deux tours dans sa circonscription. C'est le vote direct de tous les citoyens, contrairement au Sénat (indirect)." },
      { emoji: "📜", title: "Voter la loi et le budget", text: "Les députés examinent, amendent et votent les lois, ainsi que le budget de l'État (loi de finances). Le vote qui compte est celui « sur l'ensemble » du texte." },
      { emoji: "⚔️", title: "Renverser le gouvernement", text: "L'Assemblée a un pouvoir que le Sénat n'a pas : elle peut renverser le gouvernement par une motion de censure. C'est aussi elle qui a le dernier mot en cas de désaccord avec le Sénat." },
      { emoji: "✍️", title: "Proposer des textes", text: "Au-delà de voter, un député peut déposer ses propres propositions de loi. Le classement des initiatives montre qui en dépose le plus." },
      { emoji: "🎖️", title: "Ses fonctions à l'Assemblée", text: "En plus de son mandat, un député peut occuper des responsabilités internes : présider l'Assemblée (le « perchoir », 4ᵉ personnage de l'État), être vice-président·e, questeur·e ou secrétaire — ensemble ils forment le Bureau qui dirige l'Assemblée. Il peut aussi présider ou siéger dans l'une des 8 commissions permanentes (Finances, Lois, Affaires sociales…) où les textes sont préparés, présider son groupe politique, ou être rapporteur d'un texte, chargé de l'analyser et de le défendre en séance." },
      { emoji: "🔗", title: "Cumuler un autre mandat ?", text: "Depuis 2017, un député ne peut plus diriger une collectivité en même temps : il ne peut être ni maire, ni adjoint, ni président (ou vice-président) d'une intercommunalité, d'un conseil départemental ou régional. Il peut en revanche rester simple conseiller municipal, départemental ou régional. Devenir ministre est également incompatible : le député doit alors quitter son siège, repris par son·sa suppléant·e." },
      { emoji: "📊", title: "Sur cette page", text: "Trouvez votre député, consultez ses votes réels, sa présence comparée aux autres, ses initiatives, ses autres fonctions, et les textes examinés par l'Assemblée." },
    ],
  },

  "/dashboard": {
    title: "Votre espace premium",
    intro: "Suivre vos élus et vos textes favoris.",
    steps: [
      { emoji: "⭐", title: "Suivre des élus", text: "Ajoutez des députés et sénateurs à vos suivis. Vous êtes prévenu de leurs votes importants dans votre fil de notifications." },
      { emoji: "🔖", title: "Vos favoris", text: "Enregistrez des lois, communes, départements ou régions pour les retrouver d'un clic." },
      { emoji: "🔔", title: "Le fil de notifications", text: "À chaque vote solennel d'un élu que vous suivez, une notification apparaît, avec son sens (pour/contre) et l'objet du scrutin." },
    ],
  },

  "/": {
    title: "Le pouvoir citoyen : les pétitions",
    intro: "Comment une pétition peut influencer l'Assemblée.",
    steps: [
      { emoji: "✍️", title: "Signer une pétition", text: "Sur la plateforme officielle de l'Assemblée, tout citoyen peut soutenir une pétition en la signant." },
      { emoji: "💯", title: "Le seuil des 100 000", text: "À partir de 100 000 signatures, la pétition peut être transmise à la Conférence des présidents de l'Assemblée." },
      { emoji: "⚖️", title: "La décision", text: "La Conférence des présidents décide de la suite : examen en commission, débat en séance, ou classement. Le site affiche le statut réel de chaque pétition." },
    ],
  },
};

// Choisit le parcours le plus spécifique pour une URL donnée.
export function parcoursForPath(pathname: string): Parcours | null {
  const keys = Object.keys(PARCOURS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (k === "/" ? pathname === "/" : (pathname === k || pathname.startsWith(k + "/"))) return PARCOURS[k];
  }
  return null;
}
