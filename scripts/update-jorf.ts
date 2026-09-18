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
 * DEEPSEEK_API_KEY est facultative — sans elle, le résumé est simplement omis.
 */
import { createClient } from "@supabase/supabase-js";
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
const NB_FICHIERS = flag("files", 4);

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

type Texte = { id: string; titre: string; nature: string };
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

/* ─────────────────────────────── Résumé du jour ─────────────────────────────── */

const MODEL = process.env.JORF_MODEL || "deepseek-v4-pro";
const LLM_URL = process.env.JORF_BASE_URL || "https://api.deepseek.com/";
const LLM_KEY = process.env.DEEPSEEK_API_KEY || "";

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
  if (!LLM_KEY) return null;
  const sommaire = e.sections
    .map(r => `## ${r.titre}\n` + r.groupes.map(g => `### ${g.titre}\n` + g.textes.map(t => `- ${t.titre}`).join("\n")).join("\n"))
    .join("\n");

  const r = await fetch(`${LLM_URL}chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: CONSIGNE },
        { role: "user", content: `${e.title} — ${e.text_count} textes.\n\n${sommaire}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    }),
  });
  const body: any = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${JSON.stringify(body).slice(0, 160)}`);
  const brut = body.choices?.[0]?.message?.content ?? "";
  if (!brut.trim()) throw new Error("réponse vide");
  const digest = String(JSON.parse(brut.replace(/^```json\s*|\s*```$/g, "")).digest ?? "").trim();
  return digest || null;
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

  console.log("=== Journal officiel — flux DILA ===");
  const archives = (await listerArchives()).slice(0, NB_FICHIERS);
  if (!archives.length) { console.error("Aucune archive listée."); process.exit(1); }
  console.log(`  ${archives.length} archive(s) à lire, de ${archives[archives.length - 1]} à ${archives[0]}`);
  console.log(`  éditions retenues : à partir du ${DEPUIS}`);

  // Éditions déjà résumées : on ne repaie pas un résumé pour rien.
  const { data: connues } = await supabase.from("jorf_editions").select("date, digest");
  const dejaResumee = new Set((connues ?? []).filter(r => r.digest).map(r => r.date));

  const editions = new Map<string, Edition & { source_file: string; published_at: string }>();

  for (const fichier of archives) {
    try {
      const r = await fetch(DILA + fichier, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const depose = r.headers.get("last-modified");
      const buf = gunzipSync(Buffer.from(await r.arrayBuffer()));

      let trouves = 0, ecartes = 0;
      for (const { nom, contenu } of lireTar(buf)) {
        if (!/\/JORFCONT\d+\.xml$/.test(nom)) continue;
        const e = lireConteneur(contenu.toString("utf8"));
        if (!e) continue;
        if (e.date < DEPUIS) { ecartes++; continue; }   // correction d'archive ancienne
        trouves++;
        // Une même édition peut revenir dans deux livraisons (corrections) : la plus
        // récente gagne, et les archives sont parcourues de la plus récente à la plus
        // ancienne, donc la première vue est la bonne.
        if (!editions.has(e.date)) {
          editions.set(e.date, {
            ...e,
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

    let digest: string | null = null;
    if (!SANS_RESUME && !dejaResumee.has(e.date)) {
      try {
        digest = await resumer(e);
        if (digest) console.log(`    résumé : ${digest.slice(0, 120)}…`);
        else if (!LLM_KEY) console.log("    (DEEPSEEK_API_KEY absente — résumé omis)");
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
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
