/**
 * Fiches pratiques de service-public.gouv.fr — ingestion des données ouvertes.
 *
 * POURQUOI
 * « Tout sur un sujet » ne connaissait que ce qui CHANGE (Journal officiel
 * récent, lois votées, débats) et jamais ce qui S'APPLIQUE : ni le montant d'une
 * aide, ni l'article de loi qui la fonde. Ces fiches comblent exactement ce vide.
 * Chacune donne les montants en vigueur, tenus à jour par l'administration, et la
 * liste des textes de référence avec leur lien Légifrance.
 *
 * Légifrance, lui, répond 403 à toute lecture automatisée (mur Cloudflare). Les
 * fiches viennent du même éditeur — la DILA — par le flux « Le Comarquage »,
 * public et sans clé : trois archives ZIP (particuliers, professionnels,
 * associations), environ 35 Mo en tout, un fichier XML par fiche.
 *
 * Le passage quotidien n'écrit que les fiches dont le contenu a changé : un
 * montant revalorisé au 1er janvier arrive le lendemain, sans réécrire les
 * trois mille autres.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/update-fiches-pratiques.ts
 *   npx tsx --env-file=.env.local scripts/update-fiches-pratiques.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/update-fiches-pratiques.ts --fiche=F23556   # affiche une fiche convertie
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Aucun modèle
 * de langage : c'est de la copie de données publiques, pas de la rédaction.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

const FLUX = ["part", "pro", "asso"] as const;
const URL_FLUX = (f: string) => `https://lecomarquage.service-public.gouv.fr/vdd/3.4/${f}/zip/vosdroits-latest.zip`;
const UA = "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const APERCU = args.find(a => a.startsWith("--fiche="))?.split("=")[1];

/* ───────────────────────────── Lire un ZIP ─────────────────────────────── */

/**
 * Extrait les fichiers d'une archive ZIP, sans dépendance.
 *
 * On lit le répertoire central (fin de l'archive), qui donne pour chaque fichier
 * sa taille compressée et la position de ses données : c'est plus sûr que de
 * parcourir les en-têtes locaux, dont les tailles peuvent être nulles quand
 * l'archive a été écrite en flux.
 */
function lireZip(buf: Buffer, garder: (nom: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  // Fin du répertoire central : signature 0x06054b50, dans les derniers 64 Ko.
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("archive ZIP illisible (répertoire central introuvable)");
  const nb = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);

  for (let k = 0; k < nb; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("répertoire central corrompu");
    const methode = buf.readUInt16LE(p + 10);
    const tailleC = buf.readUInt32LE(p + 20);
    const lNom = buf.readUInt16LE(p + 28);
    const lExtra = buf.readUInt16LE(p + 30);
    const lComm = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nom = buf.toString("utf8", p + 46, p + 46 + lNom);
    p += 46 + lNom + lExtra + lComm;
    if (!garder(nom)) continue;

    const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const brut = buf.subarray(debut, debut + tailleC);
    const data = methode === 0 ? brut : methode === 8 ? inflateRawSync(brut) : null;
    if (data) out.set(nom, data.toString("utf8"));
  }
  return out;
}

/* ─────────────────────────── XML → texte lisible ─────────────────────────── */

const ENTITES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decoder = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITES[e.toLowerCase()] ?? m;
  });

const nettoyer = (s: string) => decoder(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/**
 * Les blocs de la fiche qui ne sont pas son contenu : navigation, métadonnées,
 * renvois vers d'autres fiches. Les références et les services en ligne en font
 * partie — ils sont extraits à part, en données structurées.
 */
const HORS_TEXTE = new Set([
  "SurTitre", "Audience", "Canal", "FilDAriane", "Theme", "SousThemePere", "DossierPere",
  "SousDossierPere", "VoirAussi", "QuiPeutMAider", "Reference", "ServiceEnLigne",
  "PourEnSavoirPlus", "Definition", "Abreviation", "QuestionReponse", "PivotLocal",
  "InformationComplementaire", "Actualite", "CommentFaireSi", "OuSAdresser", "RessourceWeb",
]);

/**
 * Met le corps d'une fiche à plat, en texte légèrement balisé.
 *
 * Le XML de la DILA est un contenu mixte — du texte coupé de balises en ligne
 * (`<Valeur>5 000 €</Valeur>`, `<MiseEnEvidence>`) — qu'un analyseur XML classique
 * rend mal. Un parcours des balises avec une pile suffit, et garde ce qui compte
 * pour la lecture : les titres des situations (« Depuis le 8 mars 2026 », « Moins
 * de 250 salariés »), les puces, les lignes des tableaux.
 */
function aPlat(xml: string): string {
  const pile: string[] = [];
  let sortie = "";
  let ignorer = 0; // profondeur dans un bloc HORS_TEXTE
  const re = /<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;

  const ENCADRES = new Set(["ANoter", "ASavoir", "Attention"]);
  const niveauTitre = () => {
    // Le titre prend le rang de son parent : situation > cas > chapitre > sous-chapitre.
    const parent = pile[pile.length - 2] ?? "";
    if (parent === "Situation") return "## ";
    if (parent === "Cas") return "### ";
    if (parent === "Chapitre" || parent === "Tableau") return "#### ";
    if (parent === "SousChapitre") return "##### ";
    if (ENCADRES.has(parent)) return "> ";
    return "";
  };

  while ((m = re.exec(xml))) {
    const [, ferme, nom, , auto, texte] = m;
    if (texte !== undefined) {
      if (!ignorer) sortie += decoder(texte).replace(/\s+/g, " ");
      continue;
    }
    if (auto) continue;
    // Dans une cellule de tableau, tout reste sur la ligne : un retour à la ligne
    // couperait la rangée et séparerait un montant de la situation qu'il chiffre.
    const dansCellule = pile.includes("Cellule");
    if (!ferme) {
      pile.push(nom);
      if (ignorer || HORS_TEXTE.has(nom)) { ignorer++; continue; }
      if (nom === "Titre") sortie += `\n\n${niveauTitre()}`;
      else if (nom === "Item") sortie += dansCellule ? " ; " : `\n${"  ".repeat(Math.max(0, pile.filter(t => t === "Liste").length - 1))}- `;
      else if (nom === "Rangée") sortie += "\n| ";
      // Le premier paragraphe d'une puce reste sur la ligne de son tiret.
      else if (nom === "Paragraphe" && pile[pile.length - 2] !== "Titre" && !/- $/.test(sortie)) sortie += dansCellule ? " " : "\n";
      continue;
    }
    // fermeture
    pile.pop();
    if (ignorer) { ignorer--; continue; }
    if (nom === "Titre") sortie += "\n";
    else if (nom === "Cellule") sortie += " | ";
    else if (nom === "Paragraphe" && !dansCellule) sortie += "\n";
  }

  return sortie
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+(?=[^\s-])/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/((?:#+|>) )\s*\n+/g, "$1")
    .replace(/\n\n(?=[ ]*- )/g, "\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

type Ref = { titre: string; url: string | null; complement?: string };
type Service = { titre: string; url: string | null; type: string };
type Fiche = {
  id: string; type: string | null; audiences: string[]; title: string; description: string | null;
  chemin: string | null; body: string; refs: Ref[]; services: Service[]; url: string | null;
  modified_at: string | null; important_at: string | null; hash?: string;
};

const attr = (bloc: string, nom: string) => bloc.match(new RegExp(`\\s${nom}="([^"]*)"`))?.[1] ?? null;

/**
 * Les enfants directs de <Publication> d'un nom donné.
 *
 * Il faut suivre la profondeur : une fiche cite aussi des références et des
 * simulateurs À L'INTÉRIEUR de son texte, et les blocs « Définition », placés
 * après les références, contiennent eux-mêmes un <Texte>. Se repérer sur la
 * dernière fermeture de <Texte> faisait perdre les références de neuf fiches
 * sur dix.
 */
function blocsRacine(corps: string, nom: string): string[] {
  const out: string[] = [];
  const re = /<(\/?)([A-Za-z][\w:.-]*)[^>]*?(\/?)>/g;
  let profondeur = 0, debut = -1, courant = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(corps))) {
    const [balise, ferme, n, auto] = m;
    if (ferme) {
      profondeur--;
      if (profondeur === 0 && courant === nom && debut >= 0) out.push(corps.slice(debut, m.index + balise.length));
      continue;
    }
    if (profondeur === 0) { courant = n; debut = m.index; }
    if (auto) {
      if (profondeur === 0 && n === nom) out.push(balise);
      continue;
    }
    profondeur++;
  }
  return out;
}

function lireFiche(xml: string, audience: string): Fiche | null {
  const tete = xml.match(/<Publication\b[^>]*>/)?.[0] ?? "";
  const id = attr(tete, "ID");
  if (!id || !id.startsWith("F")) return null;
  const type = attr(tete, "type");
  // Les « recherches guidées » sont des questionnaires d'orientation, sans contenu propre.
  if (type && /Recherche guidée/i.test(type)) return null;

  const title = nettoyer(xml.match(/<dc:title>([\s\S]*?)<\/dc:title>/)?.[1] ?? "");
  if (!title) return null;
  const description = nettoyer(xml.match(/<dc:description>([\s\S]*?)<\/dc:description>/)?.[1] ?? "") || null;
  const modifie = xml.match(/<dc:date>\s*modified\s+(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  const important = attr(tete, "dateDerniereModificationImportante")?.slice(0, 10) ?? null;
  const url = attr(tete, "spUrl");

  const ariane = [...(xml.match(/<FilDAriane>([\s\S]*?)<\/FilDAriane>/)?.[1] ?? "").matchAll(/<Niveau[^>]*>([\s\S]*?)<\/Niveau>/g)]
    .map(n => nettoyer(n[1]))
    .filter(n => n && !/^Accueil/i.test(n) && n !== title);
  const chemin = ariane.length ? ariane.join(" › ") : null;

  const corps = xml.replace(/^[\s\S]*?<Publication\b[^>]*>/, "").replace(/<\/Publication>\s*$/, "");
  const body = aPlat(corps.replace(/<dc:[\s\S]*?<\/dc:[a-z]+>/g, ""));

  const refs: Ref[] = blocsRacine(corps, "Reference")
    .filter(b => /type="Texte de référence"/.test(b))
    .map(b => ({
      titre: nettoyer(b.match(/<Titre>([\s\S]*?)<\/Titre>/)?.[1] ?? ""),
      url: attr(b, "URL"),
      complement: nettoyer(b.match(/<Complement>([\s\S]*?)<\/Complement>/)?.[1] ?? "") || undefined,
    }))
    .filter(r => r.titre);

  const services: Service[] = blocsRacine(corps, "ServiceEnLigne")
    .map(b => ({
      titre: nettoyer(b.match(/<Titre>([\s\S]*?)<\/Titre>/)?.[1] ?? ""),
      url: attr(b, "URL"),
      type: attr(b, "type") ?? "Service",
    }))
    .filter(s => s.titre);

  return {
    id, type, audiences: [audience], title, description, chemin, body, refs, services, url,
    modified_at: modifie, important_at: important,
  };
}

const AUDIENCE: Record<string, string> = { part: "Particuliers", pro: "Professionnels", asso: "Associations" };

async function telecharger(flux: string): Promise<Buffer> {
  for (let essai = 1; ; essai++) {
    try {
      const r = await fetch(URL_FLUX(flux), { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (essai >= 3) throw new Error(`flux ${flux} : ${(e as Error).message}`);
      await new Promise(res => setTimeout(res, 5000 * essai));
    }
  }
}

/* ─────────────────────────────────── Entrée ──────────────────────────────── */

async function main() {
  const fiches = new Map<string, Fiche>();

  for (const flux of FLUX) {
    const zip = await telecharger(flux);
    const fichiers = lireZip(zip, nom => /^F\d+\.xml$/.test(nom));
    let n = 0;
    for (const xml of fichiers.values()) {
      const f = lireFiche(xml, AUDIENCE[flux]);
      if (!f) continue;
      n++;
      const deja = fiches.get(f.id);
      if (!deja) { fiches.set(f.id, f); continue; }
      // La même fiche publiée pour plusieurs publics : on garde la version la plus
      // complète, et elle sert tous les publics.
      const garde = f.body.length > deja.body.length ? f : deja;
      garde.audiences = [...new Set([...deja.audiences, ...f.audiences])];
      fiches.set(f.id, garde);
    }
    console.log(`  · ${AUDIENCE[flux]} : ${(zip.length / 1e6).toFixed(1)} Mo, ${n} fiches lues`);
  }

  if (APERCU) {
    const f = fiches.get(APERCU);
    if (!f) { console.log(`${APERCU} introuvable`); return; }
    console.log(`# ${f.title}\n${f.chemin}\n${f.description}\n(${f.audiences.join(", ")} — maj ${f.modified_at})\n`);
    console.log(f.body);
    console.log("\nRÉFÉRENCES :"); for (const r of f.refs) console.log(`- ${r.titre}${r.complement ? ` (${r.complement})` : ""} → ${r.url}`);
    console.log("\nSERVICES :"); for (const s of f.services) console.log(`- [${s.type}] ${s.titre} → ${s.url}`);
    return;
  }

  // Garde-fou : un flux tronqué ne doit jamais effacer la base.
  if (fiches.size < 2000) throw new Error(`seulement ${fiches.size} fiches lues — flux incomplet, on n'écrit rien`);

  for (const f of fiches.values()) {
    f.hash = createHash("md5")
      .update(JSON.stringify([f.title, f.description, f.chemin, f.body, f.refs, f.services, f.audiences.sort(), f.modified_at]))
      .digest("hex");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Ce qui est déjà en base, pour n'écrire que ce qui a changé.
  const connues = new Map<string, string>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from("fiches_pratiques").select("id, hash").range(de, de + 999);
    if (error) throw error;
    for (const r of data ?? []) connues.set(r.id, r.hash);
    if (!data || data.length < 1000) break;
  }

  const aEcrire = [...fiches.values()].filter(f => connues.get(f.id) !== f.hash);
  const aRetirer = [...connues.keys()].filter(id => !fiches.has(id));
  console.log(`> ${fiches.size} fiches, ${aEcrire.length} nouvelles ou modifiées, ${aRetirer.length} retirées du flux`);
  if (DRY) { console.log("--- DRY-RUN : rien écrit ---"); return; }

  const maintenant = new Date().toISOString();
  // Lots bornés en volume plutôt qu'en nombre : certaines fiches dépassent 80 Ko.
  let lot: Fiche[] = [], poids = 0, ecrites = 0;
  const vider = async () => {
    if (!lot.length) return;
    const { error } = await supabase.from("fiches_pratiques")
      .upsert(lot.map(f => ({ ...f, synced_at: maintenant })), { onConflict: "id" });
    if (error) throw new Error(`écriture : ${error.message}`);
    ecrites += lot.length;
    lot = []; poids = 0;
  };
  for (const f of aEcrire) {
    lot.push(f); poids += f.body.length;
    if (lot.length >= 100 || poids > 1_500_000) await vider();
  }
  await vider();

  for (let i = 0; i < aRetirer.length; i += 200) {
    const { error } = await supabase.from("fiches_pratiques").delete().in("id", aRetirer.slice(i, i + 200));
    if (error) throw new Error(`suppression : ${error.message}`);
  }
  console.log(`--- TERMINÉ : ${ecrites} fiche(s) écrite(s), ${aRetirer.length} retirée(s) ---`);
}

main().catch(e => { console.error(e); process.exit(1); });
