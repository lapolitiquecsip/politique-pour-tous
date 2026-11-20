"""Programme de Dominique de Villepin (La France humaniste) pour 2027 : « Réussir à nouveau »,
258 propositions en 25 chapitres et 4 parties, lu chapitre par chapitre sur
lafrancehumaniste.fr/programme/reussir-a-nouveau/chapitre-N.html.

Le texte officiel est repris TEL QUEL, sans IA. Chaque chapitre est rangé en sections
(« A. … », parfois « Premier axe : … ») suivies d'un texte d'introduction et d'une liste numérotée :
  - section            → thème (candidate_proposals.theme), lettre « A. » retirée
  - texte de la section → ligne de contexte (subsection = "__contexte__"), « Comment ? » retiré ;
                          une section sans proposition passe son texte à la suivante
  - proposition         → subsection = NULL, texte intégral (l'accroche en gras sur le site en est le début)
Une source par chapitre (source_url = page du chapitre), intitulé « Chapitre N · … » dans
programmes_sources ; la fiche range les chapitres sous leur partie (ProgrammeCandidat, VILLEPIN).
Les explications « ? » restent vides : explain-proposals (cron backend) les remplit.
Ne touche QUE les lignes de Dominique de Villepin dont la source est une page du programme.

Contrôles : le nombre total doit égaler celui annoncé en tête du sommaire (« Explorer les 258 propositions »)
et chaque numéro 1..N doit apparaître une fois, sinon rien n'est écrit.

Usage : python scripts/programmes/villepin-programme.py [--dry-run]   (lit .env.local)
"""
import hashlib, html, json, os, re, sys, unicodedata, urllib.parse, urllib.request
from datetime import datetime, timezone

SOMMAIRE = "https://lafrancehumaniste.fr/programme/reussir-a-nouveau/"
SLUG = "dominique-de-villepin"
DRY = "--dry-run" in sys.argv
UA = {"User-Agent": "Mozilla/5.0 (compatible; LaPolitiqueBot/1.0)"}
PARTIES = {1: "Dire la vérité", 2: "Redresser l'État", 3: "Vivre ensemble", 4: "Continuer la France"}


def lire(url):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8")


def propre(fragment):
    t = re.sub(r"<[^>]+>", "", fragment)
    t = html.unescape(t).replace("\xa0", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()


def norm(s):
    s = unicodedata.normalize("NFD", s.lower().replace("’", "'"))
    return re.sub(r"\s+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn")).strip()


def sommaire():
    """[(n, partie, titre du chapitre)] dans l'ordre, et le total annoncé."""
    s = lire(SOMMAIRE)
    total = int(re.search(r"Explorer les (\d+) propositions", s).group(1))
    chap = []
    for m in re.finditer(r'<div class="prj-liste-groupe" data-partie="(\d)"[^>]*>\s*<h3><a href="chapitre-(\d+)\.html"><b>[^<]*</b>(.*?)</a></h3>', s, re.S):
        chap.append((int(m.group(2)), int(m.group(1)), propre(m.group(3))))
    return chap, total


def lire_chapitre(n, titre_chap):
    """Sections du chapitre : [(thème, contexte, [(numéro, texte)])]."""
    s = lire(f"{SOMMAIRE}chapitre-{n}.html")
    b = s[s.find('<div id="propositions">'):]
    b = b[:b.find('class="prj-suivants"')] if 'class="prj-suivants"' in b else b
    sections, report = [], ""
    pos = 0
    bloc = re.compile(r'<h2 class="prj-st"[^>]*>(.*?)</h2>|<div class="prj-texte">(.*?)</div>|<ol class="prj-props">(.*?)</ol>', re.S)
    cur, parent = None, None
    axe = re.compile(r"^(Premier|Deuxième|Troisième|Quatrième|Cinquième|Sixième|Septième)\s+axe\s*[:,]\s*", re.I)
    for m in bloc.finditer(b):
        if m.group(1) is not None:
            titre = propre(m.group(1))
            if re.fullmatch(r"Les \d+ propositions?", titre):
                titre = titre_chap
            elif re.match(r"^[A-Z]\.\s+", titre):
                # Section lettrée (« A. … ») : elle devient le parent des sous-sections qui suivent.
                titre = re.sub(r"^[A-Z]\.\s+", "", titre)
                titre = axe.sub("", titre)
                titre = titre[:1].upper() + titre[1:]
                parent = titre
            else:
                # Sous-section (« Premier axe : … », « La formation ») : rattachée à sa section,
                # sinon « Faire respecter les lois » ne dit pas qu'il s'agit d'immigration.
                titre = axe.sub("", titre)
                titre = titre[:1].upper() + titre[1:]
                if parent:
                    titre = f"{parent} · {titre}"
            cur = {"theme": titre, "ctx": [], "props": []}
            sections.append(cur)
        elif m.group(2) is not None:
            paras = [propre(p) for p in re.findall(r'<p(?: class="(?!prj-question)[^"]*")?>(.*?)</p>', m.group(2), re.S)]
            paras = [p for p in paras if p and p != "Comment ?"]
            if cur is None:
                cur = {"theme": titre_chap, "ctx": [], "props": []}
                sections.append(cur)
            cur["ctx"] += paras
        else:
            if cur is None:
                cur = {"theme": titre_chap, "ctx": [], "props": []}
                sections.append(cur)
            for li in re.finditer(r'<li class="prj-prop"[^>]*data-num="(\d+)"[^>]*>(.*?)</li>', m.group(3), re.S):
                t = re.search(r'<p class="prj-prop-texte">(.*?)</p>', li.group(2), re.S).group(1)
                t = re.sub(r'<span class="sr-only">.*?</span>', "", t, flags=re.S)
                cur["props"].append((int(li.group(1)), propre(t)))
    # Une section sans proposition (« A. … » qui ne fait qu'annoncer ses axes) passe son texte à la suivante.
    out, report = [], []
    for sec in sections:
        if not sec["props"]:
            report += sec["ctx"]
            continue
        out.append((sec["theme"], " ".join(report + sec["ctx"]) or None, sec["props"]))
        report = []
    return out


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
    chapitres, annonce = sommaire()
    assert len(chapitres) >= 20, f"sommaire incomplet : {len(chapitres)} chapitres"
    lus, nums, themes_vus = [], [], {}
    for n, partie, titre in chapitres:
        secs = lire_chapitre(n, titre)
        for i, (th, ctx, props) in enumerate(secs):
            # Deux chapitres ne doivent pas partager un intitulé de thème (la fiche regroupe par intitulé).
            if th in themes_vus and themes_vus[th] != n:
                secs[i] = (f"{th} (ch. {n})", ctx, props)
            themes_vus[secs[i][0]] = n
            nums += [x[0] for x in props]
        lus.append((n, partie, titre, secs))
        print(f"  ch. {n:>2} (partie {partie}) {sum(len(s[2]) for s in secs):>3} prop. · {len(secs)} thèmes · {titre[:60]}")
    erreurs = []
    if len(nums) != annonce:
        erreurs.append(f"{len(nums)} propositions lues pour {annonce} annoncées")
    if sorted(nums) != list(range(1, annonce + 1)):
        erreurs.append(f"numérotation incomplète ou en double : manquants {sorted(set(range(1, annonce + 1)) - set(nums))[:10]}")
    for e in erreurs: print("  ✗", e)
    if erreurs:
        sys.exit("Contrôle en échec : rien n'est écrit.")

    URL, KEY = env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")
    cid = api("GET", f"presidential_candidates?select=id&slug=eq.{SLUG}")[0]["id"]
    now = datetime.now(timezone.utc).isoformat()
    rows, sources, order = [], [], 0
    for n, partie, titre, secs in lus:
        url = f"{SOMMAIRE}chapitre-{n}.html"
        def ligne(sub, th, txt):
            global order
            rows.append({"id": hashlib.md5(f"{cid}|dv|{url}|{sub or ''}|{norm(txt)}".encode()).hexdigest(), "candidate_id": cid,
                         "theme": th, "subsection": sub, "text": txt, "source_url": url,
                         "sort_order": order, "updated_at": now, "explanation": None})
            order += 1
        for th, ctx, props in secs:
            if ctx: ligne("__contexte__", th, ctx)
            for _, t in props: ligne(None, th, t)
        sources.append({"source_url": url, "candidate_id": cid, "titre": f"Chapitre {n} · {titre}", "statut": "programme",
                        "nb_propositions": sum(len(s[2]) for s in secs),
                        "methode": "texte officiel repris tel quel (« Réussir à nouveau », chapitre par chapitre)", "traite_le": now})

    ids = [r["id"] for r in rows]
    assert len(set(ids)) == len(ids), "identifiants en double"
    n = sum(1 for r in rows if r["subsection"] != "__contexte__")
    print(f"{len(lus)} chapitres, {len({r['theme'] for r in rows})} thèmes, {n} propositions")
    if DRY:
        json.dump(rows, open(os.path.join(os.environ.get("TEMP", "."), "villepin-rows.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        sys.exit(0)

    # Garde les explications « ? » déjà rédigées pour une proposition inchangée (même identifiant).
    anciennes = {r["id"]: r["explanation"] for r in api("GET", f"candidate_proposals?select=id,explanation&candidate_id=eq.{cid}&limit=1000") if r["explanation"]}
    for r in rows:
        r["explanation"] = anciennes.get(r["id"])
    api("DELETE", f"candidate_proposals?candidate_id=eq.{cid}&source_url=like.{urllib.parse.quote(SOMMAIRE, safe='')}*")
    api("POST", "candidate_proposals", rows, prefer="return=minimal")
    api("POST", "programmes_sources?on_conflict=source_url", sources, prefer="resolution=merge-duplicates,return=minimal")
    print(f"{n} propositions insérées pour {SLUG}")
