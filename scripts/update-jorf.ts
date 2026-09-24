/**
 * Journal officiel du jour — ingestion du flux OPENDATA de la DILA.
 *
 * Légifrance répond 403 à toute lecture automatisée de ses pages : la voie
 * officielle est le flux de la DILA, qui dépose deux archives par jour sur
 * echanges.dila.gouv.fr. Chacune pèse moins de 200 Ko et contient, entre autres,
 * le CONTENEUR de l'édition — c'est-à-dire le sommaire complet du JO.
 *
 * On ne garde que ce sommaire. Le texte intégral des actes représente plusieurs
 * mégaoctets par jour et Légifrance le sert déjà : conserver l'identifiant de
 * chaque texte suffit à y renvoyer.
 *
 * Deux livraisons par jour, de nature très différente :
 *   — celle du petit matin (~00 h 30) pèse 175 Ko et contient EXACTEMENT l'édition
 *     du jour : c'est celle qui nous intéresse ;
 *   — celle du soir (~21 h 45) pèse 4 Mo et rejoue une centaine d'éditions
 *     anciennes que la DILA vient de corriger — on en a vu remonter jusqu'à 1905.
 *     Elle contient aussi l'édition du jour, ce qui en fait un filet de sécurité.
 *
 * D'où la fenêtre de dates : sans elle, un passage ordinaire enregistrerait le JO
 * du 11 août 1992 et paierait un résumé pour chacun.
 *
 * Usage :
 *   npx tsx scripts/update-jorf.ts                    # les jours récents
 *   npx tsx scripts/update-jorf.ts --days=30          # fenêtre élargie
 *   npx tsx scripts/update-jorf.ts --since=2026-01-01 # reprise depuis une date
 *   npx tsx scripts/update-jorf.ts --dry-run          # n'écrit rien
 *   npx tsx scripts/update-jorf.ts --no-digest        # sommaire seul, sans résumé
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * LLM_FREE_API_KEY (Google AI Studio, gratuit) porte les explications et le
 * résumé du jour — sans elle, le sommaire est enregistré mais reste muet.
 * Voir scripts/lib/llm.ts, qui retombe sur DeepSeek si une clé payante existe.
 */
import { createClient } from "@supabase/supabase-js";
import { demanderJSON, llmDisponible, llmVoie } from "./lib/llm";
import { gunzipSync } from "node:zlib";

const DILA = "https://echanges.dila.gouv.fr/OPENDATA/JORF/";
const UA = "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)";

const args = process.argv.slice(2);
const flag = (nom: string, defaut: number) => {
  const a = args.find(x => x.startsWith(`--${nom}=`));
  return a ? Number(a.split("=")[1]) || defaut : defaut;
};
const DRY = args.includes("--dry-run");
const SANS_RESUME = args.includes("--no-digest");
/**
 * Reprend les textes déjà en base restés sans explication, sans relire le flux.
 *
 * Utile après un rattrapage fait sans clé, ou quand une journée a échoué : un
 * mois d'archives pèse cent trente mégaoctets, les retélécharger pour la seule
 * rédaction serait absurde. Le corps des actes n'étant pas conservé, ces
 * explications-là sont écrites d'après l'intitulé seul — moins riches que celles
 * du jour même, mais justes.
 */
const RATTRAPER_EXPLICATIONS = args.includes("--rattraper-explications");
const NB_FICHIERS = flag("files", 4);
/** Nombre maximal de résumés de rattrapage par passage, pour borner la dépense. */
const RATTRAPAGE_MAX = flag("catchup", 10);

/**
 * Première date retenue. Tout ce qui est plus ancien appartient au lot de
 * corrections d'archives de la livraison du soir, et n'a pas sa place dans une
 * rubrique intitulée « le Journal officiel du jour ».
 */
const DEPUIS = (() => {
  const s = args.find(x => x.startsWith("--since="))?.split("=")[1];
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - flag("days", 10));
  return d.toISOString().slice(0, 10);
})();

/* ─────────────────────────── Lecture des archives ─────────────────────────── */

/**
 * Lecteur tar minimal. Le format tient en blocs de 512 octets : un en-tête, puis
 * le contenu arrondi au bloc supérieur. On préfère ces trente lignes à une
 * dépendance qui ne figure pas dans package.json et ne survivrait pas à un
 * `npm ci` en intégration continue.
 */
function* lireTar(buf: Buffer): Generator<{ nom: string; contenu: Buffer }> {
  let p = 0;
  while (p + 512 <= buf.length) {
    const entete = buf.subarray(p, p + 512);
    if (entete.every(b => b === 0)) break;            // deux blocs nuls = fin d'archive
    const champ = (d: number, l: number) =>
      // [\s\S] plutôt que le drapeau `s`, que la cible ES2017 du projet refuse.
      entete.subarray(d, d + l).toString("utf8").replace(/\0[\s\S]*$/, "").trim();
    const nom = champ(0, 100);
    const prefixe = champ(345, 155);
    const taille = parseInt(champ(124, 12) || "0", 8) || 0;
    const type = entete[156];
    p += 512;
    // '0' et l'octet nul désignent tous deux un fichier ordinaire ; '5' un dossier.
    if (type === 0x30 || type === 0) {
      yield { nom: prefixe ? `${prefixe}/${nom}` : nom, contenu: buf.subarray(p, p + taille) };
    }
    p += Math.ceil(taille / 512) * 512;
  }
}

/** Liste les archives disponibles, de la plus récente à la plus ancienne. */
async function listerArchives(): Promise<string[]> {
  const r = await fetch(DILA, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`la DILA a répondu ${r.status}`);
  const html = await r.text();
  const noms = [...html.matchAll(/JORF_(\d{8}-\d{6})\.tar\.gz/g)].map(m => m[0]);
  return [...new Set(noms)].sort().reverse();
}

/* ──────────────────────────── Lecture du sommaire ──────────────────────────── */

const ENTITES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'",
};
const decode = (s: string) =>
  s.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, m => ENTITES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // Les éditions anciennes gardent les points de conduite de la mise en page
    // papier (« TEXTES GENERAUX ......... »). Quatre points d'affilée ne peuvent
    // pas être des points de suspension : on les efface.
    .replace(/\.{4,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Nature de l'acte, déduite de son intitulé.
 *
 * Le JO nomme ses actes de façon strictement normalisée — « Arrêté du 14 septembre
 * 2026 portant… », « LOI n° 2026-… » — ce qui rend cette lecture fiable. Le flux
 * expose bien un classement ELI par nature, mais il porte sur les fichiers de
 * l'archive (versions, articles) et non sur les textes du sommaire.
 */
/**
 * Chaque motif s'ancre en tête et refuse d'être suivi d'une lettre, ce qui laisse
 * passer le pluriel sans confondre « Loi » avec « Loire-Atlantique ».
 *
 * `\b` serait piégeux ici : en JavaScript il ne connaît que l'alphabet ASCII, si
 * bien que `/^Arrêté\b/` ne reconnaissait AUCUN arrêté — le « é » final n'y compte
 * pas comme lettre, donc aucune frontière de mot ne s'y forme. Les décrets, eux,
 * passaient. On comptait 22 décrets et zéro arrêté sur une journée qui en publiait
 * soixante.
 */
const NATURES: [RegExp, string][] = [
  [/^LOI(?!\p{L})|^Loi(?!\p{L})/u, "loi"],
  [/^Ordonnance(?!\p{L})/iu, "ordonnance"],
  [/^Décret(?!\p{L})/iu, "decret"],
  [/^Arrêté(?!\p{L})/iu, "arrete"],
  [/^Décision(?!\p{L})/iu, "decision"],
  [/^Délibération(?!\p{L})/iu, "deliberation"],
  [/^Circulaire(?!\p{L})|^Instruction(?!\p{L})/iu, "circulaire"],
  [/^Avis(?!\p{L})/iu, "avis"],
  [/^Communiqué(?!\p{L})|^Information(?!\p{L})/iu, "communication"],
  [/^Rapport(?!\p{L})/iu, "rapport"],
];
const natureDe = (titre: string) => NATURES.find(([re]) => re.test(titre))?.[1] ?? "autre";

type Texte = {
  id: string;
  titre: string;
  nature: string;
  /** Ce que le texte fait, en clair. Nul tant qu'il n'a pas été expliqué. */
  explication?: string | null;
  /** « notice » = note officielle de l'administration ; « ia » = résumé généré ;
   *  « renvoi » = le JO ne publie qu'un pointeur, il n'y a rien à expliquer. */
  source_explication?: "notice" | "ia" | "renvoi" | null;
};

/** Ce qu'on tire du texte intégral, livré dans la même archive que le sommaire. */
type Corps = {
  notice: string;
  visas: string;
  articles: { num: number; texte: string }[];
  ministere: string;
};
type Groupe = { titre: string; textes: Texte[] };
type Rubrique = { titre: string; groupes: Groupe[] };

type Edition = {
  date: string; num: string; title: string; eli_url: string | null;
  text_count: number; counts: Record<string, number>; sections: Rubrique[];
};

/**
 * Lit un CONTENEUR et en tire le sommaire.
 *
 * L'arborescence n'est pas régulière : « Décrets, arrêtés, circulaires » descend
 * jusqu'au ministère (niveau 4), tandis que « Informations parlementaires »
 * s'arrête à « Assemblée nationale » (niveau 3) et « Annonces » porte ses textes
 * directement. On suit donc la profondeur annoncée par chaque <TM> plutôt que de
 * supposer un nombre fixe de niveaux.
 */
function lireConteneur(xml: string): Edition | null {
  const balise = (t: string) => xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1]?.trim() ?? null;
  const date = balise("DATE_PUBLI");
  const num = balise("NUM");
  const title = balise("TITRE");
  if (!date || !num || !title) return null;

  const chemin: string[] = [];
  let profondeur = 0;
  const rubriques = new Map<string, Map<string, Texte[]>>();
  const counts: Record<string, number> = {};
  let total = 0;

  const jetons = xml.matchAll(/<TM niv="(\d+)"\s*>|<TITRE_TM>([\s\S]*?)<\/TITRE_TM>|<LIEN_TXT\b([^>]*?)\/>/g);
  for (const j of jetons) {
    if (j[1] !== undefined) {                 // ouverture d'une rubrique
      profondeur = Number(j[1]);
      chemin.length = profondeur - 1;
    } else if (j[2] !== undefined) {          // son intitulé
      chemin[profondeur - 1] = decode(j[2]);
    } else if (j[3] !== undefined) {          // un texte
      const id = j[3].match(/idtxt="([^"]*)"/)?.[1];
      const titre = j[3].match(/titretxt="([^"]*)"/)?.[1];
      if (!id || !titre) continue;

      // chemin[0] = « Journal officiel Lois et Décrets », chemin[1] = la rubrique,
      // les niveaux suivants précisent la sous-rubrique puis le ministère.
      const rub = chemin[1] || chemin[0] || "Sommaire";
      const grp = chemin.slice(2).filter(Boolean).join(" · ") || rub;
      if (!rubriques.has(rub)) rubriques.set(rub, new Map());
      const groupes = rubriques.get(rub)!;
      if (!groupes.has(grp)) groupes.set(grp, []);

      const t = decode(titre);
      const nature = natureDe(t);
      groupes.get(grp)!.push({ id, titre: t, nature });
      counts[nature] = (counts[nature] ?? 0) + 1;
      total++;
    }
  }
  if (!total) return null;

  return {
    date, num, title: decode(title),
    eli_url: balise("ID_ELI"),
    text_count: total,
    counts,
    sections: [...rubriques].map(([titre, groupes]) => ({
      titre,
      groupes: [...groupes].map(([t, textes]) => ({ titre: t, textes })),
    })),
  };
}

/* ──────────────────────── Lecture du texte intégral ──────────────────────── */

/** Contenu d'une balise, débarrassé du balisage interne. */
function baliseTexte(xml: string, t: string): string {
  // Recherche par position, sans construire de motif : dans un gabarit, \s et \S
  // sont consommés à l’écriture de la chaîne, si bien qu’un ([\s\S]*?) assemblé ainsi
  // devient ([sS]*?) et ne capture plus que des suites de « s ». Toutes les balises
  // revenaient vides sans qu’aucune erreur ne soit levée.
  const ouvre = `<${t}>`, ferme = `</${t}>`;
  const i = xml.indexOf(ouvre);
  if (i < 0) return "";
  const j = xml.indexOf(ferme, i + ouvre.length);
  if (j < 0) return "";
  return decode(xml.slice(i + ouvre.length, j).replace(/<[^>]+>/g, " "));
}

/**
 * Lit la fiche d'un texte.
 *
 * La NOTICE est une note rédigée par l'administration elle-même — « Publics concernés :
 * … Objet : … » — et vaut mieux que n'importe quel résumé généré. Elle est rare : cinq
 * textes sur cent deux le 18 septembre, et le reste du temps la balise ne contient
 * qu'un `<CONTENU/>` vide.
 *
 * Les VISAS disent d'où vient l'acte (« Vu la demande de dérogation formulée par… »).
 * Le dispositif, lui, n'est PAS dans ce fichier : il vit dans des fichiers d'article
 * séparés, que `lireArticle` rattache ensuite par l'identifiant du texte.
 */
function lireCorps(xml: string): Corps {
  return {
    notice: baliseTexte(xml, "NOTICE"),
    visas: baliseTexte(xml, "VISAS"),
    articles: [],
    ministere: baliseTexte(xml, "MINISTERE"),
  };
}

/** Un article et le texte auquel il appartient. */
function lireArticle(xml: string): { cid: string; num: number; texte: string } | null {
  const cid = xml.match(/<TEXTE\s+cid="(JORFTEXT\d+)"/)?.[1];
  if (!cid) return null;
  const texte = baliseTexte(xml, "CONTENU");
  if (!texte) return null;
  return { cid, num: Number(baliseTexte(xml, "NUM")) || 0, texte };
}

/** Identifiant du texte, tel qu'il figure dans le nom de son fichier. */
const idDeFichier = (nom: string) => nom.match(/(JORFTEXT\d+)\.xml$/)?.[1] ?? null;

/** Ce qu'on donne à lire au modèle : d'où vient l'acte, puis ce qu'il décide. */
function corpsLisible(c: Corps): string {
  const articles = [...c.articles].sort((a, b) => a.num - b.num).map(a => a.texte).join(" ");
  return [c.visas, articles].filter(Boolean).join("\n\n").trim();
}

/* ─────────────────────────────── Résumé du jour ─────────────────────────────── */

// Le choix du fournisseur vit dans scripts/lib/llm.ts : gratuit d'abord (Google
// AI Studio), DeepSeek en secours si une clé payante traîne. Rien ici n'en dépend.

const CONSIGNE = `Tu rédiges, pour des professionnels de la politique, le point quotidien sur le Journal officiel.
On te donne le sommaire intégral d'une édition : rubriques, ministères, intitulés des textes.

Écris UN SEUL paragraphe de 3 à 5 phrases, en français, qui dit ce que cette édition contient de notable.
Règles impératives :
- ne t'appuie QUE sur les intitulés fournis ; n'invente aucun texte, aucun chiffre, aucune date ;
- cite les mesures de fond (textes généraux) et ignore les nominations individuelles, sauf si elles concernent une fonction de premier plan ;
- si la journée est sans relief, dis-le simplement plutôt que de gonfler l'importance des textes ;
- pas de titre, pas de liste à puces, pas de formule d'introduction : le paragraphe seul.
Réponds en JSON : { "digest": "…" }`;

/** Produit le résumé du jour. Un appel par édition : le coût est négligeable. */
async function resumer(e: Edition): Promise<string | null> {
  if (!llmDisponible()) return null;
  const sommaire = e.sections
    .map(r => `## ${r.titre}\n` + r.groupes.map(g => `### ${g.titre}\n` + g.textes.map(t => `- ${t.titre}`).join("\n")).join("\n"))
    .join("\n");

  const reponse = await demanderJSON<{ digest?: string }>(
    CONSIGNE,
    `${e.title} — ${e.text_count} textes.

${sommaire}`,
    { maxJetons: 4096 },
  );
  return String(reponse.digest ?? "").trim() || null;
}


/* ──────────────────────── Expliquer chaque texte ──────────────────────── */

/** Taille d'un lot envoyé au modèle. Assez petit pour que la réponse tienne. */
const LOT_EXPLICATION = Number(process.env.JORF_LOT || 25);
// Vingt-cinq textes tiennent large dans la fenetre d'un modele « flash », et le
// palier gratuit compte les REQUETES, pas les jetons : de gros lots coutent donc
// moins cher en quota qu'une serie de petits. A douze, un mois de rattrapage
// epuisait le quota quotidien avant d'avoir fini.

const CONSIGNE_TEXTES = `Tu expliques, pour des professionnels de la politique et des entreprises, ce que font des textes parus au Journal officiel.

Pour CHAQUE texte reçu, écris UNE phrase de 15 à 35 mots disant ce qu'il change concrètement et pour qui.
Règles impératives :
- ne t'appuie QUE sur l'intitulé et le corps fournis ; n'invente aucun chiffre, aucune date, aucun bénéficiaire ;
- commence directement par le verbe ou l'objet, sans « Ce texte… » ni « Cet arrêté… » ;
- certains textes arrivent SANS corps, avec leur seul intitulé : explique-les quand même à partir de lui, sans rien supposer du dispositif, et reste au ras de ce qui est écrit ;
- si le texte est purement formel (délégation de signature, nomination), dis simplement de quoi il s'agit et pour qui ;
- pas de jargon inutile : « les entreprises du bâtiment » plutôt que « les personnes visées à l'article L. 5424-6 ».
Réponds en JSON : { "textes": [ { "id": "JORFTEXT…", "explication": "…" } ] } — un objet par texte reçu, avec son identifiant exact.`;

/**
 * Donne à chaque texte une phrase qui dit ce qu'il fait.
 *
 * Trois cas, dans cet ordre :
 *   — une NOTICE officielle existe : on la reprend, raccourcie. C'est l'administration
 *     qui explique son propre texte, aucun résumé ne fera mieux ;
 *   — le JO ne publie qu'un renvoi (« Documents déposés », « Conférence des
 *     présidents ») : son contenu est vide, il n'y a rien à expliquer et on le dit ;
 *   — sinon, le modèle résume, par lots, à partir de l'intitulé et du corps.
 *
 * Le coût tient : une journée entière pèse une cinquantaine de milliers de caractères.
 */
async function expliquerTextes(sections: Rubrique[], corps: Map<string, Corps>): Promise<number> {
  const aResumer: { id: string; titre: string; corps: string }[] = [];

  for (const r of sections) {
    for (const g of r.groupes) {
      for (const t of g.textes) {
        const c = corps.get(t.id);
        const notice = c?.notice?.trim();
        if (notice) {
          // La notice officielle s'ouvre souvent sur « Publics concernés : … Objet : … ».
          // On garde la phrase d'objet, qui porte le fond, et on borne la longueur.
          const objet = notice.match(/Objet\s*:\s*([\s\S]*?)(?:\s*(?:Entr[ée]e en vigueur|Notice|R[ée]f[ée]rences)\s*:|$)/i)?.[1];
          t.explication = abreger(objet?.trim() || notice, 320);
          t.source_explication = "notice";
          continue;
        }
        // Deux situations se ressemblent et n'ont rien à voir ; les confondre a
        // produit des contresens. Un arrêté interdisant le déplacement de supporters
        // s'est vu annoncer « publication signalée sans son contenu, le détail est
        // tenu par l'assemblée concernée », ce qui est faux de bout en bout.
        //
        //   — la fiche du texte EXISTE dans l'archive mais son CONTENU est vide :
        //     c'est un vrai renvoi, le JO ne publie qu'un pointeur (« Documents
        //     déposés », « Conférence des présidents ») ;
        //   — la fiche N'EST PAS dans l'archive : le texte a bien un contenu, nous
        //     ne l'avons simplement pas reçu. C'est le cas de tout rattrapage, la
        //     livraison du soir ne rejouant que les sommaires.
        //
        // Le second cas part au modèle avec son seul intitulé. Ceux du Journal
        // officiel sont très descriptifs — « Arrêté du 1er septembre 2026 portant
        // interdiction de déplacement des supporters du club de… » — et suffisent à
        // dire ce que le texte fait.
        const lisible = c ? corpsLisible(c) : "";
        if (c && !lisible) {
          t.explication = "Le Journal officiel signale cette publication sans en reprendre le contenu : le détail est tenu par l'institution qui l'a produite.";
          t.source_explication = "renvoi";
          continue;
        }
        aResumer.push({ id: t.id, titre: t.titre, corps: abreger(lisible, 1800) });
      }
    }
  }

  if (!aResumer.length || !llmDisponible()) return 0;

  const obtenues = new Map<string, string>();
  for (let i = 0; i < aResumer.length; i += LOT_EXPLICATION) {
    const lot = aResumer.slice(i, i + LOT_EXPLICATION);
    try {
      // Un seul lot par appel. Le client espace les requêtes pour tenir sous la
      // limite par minute du palier gratuit, et réessaie les refus passagers.
      const parsed = await demanderJSON<{ textes?: { id?: string; explication?: string }[] }>(
        CONSIGNE_TEXTES,
        lot.map(t => [`### ${t.id}`, t.titre, "", t.corps].join("\n")).join("\n\n---\n\n"),
        { maxJetons: 8192 },
      );
      // On n'accepte QUE les identifiants envoyés : un identifiant inventé rattacherait
      // une explication au mauvais texte, ce qui est pire qu'une ligne sans explication.
      const envoyes = new Set(lot.map(t => t.id));
      for (const x of parsed.textes ?? []) {
        const id = String(x?.id ?? "");
        const e = String(x?.explication ?? "").trim();
        if (e && envoyes.has(id)) obtenues.set(id, abreger(e, 320));
      }
    } catch (e) {
      console.warn(`    ⚠ explications ${i + 1}-${i + lot.length} : ${(e as Error).message}`);
    }
  }

  for (const r of sections) {
    for (const g of r.groupes) {
      for (const t of g.textes) {
        const e = obtenues.get(t.id);
        if (e) { t.explication = e; t.source_explication = "ia"; }
      }
    }
  }
  return obtenues.size;
}

/** Coupe à la phrase, sans laisser de mot tranché en deux. */
function abreger(s: string, max: number): string {
  const net = s.replace(/\s+/g, " ").trim();
  if (net.length <= max) return net;
  const coupe = net.slice(0, max);
  const point = Math.max(coupe.lastIndexOf(". "), coupe.lastIndexOf(" ; "));
  return (point > max * 0.5 ? coupe.slice(0, point + 1) : coupe.replace(/\s\S*$/, "")) + (point > max * 0.5 ? "" : "…");
}

/* ───────────────────────────────── Traitement ───────────────────────────────── */

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  // Reprise de l'arriéré : on n'a pas besoin du flux, tout est déjà en base.
  if (RATTRAPER_EXPLICATIONS) { await rattraperExplications(supabase); return; }

  console.log("=== Journal officiel — flux DILA ===");
  console.log(`  voie de rédaction : ${llmVoie()}`);
  const archives = (await listerArchives()).slice(0, NB_FICHIERS);
  if (!archives.length) { console.error("Aucune archive listée."); process.exit(1); }
  console.log(`  ${archives.length} archive(s) à lire, de ${archives[archives.length - 1]} à ${archives[0]}`);
  console.log(`  éditions retenues : à partir du ${DEPUIS}`);

  // Éditions déjà résumées : on ne repaie pas un résumé pour rien.
  const { data: connues } = await supabase.from("jorf_editions").select("date, digest");
  const dejaResumee = new Set((connues ?? []).filter(r => r.digest).map(r => r.date));

  const editions = new Map<string, Edition & { corps: Map<string, Corps>; source_file: string; published_at: string }>();

  for (const fichier of archives) {
    try {
      const r = await fetch(DILA + fichier, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const depose = r.headers.get("last-modified");
      const buf = gunzipSync(Buffer.from(await r.arrayBuffer()));

      // Une seule traverseée de l'archive : les sommaires ET les textes intégraux y
      // sont, inutile de la relire. Les corps serviront à expliquer chaque entrée.
      const conteneurs: string[] = [];
      const corps = new Map<string, Corps>();
      for (const { nom, contenu } of lireTar(buf)) {
        if (/\/JORFCONT\d+\.xml$/.test(nom)) { conteneurs.push(contenu.toString("utf8")); continue; }
        if (nom.includes("/texte/version/")) {
          const id = idDeFichier(nom);
          // Les articles peuvent avoir été lus avant leur texte : on garde les leurs.
          if (id) corps.set(id, { ...lireCorps(contenu.toString("utf8")), articles: corps.get(id)?.articles ?? [] });
        } else if (nom.includes("/article/")) {
          // Les articles arrivent dans le désordre et avant ou après leur texte : on
          // crée la fiche au besoin, elle sera complétée à la rencontre du texte.
          const a = lireArticle(contenu.toString("utf8"));
          if (a) {
            const f = corps.get(a.cid) ?? { notice: "", visas: "", articles: [], ministere: "" };
            f.articles.push({ num: a.num, texte: a.texte });
            corps.set(a.cid, f);
          }
        }
      }

      let trouves = 0, ecartes = 0;
      for (const xml of conteneurs) {
        const e = lireConteneur(xml);
        if (!e) continue;
        if (e.date < DEPUIS) { ecartes++; continue; }   // correction d'archive ancienne
        trouves++;
        // Une même édition peut revenir dans deux livraisons (corrections) : la plus
        // récente gagne, et les archives sont parcourues de la plus récente à la plus
        // ancienne, donc la première vue est la bonne.
        if (!editions.has(e.date)) {
          editions.set(e.date, {
            ...e,
            corps,
            source_file: fichier,
            published_at: depose ? new Date(depose).toISOString() : new Date().toISOString(),
          });
        }
      }
      console.log(`  ${fichier} → ${trouves} édition(s)${ecartes ? ` (+${ecartes} archive(s) ancienne(s) écartée(s))` : ""}`);
    } catch (err) {
      // Une archive illisible ne doit pas faire tomber les autres.
      console.warn(`  ⚠ ${fichier} : ${(err as Error).message}`);
    }
  }

  if (!editions.size) { console.log("  Aucune édition exploitable."); return; }

  const lignes: any[] = [];
  for (const e of [...editions.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const repartition = Object.entries(e.counts).sort((a, b) => b[1] - a[1])
      .map(([n, c]) => `${c} ${n}`).join(", ");
    console.log(`\n  ${e.title}`);
    console.log(`    ${e.text_count} textes — ${repartition}`);
    console.log(`    ${e.sections.length} rubrique(s) : ${e.sections.map(s => s.titre).join(" | ")}`);

    // Chaque texte reçoit sa phrase d'explication avant l'enregistrement : c'est elle
    // qui fait la valeur de la rubrique, un intitulé nu ne dit rien à personne.
    await expliquerTextes(e.sections, e.corps);
    const tous = e.sections.flatMap(r => r.groupes.flatMap(g => g.textes));
    const par = (src: string) => tous.filter(t => t.source_explication === src).length;
    console.log(`    corps lus : ${e.corps.size} — expliqués : ${par("notice")} par notice, ${par("ia")} par résumé, ${par("renvoi")} sans contenu, ${tous.filter(t => !t.explication).length} en attente`);

    let digest: string | null = null;
    if (!SANS_RESUME && !dejaResumee.has(e.date)) {
      try {
        digest = await resumer(e);
        if (digest) console.log(`    résumé : ${digest.slice(0, 120)}…`);
        else if (!llmDisponible()) console.log("    (aucune clé LLM — résumé omis)");
      } catch (err) {
        // Le sommaire reste la valeur principale : un résumé manquant ne bloque rien.
        console.warn(`    ⚠ résumé : ${(err as Error).message}`);
      }
    }

    lignes.push({
      date: e.date, num: e.num, title: e.title, eli_url: e.eli_url,
      text_count: e.text_count, counts: e.counts, sections: e.sections,
      ...(digest ? { digest, digest_at: new Date().toISOString() } : {}),
      source_file: e.source_file, published_at: e.published_at,
      updated_at: new Date().toISOString(),
    });
  }

  if (DRY) { console.log("\n  (--dry-run : rien n'est écrit)"); return; }
  const { error } = await supabase.from("jorf_editions").upsert(lignes, { onConflict: "date" });
  if (error) { console.error(`\n  ✗ écriture : ${error.message}`); process.exit(1); }
  console.log(`\n  → ${lignes.length} édition(s) enregistrée(s)`);

  await indexerTextes(supabase, lignes);
  await rattraperResumes(supabase);
}

/**
 * Réécrit l'index de recherche à partir des sommaires.
 *
 * jorf_texts est dérivée : une ligne par texte, avec son intitulé et son
 * explication, pour que la loupe de l'espace Pro interroge un index plein texte
 * plutôt que de relire tout le JSONB à chaque frappe. On la réécrit
 * systématiquement — c'est le sommaire qui fait foi, jamais l'inverse.
 */
async function indexerTextes(supabase: any, editions: any[]): Promise<void> {
  const lignes: any[] = [];
  for (const e of editions) {
    for (const r of e.sections ?? []) {
      for (const g of r.groupes ?? []) {
        for (const t of g.textes ?? []) {
          lignes.push({
            id: t.id,
            edition_date: e.date,
            rubrique: r.titre ?? null,
            groupe: g.titre ?? null,
            titre: t.titre,
            nature: t.nature ?? null,
            explication: t.explication ?? null,
            source_explication: t.source_explication ?? null,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }
  if (!lignes.length) return;

  // Par paquets : une journée chargée dépasse la centaine de textes, et un mois
  // de rattrapage en aligne plus de deux mille — au-delà, PostgREST refuse.
  let ecrits = 0;
  for (let i = 0; i < lignes.length; i += 500) {
    const { error } = await supabase
      .from("jorf_texts").upsert(lignes.slice(i, i + 500), { onConflict: "id" });
    if (error) {
      // La migration peut ne pas être appliquée : on le dit sans faire échouer
      // l'ingestion, qui a déjà enregistré l'essentiel.
      console.warn(`  ⚠ index de recherche : ${error.message}`);
      return;
    }
    ecrits += Math.min(500, lignes.length - i);
  }
  console.log(`  → ${ecrits} texte(s) indexé(s) pour la recherche`);
}

/**
 * Écrit les explications manquantes des éditions déjà enregistrées.
 *
 * Le corps des actes n'est pas conservé : ces phrases-là sont donc rédigées à
 * partir du seul intitulé. Ceux du Journal officiel sont très descriptifs, mais
 * le résultat reste en deçà de ce que produit l'ingestion du jour, qui dispose
 * des visas et du dispositif. On le marque « ia » comme les autres, la source
 * étant la même ; c'est la richesse qui change, pas la nature.
 */
async function rattraperExplications(supabase: any): Promise<void> {
  console.log("=== Journal officiel — reprise des explications ===");
  console.log(`  voie de rédaction : ${llmVoie()}`);
  if (!llmDisponible()) {
    console.error("❌ Aucune clé LLM (LLM_FREE_API_KEY) : rien à faire.");
    process.exit(1);
  }

  const { data: editions, error } = await supabase
    .from("jorf_editions").select("date, sections").order("date", { ascending: false });
  if (error) { console.error(`✗ lecture : ${error.message}`); process.exit(1); }

  // Un seul inventaire pour toutes les éditions : les lots se remplissent ainsi
  // complètement, au lieu de finir chaque journée sur un lot de trois textes.
  type Manquant = { date: string; id: string; titre: string };
  const manquants: Manquant[] = [];
  for (const e of editions ?? []) {
    for (const r of e.sections ?? []) {
      for (const g of r.groupes ?? []) {
        for (const t of g.textes ?? []) {
          if (!String(t.explication ?? "").trim()) manquants.push({ date: e.date, id: t.id, titre: t.titre });
        }
      }
    }
  }

  if (!manquants.length) { console.log("  Rien à reprendre : tous les textes ont leur explication."); return; }
  console.log(`  ${manquants.length} texte(s) sans explication, sur ${editions.length} édition(s)`);

  /**
   * Verse en base ce qui a été rédigé, puis vide l'accumulateur.
   *
   * On écrit en cours de route plutôt qu'une fois à la fin : quatre-vingts lots
   * qui échoueraient au soixante-dixième perdraient tout le travail déjà payé en
   * quota, et rien ne serait visible entre-temps.
   */
  let ecrites = 0;
  const verser = async (obtenues: Map<string, string>) => {
    if (!obtenues.size) return;
    const touchees: any[] = [];
    for (const e of editions ?? []) {
      let modifiee = false;
      for (const r of e.sections ?? []) {
        for (const g of r.groupes ?? []) {
          for (const t of g.textes ?? []) {
            const phrase = obtenues.get(t.id);
            if (phrase && !String(t.explication ?? "").trim()) {
              t.explication = phrase;
              t.source_explication = "ia";
              modifiee = true;
            }
          }
        }
      }
      if (modifiee) touchees.push(e);
    }
    for (const e of touchees) {
      const { error: err } = await supabase.from("jorf_editions")
        .update({ sections: e.sections, updated_at: new Date().toISOString() }).eq("date", e.date);
      if (err) console.warn(`  ⚠ ${e.date} : ${err.message}`);
    }
    await indexerTextes(supabase, touchees);
    ecrites += obtenues.size;
    obtenues.clear();
  };

  /** Lots rédigés avant chaque versement. Assez pour ne pas écrire à chaque appel. */
  const VERSEMENT = 8;

  let obtenues = new Map<string, string>();
  let depuisVersement = 0;
  for (let i = 0; i < manquants.length; i += LOT_EXPLICATION) {
    const lot = manquants.slice(i, i + LOT_EXPLICATION);
    try {
      const parsed = await demanderJSON<{ textes?: { id?: string; explication?: string }[] }>(
        CONSIGNE_TEXTES,
        lot.map(t => [`### ${t.id}`, t.titre].join("\n")).join("\n\n---\n\n"),
        { maxJetons: 8192 },
      );
      // On n'accepte QUE les identifiants envoyés : un identifiant inventé
      // rattacherait une explication au mauvais texte.
      const envoyes = new Set(lot.map(t => t.id));
      for (const x of parsed.textes ?? []) {
        const id = String(x?.id ?? "");
        const phrase = String(x?.explication ?? "").trim();
        if (phrase && envoyes.has(id)) obtenues.set(id, abreger(phrase, 320));
      }
      const fin = Math.min(i + LOT_EXPLICATION, manquants.length);
      console.log(`  ${fin}/${manquants.length} — ${ecrites + obtenues.size} rédigée(s)`);
    } catch (e) {
      console.warn(`  ⚠ lot ${i + 1}-${i + lot.length} : ${(e as Error).message}`);
    }
    if (++depuisVersement >= VERSEMENT) { await verser(obtenues); depuisVersement = 0; }
  }
  await verser(obtenues);

  if (!ecrites) { console.error("❌ Aucune explication obtenue."); process.exitCode = 1; return; }
  console.log(`\n  → ${ecrites} explication(s) écrite(s)`);
}

/**
 * Résume les éditions déjà en base qui n'en ont pas.
 *
 * Sans cette étape, un résumé manqué l'était pour toujours : les archives lues à
 * chaque passage ne couvrent que les deux derniers jours, si bien qu'une édition
 * plus ancienne — ingérée alors que la clé DeepSeek manquait, ou pendant une panne
 * de l'API — ne repassait jamais devant le modèle. Le sélecteur de jours du panneau
 * Pro remonte à une semaine : ces éditions-là doivent avoir leur résumé.
 */
// `any` plutôt que les génériques du client Supabase : les typer ici ne dit rien
// d'utile et fait diverger la signature de ce que createClient renvoie réellement.
async function rattraperResumes(supabase: any) {
  if (SANS_RESUME) return;
  if (!llmDisponible()) {
    // Bruyant exprès : le sommaire seul passait pour un succès complet, et les
    // résumés quotidiens sont restés absents sans que rien ne le signale.
    console.error("❌ Aucune clé LLM (LLM_FREE_API_KEY) : les éditions resteront sans résumé.");
    process.exitCode = 1;
    return;
  }

  const { data, error } = await supabase
    .from("jorf_editions")
    .select("date, title, text_count, sections")
    .is("digest", null)
    .gte("date", DEPUIS)
    .order("date", { ascending: false })
    .limit(RATTRAPAGE_MAX);
  if (error || !data?.length) return;

  console.log(`\n  Rattrapage des résumés manquants : ${data.length} édition(s)`);
  let reussis = 0;
  for (const row of data as any[]) {
    try {
      const digest = await resumer({
        date: row.date, num: "", title: row.title, eli_url: null,
        text_count: row.text_count, counts: {}, sections: row.sections ?? [],
      });
      if (!digest) continue;
      const { error: err } = await supabase
        .from("jorf_editions")
        .update({ digest, digest_at: new Date().toISOString() })
        .eq("date", row.date);
      if (err) throw new Error(err.message);
      console.log(`    ✓ ${row.date} — ${digest.slice(0, 90)}…`);
      reussis++;
    } catch (e) {
      console.warn(`    ⚠ ${row.date} : ${(e as Error).message}`);
    }
  }

  // Aucun résumé alors qu'il y avait du travail et une clé : le modèle refuse, le
  // solde est à sec, ou l'interface a changé. Dans tous les cas il faut le savoir,
  // plutôt que de voir le passage se terminer au vert sans rien avoir produit.
  if (!reussis) {
    console.error("❌ Aucun résumé produit alors que des éditions en attendaient un.");
    console.error("   Vérifiez le solde DeepSeek sur platform.deepseek.com.");
    process.exitCode = 1;
  }
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
