"""Crédits VOTÉS l'année précédente (LFI N-1), par mission, pour les PLF 2025, 2026 et 2027.

Source : annexe « Tableau de comparaison, par mission et programme du budget général, des crédits
proposés pour N à ceux votés pour N-1 (hors fonds de concours) » de chaque PLF.
Les montants du PLF (AE et CP) étant connus à l'euro près par l'état B (missions.json), ils servent
de repères pour isoler les deux colonnes « LFI N-1 » sur chaque ligne de mission.

Contrôle : LFI 2026 reconstituée = 593,9 Md€ de CP, soit +21,2 Md€ jusqu'au PLF 2027 — l'écart
annoncé dans le texte du PLF 2027.

Usage : python scripts/plf/extraire-lfi-precedente.py <dossier_contenant_plfAAAA.pdf>
"""
import json, os, re, sys, unicodedata
import pypdf

ICI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ICI, "..", "..", "src", "lib", "data", "plf")


def norm(s):
    s = unicodedata.normalize("NFD", s.lower().replace("’", "'"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)


def lignes_annexe(pdf):
    r = pypdf.PdfReader(pdf); pages = []; on = False
    for i, p in enumerate(r.pages):
        if i < 250: continue
        tx = p.extract_text() or ""
        if not on and "Tableau de comparaison, par mission et programme" in tx and "LFI" in tx: on = True
        elif on and re.search(r"2\.\s*Tableau de comparaison, par titre", tx): break
        if on: pages.append(p.extract_text(extraction_mode="layout"))
    return [l for pg in pages for l in pg.split("\n") if l.strip()]


def lfi(lines, missions):
    res = {}
    for m in missions:
        ae, cp, pref, found = str(m["ae"]), str(m["cp"]), norm(m["mission"])[:14], None
        cands = [l for l in lines if l[:1] != " " and norm(l).startswith(pref)]
        for l in cands:  # 1) repères : la ligne se termine par le CP du PLF et contient l'AE du PLF
            mm = re.search(r"\s{2,}(\d[\d ]*)$", l.rstrip())
            if not mm: continue
            D = re.sub(r"\D", "", mm.group(1))
            if not D.endswith(cp): continue
            rest = D[: -len(cp)]
            for i in [x.start() for x in re.finditer(ae, rest)]:
                a, c = rest[:i], rest[i + len(ae):]
                if a and c and abs(len(a) - len(ae)) <= 2 and abs(len(c) - len(cp)) <= 2 and not c.startswith("0"):
                    found = (int(a), int(c)); break
            if found: break
        if not found:  # 2) repli : quatre colonnes bien séparées (cas d'un montant nul)
            for l in cands:
                cols = re.split(r"\s{3,}", l.strip())
                if len(cols) >= 5 and all(re.fullmatch(r"[\d ]+", c) for c in cols[-4:]):
                    n = [int(c.replace(" ", "")) for c in cols[-4:]]
                    if n[1] == m["ae"] and n[3] == m["cp"]: found = (n[0], n[2]); break
        if not found: sys.exit(f"LFI introuvable pour la mission : {m['mission']}")
        res[m["cle"]] = {"ae": found[0], "cp": found[1]}
    return res


if __name__ == "__main__":
    work = sys.argv[1] if len(sys.argv) > 1 else "."
    M = json.load(open(os.path.join(DATA, "missions.json"), encoding="utf-8"))
    out = {}
    for an in (2027, 2026, 2025):
        out[str(an)] = lfi(lignes_annexe(os.path.join(work, f"plf{an}.pdf")), M[str(an)])
        print(f"PLF {an} -> LFI {an - 1} : {len(out[str(an)])} missions, CP = {sum(v['cp'] for v in out[str(an)].values()) / 1e9:.2f} Md EUR")
    json.dump(out, open(os.path.join(DATA, "lfi-precedente.json"), "w", encoding="utf-8"), separators=(",", ":"))
