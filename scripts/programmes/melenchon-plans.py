"""Programme de Jean-Luc Mélenchon : plan thématique « Ruralités » et plan d'investissement productif
« BTP-logement » (melenchon2027.fr, lus le 11/10/2026).

Même forme que les programmes déjà en base (table candidate_proposals) : par thème, une ligne de
contexte (subsection = "__contexte__") puis une ligne par mesure, avec son explication « ? ».
Tout est repris des deux pages officielles ; aucun chiffre n'est ajouté.

Usage : python scripts/programmes/melenchon-plans.py   (lit .env.local ; remplace les lignes du candidat)
"""
import hashlib
import urllib.parse, json, os, re, sys, unicodedata, urllib.request
from datetime import datetime, timezone

RURAL = "https://melenchon2027.fr/programme/plans-thematiques/ruralite/"
BTP = "https://melenchon2027.fr/programme/plans-investissement/btp-logement/"
SLUG = "jean-luc-melenchon"

# (thème, source, contexte, [(mesure, explication), ...])
THEMES = [
  ("Agriculture paysanne et alimentation locale", RURAL,
   "Le plan « Ruralités » veut relocaliser l'agriculture et la faire « bifurquer » vers un modèle paysan, présenté comme créateur de milliers d'emplois dans les campagnes. L'État doit, selon lui, appuyer les petits producteurs et les petites industries agroalimentaires.",
   [
    ("Appuyer les circuits courts de transformation et de distribution, et les regroupements de producteurs locaux en coopératives à taille humaine, pour une plus grande autonomie alimentaire des bassins de vie.",
     "Un « circuit court » limite les intermédiaires entre le producteur et le consommateur (vente directe, marché, magasin de producteurs). L'idée est que la nourriture consommée dans un territoire y soit davantage produite et transformée."),
    ("Encourager la création de marchés dans les communes rurales et y attribuer les places en priorité aux agriculteurs et artisans locaux.",
     "Le plan part du constat que de nombreuses communes rurales n'ont plus aucun commerce. Un marché donne un débouché direct aux producteurs du secteur et recrée un lieu de vie."),
    ("Développer de petites structures de transformation alimentaire de proximité, pour valoriser sur place les produits agricoles locaux.",
     "Transformer (abattoir, laiterie, conserverie, moulin…) près du lieu de production évite que la valeur ajoutée parte ailleurs et raccourcit les transports."),
    ("Structurer des « filières d'avenir » créatrices d'emplois écologiques locaux : lin, chanvre, miscanthus, etc.",
     "Ces plantes servent notamment à fabriquer des matériaux d'isolation et de construction dits « biosourcés ». Le plan logement du même candidat prévoit d'en augmenter l'usage dans les chantiers publics."),
    ("Protéger le foncier agricole, forestier et naturel par un plan généralisé, afin d'appliquer le « zéro artificialisation nette » des sols.",
     "« Artificialiser » un sol, c'est le bétonner ou le bitumer. Le « zéro artificialisation nette » (ZAN) consiste à ne plus consommer de nouvelles terres sans en rendre autant à la nature ; il vise ici à préserver les terres cultivables."),
    ("Garantir une gestion publique et démocratique de l'eau, en donnant la priorité aux usages domestiques et aux cultures nourricières en cas de pénurie.",
     "Lors des sécheresses, l'eau doit être partagée entre habitants, agriculture et industrie. Le plan fixe un ordre de priorité : l'eau du robinet et l'agriculture qui nourrit passent d'abord."),
    ("Instaurer une zone tampon sans pesticides autour des habitations, des crèches, des écoles et des hôpitaux, et adopter un plan d'éradication des maladies chroniques liées aux pollutions.",
     "Une « zone tampon » est une bande de terrain où l'épandage est interdit. Le plan affirme que 40 % des cancers sont évitables en agissant sur l'environnement ; ce chiffre est celui du document."),
    ("Renforcer l'écoute et la prévention destinées aux agriculteurs, avec les associations spécialisées, et développer les visites de convivialité entre exploitants isolés.",
     "La mesure répond à l'isolement de nombreux exploitants, seuls sur leur ferme. Elle s'appuie sur des associations déjà actives plutôt que sur un nouveau dispositif administratif."),
    ("Soutenir les fêtes populaires et événements locaux, dont les comices agricoles, face aux « tentatives de récupération identitaire » par l'extrême droite.",
     "Un comice agricole est une fête-concours où les agriculteurs d'un canton présentent leurs bêtes et leurs produits. La formulation entre guillemets est celle du plan."),
   ]),
  ("Collectivités : redonner le pouvoir aux communes", RURAL,
   "Le plan juge que les réformes territoriales (loi NOTRe, loi 3DS), la répartition des dotations et la suppression de la taxe d'habitation ont réduit l'autonomie des communes, qui représentent selon lui 88 % des communes du pays pour les campagnes et villes moyennes. Il veut en refaire « la cellule de base de la démocratie locale ».",
   [
    ("Supprimer les métropoles « technocratiques » en abrogeant les lois qui ont concentré les pouvoirs locaux, et rendre aux communes le libre choix de s'associer.",
     "Les métropoles sont de grandes intercommunalités créées autour des principales villes, auxquelles les communes ont dû transférer des compétences. Le plan veut que l'adhésion redevienne un choix."),
    ("Refuser les fusions forcées de communes.",
     "Une fusion regroupe plusieurs communes en une seule « commune nouvelle ». Le plan s'oppose à ce qu'elle soit imposée d'en haut."),
    ("Réduire la concentration des pouvoirs entre les mains des préfets et redonner des moyens aux services locaux de l'État.",
     "Le préfet représente l'État dans le département. Les « administrations déconcentrées » sont les services de l'État sur place (équipement, agriculture, etc.), dont les effectifs ont été réduits."),
    ("Rééquilibrer la dotation globale de fonctionnement (DGF) entre communes et l'indexer sur l'inflation.",
     "La DGF est la principale enveloppe que l'État verse chaque année aux collectivités pour fonctionner. « Indexée sur l'inflation », elle augmenterait automatiquement avec les prix."),
    ("Préserver et augmenter la dotation d'équipement des territoires ruraux, et créer un fonds de soutien communal pour recruter et mieux payer les agents.",
     "La dotation d'équipement des territoires ruraux (DETR) finance des investissements des petites communes : école, voirie, salle communale."),
    ("Rétablir une taxation locale selon un barème tenant compte des revenus et du confort des logements.",
     "La taxe d'habitation sur les résidences principales a été supprimée. Le plan propose un impôt local qui dépendrait des revenus du foyer, contrairement à l'ancienne taxe."),
    ("Rendre gratuite l'ingénierie publique pour les petites communes, notamment l'instruction des permis de construire, et préserver les CAUE.",
     "L'« ingénierie », ce sont les experts (urbanistes, techniciens) dont une petite mairie a besoin pour monter un projet. Les CAUE sont des organismes départementaux de conseil en architecture et urbanisme."),
    ("Remplacer la fiscalité des logements vacants par une taxe unique et progressive selon le nombre de logements vides détenus.",
     "« Progressive » signifie que le taux augmente avec le nombre de logements laissés vides : celui qui en possède beaucoup paierait proportionnellement plus."),
    ("Renforcer le statut de l'élu local : maintien des droits sociaux et des trimestres de retraite, formation continue, protection contre les violences et menaces.",
     "Une loi du 22 décembre 2025 a créé un statut de l'élu local ; le plan veut aller plus loin, car beaucoup de maires de petites communes exercent leur mandat en plus de leur métier."),
    ("Imposer la parité dans les exécutifs municipaux et intercommunaux : maire et premier adjoint, présidence et vice-présidences.",
     "L'« exécutif » désigne ceux qui dirigent la collectivité. La parité s'applique déjà aux listes de candidats, mais pas à ces fonctions."),
   ]),
  ("Écologie : la planification dans les campagnes", RURAL,
   "Les campagnes sont, selon le plan, en première ligne du changement climatique et des « conflits d'accaparement » de l'eau et des terres. Il veut y appliquer la « règle verte » : ne pas prendre à la nature davantage qu'elle ne peut donner.",
   [
    ("Remplacer les régions actuelles par des « éco-régions » délimitées selon des critères écologiques (bassins versants, façades maritimes, massifs montagneux).",
     "Un bassin versant est le territoire dont toutes les eaux s'écoulent vers un même fleuve. Découper les régions ainsi viserait à gérer l'eau et les milieux naturels à la bonne échelle."),
    ("Donner aux communes un droit de préemption sur les zones stratégiques pour la planification écologique : carrières, énergies renouvelables, protection des forêts.",
     "Le droit de préemption permet à une commune d'acheter un terrain en priorité quand il est mis en vente."),
    ("Créer des « défenseurs de la nature », chargés de la protection de l'eau, de l'air, de la forêt et des sols.",
     "Le plan ne précise pas leur statut ; il s'agit de responsables publics dédiés à la protection des milieux naturels."),
    ("Adapter les zones habitées au changement climatique : désimperméabiliser les sols, créer des îlots et corridors de fraîcheur.",
     "« Désimperméabiliser », c'est retirer le bitume ou le béton pour que la pluie s'infiltre. Un îlot de fraîcheur est un espace végétalisé ou ombragé qui reste plus frais pendant les canicules."),
    ("Sanctuariser les forêts face à la surexploitation et à la privatisation des forêts publiques, et soutenir une gestion « à couvert continu ».",
     "La gestion « à couvert continu » évite les coupes rases : on prélève des arbres un par un, de sorte que la forêt reste toujours boisée."),
    ("Refaire l'isolation d'au moins 700 000 logements par an, avec un service public de la rénovation énergétique et un guichet unique pour les propriétaires.",
     "Un « guichet unique » est un interlocuteur public qui regroupe conseils, aides et démarches. L'objectif chiffré est repris dans le plan d'investissement BTP-logement du candidat."),
    ("Remplacer progressivement les chauffages au fioul et au gaz par des systèmes n'émettant pas de gaz à effet de serre (pompes à chaleur, géothermie).",
     "Une pompe à chaleur capte la chaleur de l'air ou du sol et fonctionne à l'électricité ; la géothermie utilise la chaleur du sous-sol."),
    ("Créer une filière de formation aux métiers de la rénovation, du CAP à la licence professionnelle.",
     "Le plan constate un manque d'artisans formés ; sans eux, les objectifs de rénovation ne peuvent pas être tenus."),
   ]),
  ("École de proximité", RURAL,
   "Le plan veut garantir à toutes les familles une école publique laïque proche du domicile. Il relève que les mères assurent 75 % des trajets d'accompagnement des enfants et que l'éloignement des écoles et des modes de garde pèse d'abord sur elles.",
   [
    ("Densifier le réseau d'établissements en zone rurale pour limiter à 15 minutes le temps de transport scolaire.",
     "L'objectif est une durée maximale de trajet pour les élèves ; le plan ne précise pas le nombre d'établissements à ouvrir."),
    ("Maintenir les écoles à classe unique et abroger les « conventions ruralité ».",
     "Une classe unique réunit tous les niveaux du primaire avec un seul enseignant. Les « conventions ruralité », signées entre l'État et des élus, organisent le regroupement d'écoles ; le plan estime qu'elles mènent à des fermetures."),
    ("Rendre les transports scolaires gratuits.",
     "Les transports scolaires relèvent aujourd'hui des régions, qui fixent les tarifs ; ils sont gratuits dans certaines et payants dans d'autres."),
    ("Créer un service public de la petite enfance, adapté aux horaires des travailleurs en zone rurale.",
     "Il s'agirait d'un accueil public des jeunes enfants (crèches, assistantes maternelles) garanti sur tout le pays."),
    ("Diversifier l'offre des lycées ruraux (options rares, jumelages avec des lycées urbains) et construire des lycées professionnels bien équipés.",
     "Le plan veut que les élèves des campagnes aient les mêmes choix d'orientation que ceux des villes, sans devoir partir loin."),
    ("Rétablir un service public national de l'orientation et organiser des forums des métiers itinérants.",
     "L'orientation scolaire a été en partie confiée aux régions ; le plan veut qu'elle redevienne une mission nationale."),
    ("Ouvrir des places d'internat gratuites pour les élèves de la voie professionnelle et les apprentis, en priorité pour les plus éloignés.",
     "L'internat permet à un élève de dormir sur place quand son lycée ou son lieu d'apprentissage est trop loin du domicile."),
   ]),
  ("Santé et services publics de proximité", RURAL,
   "« Vivre à la campagne ne doit pas obliger à renoncer aux services essentiels », écrit le plan, qui avance qu'environ 6 millions de personnes n'ont pas de médecin traitant. Il promet de stopper les fermetures et de rouvrir des lieux d'accueil physique.",
   [
    ("Garantir un service public de santé à moins de trente minutes de chaque habitant, en rouvrant progressivement urgences, maternités et EHPAD publics.",
     "L'objectif est un temps d'accès maximal. Un EHPAD est une maison de retraite médicalisée."),
    ("Combattre les déserts médicaux : régulation de l'installation des médecins, recrutement de médecins publics, centres de santé avec médecins salariés.",
     "« Réguler l'installation » revient à limiter la liberté des médecins de s'installer où ils veulent, pour les orienter vers les zones qui en manquent. Dans un centre de santé, les médecins sont salariés et non payés à l'acte."),
    ("Engager un plan pluriannuel de recrutement des soignants et revaloriser leurs métiers ; construire un service public de la dépendance.",
     "La « dépendance » désigne la perte d'autonomie des personnes âgées. Le plan prévoit aussi un réseau d'équipes de soins à domicile."),
    ("Stopper les fermetures de services publics et lancer un plan de redéploiement : bureaux de poste, gares, hôpitaux, écoles, tribunaux, Trésor public.",
     "Le plan chiffre le recul : selon lui, 62 % des communes rurales n'avaient plus aucun commerce en 2021, contre 25 % en 1980."),
    ("Rouvrir des guichets physiques et garantir des formulaires papier : la dématérialisation doit rester « une possibilité, jamais une obligation ».",
     "« Dématérialiser » une démarche, c'est ne la proposer que sur internet. Le plan estime que cela prive de leurs droits les personnes âgées ou mal connectées."),
    ("Développer des services publics itinérants, comme un « bus des services publics » réunissant impôts, assurance maladie et France Travail.",
     "Le bus se déplace de village en village à dates fixes, pour les habitants éloignés de toute administration."),
    ("Faire du département l'organisateur de l'égalité territoriale, et réunir des états généraux des espaces ruraux.",
     "Le département gère déjà l'action sociale et les routes ; le plan veut lui donner les moyens d'assurer le maillage des services publics."),
   ]),
  ("Égalité : droits des femmes, handicap, lutte contre les discriminations", RURAL,
   "Le plan affirme que les plus exposés aux « violences sociales » en zone rurale sont les mêmes qu'ailleurs : classes populaires, femmes, jeunes, personnes âgées, handicapées ou LGBTI — avec l'éloignement en plus.",
   [
    ("Créer des permanences et des solutions itinérantes pour les associations d'aide aux femmes victimes de violences.",
     "En zone rurale, la première association peut se trouver à des dizaines de kilomètres ; l'itinérance consiste à aller vers les victimes."),
    ("Créer les nouvelles brigades de gendarmerie de proximité promises en zone rurale, et former gendarmes et agents à l'accueil des victimes.",
     "Le plan indique que ces créations de brigades, déjà annoncées, sont « aujourd'hui à l'arrêt »."),
    ("Garantir un accès effectif à l'IVG près du domicile, y compris par des consultations itinérantes, et développer l'accès à la PMA dans les hôpitaux de proximité.",
     "L'IVG est l'interruption volontaire de grossesse ; la PMA, la procréation médicalement assistée."),
    ("Sanctuariser le financement public des centres de planification familiale et des antennes du Planning familial en milieu rural.",
     "Ces centres assurent un accueil anonyme et gratuit sur la contraception et la sexualité. Le plan les dit menacés de fermeture faute de subventions."),
    ("Garantir une solution de mobilité de proximité aux personnes âgées, handicapées ou à mobilité réduite.",
     "Sans voiture ni transport adapté, ces personnes ne peuvent plus se soigner ni faire leurs courses ; la mesure vise un transport accessible partout."),
   ]),
  ("Transports et numérique : désenclaver les campagnes", RURAL,
   "Le plan relève que 13,5 % des ruraux motorisés consacrent plus d'un mois de revenu par an au carburant, une proportion qui ne dépasse pas 9 % en ville. Il veut reconstruire un réseau de transports publics et en finir avec les « zones blanches » numériques.",
   [
    ("Renationaliser la SNCF et mettre fin à la mise en concurrence des lignes ferroviaires.",
     "Depuis l'ouverture à la concurrence, d'autres compagnies peuvent exploiter des lignes françaises. Le plan veut revenir à un opérateur public unique."),
    ("Rouvrir les « lignes du quotidien », augmenter le nombre et la fréquence des trains, et maintenir des guichets dans les gares.",
     "Les « lignes du quotidien » sont les petites lignes régionales, dont beaucoup ont fermé."),
    ("Créer un pôle public des transports et mailler le pays de transports interconnectés : trains, cars, vélos, transport à la demande.",
     "Le transport à la demande est un véhicule collectif qui ne circule que sur réservation, là où une ligne régulière ne serait pas rentable."),
    ("Ouvrir les transports scolaires aux autres usagers, y compris hors période scolaire.",
     "Les cars scolaires sont souvent le seul transport collectif d'un village ; ils serviraient ainsi à tous les habitants."),
    ("Diffuser des voitures électriques légères à prix modeste par la commande publique et le « leasing social », et soutenir les garages solidaires.",
     "Le leasing social est une location longue durée à loyer réduit, réservée aux ménages modestes."),
    ("Relancer le fret ferroviaire, fluvial et maritime pour réduire le nombre de camions sur les routes.",
     "Le fret désigne le transport de marchandises."),
    ("Achever la couverture en fibre et garantir un réseau mobile de qualité partout, par des réseaux de télécommunication sous contrôle public.",
     "Une « zone blanche » est un lieu sans réseau mobile ou sans internet correct."),
    ("Faire de l'accès à internet un service d'intérêt général : wifi gratuit et postes informatiques dans les mairies, bibliothèques et gares.",
     "Un « service d'intérêt général » est un service que la collectivité doit garantir à tous, comme l'eau ou l'électricité."),
   ]),
  ("Emploi, commerces et industrie locale", RURAL,
   "« Travailler près de chez soi » suppose, selon le plan, de rapprocher les lieux de travail des lieux de vie : renforcer le commerce de proximité face aux grandes surfaces et au e-commerce, et relocaliser les industries essentielles. Il cite près de 70 000 défaillances d'entreprises en 2025.",
   [
    ("Aider l'installation de commerces de proximité dans les villages : aides à l'installation, subventions, prêt de locaux.",
     "Les aides seraient versées à l'ouverture puis pour le fonctionnement, un commerce de village étant rarement rentable les premières années."),
    ("Soutenir les commerces ambulants et les points multiservices (épicerie, poste, point relais, café) dans les communes sans commerce.",
     "Un point multiservices réunit plusieurs activités dans un même local pour qu'il soit viable."),
    ("Soumettre l'ouverture de nouvelles grandes et moyennes surfaces à l'objectif de zéro artificialisation et à la préservation des petits commerces.",
     "L'ouverture d'un supermarché est déjà soumise à autorisation d'une commission départementale ; le plan veut en durcir les critères."),
    ("Créer une garantie d'emploi : tout chômeur de longue durée pourrait se voir proposer un emploi payé au moins au SMIC revalorisé, dans un secteur utile.",
     "L'État deviendrait « employeur en dernier ressort » : il proposerait lui-même un poste à ceux qui n'en trouvent pas."),
    ("Relocaliser les industries stratégiques pour la bifurcation écologique, et conditionner les aides aux entreprises à leur implantation locale et au maintien de l'emploi.",
     "« Conditionner » une aide, c'est ne la verser que si l'entreprise respecte des engagements, ici ne pas délocaliser ni licencier."),
    ("Modifier le code des marchés publics pour que les collectivités puissent adapter leurs appels d'offres aux filières locales.",
     "Les règles européennes interdisent aujourd'hui de réserver un marché public à une entreprise parce qu'elle est locale."),
    ("Soutenir l'économie sociale et solidaire et la reprise d'entreprises en coopératives par leurs salariés.",
     "Dans une coopérative (SCOP ou SCIC), l'entreprise appartient à ses salariés ou à ses usagers, qui votent les décisions."),
    ("Développer des espaces de travail partagés pour les indépendants, créateurs d'entreprise et télétravailleurs.",
     "Ces lieux mutualisent bureau, connexion et matériel, et rompent l'isolement de ceux qui travaillent seuls."),
   ]),
  ("Culture, sport et vie associative", RURAL,
   "Le plan attribue l'isolement en zone rurale à la disparition des lieux communs. Il fait du sport, de la culture et des associations « des leviers majeurs d'émancipation », parfois le seul lien social.",
   [
    ("Lancer un plan national contre l'isolement des personnes âgées ou dépendantes : visites à domicile, réseaux de solidarité de voisinage.",
     "La mesure s'appuie sur des bénévoles et des professionnels qui passent régulièrement chez les personnes seules."),
    ("Garantir les subventions aux associations par des conventions pluriannuelles, et sortir de la logique des appels à projets.",
     "Avec un appel à projets, l'association doit candidater chaque année sans certitude ; une convention pluriannuelle garantit un financement sur plusieurs années."),
    ("Créer ou rénover des espaces jeunesse de proximité (maisons des jeunes, foyers ruraux), avec des animateurs et des horaires adaptés.",
     "Le plan note que les jeunes ruraux n'ont souvent aucun lieu pour se retrouver le soir et le week-end."),
    ("Lancer un plan d'urgence pour construire et rénover les équipements sportifs de proximité : piscines, salles, pistes de skate.",
     "Le plan prévoit aussi les transports pour y accéder, sans quoi l'équipement reste inutilisable pour ceux qui n'ont pas de voiture."),
    ("Implanter des artistes partout dans le pays et faire circuler médiathèques et bibliobus dans les communes sans équipement.",
     "Un bibliobus est une bibliothèque installée dans un véhicule, qui passe de village en village."),
    ("Créer un fonds de sauvegarde du petit patrimoine rural et soutenir les chantiers participatifs.",
     "Le « petit patrimoine » désigne lavoirs, chapelles, fours à pain, calvaires… qui ne sont pas classés monuments historiques."),
   ]),
  ("Tourisme maîtrisé", RURAL,
   "Le tourisme peut être « un moteur essentiel » des économies rurales, mais ne doit pas, selon le plan, transformer les campagnes en « simples décors » ni aggraver la pression sur le logement.",
   [
    ("Fixer un quota maximal de meublés touristiques dans les zones en tension, pour lutter contre la spéculation sur le logement.",
     "Un meublé touristique est un logement loué à la nuit ou à la semaine, de type Airbnb. Le plan estime qu'il retire des logements aux habitants et aux saisonniers."),
    ("Redéployer des auberges de jeunesse dans les zones rurales et les villes moyennes.",
     "Elles sont présentées comme un hébergement collectif à prix limité, alternatif aux meublés touristiques."),
    ("Garantir un logement digne aux travailleurs saisonniers et renforcer leurs droits (contrats, rémunérations).",
     "Dans les stations touristiques, les saisonniers peinent à se loger pendant la saison où ils travaillent."),
    ("Développer véloroutes, voies vertes et sentiers balisés, utilisables par les visiteurs comme par les habitants.",
     "Une voie verte est un chemin réservé aux piétons et aux vélos, souvent une ancienne voie ferrée."),
    ("Maîtriser la surfréquentation des sites naturels fragiles : sensibiliser, baliser, organiser l'accès.",
     "Certains sites reçoivent plus de visiteurs que leur milieu naturel ne peut en supporter ; l'accès peut alors être régulé."),
   ]),
  ("Logement : 400 000 logements abordables par an", BTP,
   "Premier « plan d'investissement productif » publié. Il dresse le constat suivant : 350 000 personnes sans domicile (le double d'il y a dix ans), 2,8 millions de ménages en attente d'un logement public, 24 556 expulsions en 2024 et plus de 3 millions de logements vacants. Il juge que « le marché a totalement échoué ».",
   [
    ("Créer 400 000 logements abordables par an pendant cinq ans, dont 200 000 logements publics.",
     "Le plan reprend les besoins estimés par la Fondation pour le logement des défavorisés (400 000) et par l'Union sociale pour l'habitat (200 000), contre environ 270 000 et 100 000 aujourd'hui selon lui."),
    ("Parmi les logements publics, construire 140 000 logements « très sociaux » (PLAI) par an.",
     "Les PLAI sont les logements sociaux aux loyers les plus bas, réservés aux ménages les plus modestes."),
    ("Obtenir plus de 35 % de ces logements (150 000 par an) en mobilisant l'existant : réquisition de logements vacants, limitation des Airbnb, transformation de bureaux.",
     "Plutôt que de tout construire, le plan veut réutiliser des bâtiments vides. Il prévoit de doubler la transformation de bureaux et locaux en logements, à 50 000 par an."),
    ("Réserver chaque année 40 000 logements aux seniors, 30 000 aux étudiants et jeunes actifs, 10 000 à l'hébergement d'urgence.",
     "Ces chiffres sont des sous-objectifs à l'intérieur des 400 000 logements annuels."),
    ("Relever les objectifs de la loi SRU et alourdir les sanctions contre les communes qui ne la respectent pas.",
     "La loi SRU oblige les communes urbaines à compter une part minimale de logements sociaux. Le programme du candidat prévoit de porter ce seuil à 30 %."),
    ("Développer l'accession à la propriété « non spéculative », notamment par le bail réel solidaire, avec des prêts bonifiés d'un pôle public bancaire.",
     "Avec le bail réel solidaire, on achète les murs mais pas le terrain, ce qui baisse le prix ; en échange, le prix de revente est plafonné."),
    ("Encadrer les prix du foncier et renforcer les établissements publics fonciers.",
     "Le « foncier », c'est le terrain. Un établissement public foncier achète des terrains pour les revendre aux collectivités qui veulent construire."),
    ("Limiter les meublés touristiques à 60 jours par an et instaurer une taxe unique et progressive sur les logements vacants.",
     "Ces deux mesures du programme visent à remettre des logements en location à l'année."),
    ("Plafonner à cinq le nombre de logements transmissibles par héritage ; au-delà, les biens seraient réquisitionnés et redistribués.",
     "Le plan indique que 3,5 % des ménages possèdent plus de cinq logements et détiennent la moitié des logements loués."),
   ]),
  ("Logement : rénover et adapter aux canicules", BTP,
   "Le plan recense plus de 3 millions de « passoires thermiques » parmi les résidences principales et affirme que près de la moitié des logements deviennent des « bouilloires » pendant les canicules. Le logement représente selon lui 15 % des émissions de gaz à effet de serre du pays.",
   [
    ("Isoler au moins 700 000 logements par an, dont 150 000 logements publics, pour supprimer les passoires thermiques en cinq ans.",
     "Une passoire thermique est un logement très mal isolé (étiquettes F et G), cher à chauffer."),
    ("Prendre en charge 100 % des travaux pour les ménages les plus modestes, puis de façon dégressive selon les revenus, en excluant les propriétaires de plus de cinq logements.",
     "« Dégressif » : plus le revenu est élevé, plus la part payée par l'État diminue. Le reste serait couvert par des prêts d'un pôle public bancaire."),
    ("Lancer dès 2027 un plan d'urgence contre les canicules : volets, stores et brasseurs d'air, en priorité dans les logements publics.",
     "Le plan chiffre à plus de 8 000 les morts de la canicule de juin-juillet 2026. Un brasseur d'air est un ventilateur de plafond."),
    ("Créer pour les locataires un droit opposable aux travaux de confort thermique.",
     "Un droit « opposable » peut être réclamé devant un juge : le bailleur serait obligé d'équiper un logement qui surchauffe."),
    ("Remplacer 400 000 chaudières au fioul et 350 000 chaudières à gaz par an.",
     "Pour le fioul, le plan parle de quatre fois le rythme actuel, afin de les faire quasiment disparaître en 2032."),
    ("Rénover les bâtiments publics, associatifs et tertiaires, avec un soutien aux petites entreprises et aux associations.",
     "Le « tertiaire » regroupe bureaux, commerces et entrepôts. Les bâtiments publics représentent 30 % de ce parc selon le plan."),
    ("Porter à 50 % d'ici 2032 la part des chantiers publics utilisant un matériau biosourcé ou géosourcé (bois, paille, terre crue, chanvre).",
     "« Biosourcé » : issu du vivant (bois, paille, chanvre). « Géosourcé » : issu du sol (terre crue, pierre). Ces matériaux émettent moins de CO2 que le béton."),
    ("Former 250 000 salariés d'ici 2030 aux métiers de la rénovation et de la construction bas-carbone.",
     "Le plan estime que le manque d'artisans qualifiés freine les rénovations, même quand les financements existent."),
    ("Augmenter de 75 % par an la quantité de déchets du bâtiment réemployés.",
     "Le BTP produit environ 227 millions de tonnes de déchets par an selon le plan, dont moins de 1 % est réemployé."),
    ("Doubler le budget public d'entretien du patrimoine.",
     "Le plan indique que deux tiers des monuments ont besoin de travaux et que 8 000 sont en péril ou en mauvais état."),
   ]),
  ("Logement : le chiffrage du plan d'investissement", BTP,
   "Le plan chiffre des investissements « supplémentaires » par rapport aux dépenses actuelles : 12 milliards d'euros par an pour l'État, complétés par un pôle public bancaire et d'autres acteurs. Il annonce plus de 300 000 emplois créés.",
   [
    ("Investir 12 milliards d'euros supplémentaires par an sur le budget de l'État.",
     "C'est le total annoncé par le plan, en plus de ce que l'État dépense déjà pour le logement et le bâtiment."),
    ("Isolation des logements : 5,3 milliards d'euros par an pour l'État, autant pour le pôle public bancaire et les autres acteurs.",
     "Le « pôle public bancaire » regrouperait des banques publiques chargées de prêter à taux avantageux."),
    ("Nouveaux logements publics : 3,1 milliards d'euros par an pour l'État et 14 milliards pour le pôle public bancaire et les autres acteurs.",
     "La construction de logements sociaux est surtout financée par des prêts de long terme, d'où la part importante des acteurs bancaires."),
    ("Rénovation des bâtiments publics, associatifs et tertiaires : 1 milliard par an pour l'État, 9 milliards pour les autres acteurs.",
     "Ces montants sont ceux du tableau publié par le candidat."),
    ("Sortie des chaudières au fioul et réduction des chaudières à gaz : 1 milliard par an pour l'État, 2,2 milliards pour les autres acteurs.",
     "Il s'agit des aides à l'achat d'équipements de remplacement, comme les pompes à chaleur."),
    ("Créer plus de 300 000 emplois dans la rénovation, les matériaux biosourcés, le réemploi et le patrimoine.",
     "Le plan dit s'appuyer sur des travaux de la Dares et de France Stratégie, deux organismes publics d'études."),
   ]),
]


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"\s+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn")).strip()


def env(k):
    p = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    return next(l.split("=", 1)[1].strip().strip('"') for l in open(p, encoding="utf-8") if l.startswith(k + "="))


def api(method, path, body=None, prefer=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    req = urllib.request.Request(URL + "/rest/v1/" + path, method=method, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        r = urllib.request.urlopen(req, timeout=60).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} {path}: {e.read().decode()[:400]}")
    return json.loads(r) if r else None


if __name__ == "__main__":
    URL, KEY = env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")
    cid = api("GET", f"presidential_candidates?select=id&slug=eq.{SLUG}")[0]["id"]
    now = datetime.now(timezone.utc).isoformat()
    rows, order = [], 1
    for theme, src, ctx, items in THEMES:
        rows.append({"id": hashlib.md5(f"{cid}|ctx|{norm(theme)}".encode()).hexdigest(), "candidate_id": cid, "theme": theme,
                     "subsection": "__contexte__", "text": ctx, "source_url": src, "sort_order": order, "updated_at": now, "explanation": None}); order += 1
        for text, expl in items:
            rows.append({"id": hashlib.md5(f"{cid}|{norm(text)}".encode()).hexdigest(), "candidate_id": cid, "theme": theme,
                         "subsection": None, "text": text, "source_url": src, "sort_order": order, "updated_at": now, "explanation": expl}); order += 1
    assert len({r["id"] for r in rows}) == len(rows), "identifiants en double"
    # Seulement les lignes des plans saisis ici : depuis le 29/10/2026, les plans « Automobile » et
    # « Enseignement supérieur » sont publiés par le cycle d'agents (backend) et ne doivent pas tomber.
    for src in sorted({t[1] for t in THEMES}):
        api("DELETE", f"candidate_proposals?candidate_id=eq.{cid}&source_url=eq.{urllib.parse.quote(src, safe='')}")
    api("POST", "candidate_proposals", rows, prefer="return=minimal")
    n = len([r for r in rows if r["subsection"] is None])
    print(f"{len(THEMES)} thèmes, {n} propositions insérées pour {SLUG}")
