"""Positions de Dominique de Villepin dans le comparateur (/presidentielles-2027, onglet Positions),
établies à la main le 20/11/2026 à partir de son programme « Réussir à nouveau » (258 propositions).

Chaque position cite la mesure qui la fonde et pointe vers le chapitre concerné (source_type = "programme",
ce qui la protège : la tâche automatique candidate-positions du backend n'écrase ni « programme » ni « vote »).
Quand le programme ne dit rien du sujet : « inconnu », sans deviner (verrouillé aussi, pour qu'une extraction
Wikipédia ne vienne pas inventer une position).
Relire la question (issues.proposition) avant de choisir pour/contre : « pour » = favorable à la proposition.

Usage : python scripts/programmes/villepin-positions.py [--dry-run]   (lit .env.local)
"""
import json, os, sys, urllib.request
from datetime import datetime, timezone

SLUG = "dominique-de-villepin"
CH = "https://lafrancehumaniste.fr/programme/reussir-a-nouveau/chapitre-{}.html"

# issue_slug : (stance, chapitre ou None, résumé ou None)
POSITIONS = {
    "immigration": ("nuance", 6, "Il fait de « l'hospitalité » le cœur de sa politique migratoire, tout en voulant augmenter les expulsions des personnes sous OQTF jugées dangereuses et créer un enregistrement biométrique des étrangers sans titre de séjour."),
    "droit-du-sol": ("contre", 6, "Son programme présente l'identité de la nation comme « fondée sur le droit du sol » et ne propose pas de le supprimer."),
    "securite-justice": ("nuance", 3, "Il veut qu'aucune peine ne reste sans exécution (incarcérations courtes systématisées, semi-liberté, bracelet électronique, travaux d'intérêt général), sans proposer d'alourdir les peines."),
    "cedh": ("contre", 6, "Il défend l'État de droit et les droits humains, et critique le fait de « se défausser sur des pays tiers, moins regardants sur les droits humains » ; il ne propose pas de quitter la CEDH."),
    "laicite": ("inconnu", None, None),
    "retraites": ("nuance", 16, "Plutôt qu'une simple abrogation, il propose un nouveau système par points où « chacun part à l'âge qu'il souhaite », élaboré pendant un an puis soumis à référendum en 2028."),
    "fiscalite": ("pour", 1, "Il veut rétablir l'impôt sur la fortune (barème proche de 2016) et rendre les droits de succession fortement progressifs au-delà d'un million d'euros."),
    "service-national": ("nuance", 6, "Il mise sur le volontariat : service militaire volontaire porté de 1 600 à 5 000 places, réserve citoyenne nationale et « droit au service universel garanti », sans service obligatoire."),
    "sante": ("nuance", 13, "Il veut augmenter de 50 % les dépenses de prévention, plafonner le reste à charge selon le revenu et rendre l'objectif de dépenses de l'Assurance maladie pluriannuel, sans hausse globale chiffrée."),
    "budget-armees": ("pour", 6, "Il veut préparer une loi de programmation militaire 2031-2036 visant 3,5 % du PIB pour la défense."),
    "isf": ("pour", 1, "Il propose de rétablir l'impôt sur la fortune, suivant un barème proche de celui de 2016, en exonérant les biens professionnels."),
    "climat": ("pour", 1, "Il veut inscrire dans la Constitution la neutralité carbone en 2050 et une empreinte de 2 t de CO2 par habitant, et fixer un prix du carbone."),
    "superprofits": ("inconnu", None, None),
    "nucleaire": ("pour", 1, "Il veut poursuivre le programme des six EPR2 (« nucléaire et renouvelable contre les énergies fossiles »), en étudiant les coûts avant de lancer d'autres réacteurs."),
    "ukraine-russie": ("pour", 11, "Il propose de pérenniser l'effort de soutien financier et de défense à l'Ukraine dans le cadre d'un Conseil de sécurité européen."),
    "impots-production": ("pour", 23, "Il veut supprimer les impôts de production et les intégrer dans l'impôt sur les sociétés."),
    "europe-ue": ("pour", 10, "Il propose un Conseil de sécurité européen, un pilier de défense européen dans l'OTAN, une agence européenne d'innovation et un « Buy European Act »."),
    "reduire-depense": ("nuance", 5, "Il veut repasser sous 3 % de déficit en 2031 surtout en supprimant par paliers les niches fiscales et sociales (de l'ordre de 35 milliards d'euros par an) et en stabilisant le nombre de fonctionnaires, sans plan de coupes massives."),
    "institutions": ("contre", 2, "Il veut restaurer la fonction présidentielle de la Ve République plutôt que d'en changer ; son programme ne parle pas de proportionnelle."),
    "rsa-activite": ("inconnu", None, None),
    "faciliter-licenciements": ("inconnu", None, None),
    "remboursement-100": ("nuance", 13, "Il propose de plafonner le reste à charge annuel des assurés selon leur revenu, plutôt qu'un remboursement à 100 %."),
    "euthanasie": ("inconnu", None, None),
    "autorite-ecole": ("inconnu", None, None),
    "prive-education": ("contre", 20, "Il veut que le privé sous contrat, « largement financé sur fonds publics », prenne sa part de la mixité sociale, avec un financement public modulé selon le profil social des élèves."),
    "thermiques-2030": ("inconnu", None, None),
    "taxe-carbone": ("pour", 1, "Il veut fixer un prix du carbone en France, par un encadrement fiscal du prix des produits fossiles, et étendre le mécanisme d'ajustement carbone aux frontières de l'UE."),
    "eoliennes": ("nuance", 1, "Il défend « nucléaire et renouvelable contre les énergies fossiles », sans objectif chiffré de développement de l'éolien."),
    "encadrer-loyers": ("inconnu", None, None),
    "logements-sociaux": ("pour", 12, "Il propose des chantiers nationaux de production de 100 000 logements sociaux par an."),
    "palestine": ("pour", 11, "Il propose dès 2027 une conférence de mise en œuvre de la paix en Palestine et de conditionner l'accord d'association UE-Israël à des avancées concrètes."),
    "vie-republique": ("contre", 2, "Il veut restaurer la fonction présidentielle telle que l'avait conçue de Gaulle dans la Ve République, sans nouvelle Constitution."),
    "proportionnelle": ("inconnu", None, None),
    "ric": ("pour", 8, "Il propose un référendum citoyen déclenché par pétition d'une part significative des électeurs, validé par le Conseil constitutionnel (hors révision de la Constitution)."),
    "voile": ("inconnu", None, None),
    "cannabis": ("inconnu", None, None),
}


def env(k):
    p = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    return next(l.split("=", 1)[1].strip().strip('"') for l in open(p, encoding="utf-8") if l.startswith(k + "="))


def api(method, path, body=None, prefer=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    req = urllib.request.Request(URL + "/rest/v1/" + path, method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    r = urllib.request.urlopen(req, timeout=60).read()
    return json.loads(r) if r else None


if __name__ == "__main__":
    URL, KEY = env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")
    questions = {i["slug"] for i in api("GET", "issues?select=slug&proposition=neq.&limit=500")}
    manquantes, inconnues = questions - set(POSITIONS), set(POSITIONS) - questions
    if manquantes or inconnues:
        sys.exit(f"questions du comparateur non couvertes : {sorted(manquantes)} ; enjeux absents du comparateur : {sorted(inconnues)}")
    now = datetime.now(timezone.utc).isoformat()
    rows = [{"candidate_slug": SLUG, "issue_slug": k, "stance": s, "summary": r, "source_url": CH.format(c) if c else None,
             "source_type": "programme", "updated_at": now} for k, (s, c, r) in POSITIONS.items()]
    print(f"{len(rows)} positions, dont {sum(1 for r in rows if r['stance'] != 'inconnu')} renseignées")
    if "--dry-run" in sys.argv:
        sys.exit(0)
    api("POST", "candidate_positions?on_conflict=candidate_slug,issue_slug", rows, prefer="resolution=merge-duplicates,return=minimal")
    print("écrit")
