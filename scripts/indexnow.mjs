/**
 * IndexNow : prévient Bing (et les autres moteurs du protocole : Yandex, Seznam, Naver…) des pages
 * nouvelles ou modifiées, dès le déploiement (24/11/2026, GEO). La recherche de ChatGPT et de
 * Copilot s'appuie sur l'index de Bing : une page connue de Bing le jour même peut être citée le
 * jour même.
 *
 *   node scripts/indexnow.mjs --avant=ancien-sitemap.xml --apres=out/sitemap.xml --liste=indexnow.json
 *       → calcule la liste (pages nouvelles, « lastmod » changé, rubriques) sans rien envoyer
 *   node scripts/indexnow.mjs --envoyer=indexnow.json
 *       → l'envoie (après le déploiement, quand les pages sont en ligne)
 *
 * La clé est publique par nature : le fichier public/<clé>.txt prouve que le site en est l'auteur.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CLE = "1971be05b8e4e50467f1e603da57a846";
const HOTE = "lapolitiquecestsimple.fr";
const SITE = `https://${HOTE}`;
// Rubriques qui changent chaque jour : toujours signalées.
const QUOTIDIENNES = ["/", "/lois/", "/deputes/", "/senateurs/", "/executif/", "/presidentielles-2027/", "/calendrier/", "/llms.txt", "/llms-full.txt"].map(c => `${SITE}${c}`);
const MAX = 10000; // limite du protocole par envoi

const arg = (nom) => process.argv.find(a => a.startsWith(`--${nom}=`))?.split("=").slice(1).join("=");

function lire(chemin) {
  if (!chemin || !existsSync(chemin)) return new Map();
  const xml = readFileSync(chemin, "utf8");
  const pages = new Map();
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (loc) pages.set(loc, m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? "");
  }
  return pages;
}

const envoi = arg("envoyer");
if (envoi) {
  const urls = existsSync(envoi) ? JSON.parse(readFileSync(envoi, "utf8")) : [];
  if (!urls.length) { console.log("IndexNow : rien à signaler."); process.exit(0); }
  for (let i = 0; i < urls.length; i += MAX) {
    const lot = urls.slice(i, i + MAX);
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOTE, key: CLE, keyLocation: `${SITE}/${CLE}.txt`, urlList: lot }),
    });
    // 200 = reçu ; 202 = reçu, clé en cours de vérification ; 429 = trop de demandes (on n'insiste pas).
    console.log(`IndexNow : ${lot.length} adresse(s) envoyée(s) → HTTP ${r.status}`);
    if (r.status >= 400 && r.status !== 429) console.log(await r.text().catch(() => ""));
  }
  process.exit(0);
}

const avant = lire(arg("avant"));
const apres = lire(arg("apres"));
if (!apres.size) { console.log("IndexNow : plan du site introuvable, rien à calculer."); writeFileSync(arg("liste") || "indexnow.json", "[]"); process.exit(0); }
const changees = [...apres].filter(([loc, lastmod]) => !avant.has(loc) || (lastmod && avant.get(loc) !== lastmod)).map(([loc]) => loc);
// Premier passage (aucun ancien plan) : tout le site, une fois.
const liste = [...new Set([...QUOTIDIENNES, ...(avant.size ? changees : [...apres.keys()])])];
writeFileSync(arg("liste") || "indexnow.json", JSON.stringify(liste));
console.log(`IndexNow : ${liste.length} adresse(s) à signaler (${changees.length} nouvelle(s) ou modifiée(s) sur ${apres.size}).`);
