"""Extrait l'état B (crédits du budget général par mission et programme) des PLF 2024 à 2027,
directement depuis les textes déposés à l'Assemblée nationale, et écrit src/lib/data/plf/missions.json.

Contrôles intégrés (le script s'arrête si l'un échoue) :
  - chaque mission = somme exacte de ses programmes (AE et CP) ;
  - somme des missions = ligne « Total » du document.
Recoupement fait le 10/10/2026 : PLF 2024 et PLF 2025 identiques à l'euro près aux jeux de données
ouverts de Bercy (data.economie.gouv.fr : plf-2024-depenses-...-destination-et-nature, plf25-depenses-2025-selon-destination).

Usage : python scripts/plf/extraire-etat-b.py <dossier_de_travail>   (nécessite pypdf)
"""
import json, os, re, sys, unicodedata, urllib.request
import pypdf

SOURCES = {
    2024: "https://www.assemblee-nationale.fr/dyn/16/textes/l16b1680_projet-loi.pdf",
    2025: "https://www.assemblee-nationale.fr/dyn/17/textes/l17b0324_projet-loi.pdf",
    2026: "https://www.assemblee-nationale.fr/dyn/17/textes/l17b1906_projet-loi.pdf",
    2027: "https://www.assemblee-nationale.fr/dyn/17/textes/l17b3210_projet-loi.pdf",
}
# Clés de comparaison : missions renommées d'une année à l'autre (périmètres signalés dans index.ts)
ALIAS = {
    "travail et emploi": "travail",
    "travail emploi et administration des ministeres sociaux": "travail",
    "gestion des finances publiques": "gestion-finances-publiques",
    "gestion des finances publiques et lutte contre les fraudes": "gestion-finances-publiques",
    "agriculture alimentation foret et affaires rurales": "agriculture",
    "agriculture et alimentation": "agriculture",
    "anciens combattants memoire et liens avec la nation": "monde-combattant",
    "monde combattant memoire et liens avec la nation": "monde-combattant",
}
NUM = r"\d{1,3}(?: \d{3})*"


def norm(s):
    s = unicodedata.normalize("NFD", s.lower().replace("’", "'"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()


def cle(nom):
    n = norm(nom)
    return ALIAS.get(n, re.sub(r"\s+", "-", n)[:60])


def lignes_etat_b(pdf):
    r = pypdf.PdfReader(pdf); pages = []; on = False
    for p in r.pages:
        tx = p.extract_text() or ""
        if not on and "Mission / Programme" in tx and re.search(r"(Etat|ÉTAT|État) B", tx): on = True
        if on:
            if re.search(r"(Etat|ÉTAT|État) C", tx) and pages: break
            pages.append(p.extract_text(extraction_mode="layout"))
    rows, pend = [], None
    for page in pages:
        for line in page.split("\n"):
            if not line.strip() or "Projet de loi de finances" in line or "(en euros)" in line: continue
            m = re.match(r"^(\s*)(.*?)\s{2,}(" + NUM + r"|0)\s{3,}(" + NUM + r"|0)\s*$", line)
            if m:
                name = m.group(2).strip()
                if not name and pend: name = pend
                elif pend and name and name[0].islower(): name = pend + " " + name
                pend = None
                rows.append((name, int(m.group(3).replace(" ", "")), int(m.group(4).replace(" ", ""))))
            else:
                s = line.strip()
                if s and not re.search(r"\d{3}", s) and not s.startswith(("Mission", "Autorisations", "d’engagement", "de paiement", "BUDGET", "Crédits")):
                    pend = (pend + " " + s) if (pend and s[0].islower()) else s
    return rows


def missions(rows):
    total, R = None, []
    for name, ae, cp in rows:
        if name.lower().startswith("total"): total = (ae, cp)
        elif name.startswith("dont titre") or name.endswith("dont titre 2") or (ae == 0 and cp == 0): continue
        else: R.append((name, ae, cp))
    out, i = [], 0
    while i < len(R):
        name, ae, cp = R[i]; sa = sc = 0; j = i + 1; ok = False
        while j < len(R) and j <= i + 14:
            sa += R[j][1]; sc += R[j][2]
            if sa == ae and sc == cp: ok = True; break
            if sa > ae and sc > cp: break
            j += 1
        if not ok: sys.exit(f"Mission non reconnue : {R[i]}")
        out.append({"cle": cle(name), "mission": name.replace("'", "’"), "ae": ae, "cp": cp,
                    "programmes": [{"programme": x[0].replace("'", "’"), "ae": x[1], "cp": x[2]} for x in R[i + 1:j + 1]]})
        i = j + 1
    st = (sum(m["ae"] for m in out), sum(m["cp"] for m in out))
    if st != total: sys.exit(f"Somme des missions {st} ≠ total du document {total}")
    return out


if __name__ == "__main__":
    work = sys.argv[1] if len(sys.argv) > 1 else "."
    res = {}
    for an, url in SOURCES.items():
        pdf = os.path.join(work, f"plf{an}.pdf")
        if not os.path.exists(pdf):
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            open(pdf, "wb").write(urllib.request.urlopen(req, timeout=120).read())
        res[str(an)] = missions(lignes_etat_b(pdf))
        print(an, len(res[str(an)]), "missions, CP =", sum(m["cp"] for m in res[str(an)]))
    dest = os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "data", "plf", "missions.json")
    json.dump(res, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("->", os.path.normpath(dest))
