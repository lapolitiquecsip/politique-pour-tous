/**
 * CRON : indicateurs officiels de l'onglet « Enjeux ».
 *
 * Interroge l'API SDMX de la Banque de données macroéconomiques de l'INSEE, qui est
 * PUBLIQUE ET SANS CLÉ (https://bdm.insee.fr/series/sdmx/). Chaque série y porte son
 * titre, son unité, son historique complet et surtout son champ LAST_UPDATE : la date à
 * laquelle l'INSEE a publié, et non la date de notre relevé. C'est cette date que le site
 * affiche, si bien qu'un chiffre ne peut pas paraître frais alors qu'il ne l'est pas.
 *
 * Pourquoi l'INSEE plutôt qu'une saisie à la main : au 14/09/2026, la page écrite à la
 * main annonçait une dette à 115,6 % du PIB et un chômage à 7,9 %, alors que l'INSEE
 * publiait 117,5 % et 8,3 %. Un chiffre saisi une fois vieillit en silence.
 *
 * Pour AJOUTER un indicateur : trouver son idBank et l'ajouter à SERIES ci-dessous.
 * Les idBank se découvrent sans clé :
 *   - liste des jeux de données : https://bdm.insee.fr/series/sdmx/dataflow
 *   - contenu d'un jeu          : https://bdm.insee.fr/series/sdmx/data/<ID>?lastNObservations=1
 *     (ajouter lastNObservations, sinon les gros jeux répondent 413)
 *
 * Usage : npx tsx scripts/update-indicators.ts [--dry-run]
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const SDMX = "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/";

type Serie = {
  code: string;
  theme: string;
  label: string;
  idBank: string;
  unit: string;
  betterWhen?: "up" | "down";
  sortOrder: number;
  /** Lien vers la page INSEE de la série, pour que le lecteur puisse vérifier. */
  sourceUrl?: string;
  /** Nombre de points d'historique conservés pour la courbe. */
  keep?: number;
};

/**
 * Séries suivies. Chaque idBank a été vérifié en lisant le titre renvoyé par l'API —
 * jamais deviné. Le script revérifie à chaque passage que le titre correspond toujours,
 * et refuse d'écrire si l'INSEE a réaffecté l'identifiant.
 */
const SERIES: Serie[] = [
  {
    code: "eco_croissance", theme: "economie", sortOrder: 1,
    label: "Croissance du PIB", idBank: "011794844", unit: "%", betterWhen: "up",
    sourceUrl: "https://www.insee.fr/fr/statistiques/serie/011794844",
  },
  {
    code: "eco_inflation", theme: "economie", sortOrder: 2,
    label: "Inflation", idBank: "011812232", unit: "%", betterWhen: "down",
    sourceUrl: "https://www.insee.fr/fr/statistiques/serie/011812232",
  },
  {
    code: "eco_chomage", theme: "economie", sortOrder: 3,
    label: "Taux de chômage", idBank: "001688527", unit: "%", betterWhen: "down",
    sourceUrl: "https://www.insee.fr/fr/statistiques/serie/001688527",
  },
  {
    code: "eco_dette", theme: "economie", sortOrder: 4,
    label: "Dette publique", idBank: "010777608", unit: "% du PIB", betterWhen: "down",
    sourceUrl: "https://www.insee.fr/fr/statistiques/serie/010777608",
  },
];

/** Mots que le titre renvoyé par l'INSEE doit contenir — garde-fou anti-réaffectation. */
const EXPECTED: Record<string, RegExp> = {
  eco_croissance: /produit intérieur brut/i,
  eco_inflation: /prix à la consommation/i,
  eco_chomage: /taux de chômage/i,
  eco_dette: /dette/i,
};

/* ─────────────────────────────── Lecture SDMX ─────────────────────────────── */

type Parsed = {
  idBank: string;
  title: string;
  unit: string | null;
  lastUpdate: string | null;
  /** Du plus ancien au plus récent. */
  obs: { period: string; value: number }[];
};

/**
 * L'API renvoie du XML SDMX. On l'analyse par expressions régulières plutôt qu'avec un
 * analyseur complet : la forme est plate et stable (une balise Series par série, une
 * balise Obs par point), et cela évite d'ajouter une dépendance pour trois attributs.
 */
function parseSdmx(xml: string): Parsed[] {
  return xml.split("<Series ").slice(1).map(block => {
    const attr = (name: string) => (block.match(new RegExp(`${name}="([^"]*)"`)) || [])[1] ?? null;
    const obs = [...block.matchAll(/TIME_PERIOD="([^"]+)" OBS_VALUE="([^"]+)"/g)]
      .map(m => ({ period: m[1], value: Number(m[2]) }))
      .filter(o => Number.isFinite(o.value))
      // L'INSEE renvoie du plus récent au plus ancien : on remet dans l'ordre du temps.
      .sort((a, b) => a.period.localeCompare(b.period));
    return {
      idBank: attr("IDBANK") ?? "",
      title: attr("TITLE_FR") ?? "",
      unit: attr("UNIT_MEASURE"),
      lastUpdate: attr("LAST_UPDATE"),
      obs,
    };
  });
}

/** « 2026-Q2 » → « T2 2026 » ; « 2026-07 » → « juillet 2026 » ; « 2026 » inchangé. */
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function periodLabel(period: string): string {
  const q = period.match(/^(\d{4})-Q(\d)$/);
  if (q) return `T${q[2]} ${q[1]}`;
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${MOIS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
  return period;
}

/** Formate une valeur à la française, pour la phrase de contexte. */
const fr = (v: number, unit: string) =>
  `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`.replace(" %", " %");

/* ───────────────────────────────── Traitement ───────────────────────────────── */

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const supabase = createClient(url, key);

  console.log("=== Indicateurs officiels (INSEE) ===");

  // Une seule requête pour toutes les séries : l'API accepte jusqu'à 400 idBank.
  const res = await fetch(SDMX + SERIES.map(s => s.idBank).join("+"), {
    headers: { "User-Agent": "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)" },
  });
  if (!res.ok) {
    console.error(`❌ INSEE a répondu ${res.status} — rien n'est écrit.`);
    process.exit(1);
  }
  const parsed = parseSdmx(await res.text());
  const byId = new Map(parsed.map(p => [p.idBank, p]));
  console.log(`  ${parsed.length} série(s) reçue(s) sur ${SERIES.length} demandée(s)`);

  const rows: any[] = [];
  for (const s of SERIES) {
    const p = byId.get(s.idBank);
    if (!p || !p.obs.length) {
      console.warn(`  ⚠ ${s.code} : série ${s.idBank} absente ou vide — indicateur laissé tel quel.`);
      continue;
    }
    // Garde-fou : si l'INSEE réaffecte un idBank à une autre série, on refuse d'écrire
    // plutôt que d'afficher un chiffre juste sous un mauvais libellé.
    const expect = EXPECTED[s.code];
    if (expect && !expect.test(p.title)) {
      console.error(`  ✗ ${s.code} : le titre a changé (« ${p.title.slice(0, 70)} ») — écriture refusée.`);
      continue;
    }

    const keep = s.keep ?? 24;
    const history = p.obs.slice(-keep);
    const last = history[history.length - 1];
    const prev = history[history.length - 2];

    rows.push({
      code: s.code,
      theme: s.theme,
      label: s.label,
      sub: prev ? `après ${fr(prev.value, s.unit)} en ${periodLabel(prev.period)}` : null,
      value: last.value,
      unit: s.unit,
      period: last.period,
      period_label: periodLabel(last.period),
      history,
      source: "INSEE",
      source_url: s.sourceUrl ?? null,
      series_id: s.idBank,
      provider: "insee",
      published_at: p.lastUpdate,
      better_when: s.betterWhen ?? null,
      sort_order: s.sortOrder,
      updated_at: new Date().toISOString(),
    });

    console.log(`  ✓ ${s.label.padEnd(20)} ${fr(last.value, s.unit).padStart(12)} (${periodLabel(last.period)}) — publié le ${p.lastUpdate}`);
  }

  if (!rows.length) { console.error("Aucun indicateur exploitable."); return; }
  if (dryRun) { console.log("  (--dry-run : rien n'est écrit)"); return; }

  const { error } = await supabase.from("indicators").upsert(rows, { onConflict: "code" });
  if (error) console.error(`  ✗ écriture : ${error.message}`);
  else console.log(`  → ${rows.length} indicateur(s) enregistré(s)`);
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
