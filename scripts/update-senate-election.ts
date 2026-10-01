/**
 * CRON : renouvellement du Sénat — scrutin du 27 septembre 2026.
 *
 * DEUX SOURCES, CHACUNE POUR CE QU'ELLE SAIT
 *
 *  1. LE RÉSULTAT vient du site officiel du scrutin, senatoriales2026.senat.fr.
 *     Il expose l'index de ses circonscriptions en JSON (/carte/data) et publie
 *     une page par circonscription : sièges pourvus, électeurs sénatoriaux, mode
 *     de scrutin, élus avec leur nuance politique — attribuée par le ministère
 *     de l'Intérieur — et la mention « (sortant) » pour les reconduits.
 *
 *     Cette mention change tout : savoir qui est réélu ne demande plus de
 *     comparer deux états du Sénat. Une première version de ce script figeait
 *     donc une photographie d'avant-vote, à prendre impérativement avant le
 *     dimanche soir ; ce n'est plus nécessaire.
 *
 *  2. LES SÉNATEURS EUX-MÊMES viennent de l'open data du Sénat
 *     (ODSEN_GENERAL.csv) : matricule, groupe, commission, photo, profession.
 *     Les nouveaux élus n'y figurent qu'à leur PRISE DE FONCTIONS, le 1er
 *     octobre. C'est à ce moment, et pas avant, que leur fiche est créée — avec
 *     le même contenu que celle de n'importe quel sénateur, puisque c'est le
 *     même chemin de code. D'ici là, les résultats les nomment sans prétendre
 *     qu'ils siègent déjà.
 *
 * Le script est idempotent : les sièges encore en attente (second tour,
 * contentieux) entrent d'eux-mêmes au passage suivant.
 *
 * Usage :
 *   npx tsx scripts/update-senate-election.ts
 *   npx tsx scripts/update-senate-election.ts --dry-run        # diagnostic seul
 *   npx tsx scripts/update-senate-election.ts --skip-senators  # n'écrit pas dans `senators`
 *   npx tsx scripts/update-senate-election.ts --skip-results   # n'interroge pas le site du scrutin
 *   npx tsx scripts/update-senate-election.ts --date=2032-09-26
 *
 * Variables requises : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const URL_ODSEN = "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv";
const SITE_SCRUTIN = "https://senatoriales2026.senat.fr";
const PHOTOS_SENAT = "https://www.senat.fr/senimg";
const UA = "Mozilla/5.0 (compatible; lapolitiquecestsimple/1.0; +https://lapolitiquecestsimple.fr)";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const valeur = (n: string) => args.find(a => a.startsWith(`--${n}=`))?.split("=")[1];

const DATE_SCRUTIN = valeur("date") || "2026-09-27";
const A_BLANC = flag("dry-run");
const SANS_SENATEURS = flag("skip-senators");
const SANS_RESULTATS = flag("skip-results");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

/* ───────────────────────── Circonscription : libellé → code ─────────────────
 * Le Sénat désigne ses circonscriptions par leur nom dans l'open data, et par
 * leur code sur le site du scrutin. Il faut les deux : le code relie un siège au
 * fond de carte, le libellé relie un sénateur à sa fiche.
 *
 * `senators.department_code` contenait les deux premières lettres du nom
 * (« Se » pour Seine-Maritime) : inexploitable. Ce script le répare.
 */
const CODES: Record<string, string> = {
  "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes",
  "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube", "11": "Aude",
  "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal", "16": "Charente",
  "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud", "2B": "Haute-Corse",
  "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne", "25": "Doubs", "26": "Drôme",
  "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère", "30": "Gard", "31": "Haute-Garonne", "32": "Gers",
  "33": "Gironde", "34": "Hérault", "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire",
  "38": "Isère", "39": "Jura", "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire",
  "44": "Loire-Atlantique", "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère",
  "49": "Maine-et-Loire", "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne",
  "54": "Meurthe-et-Moselle", "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord",
  "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques",
  "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône",
  "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie",
  "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres",
  "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse", "85": "Vendée",
  "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne", "90": "Territoire de Belfort",
  "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise",
  "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "975": "Saint-Pierre-et-Miquelon",
  "976": "Mayotte", "977": "Saint-Barthélemy", "978": "Saint-Martin", "986": "Wallis-et-Futuna",
  "987": "Polynésie française", "988": "Nouvelle-Calédonie",
  // Les douze sénateurs des Français de l'étranger ne relèvent d'aucun
  // département ; le Sénat leur donne le code « ZZ », qu'on reprend tel quel.
  ZZ: "Français établis hors de France",
};

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// Écarts de graphie constatés dans les fichiers du Sénat, jamais supposés.
const ALIAS: Record<string, string> = {
  [norm("Iles Wallis et Futuna")]: "986",
  [norm("Wallis et Futuna")]: "986",
  [norm("Nouvelle Calédonie")]: "988",
  [norm("Saint Pierre et Miquelon")]: "975",
  [norm("La Reunion")]: "974",
  [norm("Français établis hors de France")]: "ZZ",
  [norm("Francais de l'etranger")]: "ZZ",
};

const PAR_NOM = new Map<string, string>();
for (const [code, nom] of Object.entries(CODES)) PAR_NOM.set(norm(nom), code);

const codeDe = (libelle: string): string | null =>
  ALIAS[norm(libelle)] || PAR_NOM.get(norm(libelle)) || null;

/* ────────────────────────────────── Réseau ───────────────────────────────── */

async function recuperer(url: string, essais = 3): Promise<string> {
  let derniere: unknown;
  for (let essai = 1; essai <= essais; essai++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      derniere = e;
      if (essai < essais) await new Promise(r => setTimeout(r, 2000 * essai));
    }
  }
  throw new Error(`${url} : ${(derniere as Error)?.message || derniere}`);
}

function decodeHtml(s: string): string {
  const nommees: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => nommees[n.toLowerCase()] ?? m);
}

const sansBalises = (x: string) =>
  decodeHtml(x.replace(/<[^>]+>/g, " ")).replace(/ /g, " ").replace(/\s+/g, " ").trim();

/* ───────────────────── 1. Le résultat, depuis le site du scrutin ───────────── */

type Elu = {
  code: string; circonscription: string; nomComplet: string; prenom: string; nom: string;
  nuance: string; couleur: string | null; sortant: boolean;
  sieges: number; electeurs: number | null; mode: "proportionnel" | "majoritaire" | null;
  url: string;
};
type Circonscription = { code: string; label: string; seats: number; known: number };

/**
 * Coupe « Florence BLATRIX CONTAT » en prénom et nom.
 *
 * Le Sénat écrit le patronyme en capitales, y compris quand il compte plusieurs
 * mots ou une particule (« Justine DE VILLA »). C'est la casse qui fait foi, pas
 * la position : découper au premier espace donnerait « Florence » / « BLATRIX
 * CONTAT » par chance, et « Marie » / « Ange ROUSSELOT » par erreur.
 */
function separerNom(complet: string): { prenom: string; nom: string } {
  const mots = complet.trim().split(/\s+/);
  const capitales = (m: string) => m === m.toLocaleUpperCase("fr") && /\p{L}/u.test(m);
  const nom = mots.filter(capitales).join(" ");
  const prenom = mots.filter(m => !capitales(m)).join(" ");
  return nom && prenom ? { prenom, nom } : { prenom: mots.slice(0, -1).join(" "), nom: mots.at(-1) || complet };
}

/**
 * Lit la page d'une circonscription : contexte du scrutin d'abord, élus ensuite.
 *
 * Les deux sont rendus séparément à dessein. Une circonscription peut n'avoir
 * encore aucun élu proclamé — la Polynésie française au lendemain du scrutin —
 * et ses sièges doivent tout de même compter dans le total, faute de quoi le site
 * annoncerait 176 sièges en jeu là où le Sénat en annonce 178.
 */
function lireCirconscription(brut: string, code: string, label: string, url: string): { sieges: number; elus: Elu[] } {
  // Le fond de carte en SVG porte des identifiants de département qui
  // brouilleraient toutes les recherches suivantes.
  const page = brut.replace(/<svg[\s\S]*?<\/svg>/g, "");

  const compteurs = [...page.matchAll(/class="district-count">([^<]+)</g)]
    .map(m => Number(m[1].replace(/\D/g, "")))
    .filter(n => Number.isFinite(n));
  const sieges = compteurs[0] ?? 0;
  const electeurs = compteurs[1] ?? null;
  const mode = page.includes("Scrutin proportionnel") ? "proportionnel"
    : page.includes("Scrutin majoritaire") ? "majoritaire" : null;

  // Les sortants sont signalés dans le tableau des résultats, quel que soit le
  // mode de scrutin — au sein d'une liste à la proportionnelle, sur la ligne du
  // candidat au majoritaire. On les relève donc sur toute la page.
  const sortants = new Set(
    [...page.matchAll(/>\s*([^<>]{3,80}?)\s*\(sortant\)/g)].map(m => norm(sansBalises(m[1]))),
  );

  const elus: Elu[] = [];
  const debut = page.indexOf('<div class="senators-list">');
  if (debut < 0) return { sieges, elus };
  // Le bloc des élus précède le tableau des résultats ; on s'arrête au premier
  // des deux repères qui suit, plutôt que de compter les balises fermantes.
  const fin = Math.min(
    ...[page.indexOf('class="results', debut), page.indexOf("<footer", debut), page.length]
      .filter(i => i > debut),
  );
  for (const item of page.slice(debut, fin).matchAll(/<div class="senator-item">([\s\S]*?)<\/div>\s*<\/div>/g)) {
    const bloc = item[1];
    const brutNom = bloc.match(/class="label">([^<]+)</)?.[1];
    if (!brutNom) continue;
    const nomComplet = sansBalises(brutNom);
    const nuance = sansBalises(bloc.match(/class="senator-group">([^<]*)</)?.[1] || "");
    // Le dièse de la couleur est échappé en « &#x23; » — une entité qui contient
    // elle-même un point-virgule. Découper la déclaration CSS avant de décoder
    // s'arrêtait donc sur ce point-virgule et ne gardait que « &#x23 », perdant
    // les six chiffres de la couleur. On décode le style d'abord, on découpe
    // ensuite.
    const style = decodeHtml(bloc.match(/class="senator-color"[^>]*style="([^"]*)"/)?.[1] || "");
    const couleur = style.match(/--senator-color:\s*([^;]+)/)?.[1]?.trim() || null;
    const { prenom, nom } = separerNom(nomComplet);
    elus.push({
      code, circonscription: label, nomComplet, prenom, nom,
      nuance, couleur, sortant: sortants.has(norm(nomComplet)),
      sieges, electeurs, mode: mode as Elu["mode"], url,
    });
  }
  return { sieges, elus };
}

async function lireResultats(): Promise<{ elus: Elu[]; circos: Circonscription[] }> {
  const index = JSON.parse(await recuperer(`${SITE_SCRUTIN}/carte/data`)) as
    { code: string; name: string; url: string; vote: string }[];
  const renouvelees = index.filter(c => c.vote && c.vote !== "none");
  if (!renouvelees.length) throw new Error("index du scrutin vide — on n'écrit rien");
  console.log(`> site du scrutin : ${renouvelees.length} circonscriptions renouvelées.`);

  const elus: Elu[] = [];
  const circos: Circonscription[] = [];
  const file = [...renouvelees];
  // Quatre pages à la fois : assez pour tenir dans le temps d'un cron, assez peu
  // pour ne pas peser sur un site institutionnel.
  const travailleur = async () => {
    for (let c = file.shift(); c; c = file.shift()) {
      const url = `${SITE_SCRUTIN}${c.url}`;
      try {
        const lu = lireCirconscription(await recuperer(url), c.code, c.name, url);
        elus.push(...lu.elus);
        circos.push({ code: c.code, label: c.name, seats: lu.sieges, known: lu.elus.length });
      } catch (e) {
        console.warn(`  ! ${c.code} ${c.name} : ${(e as Error).message}`);
        circos.push({ code: c.code, label: c.name, seats: 0, known: 0 });
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, travailleur));
  circos.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return { elus, circos };
}

/* ───────────────────── 2. Les sénateurs, depuis l'open data ───────────────── */

type Senateur = {
  matricule: string; nom: string; prenom: string; civilite: string;
  groupe: string; commission: string; circo: string; code: string | null;
  naissance: string | null; profession: string; csp: string; email: string;
  /** Lu sur senat.fr pour un nouvel élu absent de l'open data : nuance du scrutin, fonctions antérieures. */
  nuance?: string; anterieur?: string; depuisSite?: boolean;
  /** Nom de fichier senat.fr exact (« amard_gabriel20684b ») : la photo en dérive sans deviner. */
  fichier?: string;
};

function lireCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  for (const brut of texte.split(/\r?\n/)) {
    if (!brut || brut.trimStart().startsWith("%")) continue;
    const cellules: string[] = [];
    let cur = "", guillemets = false;
    for (let i = 0; i < brut.length; i++) {
      const c = brut[i];
      if (c === '"') {
        if (guillemets && brut[i + 1] === '"') { cur += '"'; i++; } else guillemets = !guillemets;
      } else if (c === "," && !guillemets) { cellules.push(cur); cur = ""; }
      else cur += c;
    }
    cellules.push(cur);
    lignes.push(cellules);
  }
  return lignes;
}

const dateSeule = (s: string) => (s || "").match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || null;

async function listeOfficielle(): Promise<Senateur[]> {
  const r = await fetch(URL_ODSEN, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`ODSEN HTTP ${r.status}`);
  // Tous les exports du Sénat sont en latin-1.
  const lignes = lireCsv(new TextDecoder("latin1").decode(await r.arrayBuffer()));
  const entete = lignes[0];
  const col = (f: string) => entete.findIndex(h => norm(h).includes(norm(f)));
  const iMat = col("Matricule"), iQual = col("Qualit"), iNom = col("Nom usuel"), iEtat = col("tat"),
    iNai = col("Date naissance"), iGrp = col("Groupe politique"), iCom = col("Commission permanente"),
    iCirc = col("Circonscription"), iMail = col("lectronique"), iCsp = col("Categorie professionnelle"),
    iProf = col("Description de la profession");
  // Le prénom suit le nom usuel ; les deux intitulés ne diffèrent que par un
  // accent, d'où le repérage par position.
  const iPre = iNom + 1;
  if (iMat < 0 || iNom < 0 || iEtat < 0 || iCirc < 0) throw new Error("ODSEN : colonnes inattendues");

  const out: Senateur[] = [];
  for (const ligne of lignes.slice(1)) {
    if ((ligne[iEtat] || "").toUpperCase() !== "ACTIF") continue;
    const circo = (ligne[iCirc] || "").trim();
    out.push({
      matricule: (ligne[iMat] || "").trim(), nom: (ligne[iNom] || "").trim(), prenom: (ligne[iPre] || "").trim(),
      civilite: (ligne[iQual] || "").trim(), groupe: (ligne[iGrp] || "").trim(),
      commission: (ligne[iCom] || "").trim(), circo, code: codeDe(circo),
      naissance: dateSeule(ligne[iNai] || ""), profession: (ligne[iProf] || "").trim(),
      csp: (ligne[iCsp] || "").trim(), email: (ligne[iMail] || "").trim(),
    });
  }
  return out;
}

/* ──────────── 2 bis. La liste du site senat.fr, en relais de l'open data ────────────
 * Le 1er octobre, la liste « Vos sénateurs » de senat.fr passe à la nouvelle
 * assemblée dès la prise de fonctions ; l'open data ODSEN, lui, ne suit que des
 * jours plus tard. Sans relais, les nouveaux élus restaient sans fiche ni photo
 * alors que le Sénat les avait déjà publiés. La liste du site dit QUI siège ;
 * pour ceux qui siégeaient déjà, la ligne ODSEN reste la source (groupe,
 * commission, profession) ; pour les nouveaux, leur page senat.fr et le
 * résultat du scrutin donnent l'essentiel, et la synchronisation ODSEN
 * complètera groupe et commission dès leur constitution.
 */
const URL_LISTE_SENAT = "https://www.senat.fr/senateurs/senatl.html";
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function dateFr(s?: string | null): string | null {
  const m = (s || "").match(/(\d{1,2})(?:er)?\s+([a-zéû]+)\s+(\d{4})/i);
  const mois = m ? MOIS_FR.indexOf(m[2].toLowerCase()) : -1;
  return m && mois >= 0 ? `${m[3]}-${String(mois + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/** « APOURCEAU-POLY » → « Apourceau-Poly », « DE LA PROVÔTÉ » → « de La Provôté ». */
function casseNom(nom: string): string {
  return nom.toLocaleLowerCase("fr").split(/(\s+|-|')/).map(p =>
    /^(\s+|-|')$/.test(p) || /^(de|du|des|d)$/.test(p) ? p : p.charAt(0).toLocaleUpperCase("fr") + p.slice(1),
  ).join("");
}

async function listeSiteSenat(odsen: Senateur[], elus: Elu[]): Promise<Senateur[] | null> {
  const html = await recuperer(URL_LISTE_SENAT);
  const entrees = [...html.matchAll(/href="\/senateur\/([a-z0-9_]+?)(\d{5}[a-z])\.html"[^>]*>([^<]+)</gi)];
  if (entrees.length < 300) { console.warn(`  ! senat.fr : ${entrees.length} sénateurs lus — liste écartée`); return null; }

  const odsenParMatricule = new Map(odsen.map(s => [s.matricule.toUpperCase(), s]));
  const eluParNom = new Map(elus.map(e => [norm(`${e.prenom}${e.nom}`), e]));
  const out: Senateur[] = [];
  for (const [, base, mat, libelle] of entrees) {
    const matricule = mat.toUpperCase();
    const connu = odsenParMatricule.get(matricule);
    if (connu) { out.push({ ...connu, fichier: `${base}${mat}` }); continue; }

    const { prenom, nom } = separerNom(decodeHtml(libelle).replace(/ /g, " "));
    const elu = eluParNom.get(norm(`${prenom}${nom}`));
    const page = await recuperer(`https://www.senat.fr/senateur/${base}${mat}.html`).catch(() => "");
    const texte = sansBalises(page);
    const titre = sansBalises(page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
    const circoPage = texte.match(/Sénat(?:eur|rice) (?:du |de la |de l'|des |de |représentant les )?(.+?) \(/)?.[1] || "";
    const anterieur = texte.match(/Fonctions antérieures (.+?) Extrait de la/)?.[1]?.replace(/\s+,/g, ",").trim();
    out.push({
      matricule, nom: casseNom(nom), prenom, civilite: /^Mme/i.test(titre) ? "Mme" : "M.",
      groupe: "", commission: "", profession: "", csp: "", email: "",
      circo: elu?.circonscription || circoPage, code: elu?.code || codeDe(circoPage),
      naissance: dateFr(texte.match(/Née? le (\d{1,2}(?:er)? [a-zéû]+ \d{4})/i)?.[1]),
      nuance: elu?.nuance || undefined, anterieur: anterieur || undefined, depuisSite: true, fichier: `${base}${mat}`,
    });
    await new Promise(r => setTimeout(r, 300)); // on reste courtois avec senat.fr
  }
  return out;
}

const pourFichier = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

/**
 * La photo officielle. Le nom de fichier exact vient de la liste senat.fr quand
 * on l'a ; sinon il est reconstitué depuis le nom. Vérifiée par GET, avec trois
 * essais : des HEAD en rafale, juste après la lecture des 348 pages, étaient
 * refusés, et 24 nouveaux élus s'étaient retrouvés sans photo alors qu'elle existait.
 */
async function photoOfficielle(nom: string, prenom: string, matricule: string, fichier?: string): Promise<string | null> {
  if (!matricule && !fichier) return null;
  const base = `${PHOTOS_SENAT}/${fichier || `${pourFichier(nom)}_${pourFichier(prenom)}${matricule.toLowerCase()}`}`;
  for (const candidat of [`${base}_carre.jpg`, `${base}.jpg`]) {
    for (let essai = 1; essai <= 3; essai++) {
      try {
        const r = await fetch(candidat, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
        await r.arrayBuffer().catch(() => null);
        if (r.ok && (r.headers.get("content-type") || "").includes("image")) return candidat;
        if (r.status === 404) break;   // absente : inutile d'insister
      } catch { /* réseau : on réessaie */ }
      await new Promise(res => setTimeout(res, 1500 * essai));
    }
  }
  return null;
}

type EnBase = {
  id: string; first_name: string; last_name: string; slug: string;
  senate_matricule: string | null; photo_url: string | null; sitting: boolean | null;
  senate_group: string | null; party: string | null; department: string | null; department_code: string | null;
};

const COLONNES_FICHE =
  "id, first_name, last_name, slug, senate_matricule, photo_url, sitting, senate_group, party, department, department_code";

/**
 * Aligne la table `senators` sur la liste officielle : mises à jour, entrées,
 * sorties. C'est ce passage qui, le 1er octobre, créera la fiche des nouveaux
 * élus — par le même chemin que toutes les autres, et non par un traitement
 * d'exception réservé au renouvellement.
 */
async function synchroniserSenateurs(officiels: Senateur[]): Promise<EnBase[]> {
  const { data, error } = await supabase.from("senators").select(COLONNES_FICHE);
  if (error) throw error;
  const enBase = (data || []) as EnBase[];
  if (SANS_SENATEURS) return enBase;

  const parMatricule = new Map(officiels.map(s => [s.matricule, s]));
  const enFonction: string[] = [], sortis: string[] = [];
  let maj = 0, photos = 0;

  for (const s of enBase) {
    const o = (s.senate_matricule && parMatricule.get(s.senate_matricule))
      || officiels.find(x => norm(`${x.nom}${x.prenom}`) === norm(`${s.last_name}${s.first_name}`));
    if (!o) { sortis.push(s.id); continue; }
    enFonction.push(s.id);

    const patch: Record<string, unknown> = {};
    const poser = (champ: string, val: unknown) => {
      if (val !== null && val !== "" && (s as Record<string, unknown>)[champ] !== val) patch[champ] = val;
    };
    poser("senate_matricule", o.matricule);
    poser("senate_group", o.groupe);
    poser("committee", o.commission);
    poser("department", o.circo);
    poser("department_code", o.code);
    poser("email", o.email);
    poser("profession", o.profession);
    poser("csp", o.csp);
    poser("birth_date", o.naissance);
    // `party` n'est renseigné que s'il manque : le groupe parlementaire fait foi
    // dans `senate_group`, et `party` porte parfois une curation qu'une
    // synchronisation n'a pas à écraser.
    if (!s.party) poser("party", o.groupe);
    if (!s.photo_url) {
      const p = await photoOfficielle(o.nom, o.prenom, o.matricule, o.fichier);
      if (p) { patch.photo_url = p; photos++; }
    }
    if (!Object.keys(patch).length) continue;
    if (A_BLANC) {
      // À blanc, on montre quelques changements : c'est ce qu'on vient vérifier.
      if (maj < 6) console.log(`    · ${s.first_name} ${s.last_name} : ${JSON.stringify(patch).slice(0, 220)}`);
      maj++; continue;
    }
    const { error: e } = await supabase.from("senators").update(patch).eq("id", s.id);
    if (e) console.warn(`  ! ${s.last_name} : ${e.message}`);
    else maj++;
  }

  // Les entrants : dans la liste officielle, absents de la nôtre.
  const connus = new Set<string>();
  for (const s of enBase) {
    if (s.senate_matricule) connus.add(s.senate_matricule);
    connus.add(norm(`${s.last_name}${s.first_name}`));
  }
  const slugs = new Set(enBase.map(s => s.slug));
  const slugifier = (s: string) =>
    (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const entrants: Record<string, unknown>[] = [];
  for (const o of officiels) {
    if (connus.has(o.matricule) || connus.has(norm(`${o.nom}${o.prenom}`))) continue;
    let slug = slugifier(`${o.prenom} ${o.nom}`);
    if (slugs.has(slug)) slug = `${slug}-${o.matricule.toLowerCase()}`;
    slugs.add(slug);
    const elle = /mme/i.test(o.civilite);
    entrants.push({
      first_name: o.prenom, last_name: o.nom, slug, senate_matricule: o.matricule,
      photo_url: await photoOfficielle(o.nom, o.prenom, o.matricule, o.fichier),
      // Nouvel élu lu sur senat.fr : pas encore de groupe (ils se constituent début
      // octobre) — sa nuance du scrutin en tient lieu jusqu'à la synchro ODSEN.
      senate_group: o.groupe || null, party: o.groupe || o.nuance || null,
      department: o.circo, department_code: o.code,
      birth_date: o.naissance, profession: o.profession || null, csp: o.csp || null,
      committee: o.commission || null, email: o.email || null, sitting: true,
      biography: o.depuisSite
        ? `${o.prenom} ${o.nom} est ${elle ? "sénatrice" : "sénateur"} de la circonscription : ${o.circo}, ${elle ? "élue" : "élu"} le ${new Date(DATE_SCRUTIN).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
          + (o.nuance ? ` (nuance : ${o.nuance})` : "") + "."
          + (o.anterieur ? ` Fonctions antérieures : ${o.anterieur}.` : "")
          + " Son groupe politique et sa commission seront indiqués dès leur constitution. Source : site officiel du Sénat."
        : `${o.prenom} ${o.nom} est ${elle ? "sénatrice" : "sénateur"} de la circonscription : ${o.circo}.`
        + (o.groupe ? ` ${elle ? "Elle siège" : "Il siège"} au sein du groupe ${o.groupe}.` : "")
        + (o.commission ? ` ${elle ? "Elle est membre" : "Il est membre"} de la ${o.commission}.` : "")
        + (o.profession ? ` Sa profession d'origine est : ${o.profession}.` : "")
        + " Ces informations proviennent des données officielles du Sénat (ODSEN).",
      legal_issues: "Aucune affaire judiciaire connue ou signalée à ce jour.",
    });
  }

  const majStatut = async (ids: string[], val: boolean) => {
    for (let i = 0; i < ids.length; i += 200) {
      const { error: e } = await supabase.from("senators").update({ sitting: val }).in("id", ids.slice(i, i + 200));
      if (e) console.warn(`  ! statut : ${e.message}`);
    }
  };

  // Un renouvellement par moitié fait sortir quelques dizaines de sénateurs. Bien
  // davantage trahirait une liste mal lue : on ne retire alors personne.
  if (sortis.length > 120) {
    console.warn(`  ! ${sortis.length} sortants : liste suspecte, statuts inchangés.`);
    sortis.length = 0;
  }
  if (!A_BLANC) {
    await majStatut(enFonction, true);
    await majStatut(sortis, false);
    if (entrants.length) {
      const { error: e } = await supabase.from("senators").insert(entrants);
      if (e) console.warn(`  ! entrants : ${e.message}`);
    }
  }
  console.log(`> senators : ${maj} fiche(s) mise(s) à jour, ${photos} photo(s), ${entrants.length} entrant(s), ${sortis.length} sortant(s).`);

  if (A_BLANC || !entrants.length) return enBase;
  const { data: apres } = await supabase.from("senators").select(COLONNES_FICHE);
  return (apres || enBase) as EnBase[];
}

/* ─────────────────────────────── Le passage ─────────────────────────────── */

const compterGroupes = (l: Senateur[]) => {
  const c: Record<string, number> = {};
  for (const s of l) { const g = s.groupe || "Sans groupe"; c[g] = (c[g] || 0) + 1; }
  return c;
};

async function main() {
  console.log(`--- RENOUVELLEMENT DU SÉNAT — scrutin du ${DATE_SCRUTIN} ---`);

  // Un passage à blanc sert justement à vérifier ce qu'on lit : il ne doit pas
  // s'arrêter parce que la destination n'existe pas encore.
  const { error: sonde } = await supabase.from("senate_election_status").select("election_date").limit(1);
  if (sonde && /does not exist|schema cache|PGRST205|42P01/i.test(`${sonde.code} ${sonde.message}`)) {
    console.error("=".repeat(76));
    console.error("❌ Migration non appliquée : les tables du renouvellement n'existent pas.");
    console.error("   → Supabase → SQL Editor → coller supabase/migrations/2026092601_senate_election.sql");
    console.error("=".repeat(76));
    if (!A_BLANC) { process.exitCode = 1; return; }
  }

  const odsen = await listeOfficielle();
  if (odsen.length < 300) throw new Error(`liste officielle suspecte (${odsen.length}) — on n'écrit rien`);
  console.log(`> open data : ${odsen.length} sénateurs en fonction.`);

  // Le résultat d'abord : c'est lui qui dit si l'open data décrit déjà la
  // nouvelle assemblée (un nouvel élu y figure) ou encore l'ancienne.
  const resultats = SANS_RESULTATS ? null : await lireResultats();
  const nomsNouveaux = new Set((resultats?.elus || []).filter(e => !e.sortant).map(e => norm(`${e.prenom}${e.nom}`)));
  const odsenRenouvele = odsen.some(o => nomsNouveaux.has(norm(`${o.prenom}${o.nom}`)));

  let officiels = odsen;
  if (resultats && nomsNouveaux.size && !odsenRenouvele) {
    const site = await listeSiteSenat(odsen, resultats.elus).catch(e => { console.warn(`  ! senat.fr : ${e.message}`); return null; });
    if (site?.some(o => nomsNouveaux.has(norm(`${o.prenom}${o.nom}`)))) {
      officiels = site;
      console.log(`> open data pas encore renouvelé : liste de senat.fr retenue (${site.length} en fonction, ${site.filter(s => s.depuisSite).length} nouveaux lus sur leur page).`);
    }
  }
  const sansCode = [...new Set(officiels.filter(s => !s.code).map(s => s.circo))];
  if (sansCode.length) console.warn(`  ! circonscription(s) non résolue(s) : ${sansCode.join(", ")}`);

  const fiches = await synchroniserSenateurs(officiels);

  if (!resultats) { console.log("> résultats ignorés (--skip-results)."); return; }

  const { elus, circos } = resultats;
  const siegesTotal = circos.reduce((n, c) => n + c.seats, 0);
  const nouveaux = elus.filter(e => !e.sortant).length;
  console.log(`> ${elus.length} élus lus sur ${siegesTotal} sièges — ${nouveaux} nouveaux, ${elus.length - nouveaux} réélus.`);
  const enAttente = circos.filter(c => c.known < c.seats);
  if (enAttente.length) {
    console.log(`  · en attente : ${enAttente.map(c => `${c.label} (${c.known}/${c.seats})`).join(", ")}`);
  }

  // Rapprochement avec les fiches du site, quand elles existent. Pour les
  // nouveaux élus, ce sera le cas dès que l'open data les aura inscrits.
  const parNom = new Map<string, EnBase>();
  for (const f of fiches) parNom.set(norm(`${f.first_name}${f.last_name}`), f);

  const lignes = elus.map(e => {
    // Repli sur nom de famille + circonscription : le site du scrutin a ses coquilles
    // (« Chistine BOST »), et un prénom mal tapé ne doit pas priver un élu de sa fiche.
    const f = parNom.get(norm(`${e.prenom}${e.nom}`))
      ?? fiches.find(x => norm(x.last_name) === norm(e.nom) && x.department_code === e.code && x.sitting !== false);
    return {
      election_date: DATE_SCRUTIN, dept_code: e.code, constituency: e.circonscription,
      full_name: e.nomComplet, first_name: e.prenom, last_name: e.nom,
      slug: f?.slug ?? null, photo_url: f?.photo_url ?? null, senate_matricule: f?.senate_matricule ?? null,
      nuance: e.nuance || null, nuance_color: e.couleur,
      outcome: e.sortant ? "reelu" : "nouveau",
      seats: e.sieges || null, electors: e.electeurs, ballot: e.mode,
      source_url: e.url, updated_at: new Date().toISOString(),
    };
  });
  console.log(`> ${lignes.filter(l => l.slug).length} élus ont déjà leur fiche sur le site.`);

  const nuances: Record<string, { count: number; color: string | null }> = {};
  for (const e of elus) {
    const n = e.nuance || "Sans nuance";
    nuances[n] = { count: (nuances[n]?.count || 0) + 1, color: nuances[n]?.color || e.couleur };
  }

  // « Avant » et « après » du point de vue des groupes du Sénat. L'open data
  // décrit encore l'ancienne assemblée tant qu'aucun nouvel élu n'y figure :
  // c'est ce test, et non l'horloge, qui dit lequel des deux on lit. Une fois
  // relevé, l'état d'avant n'est plus jamais réécrit.
  // Les groupes ne se comptent que sur l'open data : la liste du site ne les donne pas.
  const rosterRenouvele = odsenRenouvele;
  const { data: statutActuel } = await supabase
    .from("senate_election_status").select("groups_before").eq("election_date", DATE_SCRUTIN).maybeSingle();

  const statut = {
    election_date: DATE_SCRUTIN,
    phase: elus.length ? "resultats" : "attente",
    constituencies_total: circos.length,
    seats_total: siegesTotal,
    seats_known: elus.length,
    new_count: nouveaux,
    reelected_count: elus.length - nouveaux,
    renewable: circos,
    nuances,
    groups_before: statutActuel?.groups_before ?? (rosterRenouvele ? null : compterGroupes(odsen)),
    groups_after: rosterRenouvele ? compterGroupes(odsen) : null,
    source: "Sénat — résultats officiels du scrutin et open data ODSEN",
    source_url: SITE_SCRUTIN,
    updated_at: new Date().toISOString(),
  };
  console.log(`> phase « ${statut.phase} » ; open data ${rosterRenouvele ? "déjà renouvelé" : "encore sur l'ancienne assemblée"}.`);

  if (A_BLANC) { console.log("--- À BLANC : rien n'a été écrit. ---"); return; }

  for (let i = 0; i < lignes.length; i += 200) {
    const { error } = await supabase.from("senate_election_results")
      .upsert(lignes.slice(i, i + 200), { onConflict: "election_date,dept_code,full_name" });
    if (error) throw error;
  }
  const { error: e2 } = await supabase.from("senate_election_status")
    .upsert(statut, { onConflict: "election_date" });
  if (e2) throw e2;

  console.log("--- TERMINÉ. ---");
}

main().catch(e => { console.error(e); process.exit(1); });
