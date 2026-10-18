#!/usr/bin/env node
/**
 * Mots collés dans le texte brut — « La politique,c'estSimple », « PÉTITIONSPOUVOIR ».
 *
 * En JSX, deux éléments écrits sur deux lignes n'ont AUCUN espace entre eux : à l'écran,
 * la mise en page (blocs, flex, grid) les sépare, mais le texte brut de la page — celui
 * que lisent les moteurs de recherche, les aperçus de liens, la synthèse vocale, le
 * copier-coller — les colle. Ce script ajoute {" "} entre deux voisins, uniquement là où
 * le navigateur n'affiche pas cet espace, donc sans aucun changement visuel :
 *   - entre les enfants d'un conteneur flex ou grid (une espace seule y est ignorée) ;
 *   - entre deux balises de bloc (div, p, h1…, li…) dans un parent ordinaire ;
 *   - avant un <br> (l'espace de fin de ligne est supprimée à l'affichage).
 *
 *   node scripts/espaces-texte-brut.mjs            # liste ce qui serait modifié
 *   node scripts/espaces-texte-brut.mjs --ecrire   # modifie les fichiers
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ECRIRE = process.argv.includes("--ecrire");
const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const BLOCS = new Set(["div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "section", "article",
  "header", "footer", "nav", "aside", "main", "figure", "figcaption", "blockquote", "table", "form", "dl", "dt", "dd", "hr", "details", "summary"]);
// Parents où une espace serait affichée telle quelle, ou refusée par React (tableaux, <html>).
const SVG = new Set(["svg", "text", "tspan", "title", "g", "textPath", "pre", "textarea", "option", "select", "code", "style", "script",
  "table", "thead", "tbody", "tfoot", "tr", "colgroup", "html", "head"]);

function fichiers(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && !e.name.startsWith(".")) out.push(...fichiers(p)); }
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const nomBalise = (el) => {
  const o = ts.isJsxElement(el) ? el.openingElement : el;
  return o.tagName.getText();
};
const attributs = (el) => (ts.isJsxElement(el) ? el.openingElement : el).attributes;

/** Le texte de l'attribut className, quelle que soit sa forme (chaîne, gabarit, cn(…)). */
function classes(el) {
  for (const a of attributs(el).properties) {
    if (ts.isJsxAttribute(a) && a.name.getText() === "className" && a.initializer) return a.initializer.getText();
  }
  return "";
}

/** Le conteneur est-il flex ou grid à toutes les tailles d'écran ? */
function flexOuGrid(el) {
  const jetons = classes(el).replace(/[`'"{}()$]/g, " ").split(/\s+/).filter(Boolean);
  const base = jetons.filter(j => !j.includes(":"));
  if (base.some(j => /^(inline-)?(flex|grid)$/.test(j))) return true;
  // « hidden sm:flex » : caché, puis flex — jamais en bloc.
  return base.includes("hidden") && jetons.some(j => /:(inline-)?(flex|grid)$/.test(j));
}

/** Un enfant est-il sûrement un bloc (balise de bloc, sans classe qui le rende en ligne) ? */
function enfantBloc(n) {
  // {cond && <div/>}, {x ? <div/> : <p/>}, {liste.map(i => <li/>)} : on regarde l'élément produit.
  if (ts.isJsxExpression(n)) return !!n.expression && exprBloc(n.expression);
  if (!ts.isJsxElement(n) && !ts.isJsxSelfClosingElement(n)) return false;
  const t = nomBalise(n).replace(/^motion\./, "");
  const c = classes(n);
  if (/(^|[\s"'`])(inline|inline-block|inline-flex|inline-grid|contents)([\s"'`]|$)/.test(c)) return false;
  return BLOCS.has(t) || /(^|[\s"'`])(block|flex|grid|absolute|fixed)([\s"'`]|$)/.test(c) && (/^[a-z]/.test(t) || t === "Link");
}
function exprBloc(e) {
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e)) return enfantBloc(e);
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return exprBloc(e.right);
  if (ts.isConditionalExpression(e)) {
    const vide = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x.kind === ts.SyntaxKind.NullKeyword || x.kind === ts.SyntaxKind.FalseKeyword || (ts.isIdentifier(x) && x.text === "undefined"); };
    if (vide(e.whenFalse)) return exprBloc(e.whenTrue);
    if (vide(e.whenTrue)) return exprBloc(e.whenFalse);
    return exprBloc(e.whenTrue) && exprBloc(e.whenFalse);
  }
  if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === "map") {
    const f = e.arguments[0];
    if (f && (ts.isArrowFunction(f) || ts.isFunctionExpression(f))) {
      if (!ts.isBlock(f.body)) return exprBloc(f.body);
      const r = f.body.statements.find(st => ts.isReturnStatement(st));
      return !!r?.expression && exprBloc(r.expression);
    }
  }
  return false;
}
/** Les éléments JSX renvoyés par un .map(), à travers parenthèses, && et ternaires. */
function elementsDeMap(e) {
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return elementsDeMap(e.right);
  if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || e.expression.name.text !== "map") return [];
  const f = e.arguments[0];
  if (!f || !(ts.isArrowFunction(f) || ts.isFunctionExpression(f))) return [];
  const sorties = ts.isBlock(f.body) ? f.body.statements.filter(st => ts.isReturnStatement(st) && st.expression).map(st => st.expression) : [f.body];
  const out = [];
  const deplier = (x) => {
    while (ts.isParenthesizedExpression(x)) x = x.expression;
    if (ts.isJsxElement(x)) out.push(x);
    else if (ts.isConditionalExpression(x)) { deplier(x.whenTrue); deplier(x.whenFalse); }
  };
  sorties.forEach(deplier);
  return out;
}
/** Cet enfant peut-il produire du texte nu (et pas seulement un élément) ? */
function texteProbable(n) {
  if (ts.isJsxText(n)) return true;
  if (!ts.isJsxExpression(n) || !n.expression) return false;
  const produitElement = (e) => {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) return true;
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return produitElement(e.right);
    if (ts.isConditionalExpression(e)) {
      const vide = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x.kind === ts.SyntaxKind.NullKeyword || x.kind === ts.SyntaxKind.FalseKeyword || (ts.isIdentifier(x) && x.text === "undefined"); };
      return (vide(e.whenTrue) || produitElement(e.whenTrue)) && (vide(e.whenFalse) || produitElement(e.whenFalse));
    }
    return elementsDeMap(e).length > 0;
  };
  return !produitElement(n.expression);
}
const estBr = (n) => ts.isJsxSelfClosingElement(n) && nomBalise(n) === "br";

/** Parent dont les enfants deviennent des éléments du DOM (balise HTML, motion.x, Link). */
function parentDom(el) {
  const t = nomBalise(el);
  if (SVG.has(t)) return false;
  return /^[a-z]/.test(t) || /^motion\.[a-z]/.test(t) || /^Motion[A-Z]/.test(t) || t === "Link";
}

let total = 0;
const modifies = [];
for (const f of fichiers(path.join(RACINE, "src"))) {
  const src = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const insertions = [];

  const visiter = (n) => {
    // Fragment <>…</> : son vrai parent est inconnu, seule la règle des blocs s'applique.
    if ((ts.isJsxElement(n) && parentDom(n)) || ts.isJsxFragment(n)) {
      const fg = ts.isJsxFragment(n) ? false : flexOuGrid(n);
      // Les enfants « qui comptent » : ni blanc, ni commentaire {/* */}.
      const enfants = n.children.filter(c =>
        !(ts.isJsxText(c) && c.containsOnlyTriviaWhiteSpaces) && !(ts.isJsxExpression(c) && !c.expression));
      for (let i = 1; i < enfants.length; i++) {
        const a = enfants[i - 1], b = enfants[i];
        // Déjà séparés ? (texte qui finit ou commence par une espace conservée, ou {" "})
        // En JSX, un blanc qui contient un saut de ligne disparaît ; sans saut de ligne, il reste.
        const garde = (blanc) => blanc.length > 0 && !blanc.includes("\n");
        const entre = src.slice(a.getEnd(), b.getStart(sf));
        if (!entre.includes("{") && garde(entre)) continue;
        if (ts.isJsxText(a) && garde(a.getText().match(/\s*$/)[0])) continue;
        if (ts.isJsxText(b) && garde(b.getText().match(/^\s*/)[0])) continue;
        const litteral = (x) => ts.isJsxExpression(x) && x.expression && (ts.isStringLiteral(x.expression) || ts.isNoSubstitutionTemplateLiteral(x.expression)) ? x.expression.text : null;
        if (/\s$/.test(litteral(a) ?? "") || /^\s/.test(litteral(b) ?? "")) continue;
        // Une espace contre un bloc tombe en début ou en fin de ligne : elle n'est pas affichée.
        // Dans un flex/grid, une espace isolée entre deux ÉLÉMENTS est ignorée ; mais entre deux
        // TEXTES ({prenom}{nom}), elle rejoindrait le même morceau de texte et s'afficherait.
        const sur = (fg && !(texteProbable(a) && texteProbable(b))) || estBr(b) || enfantBloc(a) || enfantBloc(b);
        if (!sur) continue;
        // Position : juste après a (après le texte significatif s'il s'agit de texte).
        let pos = a.getEnd();
        if (ts.isJsxText(a)) pos = a.getStart(sf) + a.getText().replace(/\s+$/, "").length;
        insertions.push(pos);
      }
    }
    // Liste (.map) dans un conteneur flex ou grid : chaque élément produit en est un item ;
    // une espace finale à l'intérieur tombe en fin de ligne, donc invisible.
    if (ts.isJsxElement(n) && parentDom(n) && flexOuGrid(n)) {
      for (const c of n.children) {
        if (!ts.isJsxExpression(c) || !c.expression) continue;
        for (const el of elementsDeMap(c.expression)) {
          if (!ts.isJsxElement(el) || !parentDom(el) || SVG.has(nomBalise(el))) continue;
          const enf = el.children.filter(x => !(ts.isJsxText(x) && x.containsOnlyTriviaWhiteSpaces) && !(ts.isJsxExpression(x) && !x.expression));
          const der = enf[enf.length - 1];
          if (!der) continue;
          const lit = ts.isJsxExpression(der) && der.expression && ts.isStringLiteral(der.expression) ? der.expression.text : null;
          const bl = ts.isJsxText(der) ? der.getText().match(/\s*$/)[0] : "";
          if (/\s$/.test(lit ?? "") || (bl.length > 0 && !bl.includes("\n"))) continue;
          insertions.push(ts.isJsxText(der) ? der.getStart(sf) + der.getText().replace(/\s+$/, "").length : der.getEnd());
        }
      }
    }
    // Élément d'une liste (.map, repéré par sa « key ») : rien ne le sépare du suivant dans le
    // texte brut. Une espace finale, invisible (fin de ligne d'un bloc, ou conteneur flex/grid),
    // fait la séparation.
    if (ts.isJsxElement(n) && parentDom(n) && attributs(n).properties.some(a => ts.isJsxAttribute(a) && a.name.getText() === "key")
      && (flexOuGrid(n) || enfantBloc(n))) {
      const enfants = n.children.filter(c =>
        !(ts.isJsxText(c) && c.containsOnlyTriviaWhiteSpaces) && !(ts.isJsxExpression(c) && !c.expression));
      const dernier = enfants[enfants.length - 1];
      const litteral = dernier && ts.isJsxExpression(dernier) && dernier.expression && ts.isStringLiteral(dernier.expression) ? dernier.expression.text : null;
      const blancFinal = dernier && ts.isJsxText(dernier) ? dernier.getText().match(/\s*$/)[0] : "";
      const finBlanche = blancFinal.length > 0 && !blancFinal.includes("\n");
      if (dernier && !/\s$/.test(litteral ?? "") && !finBlanche) {
        insertions.push(ts.isJsxText(dernier) ? dernier.getStart(sf) + dernier.getText().replace(/\s+$/, "").length : dernier.getEnd());
      }
    }
    ts.forEachChild(n, visiter);
  };
  visiter(sf);
  if (!insertions.length) continue;
  total += insertions.length;
  modifies.push([path.relative(RACINE, f), insertions.length]);
  if (ECRIRE) {
    let s = src;
    for (const p of [...new Set(insertions)].sort((x, y) => y - x)) s = s.slice(0, p) + '{" "}' + s.slice(p);
    fs.writeFileSync(f, s);
  }
}
for (const [f, n] of modifies.sort((x, y) => y[1] - x[1])) console.log(`${String(n).padStart(4)}  ${f}`);
console.log(`\n${total} espaces ${ECRIRE ? "ajoutées" : "à ajouter"} dans ${modifies.length} fichiers.`);
