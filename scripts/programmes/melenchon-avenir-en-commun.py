"""Programme de Jean-Luc Mélenchon : livre-programme « L'Avenir en commun » (6e édition, présenté au
Bourget le 7 novembre 2026, en librairie le 6), lu chapitre par chapitre sur melenchon2027.fr/programme/livre/.

Le texte officiel est repris TEL QUEL, sans IA : le site range chaque chapitre en sections
(titre, paragraphe d'introduction, « mesure clé », liste de mesures, parfois des sous-mesures).
  - section            → thème (candidate_proposals.theme)
  - paragraphe d'intro → ligne de contexte (subsection = "__contexte__")
  - mesure clé         → subsection = "__mesure_cle__" (mise en avant sur la fiche)
  - sous-mesure        → subsection = intitulé de la mesure qui la chapeaute
  - mesure simple      → subsection = NULL
Une source par chapitre (source_url = page du chapitre) ; son intitulé va dans programmes_sources,
c'est lui que la fiche affiche. Les explications « ? » restent vides : explain-proposals les remplit.

Ne touche QUE les lignes dont la source est une page /programme/livre/ : les plans thématiques et
d'investissement (melenchon-plans.py et le cycle d'agents) ne bougent pas.

Usage : python scripts/programmes/melenchon-avenir-en-commun.py [--dry-run]   (lit .env.local)
"""
import hashlib, html, json, os, re, sys, unicodedata, urllib.parse, urllib.request
from datetime import datetime, timezone

BASE = "https://melenchon2027.fr"
SOMMAIRE = BASE + "/programme/livre/"
SLUG = "jean-luc-melenchon"
DRY = "--dry-run" in sys.argv
UA = {"User-Agent": "Mozilla/5.0 (compatible; LaPolitiqueBot/1.0)"}


def lire(url):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8")


def propre(fragment):
    """HTML → texte : balises retirées (6<sup>e</sup> → 6e), entités décodées, espaces normalisés."""
    t = re.sub(r"<[^>]+>", "", fragment)
    t = html.unescape(t).replace(" ", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"\s+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn")).strip()


def corps(page):
    """Le texte du chapitre : la balise <main> du bloc de contenu (le reste = menus, sommaire)."""
    s = page[page.find("elementor-widget-theme-post-content"):]
    m = re.search(r"<main[^>]*>(.*?)</main>", s, re.S)
    if not m:
        raise ValueError("contenu du chapitre introuvable (structure du site changée ?)")
    return m.group(1)


def mesures(ul):
    """Mesures d'une liste, dans l'ordre : [(subsection, texte)]. Une mesure qui finit par « : » et
    est suivie d'une sous-liste devient l'intitulé de ses sous-mesures."""
    out, chapeau = [], None
    for m in re.finditer(r"<li class=['\"](mesure|sous_mesure)['\"][^>]*>(.*?)</li>", ul, re.S):
        genre, txt = m.group(1), propre(m.group(2))
        if not txt:
            continue
        if genre == "mesure":
            # Intitulé suivi de sous-mesures : on le garde comme chapeau, pas comme mesure.
            suite = ul[m.end():m.end() + 400]
            if txt.endswith(":") and re.match(r"\s*<li[^>]*>\s*<ul", suite):
                chapeau = txt.rstrip(" :").strip()
                continue
            chapeau = None
            out.append((None, txt))
        else:
            out.append((chapeau, txt))
    return out


def chapitres():
    """Adresses des chapitres, dans l'ordre du sommaire officiel (introduction et pages de partie
    exclues : elles ne contiennent que du texte d'exposé, sans mesure)."""
    vus = []
    for h in re.findall(r'href="(/programme/livre/[^"#?]+)"', lire(SOMMAIRE)):
        h = h.rstrip("/")
        if re.search(r"/chapitre\d+$", h) and h not in vus:
            vus.append(h)
    return [BASE + h for h in vus]


def lire_chapitre(url):
    b = corps(lire(url))
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", b, re.S)
    titre = propre(h1.group(1)) if h1 else url.rsplit("/", 1)[-1]
    sections = []
    for sec in re.finditer(r"<section[^>]*>(.*?)</section>", b, re.S):
        c = sec.group(1)
        h3 = re.search(r"<h3[^>]*>(.*?)</h3>", c, re.S)
        if not h3:
            continue  # introduction du chapitre (texte d'exposé)
        theme = propre(h3.group(1))
        # Contexte = paragraphes situés avant la mesure clé / la liste.
        tete = re.split(r'<div class="mesure-cle"|<ul', c, maxsplit=1)[0]
        ctx = " ".join(propre(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", tete, re.S) if propre(p))
        cle = re.search(r'<div class="mesure-cle"[^>]*>.*?<p[^>]*>(.*?)</p>', c, re.S)
        items = [("__mesure_cle__", propre(cle.group(1)))] if cle else []
        reste = c[cle.end():] if cle else c
        items += mesures(reste)
        sections.append((theme, ctx, items))
    return titre, sections


def env(k):
    p = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    return next(l.split("=", 1)[1].strip().strip('"') for l in open(p, encoding="utf-8") if l.startswith(k + "="))


def api(method, path, body=None, prefer=None, rng=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    if rng: h["Range"] = rng
    req = urllib.request.Request(URL + "/rest/v1/" + path, method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        r = urllib.request.urlopen(req, timeout=120).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} {path}: {e.read().decode()[:400]}")
    return json.loads(r) if r else None


if __name__ == "__main__":
    URL, KEY = env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")
    cid = api("GET", f"presidential_candidates?select=id&slug=eq.{SLUG}")[0]["id"]
    # Thèmes déjà présents (plans) : la fiche regroupe par intitulé, deux thèmes homonymes se mélangeraient.
    deja = set()
    for i in range(0, 20000, 1000):
        lot = api("GET", f"candidate_proposals?select=theme,source_url&candidate_id=eq.{cid}", rng=f"{i}-{i + 999}")
        deja |= {norm(r["theme"] or "") for r in lot if "/programme/livre/" not in (r["source_url"] or "")}
        if len(lot) < 1000: break

    now = datetime.now(timezone.utc).isoformat()
    rows, sources, order, vus_themes = [], [], 100000, set()
    urls = chapitres()
    assert len(urls) >= 20, f"sommaire incomplet : {len(urls)} chapitres"
    for url in urls:
        titre, sections = lire_chapitre(url)
        n_chap = 0
        for theme, ctx, items in sections:
            if norm(theme) in deja or norm(theme) in vus_themes:
                theme = f"{theme} ({titre.split(':')[0].strip()})"
            vus_themes.add(norm(theme))
            if ctx:
                rows.append({"id": hashlib.md5(f"{cid}|laec|ctx|{url}|{norm(theme)}".encode()).hexdigest(), "candidate_id": cid,
                             "theme": theme, "subsection": "__contexte__", "text": ctx, "source_url": url,
                             "sort_order": order, "updated_at": now, "explanation": None}); order += 1
            for sub, txt in items:
                rows.append({"id": hashlib.md5(f"{cid}|laec|{url}|{norm(theme)}|{norm(sub or '')}|{norm(txt)}".encode()).hexdigest(),
                             "candidate_id": cid, "theme": theme, "subsection": sub, "text": txt, "source_url": url,
                             "sort_order": order, "updated_at": now, "explanation": None}); order += 1
                n_chap += 1
        sources.append({"source_url": url, "candidate_id": cid, "titre": titre, "statut": "programme",
                        "nb_propositions": n_chap, "methode": "texte officiel", "traite_le": now})
        print(f"  {titre[:70]:<70} {len(sections):>2} thèmes · {n_chap:>3} mesures")

    ids = [r["id"] for r in rows]
    assert len(set(ids)) == len(ids), "identifiants en double"
    n = sum(1 for r in rows if r["subsection"] != "__contexte__")
    cles = sum(1 for r in rows if r["subsection"] == "__mesure_cle__")
    sous = sum(1 for r in rows if r["subsection"] not in (None, "__contexte__", "__mesure_cle__"))
    print(f"{len(urls)} chapitres, {len(vus_themes)} thèmes, {n} mesures (dont {cles} mesures clés, {sous} sous-mesures)")
    if DRY:
        json.dump(rows, open(os.path.join(os.environ.get("TEMP", "."), "laec-rows.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        sys.exit(0)

    # Remplace les lignes des chapitres du livre (et elles seules).
    api("DELETE", f"candidate_proposals?candidate_id=eq.{cid}&source_url=like.{urllib.parse.quote(BASE + '/programme/livre/', safe='')}*")
    for i in range(0, len(rows), 400):
        api("POST", "candidate_proposals", rows[i:i + 400], prefer="return=minimal")
    api("POST", "programmes_sources?on_conflict=source_url", sources, prefer="resolution=merge-duplicates,return=minimal")
    print(f"{n} mesures insérées pour {SLUG}")
