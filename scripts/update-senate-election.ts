/**
 * CRON : renouvellement du Sénat (série 2 — scrutin du 27 septembre 2026).
 *
 * POURQUOI CE SCRIPT EXISTE
 * Une sénatoriale ne se suit pas comme une présidentielle. Le scrutin est
 * indirect, se tient dans 63 chefs-lieux le même dimanche, et AUCUNE
 * administration ne publie de flux de voix exploitable en temps réel : le site
 * du ministère de l'Intérieur n'ouvre son espace « senatoriales2026 » qu'au
 * moment du scrutin, dans un format qu'on ne peut pas deviner à l'avance.
 * Écrire aujourd'hui un analyseur pour ce format serait écrire du code qui ne
 * marchera pas le jour où il servira.
 *
 * Ce qui fait foi — et ce qui intéresse le lecteur — c'est la LISTE DES ÉLUS.
 * Le Sénat la publie lui-même en open data (ODSEN_GENERAL.csv, Licence
 * Ouverte), et cette liste est vivante : elle a été mise à jour le jour même où
 * ce script a été écrit. Le résultat est donc obtenu par DIFFÉRENCE entre deux
 * états de cette liste — celle de la veille du scrutin, et celle d'après.
 *
 * Trois choses à chaque passage :
 *   1. SYNCHRONISER `senators` sur la liste officielle (groupe, commission,
 *      circonscription, code département, entrées et sorties). C'est ce qui
 *      met à jour l'hémicycle, l'annuaire et les fiches sans redéploiement.
 *   2. FIGER L'ÉTAT D'AVANT tant que le scrutin n'a pas eu lieu : qui siège,
 *      où, dans quel groupe, et quels sièges sont remis en jeu.
 *   3. PUBLIER LE RÉSULTAT dès que la liste bouge : siège par siège, réélu ou
 *      nouveau, avec le solde de chaque groupe.
 *
 * Le script est idempotent et silencieux quand rien n'a changé : il compare une
 * empreinte de la liste officielle avant d'écrire quoi que ce soit.
 *
 * Usage :
 *   npx tsx scripts/update-senate-election.ts
 *   npx tsx scripts/update-senate-election.ts --dry-run        # diagnostic seul
 *   npx tsx scripts/update-senate-election.ts --force          # réécrit malgré l'empreinte
 *   npx tsx scripts/update-senate-election.ts --skip-senators  # n'écrit pas dans `senators`
 *   npx tsx scripts/update-senate-election.ts --date=2032-09-26
 *
 * Variables requises : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const URL_ODSEN = "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv";
const URL_ELUSEN = "https://data.senat.fr/data/senateurs/ODSEN_ELUSEN.csv";
const UA = "Mozilla/5.0 (compatible; lapolitiquecestsimple/1.0; +https://lapolitiquecestsimple.fr)";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const valeur = (n: string) => args.find(a => a.startsWith(`--${n}=`))?.split("=")[1];

const DATE_SCRUTIN = valeur("date") || "2026-09-27";
const A_BLANC = flag("dry-run");
const FORCER = flag("force");
const SANS_SENATEURS = flag("skip-senators");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

/* ───────────────────────────── Département : libellé → code ─────────────────
 * Le Sénat désigne les circonscriptions par leur nom, jamais par leur code.
 * Or c'est le code qui relie un siège au fond de carte et aux autres tables.
 * `senators.department_code` contenait jusqu'ici les deux premières lettres du
 * nom (« Se » pour Seine-Maritime) : inexploitable. Ce script le répare.
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
  // département. Ils ont donc un code à eux, hors nomenclature INSEE.
  "099": "Français établis hors de France",
};

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// Le Sénat écrit certains libellés autrement que l'INSEE. Ces écarts sont
// constatés dans le fichier, pas supposés.
const ALIAS: Record<string, string> = {
  [norm("Iles Wallis et Futuna")]: "986",
  [norm("Wallis et Futuna")]: "986",
  [norm("Nouvelle Calédonie")]: "988",
  [norm("Saint Pierre et Miquelon")]: "975",
  [norm("La Reunion")]: "974",
  [norm("Français établis hors de France")]: "099",
  [norm("Francais de l'etranger")]: "099",
};

const PAR_NOM = new Map<string, string>();
for (const [code, nom] of Object.entries(CODES)) PAR_NOM.set(norm(nom), code);

function codeDe(libelle: string): string | null {
  const n = norm(libelle);
  return ALIAS[n] || PAR_NOM.get(n) || null;
}

/* ──────────────────────────── Les sièges remis en jeu ───────────────────────
 * Le Sénat se renouvelle par moitié. La série qui vote en 2026 n'est PAS
 * devinée à partir des numéros de département : cette règle de pouce est fausse
 * (elle oublie la Guyane, qui vote bien en 2026). La liste ci-dessous a été
 * établie à partir des données du Sénat elles-mêmes — les circonscriptions dont
 * les sénateurs ont été élus au renouvellement du 27 septembre 2020 et siègent
 * toujours (ODSEN_ELUSEN.csv, relevé du 25 septembre 2026) : 63 circonscriptions,
 * 172 sièges. `verifierSerie()` refait ce calcul à chaque passage d'avant-scrutin
 * et alerte si la liste officielle s'en écarte.
 */
const SERIE_2 = [
  "Ain", "Aisne", "Allier", "Alpes-de-Haute-Provence", "Hautes-Alpes", "Alpes-Maritimes", "Ardèche",
  "Ardennes", "Ariège", "Aube", "Aude", "Aveyron", "Bouches-du-Rhône", "Calvados", "Cantal", "Charente",
  "Charente-Maritime", "Cher", "Corrèze", "Corse-du-Sud", "Haute-Corse", "Côte-d'Or", "Côtes-d'Armor",
  "Creuse", "Dordogne", "Doubs", "Drôme", "Eure", "Eure-et-Loir", "Finistère", "Gard", "Haute-Garonne",
  "Gers", "Gironde", "Guyane", "Hérault", "Ille-et-Vilaine", "Indre", "Bas-Rhin", "Haut-Rhin", "Rhône",
  "Haute-Saône", "Saône-et-Loire", "Sarthe", "Savoie", "Haute-Savoie", "Seine-Maritime", "Deux-Sèvres",
  "Somme", "Tarn", "Tarn-et-Garonne", "Territoire de Belfort", "Var", "Vaucluse", "Vendée", "Vienne",
  "Haute-Vienne", "Vosges", "Yonne", "Saint-Barthélemy", "Saint-Martin", "Wallis-et-Futuna",
  "Polynésie française",
];
const SERIE_2_CODES = new Set(SERIE_2.map(n => codeDe(n)!).filter(Boolean));

/* ─────────────────────────────── Lecture du CSV ─────────────────────────────
 * Les exports du Sénat sont en latin-1, préfixés par la requête SQL qui les a
 * produits (lignes « % »), et contiennent des virgules dans les professions.
 */
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

async function telecharger(url: string): Promise<string[][]> {
  let derniere: unknown;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return lireCsv(new TextDecoder("latin1").decode(await r.arrayBuffer()));
    } catch (e) {
      derniere = e;
      await new Promise(r => setTimeout(r, 2000 * (essai + 1)));
    }
  }
  throw new Error(`${url} : ${(derniere as Error)?.message || derniere}`);
}

type Senateur = {
  matricule: string; nom: string; prenom: string; civilite: string;
  groupe: string; commission: string; circo: string; code: string | null;
  naissance: string | null; profession: string; csp: string; email: string;
};

const dateSeule = (s: string) => (s || "").match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || null;

/** Les sénateurs en fonction, d'après la liste officielle. */
async function listeOfficielle(): Promise<Senateur[]> {
  const lignes = await telecharger(URL_ODSEN);
  const entete = lignes[0];
  const col = (fragment: string) => entete.findIndex(h => norm(h).includes(norm(fragment)));
  const iMat = col("Matricule"), iQual = col("Qualit"), iNom = col("Nom usuel"), iEtat = col("tat"),
    iNai = col("Date naissance"), iGrp = col("Groupe politique"), iCom = col("Commission permanente"),
    iCirc = col("Circonscription"), iMail = col("lectronique"), iCsp = col("Categorie professionnelle"),
    iProf = col("Description de la profession");
  // Le prénom suit immédiatement le nom usuel ; les deux colonnes portent des
  // intitulés qui ne se distinguent que par un accent, d'où le repérage par
  // position plutôt que par nom.
  const iPre = iNom + 1;
  if (iMat < 0 || iNom < 0 || iEtat < 0 || iCirc < 0) throw new Error("ODSEN : colonnes inattendues");

  const out: Senateur[] = [];
  for (const r of lignes.slice(1)) {
    if ((r[iEtat] || "").toUpperCase() !== "ACTIF") continue;
    const circo = (r[iCirc] || "").trim();
    out.push({
      matricule: (r[iMat] || "").trim(),
      nom: (r[iNom] || "").trim(),
      prenom: (r[iPre] || "").trim(),
      civilite: (r[iQual] || "").trim(),
      groupe: (r[iGrp] || "").trim(),
      commission: (r[iCom] || "").trim(),
      circo,
      code: codeDe(circo),
      naissance: dateSeule(r[iNai] || ""),
      profession: (r[iProf] || "").trim(),
      csp: (r[iCsp] || "").trim(),
      email: (r[iMail] || "").trim(),
    });
  }
  return out;
}

/**
 * Recalcule la série concernée à partir des mandats ouverts issus du
 * renouvellement de 2020, et compare à SERIE_2. Non bloquant : ODSEN_ELUSEN
 * n'est plus tenu à jour depuis 2021 (il ignore le renouvellement de 2023), il
 * sert donc de garde-fou sur l'historique, pas de source.
 */
async function verifierSerie(officiels: Senateur[]) {
  try {
    const lignes = await telecharger(URL_ELUSEN);
    const entete = lignes[0];
    const col = (f: string) => entete.findIndex(h => norm(h).includes(norm(f)));
    const iMat = col("Matricule"), iEtat = col("tat"), iElu = col("Date d election"), iFin = col("Date de fin");
    if (iMat < 0 || iElu < 0 || iFin < 0) return;
    const circoPar = new Map(officiels.map(s => [s.matricule, s.circo]));
    const attendu = new Set<string>();
    for (const r of lignes.slice(1)) {
      if ((r[iEtat] || "").toUpperCase() !== "ACTIF") continue;
      if ((r[iElu] || "").slice(0, 10) !== "2020-09-27") continue;
      if ((r[iFin] || "").trim()) continue;                       // mandat clos
      const c = circoPar.get((r[iMat] || "").trim());
      if (c) attendu.add(codeDe(c) || c);
    }
    if (!attendu.size) return;                                    // export vidé : on se tait
    const manquants = [...attendu].filter(c => !SERIE_2_CODES.has(c));
    const superflus = [...SERIE_2_CODES].filter(c => !attendu.has(c));
    if (manquants.length || superflus.length) {
      console.warn(`  ! série 2 : écart avec les mandats 2020 — manquants ${manquants.join(",") || "aucun"} / en trop ${superflus.join(",") || "aucun"}`);
    } else {
      console.log(`> série 2 recoupée avec les mandats de 2020 : ${attendu.size} circonscriptions, aucun écart.`);
    }
  } catch (e) {
    console.warn(`  ! vérification de la série impossible : ${(e as Error).message}`);
  }
}

/* ─────────────────────── Synchronisation de la table senators ───────────────
 * Le backend fait déjà cette synchronisation, mais une fois par mois : bien trop
 * lent pour un renouvellement. Les deux écrivent les mêmes valeurs depuis la
 * même source, ils convergent donc au lieu de diverger.
 */
const pourFichier = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

async function photoOfficielle(nom: string, prenom: string, matricule: string): Promise<string | null> {
  if (!matricule) return null;
  const base = `https://www.senat.fr/senimg/${pourFichier(nom)}_${pourFichier(prenom)}${matricule.toLowerCase()}`;
  for (const candidat of [`${base}_carre.jpg`, `${base}.jpg`]) {
    try {
      const r = await fetch(candidat, { method: "HEAD", signal: AbortSignal.timeout(12000) });
      if (r.ok && (r.headers.get("content-type") || "").includes("image")) return candidat;
    } catch { /* la photo n'est pas indispensable */ }
  }
  return null;
}

type EnBase = {
  id: string; first_name: string; last_name: string; slug: string;
  senate_matricule: string | null; photo_url: string | null; sitting: boolean | null;
  senate_group: string | null; party: string | null; department: string | null; department_code: string | null;
};

async function synchroniserSenateurs(officiels: Senateur[]): Promise<EnBase[]> {
  const { data, error } = await supabase
    .from("senators")
    .select("id, first_name, last_name, slug, senate_matricule, photo_url, sitting, senate_group, party, department, department_code");
  if (error) throw error;
  const enBase = (data || []) as EnBase[];

  if (SANS_SENATEURS) return enBase;

  const parMatricule = new Map(enBase.filter(s => s.senate_matricule).map(s => [s.senate_matricule!, s]));
  // Repli par nom pour les rares fiches sans matricule.
  const parNom = new Map(enBase.map(s => [norm(`${s.last_name}${s.first_name}`), s]));

  const officielsParMat = new Map(officiels.map(s => [s.matricule, s]));
  const enFonction: string[] = [], sortis: string[] = [];
  let maj = 0, photos = 0;

  for (const s of enBase) {
    const o = (s.senate_matricule && officielsParMat.get(s.senate_matricule))
      || officiels.find(x => norm(`${x.nom}${x.prenom}`) === norm(`${s.last_name}${s.first_name}`));
    if (!o) { sortis.push(s.id); continue; }
    enFonction.push(s.id);

    const patch: Record<string, unknown> = {};
    const poser = (champ: string, valeur: unknown) => {
      if (valeur !== null && valeur !== "" && (s as Record<string, unknown>)[champ] !== valeur) patch[champ] = valeur;
    };
    poser("senate_matricule", o.matricule);
    poser("senate_group", o.groupe);
    // `party` n’est renseigné que s’il manque : le groupe parlementaire fait
    // foi dans `senate_group`, et `party` porte parfois une curation (couleur,
    // rattachement à une fiche de parti) qu’une synchronisation n’a pas à écraser.
    if (!s.party) poser("party", o.groupe);
    poser("committee", o.commission);
    poser("department", o.circo);
    poser("department_code", o.code);
    poser("email", o.email);
    poser("profession", o.profession);
    poser("csp", o.csp);
    poser("birth_date", o.naissance);
    if (!s.photo_url) {
      const p = await photoOfficielle(o.nom, o.prenom, o.matricule);
      if (p) { patch.photo_url = p; photos++; }
    }
    if (!Object.keys(patch).length) continue;
    if (A_BLANC) { maj++; continue; }
    const { error: e } = await supabase.from("senators").update(patch).eq("id", s.id);
    if (e) console.warn(`  ! ${s.last_name} : ${e.message}`);
    else maj++;
  }

  // Les entrants : présents dans la liste officielle, absents de la nôtre.
  const connus = new Set<string>();
  for (const s of enBase) {
    if (s.senate_matricule) connus.add(s.senate_matricule);
    connus.add(norm(`${s.last_name}${s.first_name}`));
  }
  const slugs = new Set(enBase.map(s => s.slug));
  const slugifier = (s: string) =>
    (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const entrants: Record<string, unknown>[] = [];
  for (const o of officiels) {
    if (connus.has(o.matricule) || connus.has(norm(`${o.nom}${o.prenom}`))) continue;
    let slug = slugifier(`${o.prenom} ${o.nom}`);
    if (slugs.has(slug)) slug = `${slug}-${o.matricule.toLowerCase()}`;
    slugs.add(slug);
    entrants.push({
      first_name: o.prenom, last_name: o.nom, slug,
      senate_matricule: o.matricule,
      photo_url: await photoOfficielle(o.nom, o.prenom, o.matricule),
      senate_group: o.groupe || null, party: o.groupe || null,
      department: o.circo, department_code: o.code,
      birth_date: o.naissance, profession: o.profession || null, csp: o.csp || null,
      committee: o.commission || null, email: o.email || null, sitting: true,
      biography: `${o.prenom} ${o.nom} est sénateur${/mme/i.test(o.civilite) ? "e" : ""} de la circonscription : ${o.circo}.`
        + (o.groupe ? ` ${/mme/i.test(o.civilite) ? "Elle siège" : "Il siège"} au sein du groupe ${o.groupe}.` : "")
        + " Ces informations proviennent des données officielles du Sénat (ODSEN).",
    });
  }

  const majStatut = async (ids: string[], valeur: boolean) => {
    for (let i = 0; i < ids.length; i += 200) {
      const { error: e } = await supabase.from("senators").update({ sitting: valeur }).in("id", ids.slice(i, i + 200));
      if (e) console.warn(`  ! statut : ${e.message}`);
    }
  };

  if (!A_BLANC) {
    await majStatut(enFonction, true);
    await majStatut(sortis, false);
    if (entrants.length) {
      const { error: e } = await supabase.from("senators").insert(entrants);
      if (e) console.warn(`  ! entrants : ${e.message}`);
    }
  }
  console.log(`> senators : ${maj} fiche(s) mise(s) à jour, ${photos} photo(s) trouvée(s), ${entrants.length} entrant(s), ${sortis.length} sortant(s).`);

  if (A_BLANC || !entrants.length) return enBase;
  const { data: apres } = await supabase
    .from("senators")
    .select("id, first_name, last_name, slug, senate_matricule, photo_url, sitting, senate_group, party, department, department_code");
  return (apres || enBase) as EnBase[];
}

/* ───────────────────────────── Le scrutin proprement dit ────────────────────── */

const compterGroupes = (l: Senateur[]) => {
  const c: Record<string, number> = {};
  for (const s of l) { const g = s.groupe || "Sans groupe"; c[g] = (c[g] || 0) + 1; }
  return c;
};

type LigneBaseline = {
  election_date: string; matricule: string; first_name: string; last_name: string;
  constituency: string; dept_code: string | null; political_group: string; renewable: boolean;
};

async function ecrireParLots<T>(table: string, lignes: T[], conflit: string) {
  for (let i = 0; i < lignes.length; i += 200) {
    const { error } = await supabase.from(table).upsert(lignes.slice(i, i + 200) as never, { onConflict: conflit });
    if (error) throw error;
  }
}

async function main() {
  console.log(`--- RENOUVELLEMENT DU SÉNAT — scrutin du ${DATE_SCRUTIN} ---`);
  const officiels = await listeOfficielle();
  if (officiels.length < 300) throw new Error(`liste officielle suspecte (${officiels.length} sénateurs) — on n'écrit rien`);
  const sansCode = officiels.filter(s => !s.code);
  if (sansCode.length) console.warn(`  ! circonscription(s) non résolue(s) : ${[...new Set(sansCode.map(s => s.circo))].join(", ")}`);
  console.log(`> liste officielle : ${officiels.length} sénateurs en fonction.`);

  const empreinte = createHash("sha1")
    .update(officiels.map(s => `${s.matricule}|${s.circo}|${s.groupe}`).sort().join("\n"))
    .digest("hex").slice(0, 16);

  const { data: statutActuel } = await supabase
    .from("senate_election_status").select("*").eq("election_date", DATE_SCRUTIN).maybeSingle();

  const scrutinPasse = new Date().toISOString().slice(0, 10) > DATE_SCRUTIN;

  await synchroniserSenateurs(officiels);

  /* ── 1. L'état d'avant, figé une fois pour toutes ─────────────────────────── */
  const { count: dejaBaseline } = await supabase
    .from("senate_election_baseline")
    .select("matricule", { count: "exact", head: true })
    .eq("election_date", DATE_SCRUTIN);

  if (!dejaBaseline) {
    if (scrutinPasse) {
      // Sans photographie d'avant, « réélu » et « nouveau » ne veulent plus rien
      // dire : mieux vaut ne rien affirmer que d'affirmer faux.
      console.warn("  ! aucun instantané d'avant-scrutin et le scrutin est passé — le résultat ne distinguera pas les réélus.");
    } else {
      await verifierSerie(officiels);
      const lignes: LigneBaseline[] = officiels.map(s => ({
        election_date: DATE_SCRUTIN, matricule: s.matricule,
        first_name: s.prenom, last_name: s.nom,
        constituency: s.circo, dept_code: s.code, political_group: s.groupe,
        renewable: !!s.code && SERIE_2_CODES.has(s.code),
      }));
      const enJeu = lignes.filter(l => l.renewable);
      console.log(`> instantané d'avant-scrutin : ${lignes.length} sièges, dont ${enJeu.length} remis en jeu dans ${new Set(enJeu.map(l => l.dept_code)).size} circonscriptions.`);
      if (!A_BLANC) await ecrireParLots("senate_election_baseline", lignes, "election_date,matricule");
    }
  }

  const { data: baseline } = await supabase
    .from("senate_election_baseline").select("*").eq("election_date", DATE_SCRUTIN);
  const avant = (baseline || []) as LigneBaseline[];
  const avantParMat = new Map(avant.map(l => [l.matricule, l]));
  // Les circonscriptions qui votent : lues dans l'instantané quand il existe,
  // sinon la liste de référence.
  const codesEnJeu = avant.length
    ? new Set(avant.filter(l => l.renewable).map(l => l.dept_code!).filter(Boolean))
    : SERIE_2_CODES;

  const siegesPar = new Map<string, number>();
  for (const s of officiels) if (s.code) siegesPar.set(s.code, (siegesPar.get(s.code) || 0) + 1);
  const enJeuMaintenant = officiels.filter(s => s.code && codesEnJeu.has(s.code));
  const renouvellement = [...codesEnJeu].map(code => ({
    code,
    label: CODES[code] || code,
    seats: siegesPar.get(code) || 0,
  })).sort((a, b) => a.label.localeCompare(b.label, "fr"));

  /* ── 2. A-t-on changé de Sénat ? ──────────────────────────────────────────── */
  // Un siège a bougé si son titulaire n'était pas là la veille du scrutin.
  const nouveaux = enJeuMaintenant.filter(s => !avantParMat.has(s.matricule));
  const aBouge = avant.length > 0 && nouveaux.length > 0;
  const phase = !scrutinPasse ? "avant" : aBouge ? "resultats" : "attente";

  if (statutActuel?.roster_hash === empreinte && statutActuel?.phase === phase && !FORCER) {
    console.log("> liste officielle inchangée depuis le dernier passage — rien à réécrire.");
    return;
  }

  /* ── 3. Le résultat, siège par siège ──────────────────────────────────────── */
  let siegesChanges = 0;
  if (phase === "resultats") {
    const { data: fiches } = await supabase
      .from("senators").select("slug, photo_url, senate_matricule").not("senate_matricule", "is", null);
    const fichePar = new Map((fiches || []).map((f: Record<string, string>) => [f.senate_matricule, f]));

    const resultats = enJeuMaintenant.map(s => {
      const reelu = avantParMat.has(s.matricule);
      if (!reelu) siegesChanges++;
      const f = fichePar.get(s.matricule);
      return {
        election_date: DATE_SCRUTIN, matricule: s.matricule,
        first_name: s.prenom, last_name: s.nom,
        slug: f?.slug || null, photo_url: f?.photo_url || null,
        constituency: s.circo, dept_code: s.code, political_group: s.groupe,
        outcome: reelu ? "reelu" : "nouveau",
        seats: s.code ? siegesPar.get(s.code) || null : null,
        updated_at: new Date().toISOString(),
      };
    });
    console.log(`> résultat : ${resultats.length} sièges renouvelés — ${siegesChanges} nouveaux visages, ${resultats.length - siegesChanges} réélus.`);
    if (!A_BLANC) {
      await ecrireParLots("senate_election_results", resultats, "election_date,matricule");
      // Les sièges disparus d'une circonscription (redécoupage, siège supprimé)
      // ne doivent pas rester affichés comme élus.
      const gardes = resultats.map(r => r.matricule);
      const { error } = await supabase.from("senate_election_results")
        .delete().eq("election_date", DATE_SCRUTIN).not("matricule", "in", `(${gardes.join(",")})`);
      if (error) console.warn(`  ! purge : ${error.message}`);
    }
  } else {
    console.log(`> phase « ${phase} » : ${phase === "avant" ? "le scrutin n'a pas encore eu lieu" : "le Sénat n'a pas encore publié sa nouvelle liste"}.`);
  }

  /* ── 4. L'état d'avancement ───────────────────────────────────────────────── */
  const statut = {
    election_date: DATE_SCRUTIN,
    phase,
    constituencies_total: renouvellement.length,
    seats_total: renouvellement.reduce((n, c) => n + c.seats, 0),
    seats_confirmed: phase === "resultats" ? siegesChanges : 0,
    renewable: renouvellement,
    groups_before: avant.length
      ? avant.reduce((acc: Record<string, number>, l) => {
          const g = l.political_group || "Sans groupe"; acc[g] = (acc[g] || 0) + 1; return acc;
        }, {})
      : compterGroupes(officiels),
    groups_after: phase === "resultats" ? compterGroupes(officiels) : null,
    roster_hash: empreinte,
    source: "Sénat — open data ODSEN (Licence Ouverte)",
    updated_at: new Date().toISOString(),
  };
  console.log(`> ${statut.seats_total} sièges en jeu dans ${statut.constituencies_total} circonscriptions.`);
  if (!A_BLANC) {
    const { error } = await supabase.from("senate_election_status").upsert(statut, { onConflict: "election_date" });
    if (error) throw error;
  }

  console.log(A_BLANC ? "--- À BLANC : rien n'a été écrit. ---" : "--- TERMINÉ. ---");
}

main().catch(e => { console.error(e); process.exit(1); });
