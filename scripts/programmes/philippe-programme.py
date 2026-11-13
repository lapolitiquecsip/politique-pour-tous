"""Programme d'Édouard Philippe (Horizons) pour 2027, lu thème par thème sur edouardphilippe.fr/programme.

Le site range chaque thème (15 au 12 novembre 2026, répartis en 4 priorités) en :
  - une accroche            → ligne de contexte (subsection = "__contexte__"), MOT POUR MOT
  - « Nos propositions phares » → subsection = "__mesure_cle__" (badge « Mesure clé »), MOT POUR MOT
  - des questions-réponses  → mesures détaillées (subsection = NULL), rédigées à la main ci-dessous
    (DETAILS) à partir de ces réponses, une mesure par ligne, comme les plans de Mélenchon.
Accroche et phares sont relus en direct à chaque passage ; les mesures détaillées sont contrôlées
contre la page (tout nombre doit y figurer, et l'essentiel des mots aussi) : une page qui a changé
fait échouer le contrôle au lieu de laisser une mesure périmée.

Une source par thème (source_url = page du thème), son intitulé dans programmes_sources.
Les explications « ? » restent vides : explain-proposals (cron backend) les remplit.
Ne touche QUE les lignes d'Édouard Philippe dont la source est edouardphilippe.fr/programme.

Quand le site est mis à jour (« Mise à jour le … » en tête de page, la campagne annonce des
mesures territoire par territoire pour l'outre-mer) : le script le signale (empreinte des
questions-réponses, EMPREINTES) → relire la page, compléter DETAILS, recopier la nouvelle empreinte.

Usage : python scripts/programmes/philippe-programme.py [--dry-run] [--force]   (lit .env.local)
"""
import hashlib, html, json, os, re, sys, unicodedata, urllib.parse, urllib.request
from datetime import datetime, timezone

BASE = "https://www.edouardphilippe.fr"
INDEX = BASE + "/programme"
SLUG = "edouard-philippe"
DRY = "--dry-run" in sys.argv
FORCE = "--force" in sys.argv
UA = {"User-Agent": "Mozilla/5.0 (compatible; LaPolitiqueBot/1.0)"}

# Mesures détaillées, tirées des questions-réponses de chaque page (version du 12/11/2026).
# Une mesure présente sur plusieurs pages n'est gardée que sur la plus pertinente.
DETAILS = {
    "securite": [
        "Dans le cadre de l'« état d'urgence narco », limité dans le temps et à certaines zones : interpeller les trafiquants chez eux la nuit, les assigner à résidence et étendre les gardes à vue.",
        "Autoriser l'usage ciblé de la reconnaissance faciale, seulement dans le cadre de l'état d'urgence contre le narcotrafic et en cas d'émeutes, dans les zones les plus touchées et pour une durée limitée.",
        "Mobiliser les services secrets, comme la DGSI, contre les trafiquants et créer une « fiche S financière ».",
        "Aligner l'exécution des peines des grands trafiquants sur celle des terroristes.",
        "Créer une liste noire européenne visant les pays qui refusent de coopérer contre le narcotrafic.",
        "Mener des opérations « place nette » contre la drogue dans les boîtes de nuit et les festivals.",
        "Signaler systématiquement à son employeur tout agent public poursuivi pour usage de stupéfiants.",
        "Lever l'excuse de minorité pour les faits liés au trafic de drogue et permettre la comparution immédiate des mineurs.",
        "Créer des établissements de réinsertion et de soin pour les mineurs condamnés, afin de les sortir de l'emprise des trafiquants.",
        "Instaurer des peines courtes et rapides dès le premier délit.",
        "Rétablir les peines planchers, en particulier pour les atteintes aux personnes dépositaires de l'autorité publique (pompiers, policiers, gendarmes, professeurs).",
        "Protéger les forces de l'ordre et les agents exposés contre la corruption des trafiquants : criblage systématique des fonctions sensibles et réforme des habilitations de sécurité.",
        "Combattre l'islamisme et éradiquer les Frères musulmans et les organisations qui y sont affiliées.",
        "Ne pas envoyer l'armée dans les quartiers, mais renforcer l'action des services de renseignement, à commencer par la DGSI, sur la piste des réseaux.",
        "Construire en France nos propres « Canadairs » contre les incendies.",
        "Créer dans les communes des réserves de citoyens volontaires formés.",
        "Organiser chaque année une journée nationale d'alerte, comme en Allemagne.",
        "Former tous les Français aux premiers secours.",
    ],
    "justice": [
        "Réserver les peines planchers aux infractions les plus graves, en particulier les atteintes aux personnes dépositaires de l'autorité publique (pompiers, policiers, gendarmes, professeurs).",
        "Sanctionner dès la première infraction par une peine courte et dissuasive, comme les pays du Nord, plutôt que d'enfermer trop tard et trop longtemps.",
        "Renforcer la responsabilité des juges en révisant la composition du Conseil supérieur de la magistrature (CSM).",
        "Instaurer un « devoir de redevabilité » des juges envers les victimes.",
        "Renforcer l'autorité du garde des Sceaux sur le parquet, en lui permettant d'adresser des instructions individuelles aux procureurs pour prioriser les dossiers.",
        "Revoir la formation et la sélection des magistrats, et ouvrir davantage la profession à d'autres métiers du droit, comme les avocats.",
        "Donner aux maires un pouvoir de sanction pénale contre les incivilités.",
    ],
    "immigration": [
        "Diviser par deux l'immigration en France.",
        "Suspendre le regroupement familial pendant toute la durée du quinquennat.",
        "Expulser immédiatement tout étranger qui commet un délit et lui retirer ses aides sociales.",
        "Créer un régime européen de sanctions contre les passeurs : gel des avoirs, interdiction de territoire et sanctions contre leurs réseaux.",
        "Créer un « verrou Schengen » : aucun État européen ne pourrait engager seul une régularisation massive au-delà d'un seuil défini ensemble, sans l'accord préalable de ses partenaires.",
        "Faire voter chaque année par le Parlement la liste des pays considérés comme sûrs.",
        "Supprimer l'asile à vie.",
        "Créer un régime européen d'urgence pour suspendre les nouvelles demandes d'asile quand un pays utilise les migrants pour faire pression sur nos frontières.",
        "Suspendre les demandes d'asile à Mayotte et en Guyane pendant le quinquennat, et le droit du sol à Mayotte.",
        "Aligner les aides sociales versées aux étrangers sur la moyenne européenne.",
        "Vérifier que les étudiants étrangers ont réellement les moyens de financer leurs études.",
        "Appliquer vraiment la hausse des droits d'inscription prévue pour les étudiants venus hors d'Europe.",
        "Utiliser les centres de retour prévus par le nouveau règlement européen pour que les décisions d'éloignement soient enfin exécutées.",
    ],
    "defense": [
        "Adopter une nouvelle loi de programmation militaire, celle de la « massification » : plus de réservistes, de volontaires, de drones, de munitions et de navires.",
        "Faire passer le service militaire volontaire de 3 000 à 50 000 places par an.",
        "Porter le nombre de réservistes de 45 000 à 250 000.",
        "Massifier la production et les achats de drones tactiques, sur le modèle du programme américain de 300 000 drones.",
        "Lancer un grand plan munitions pour dépasser l'objectif actuel de 100 000 obus par an et atteindre l'échelle des 700 000 produits par l'Allemagne.",
        "Doubler le nombre de navires aux Antilles, pour lutter contre le narcotrafic et sécuriser les territoires ultramarins.",
        "Ajouter un volet environnemental au futur service national : missions de débroussaillage, d'entretien des forêts ou de sensibilisation du public.",
    ],
    "travail": [
        "Permettre aux entreprises de fixer librement leur temps de travail, par accord d'entreprise, pour sortir des 35 heures obligatoires.",
        "Exonérer de cotisations sociales et d'impôt sur le revenu les heures travaillées au-dessus de 35 h par semaine (environ 1 000 € de plus par an pour un salarié au SMIC qui travaille deux heures de plus par semaine).",
        "Supprimer la cotisation patronale au-delà de la 37e heure.",
        "Alléger nettement les charges qui pèsent sur les salaires, en commençant par baisser la dépense sociale, pour réduire l'écart entre salaire brut et salaire net.",
        "Limiter l'indemnisation chômage à 12 mois au maximum, contre 18 mois aujourd'hui, comme en Allemagne ; les plus de 50 ans ne seront pas concernés.",
        "Instaurer trois jours de carence pour tous les actifs, dans le privé comme dans le public, pour mettre fin à « l'open bar » des arrêts maladie.",
        "Imposer un délai incompressible de 3 à 6 mois entre un arrêt maladie et une rupture conventionnelle.",
        "Instaurer un droit à la reconversion pour les salariés dont le métier est menacé par l'intelligence artificielle.",
        "Confier au dialogue social l'organisation et la fixation de la durée du travail dans l'entreprise.",
    ],
    "entreprises": [
        "Baisser de 50 milliards d'euros les impôts de production en supprimant autant d'aides publiques improductives, sans creuser le déficit.",
        "Instaurer un moratoire normatif et fiscal : aucune nouvelle norme et aucun nouvel impôt pendant tout le quinquennat, après avoir supprimé des dizaines de normes.",
        "En finir avec la surtransposition des règles européennes.",
        "Supprimer le code français des marchés publics dès l'entrée en vigueur du futur règlement européen, sans y ajouter de règles nationales.",
        "Mettre fin aux 35 h en permettant aux entreprises de fixer librement le temps de travail par accord d'entreprise.",
        "Instaurer une préférence européenne massive dans l'industrie, pour sauver notre industrie automobile, sidérurgique et nucléaire.",
        "Imposer aux entreprises chinoises, dans les secteurs stratégiques, des transferts de technologie, des quotas de production et des coentreprises.",
        "Instaurer un prix du carbone aux frontières européennes, qui fera payer leurs émissions aux produits importés, notamment chinois.",
        "Créer un « livret capital France » pour diriger l'épargne des Français vers nos champions technologiques.",
        "Mobiliser la retraite par capitalisation pour financer l'innovation et nos champions en France.",
        "Maintenir le pacte Dutreil, qui facilite la transmission des entreprises familiales.",
        "Achever en priorité l'Union des marchés de capitaux, pour que l'épargne européenne finance l'innovation européenne.",
        "Achever le marché unique en supprimant les spécifications nationales qui agissent comme des droits de douane cachés.",
    ],
    "comptes-publics": [
        "Faire porter l'effort de redressement pour moitié sur les dépenses sociales (retraites, chômage, arrêts maladie), pour un quart sur l'État et les collectivités ; le dernier quart viendra de la croissance.",
        "Par la règle d'or, interdire aux parlementaires de creuser le déficit au-delà du seuil européen de 3 %.",
        "Ramener le déficit à environ 2 % du PIB à la fin du quinquennat.",
        "Ne pas remplacer un fonctionnaire sur trois partant à la retraite, soit plus de 250 000 postes, sans aucun licenciement.",
        "Fusionner ou supprimer des dizaines d'opérateurs, d'agences et de comités publics.",
        "Réorganiser massivement l'État et simplifier drastiquement les procédures, notamment grâce à l'IA.",
        "Mieux dépenser en santé grâce à la prévention et aux transformations technologiques, sans diminuer les dépenses de santé.",
        "Instaurer trois jours de carence pour tous, dans le privé comme dans le public.",
        "Limiter l'indemnisation chômage à 12 mois pour les moins de 50 ans.",
        "Limiter la durée du RSA pour inciter à la reprise du travail.",
        "Supprimer des normes existantes et instaurer un moratoire : aucune nouvelle norme et aucun nouvel impôt pendant le quinquennat.",
    ],
    "retraites": [
        "Sauver les retraites sans hausse des cotisations ni baisse générale des pensions.",
        "Maintenir les âges de départ actuels pour les personnes en mauvaise santé : 55 ans en situation de handicap, 60 ans en incapacité permanente, 62 ans en invalidité.",
        "Maintenir les départs anticipés pour carrières longues.",
        "Confier aux partenaires sociaux, dès le départ, la négociation sur la définition des critères de pénibilité.",
        "Ouvrir un plan d'épargne retraite à chaque Français, avec un premier versement de 500 € par l'État dès le premier emploi.",
        "Ajouter la capitalisation à la retraite par répartition, sans la remplacer.",
        "Former, recruter et accompagner les salariés après 50 ans.",
        "Développer la retraite progressive et le cumul emploi-retraite.",
    ],
    "ecole": [
        "Porter la rémunération des enseignants au moins au niveau de la moyenne européenne, en particulier en milieu de carrière.",
        "Interdire strictement le téléphone portable à l'école primaire, au collège et au lycée : en cas d'usage, il sera confisqué immédiatement et rendu uniquement aux parents.",
        "Laisser les chefs d'établissement imposer l'uniforme ou organiser des rites républicains, fixer les règles de discipline et participer au recrutement et à l'évaluation de leur équipe.",
        "Faire compter les notes du mois de juin pour le bulletin de l'année suivante, pour que juin ne soit plus sacrifié.",
        "Généraliser l'apprentissage de la lecture dès la maternelle et organiser des tests de décodage pour repérer très tôt les élèves en difficulté.",
        "Fixer à chaque élève l'objectif de maîtriser 2500 mots en arrivant au CP, et accompagner ceux qui ne l'atteindront pas.",
        "Créer un service public universel du soutien scolaire combinant des brigades d'anciens professeurs et d'étudiants volontaires et un assistant d'intelligence artificielle personnalisé.",
        "Introduire l'IA par paliers : zéro IA avant le collège, sensibilisation à son usage responsable au collège, inscription progressive dans la pédagogie au lycée ; l'IA sera encouragée pour la préparation des cours des professeurs.",
        "Recréer des écoles normales, plus exigeantes sur les savoirs fondamentaux, pour la formation initiale des professeurs.",
        "Ouvrir les carrières des enseignants, avec des évolutions possibles dans ou hors de l'Éducation nationale et d'autres façons d'enseigner en fin de carrière.",
        "Proposer aux enseignants des outils IA performants et mieux les associer au projet d'établissement.",
        "Rendre publiques, auprès des parents et des élus locaux, les évaluations de performance des établissements scolaires.",
        "Créer une « amende de responsabilisation scolaire », inspirée du modèle britannique, pour les parents d'enfants harceleurs, perturbateurs ou absentéistes, et pour les parents violents, donnée par le maire sur proposition de l'équipe éducative.",
        "Consolider les moyens du 3018, le numéro national contre le harcèlement.",
        "Refonder l'orientation dès la 5e, avec un temps en classe consacré à la découverte des études supérieures et des métiers, et des temps dédiés pour les professeurs.",
        "Donner un tuteur à chaque élève, ancien élève de l'établissement ou professionnel, grâce à un vaste plan de tutorat.",
        "Refondre l'enseignement supérieur : revoir les filières avec les moins bons taux d'insertion et revaloriser les filières scientifiques.",
        "Renforcer la santé à l'école : accès à des tiers de confiance, à des conseils et meilleure détection en matière de santé mentale.",
        "Accueillir les enfants en situation de handicap dans de bonnes conditions, sur le modèle du Havre : un institut médico-éducatif intégré à une école rénovée.",
        "Apprendre la natation à tous les enfants dès l'école maternelle.",
        "Faire passer le nombre d'ingénieurs formés chaque année de 40 000 à 100 000 en cinq ans.",
    ],
    "famille": [
        "Fusionner les aides aux familles, trop complexes et éparpillées, en une allocation familiale unique, dégressive avec le revenu (350 € pour les plus modestes).",
        "Supprimer l'impôt sur le revenu des ménages des classes moyennes (du 4e au 6e décile et au début du 7e) pendant les trois premières années de l'enfant.",
        "Accorder aux familles plus aisées qui travaillent une réduction d'impôt de 3 000 € par an pendant les trois premières années de l'enfant.",
        "Doubler les plafonds de donation du vivant aux enfants et aux petits-enfants pendant les trois premières années du quinquennat.",
    ],
    "protection-de-l-enfance": [
        "Sur le modèle de la « Sarah's law » britannique, permettre aux parents de demander à la police de vérifier qu'une personne en contact avec leur enfant n'a pas d'antécédents.",
        "Créer un principe de précaution pénal : pour chaque plainte liée à un enfant, une mesure de protection immédiate, sans attendre la fin de l'enquête.",
        "Contrôler tous les lieux accueillant des mineurs au moins tous les trois ans, contre tous les dix ans aujourd'hui, avec le pouvoir de fermer les établissements qui ne protègent pas les enfants.",
        "Réformer en profondeur le périscolaire : certificats d'honorabilité partout, choc de formation des encadrants et présence obligatoire d'un responsable formé à la protection des enfants pendant chaque temps périscolaire.",
        "Publier le parcours des éducateurs du périscolaire, pour qu'un adulte écarté quelque part ne puisse pas recommencer ailleurs.",
        "Faire fermer les sites qui laissent prospérer le proxénétisme en ligne.",
        "Défendre en Europe une régulation de l'intelligence artificielle qui protège les enfants.",
    ],
    "intelligence-artificielle": [
        "Adopter un « Buy European Tech Act » et organiser des achats technologiques groupés entre États membres.",
        "Bâtir une infrastructure d'intelligence artificielle européenne souveraine, en soutenant nos champions comme Mistral.",
        "Ouvrir aux acteurs nationaux et européens de l'IA un accès préférentiel à notre électricité décarbonée, avec des « zones d'accélération de l'IA » inspirées des AI Growth Zones britanniques.",
        "Adapter l'enseignement, le recrutement et la formation continue à l'intelligence artificielle.",
        "Simplifier le cadre juridique européen applicable à l'IA, sans renoncer à une régulation éthique et protectrice des enfants.",
        "Renforcer la responsabilité pénale des plateformes face aux contenus pédopornographiques générés par l'IA.",
        "Augmenter les amendes pour les plateformes qui ne modèrent pas correctement les contenus.",
        "Ouvrir une réflexion sur la modération a priori des contenus illicites générés par l'IA.",
    ],
    "energie": [
        "Lancer 8 réacteurs EPR supplémentaires en plus des 6 déjà prévus, soit 14 nouveaux réacteurs.",
        "Concentrer l'effort de réduction des émissions sur le fret, la rénovation des logements et l'industrie lourde.",
        "Accélérer la décarbonation de l'industrie lourde et investir massivement dans la capture de carbone.",
        "Renforcer les mécanismes de prix du carbone aux frontières européennes, pour protéger les industries qui décarbonent.",
        "Accompagner et soutenir les Français pour que l'électrification ne se fasse pas au détriment de leur pouvoir d'achat.",
        "Verser la même aide pour l'achat d'une voiture électrique d'occasion que pour une neuve.",
    ],
    "adaptation-climatique": [
        "Réunir le fonds Barnier et le Fonds vert dans le fonds d'adaptation, qui financera des investissements dont l'impact devra être mesurable.",
        "Créer un opérateur public unique, fusionnant quatre agences existantes, pour accompagner les territoires dans leur adaptation.",
        "Climatiser massivement les lieux qui accueillent des personnes fragiles.",
        "Étendre le soutien du fonds chaleur aux réseaux de froid, pour rafraîchir notamment les EHPAD et les logements sociaux.",
        "Multiplier les plantations d'arbres pour donner de l'ombre aux villes et lever les règles d'urbanisme qui freinent l'adaptation des espaces publics et des logements à la chaleur.",
        "Lancer un plan baignade national pour rendre baignables toutes nos rivières et rénover nos piscines.",
        "Revoir l'assurance des risques climatiques, notamment la prise en charge du retrait-gonflement des argiles, qui fissure les maisons lors des sécheresses, et de l'érosion du littoral.",
        "Accélérer le stockage de l'eau agricole, en plaçant « la protection avant la procédure ».",
        "Réutiliser 10 % des eaux usées traitées pour les usages qui ne demandent pas d'eau potable, contre moins de 1 % aujourd'hui.",
        "Lancer un grand plan de transmission et de modernisation des exploitations agricoles, avec un super Dutreil agricole permettant de défiscaliser les transmissions.",
        "Créer 100 territoires de souveraineté alimentaire.",
        "Inscrire le développement agricole dans la Charte de l'environnement.",
    ],
    "outre-mer": [
        "Moderniser l'octroi de mer sans le supprimer : il aide la production locale et finance les collectivités, mais manque de transparence.",
        "Faire jouer la concurrence sur les mobilités, pour les liaisons vers l'extérieur comme pour les transports en commun, et agir sur le prix du fret.",
        "Ne pas aborder la question de la surrémunération des fonctionnaires outre-mer lors du prochain quinquennat.",
        "Accélérer jusqu'à l'égalité la convergence du SMIC et des retraites de Mayotte avec l'Hexagone (le SMIC mahorais atteint 87,5 % du niveau national), en accompagnant les petites entreprises.",
        "Garantir jusqu'en 2032 les financements de l'eau à Mayotte.",
        "Accélérer la création de retenues collinaires à La Réunion pour stocker l'eau.",
        "Construire un deuxième hôpital de plein exercice à Combani, avec une maternité, des services de médecine et de chirurgie et les plateaux techniques nécessaires.",
        "Construire une nouvelle piste sur Grande-Terre plutôt que d'allonger celle de Petite-Terre, et penser l'aéroport et le port de Longoni comme une seule plateforme logistique régionale.",
        "Développer le ferroviaire à La Réunion et en Guyane, en repensant les projets.",
        "Demander que Frontex aide à accélérer les retours depuis Mayotte, en particulier pour le camp de Tsoundzou.",
        "Mobiliser tous les leviers (aide au développement, visas, accords de coopération, transferts de fonds) contre tout État qui voudrait faire de Mayotte un moyen de pression sur la France.",
        "Développer la présence en mer de l'État et de nos armées dans tous les Outre-mer.",
    ],
}

# Empreinte des questions-réponses de chaque page quand DETAILS a été rédigé. Une page qui a
# changé est signalée (et le passage refusé sans --force) : il faut la relire.
EMPREINTES = {  # --empreintes les réimprime
    "securite": "0e43a77e450d",
    "justice": "cd34fe691c82",
    "immigration": "c46fdae869f9",
    "defense": "012c3249b08f",
    "travail": "7ca8b670d5c3",
    "entreprises": "34e8109d55bd",
    "comptes-publics": "e5782094b00e",
    "retraites": "3ed55468bfdf",
    "ecole": "d777ccce8800",
    "famille": "75cc4d27bfe7",
    "protection-de-l-enfance": "8a988cc9fe69",
    "intelligence-artificielle": "c7e90e4e0dee",
    "energie": "09cae3f3b09b",
    "adaptation-climatique": "b8fff653932c",
    "outre-mer": "f4aa6ccdf3eb",
}


def lire(url):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8")


def propre(fragment):
    t = re.sub(r"<[^>]+>", "", fragment)
    t = html.unescape(t).replace(" ", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()


def norm(s):
    s = unicodedata.normalize("NFD", s.lower().replace("’", "'"))
    return re.sub(r"\s+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn")).strip()


def themes():
    """Pages des thèmes, dans l'ordre du sommaire officiel."""
    vus = []
    for h in re.findall(r'class="carte-theme" href="([^"]+)"', lire(INDEX)):
        h = h.rstrip("/")
        if h.startswith(INDEX + "/") and h not in vus:
            vus.append(h)
    return vus


def lire_theme(url):
    s = lire(url)
    b = s[s.find("data-audience-page"):s.find("</main>")]
    titre = propre(re.search(r"<h1[^>]*>(.*?)</h1>", b, re.S).group(1))
    acc = re.search(r'class="propositions__accroche">(.*?)</p>', b, re.S)
    liste = re.search(r'<ul class="propositions__liste">(.*?)</ul>', b, re.S)
    phares = [propre(x) for x in re.findall(r"<li>(.*?)</li>", liste.group(1), re.S)] if liste else []
    qa = []
    for m in re.finditer(r'<section id="[^"]+"[^>]*class="qa[^"]*">(.*?)</section>', b, re.S):
        q = propre(re.search(r"<h2>(.*?)</h2>", m.group(1), re.S).group(1))
        rep = re.search(r'<div class="qa__reponse">(.*)</div>', m.group(1), re.S).group(1)
        qa.append((q, " ".join(propre(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", rep, re.S))))
    maj = re.search(r'class="thematique-maj">(.*?)</p>', b, re.S)
    return titre, propre(acc.group(1)) if acc else None, [p for p in phares if p], qa, propre(maj.group(1)) if maj else ""


def chiffres(t):
    """Nombres d'un texte, espaces de milliers retirés (« 3 000 » = « 3000 »)."""
    return {re.sub(r"[ .]", "", n).replace(",", ".") for n in re.findall(r"\d[\d  .,]*\d|\d", t)}


MOTS_VIDES = set("dans pour avec sans leur leurs elles nous notre cette celle ceux tous toutes plus moins entre aussi afin".split())


def controle(ligne, page):
    """Faux = la mesure contient un nombre absent de la page, ou trop de mots qui n'y sont pas."""
    p = norm(page)
    manquants = {n for n in chiffres(ligne) if n not in chiffres(page)}
    # Racine de 6 lettres : « refondra » couvre « Refondre », « décarbonent » « décarbonation ».
    # Le premier mot (le verbe mis à l'infinitif) n'est pas compté.
    mots = [w for w in re.findall(r"[a-z]{5,}", norm(ligne))[1:] if w not in MOTS_VIDES]
    absents = [w for w in mots if w[:6] not in p]
    ok = not manquants and (not mots or len(absents) / len(mots) <= 0.2)
    return ok, manquants, absents


def env(k):
    p = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    return next(l.split("=", 1)[1].strip().strip('"') for l in open(p, encoding="utf-8") if l.startswith(k + "="))


def api(method, path, body=None, prefer=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    req = urllib.request.Request(URL + "/rest/v1/" + path, method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        r = urllib.request.urlopen(req, timeout=120).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} {path}: {e.read().decode()[:400]}")
    return json.loads(r) if r else None


if __name__ == "__main__":
    urls = themes()
    assert len(urls) >= 10, f"sommaire incomplet : {len(urls)} thèmes"
    pages, erreurs, changees = [], [], []
    for url in urls:
        slug = url.rsplit("/", 1)[-1]
        titre, acc, phares, qa, maj = lire_theme(url)
        texte = " ".join([acc or ""] + phares + [q + " " + r for q, r in qa])
        emp = hashlib.md5(json.dumps(qa, ensure_ascii=False).encode()).hexdigest()[:12]
        if slug not in DETAILS:
            changees.append(f"{slug} : thème NOUVEAU, aucune mesure détaillée rédigée")
        elif EMPREINTES and EMPREINTES.get(slug) != emp:
            changees.append(f"{slug} : questions-réponses modifiées ({maj}) → relire la page, compléter DETAILS, empreinte {emp}")
        for ligne in DETAILS.get(slug, []):
            ok, manq, abs_ = controle(ligne, texte)
            if not ok:
                erreurs.append(f"{slug} : {ligne[:90]}… nombres absents {sorted(manq)} mots absents {abs_}")
        pages.append((url, slug, titre, acc, phares, emp, maj))
        print(f"  {titre:<28} {len(phares):>2} phares · {len(DETAILS.get(slug, [])):>2} mesures détaillées · {len(qa):>2} Q/R · {maj}")
    absents = set(DETAILS) - {p[1] for p in pages}
    if absents:
        changees.append(f"thèmes retirés du site : {sorted(absents)}")
    for e in erreurs: print("  ✗", e)
    for c in changees: print("  ⚠", c)
    if "--empreintes" in sys.argv:
        print("EMPREINTES = " + json.dumps({p[1]: p[5] for p in pages}, indent=4))
        sys.exit(0)
    if (erreurs or changees) and not FORCE:
        sys.exit("Contrôle en échec : rien n'est écrit (--force pour passer outre).")

    URL, KEY = env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")
    cid = api("GET", f"presidential_candidates?select=id&slug=eq.{SLUG}")[0]["id"]
    now = datetime.now(timezone.utc).isoformat()
    rows, sources, order = [], [], 0
    for url, slug, titre, acc, phares, emp, maj in pages:
        def ligne(sub, txt):
            global order
            rows.append({"id": hashlib.md5(f"{cid}|ep|{url}|{sub or ''}|{norm(txt)}".encode()).hexdigest(), "candidate_id": cid,
                         "theme": titre, "subsection": sub, "text": txt, "source_url": url,
                         "sort_order": order, "updated_at": now, "explanation": None})
            order += 1
        if acc: ligne("__contexte__", acc)
        for p in phares: ligne("__mesure_cle__", p)
        for d in DETAILS.get(slug, []): ligne(None, d)
        sources.append({"source_url": url, "candidate_id": cid, "titre": titre, "statut": "programme",
                        "nb_propositions": len(phares) + len(DETAILS.get(slug, [])),
                        "methode": "texte officiel (accroche, propositions phares) + questions-réponses", "traite_le": now})

    ids = [r["id"] for r in rows]
    assert len(set(ids)) == len(ids), "identifiants en double"
    n = sum(1 for r in rows if r["subsection"] != "__contexte__")
    print(f"{len(pages)} thèmes, {n} propositions (dont {sum(1 for r in rows if r['subsection'] == '__mesure_cle__')} phares)")
    if DRY:
        json.dump(rows, open(os.path.join(os.environ.get("TEMP", "."), "philippe-rows.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        sys.exit(0)

    # Garde les explications « ? » déjà rédigées pour une proposition inchangée (même identifiant).
    anciennes = {r["id"]: r["explanation"] for r in api("GET", f"candidate_proposals?select=id,explanation&candidate_id=eq.{cid}&limit=1000") if r["explanation"]}
    for r in rows:
        r["explanation"] = anciennes.get(r["id"])
    api("DELETE", f"candidate_proposals?candidate_id=eq.{cid}&source_url=like.{urllib.parse.quote(INDEX + '/', safe='')}*")
    api("POST", "candidate_proposals", rows, prefer="return=minimal")
    api("POST", "programmes_sources?on_conflict=source_url", sources, prefer="resolution=merge-duplicates,return=minimal")
    print(f"{n} propositions insérées pour {SLUG}")
