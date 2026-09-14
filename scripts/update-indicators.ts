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

/* ═══════════════════ Énergie — éCO2mix (RTE, via Open Data Réseaux Énergies) ═══════════════════ */

/**
 * ODRE expose les données de production électrique de RTE, sans clé, avec agrégation
 * côté serveur. On ne télécharge donc pas 500 000 points pour en tirer quatre chiffres :
 * l'API fait les sommes et ne renvoie que les totaux.
 *
 * Deux requêtes suffisent : une pour les douze derniers mois (le chiffre affiché), une
 * groupée par année (la courbe).
 */
const ODRE = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-national-cons-def";
const FILIERES = "sum(nucleaire) as nuc,sum(eolien) as eol,sum(solaire) as sol,sum(hydraulique) as hyd,sum(bioenergies) as bio,sum(gaz) as gaz,sum(charbon) as cha,sum(fioul) as fio,avg(taux_co2) as co2";

type Mix = { an?: number; nuc: number; eol: number; sol: number; hyd: number; bio: number; gaz: number; cha: number; fio: number; co2: number };

const renouvelable = (m: Mix) => m.eol + m.sol + m.hyd + m.bio;
const totalProduit = (m: Mix) => m.nuc + renouvelable(m) + m.gaz + m.cha + m.fio;
const part = (v: number, m: Mix) => (totalProduit(m) ? (v / totalProduit(m)) * 100 : 0);

async function odre(params: string): Promise<any[]> {
  const r = await fetch(`${ODRE}/records?${params}`, {
    headers: { "User-Agent": "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)" },
  });
  if (!r.ok) throw new Error(`ODRE a répondu ${r.status}`);
  const j: any = await r.json();
  return j.results ?? [];
}

async function collectEnergie(): Promise<any[]> {
  // Borne des données. On NE prend PAS max(date_heure) : le jeu contient des lignes de
  // calendrier déjà créées mais encore vides, qui feraient croire à des données plus
  // récentes qu'elles ne sont. On se cale sur le dernier point réellement renseigné.
  const [borne] = await odre(
    "select=date_heure&where=" + encodeURIComponent("nucleaire is not null") +
    "&order_by=" + encodeURIComponent("date_heure desc") + "&limit=1",
  );
  const fin = String(borne?.date_heure ?? "").slice(0, 10);
  if (!fin) throw new Error("borne temporelle introuvable");
  const debut = new Date(new Date(fin).getTime() - 365 * 864e5).toISOString().slice(0, 10);

  // Douze mois glissants : c'est la photo la plus récente qui soit complète.
  const [courant] = await odre(
    "select=" + encodeURIComponent(FILIERES) +
    "&where=" + encodeURIComponent(`date_heure>=date'${debut}'`),
  ) as Mix[];
  if (!courant?.nuc) throw new Error("agrégat courant vide");

  // Historique par année civile, pour la courbe. On écarte l'année en cours, incomplète,
  // et les toutes premières années du jeu, partielles elles aussi.
  const annees = (await odre(
    "select=" + encodeURIComponent(FILIERES) +
    "&group_by=" + encodeURIComponent("year(date_heure) as an") +
    "&order_by=an&limit=30",
  ) as Mix[])
    .filter(m => m.an && totalProduit(m) > 1e8 && m.an < new Date(fin).getFullYear());

  const serie = (pick: (m: Mix) => number) =>
    annees.map(m => ({ period: String(m.an), value: Number(pick(m).toFixed(1)) }));

  const finLisible = new Date(fin).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const commun = {
    // Le thème du site s'appelle « ecologie » (Écologie & énergie) : c'est cette clé
    // qui rattache l'indicateur à sa carte, pas le nom du domaine.
    theme: "ecologie",
    source: "RTE — éCO2mix",
    source_url: "https://odre.opendatasoft.com/explore/dataset/eco2mix-national-cons-def/",
    provider: "odre",
    period: fin,
    period_label: `12 mois à fin ${finLisible}`,
    // Date de la dernière donnée publiée par RTE, et non date de notre relevé.
    published_at: fin,
    updated_at: new Date().toISOString(),
  };

  return [
    {
      ...commun, code: "ene_nucleaire", sort_order: 1,
      label: "Part du nucléaire", unit: "% de l'électricité produite", better_when: null,
      value: Number(part(courant.nuc, courant).toFixed(1)),
      sub: "dans la production électrique française",
      history: serie(m => part(m.nuc, m)),
    },
    {
      ...commun, code: "ene_renouvelable", sort_order: 2,
      label: "Part des renouvelables", unit: "% de l'électricité produite", better_when: "up",
      value: Number(part(renouvelable(courant), courant).toFixed(1)),
      sub: "éolien, solaire, hydraulique et bioénergies",
      history: serie(m => part(renouvelable(m), m)),
    },
    {
      ...commun, code: "ene_fossile", sort_order: 3,
      label: "Part des fossiles", unit: "% de l'électricité produite", better_when: "down",
      value: Number(part(courant.gaz + courant.cha + courant.fio, courant).toFixed(1)),
      sub: "gaz, charbon et fioul",
      history: serie(m => part(m.gaz + m.cha + m.fio, m)),
    },
    {
      ...commun, code: "ene_co2", sort_order: 4,
      label: "Intensité carbone", unit: "g CO₂/kWh", better_when: "down",
      value: Number(courant.co2.toFixed(1)),
      sub: "émissions moyennes de l'électricité consommée",
      history: annees.map(m => ({ period: String(m.an), value: Number(m.co2.toFixed(1)) })),
    },
  ];
}

/* ═══════════════════════ Europe — Eurostat ═══════════════════════ */

/**
 * Eurostat, API de diffusion, publique et sans clé. Les libellés reviennent en français
 * et la réponse porte un champ `updated` : la date de publication par Eurostat.
 *
 * L'intérêt ici n'est pas de répéter les chiffres du thème Économie, mais de SITUER la
 * France : sa valeur, celle de l'Union, et son rang parmi les Vingt-Sept. C'est le rang
 * qui fait l'information — « 2e pays le plus dépensier de l'Union » se retient.
 */
const EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/";

/**
 * Les 27 États membres, en dur.
 *
 * Eurostat diffuse aussi la Norvège, la Suisse, la Turquie, le Royaume-Uni et les pays
 * candidats dans les mêmes jeux : un filtre « code à deux lettres » donnait « 3e pays
 * sur 34 », ce qui ne veut rien dire. Le classement doit porter sur l'Union, et sur elle
 * seule. Attention : la Grèce est « EL » chez Eurostat, et non « GR ».
 */
const UE27 = new Set([
  "BE", "BG", "CZ", "DK", "DE", "EE", "IE", "EL", "ES", "FR", "HR", "IT", "CY",
  "LV", "LT", "LU", "HU", "MT", "NL", "AT", "PL", "PT", "RO", "SI", "SK", "FI", "SE",
]);

type EuroDef = {
  code: string;
  label: string;
  dataset: string;
  filters: string;
  unit: string;
  sortOrder: number;
  betterWhen?: "up" | "down";
  /** Comment nommer le rang : « le plus endetté », « le plus dépensier »… */
  rangSuffixe: string;
  /** true si une valeur haute place en tête du classement. */
  hautEnTete: boolean;
};

const EUROPE: EuroDef[] = [
  { code: "eu_dette", label: "Dette publique", dataset: "gov_10dd_edpt1", sortOrder: 1,
    filters: "na_item=GD&sector=S13&unit=PC_GDP", unit: "% du PIB", betterWhen: "down",
    rangSuffixe: "le plus endetté", hautEnTete: true },
  { code: "eu_depense", label: "Dépense publique", dataset: "gov_10a_main", sortOrder: 2,
    filters: "na_item=TE&sector=S13&unit=PC_GDP", unit: "% du PIB",
    rangSuffixe: "où l'État dépense le plus", hautEnTete: true },
  { code: "eu_prelevements", label: "Recettes publiques", dataset: "gov_10a_main", sortOrder: 3,
    filters: "na_item=TR&sector=S13&unit=PC_GDP", unit: "% du PIB",
    rangSuffixe: "qui prélève le plus", hautEnTete: true },
  { code: "eu_chomage", label: "Chômage", dataset: "une_rt_a", sortOrder: 4,
    filters: "unit=PC_ACT&sex=T&age=Y15-74", unit: "%", betterWhen: "down",
    rangSuffixe: "au chômage le plus élevé", hautEnTete: true },
];

async function collectEurope(): Promise<any[]> {
  const out: any[] = [];

  for (const d of EUROPE) {
    try {
      // Tous les pays d'un coup, sur dix périodes : une seule requête donne à la fois la
      // valeur française, celle de l'Union, le classement et la courbe.
      const url = `${EUROSTAT_BASE}${d.dataset}?format=JSON&lang=FR&lastTimePeriod=10&${d.filters}`;
      const r = await fetch(url, { headers: { "User-Agent": "lapolitiquecestsimple/1.0" } });
      if (!r.ok) throw new Error(`Eurostat a répondu ${r.status}`);
      const j: any = await r.json();

      const geoIdx: Record<string, number> = j.dimension?.geo?.category?.index ?? {};
      const timeIdx: Record<string, number> = j.dimension?.time?.category?.index ?? {};
      const values: Record<string, number> = j.value ?? {};
      const nbTime = Object.keys(timeIdx).length;
      if (!nbTime || !Object.keys(geoIdx).length) throw new Error("réponse sans dimension");

      // La valeur d'une cellule se lit à la position (rang du pays × nb de périodes + rang
      // de la période) : c'est l'aplatissement standard de JSON-stat.
      const at = (geo: string, time: string) => {
        const gi = geoIdx[geo], ti = timeIdx[time];
        if (gi === undefined || ti === undefined) return undefined;
        const v = values[gi * nbTime + ti] ?? values[String(gi * nbTime + ti)];
        return typeof v === "number" ? v : undefined;
      };

      const periodes = Object.keys(timeIdx).sort();
      // Dernière période où la France est renseignée : Eurostat publie souvent une
      // période de plus pour certains pays, avec un trou pour les autres.
      const derniere = [...periodes].reverse().find(p => at("FR", p) !== undefined);
      if (!derniere) throw new Error("aucune valeur française");

      const fr = at("FR", derniere)!;
      const ue = at("EU27_2020", derniere);

      // Classement parmi les seuls États membres, agrégats exclus.
      const pays = Object.keys(geoIdx)
        .filter(g => UE27.has(g))
        .map(g => ({ g, v: at(g, derniere) }))
        .filter((p): p is { g: string; v: number } => p.v !== undefined)
        .sort((a, b) => d.hautEnTete ? b.v - a.v : a.v - b.v);
      const rang = pays.findIndex(p => p.g === "FR") + 1;

      const nb = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
      const morceaux = [
        ue !== undefined ? `contre ${nb(ue)} ${d.unit} dans l'Union` : null,
        rang > 0 ? `${rang}${rang === 1 ? "er" : "e"} pays ${d.rangSuffixe} sur ${pays.length}` : null,
      ].filter(Boolean);

      out.push({
        code: d.code,
        theme: "europe",
        label: d.label,
        sub: morceaux.join(" — ") || null,
        value: Number(fr.toFixed(1)),
        unit: d.unit,
        period: derniere,
        period_label: derniere,
        history: periodes
          .map(p => ({ period: p, value: at("FR", p) }))
          .filter((h): h is { period: string; value: number } => h.value !== undefined),
        source: "Eurostat",
        source_url: `https://ec.europa.eu/eurostat/databrowser/view/${d.dataset}/default/table?lang=fr`,
        series_id: d.dataset,
        provider: "eurostat",
        // Date de publication annoncée par Eurostat, pas celle de notre relevé.
        published_at: j.updated ? String(j.updated).slice(0, 10) : null,
        better_when: d.betterWhen ?? null,
        sort_order: d.sortOrder,
        updated_at: new Date().toISOString(),
      });

      console.log(`  ✓ ${d.label.padEnd(22)} ${nb(fr).padStart(7)} ${d.unit} (${derniere}) — ${morceaux.join(" — ")}`);
    } catch (e) {
      // Un indicateur en échec n'empêche pas les autres : celui déjà en base reste affiché.
      console.warn(`  ⚠ ${d.label} : ${(e as Error).message}`);
    }
  }

  return out;
}

/* ═══════════ Éducation & Santé — portails Opendatasoft des ministères ═══════════ */

/**
 * data.education.gouv.fr et data.drees.solidarites-sante.gouv.fr exposent la MÊME API
 * qu'ODRE (Opendatasoft), publique et sans clé, avec agrégation côté serveur. Le même
 * code sert donc pour les trois : on demande des sommes, pas des lignes.
 *
 * Les clauses ODSQL doivent être encodées — parenthèses, espaces et apostrophes —
 * sinon la requête part tronquée et l'API répond une valeur fausse sans erreur.
 */
async function ods(base: string, dataset: string, params: string): Promise<any[]> {
  const r = await fetch(`${base}/api/explore/v2.1/catalog/datasets/${dataset}/records?${params}`, {
    headers: { "User-Agent": "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)" },
  });
  if (!r.ok) throw new Error(`${dataset} a répondu ${r.status}`);
  const j: any = await r.json();
  return j.results ?? [];
}

/** Date de dernière modification annoncée par le portail, pour dater la publication. */
async function odsPublie(base: string, dataset: string): Promise<string | null> {
  try {
    const r = await fetch(`${base}/api/explore/v2.1/catalog/datasets/${dataset}`);
    if (!r.ok) return null;
    const j: any = await r.json();
    const d = j.metas?.default?.modified ?? j.metas?.default?.data_processed;
    return d ? String(d).slice(0, 10) : null;
  } catch { return null; }
}

/** « 2025-01-01T00:00:00+00:00 » ou « 2025 » → 2025. */
const anneeDe = (v: unknown) => Number(String(v ?? "").slice(0, 4)) || null;

const EDUCATION_BASE = "https://data.education.gouv.fr";
const DREES_BASE = "https://data.drees.solidarites-sante.gouv.fr";

async function collectEducation(): Promise<any[]> {
  const DATASET = "fr-en-baccalaureat-par-academie";
  const lignes = await ods(EDUCATION_BASE, DATASET,
    "select=" + encodeURIComponent("sum(nombre_de_presents) as pres,sum(nombre_d_admis_totaux) as adm") +
    "&group_by=" + encodeURIComponent("session as an") + "&order_by=an&limit=30");

  const sessions = lignes
    .map(r => ({ an: anneeDe(r.an), pres: Number(r.pres), adm: Number(r.adm) }))
    .filter(r => r.an && r.pres > 0)
    .sort((a, b) => a.an! - b.an!);
  if (!sessions.length) throw new Error("aucune session exploitable");

  const derniere = sessions[sessions.length - 1];
  const publie = await odsPublie(EDUCATION_BASE, DATASET);
  const commun = {
    theme: "education",
    source: "Ministère de l'Éducation nationale",
    source_url: `${EDUCATION_BASE}/explore/dataset/${DATASET}/`,
    series_id: DATASET,
    provider: "education",
    period: String(derniere.an),
    period_label: `session ${derniere.an}`,
    published_at: publie,
    updated_at: new Date().toISOString(),
  };

  return [
    {
      ...commun, code: "edu_bac_taux", sort_order: 1,
      label: "Réussite au baccalauréat", unit: "%", better_when: "up",
      value: Number((derniere.adm / derniere.pres * 100).toFixed(1)),
      sub: `${derniere.adm.toLocaleString("fr-FR")} admis sur ${derniere.pres.toLocaleString("fr-FR")} candidats présents`,
      history: sessions.map(s => ({ period: String(s.an), value: Number((s.adm / s.pres * 100).toFixed(1)) })),
    },
    {
      ...commun, code: "edu_bacheliers", sort_order: 2,
      label: "Bacheliers", unit: "diplômés", better_when: null,
      value: derniere.adm,
      sub: "toutes voies confondues : générale, technologique et professionnelle",
      history: sessions.map(s => ({ period: String(s.an), value: s.adm })),
    },
  ];
}

async function collectSante(): Promise<any[]> {
  const DATASET = "graphique-1-effectifs-de-medecins-en-activite-au-1er-janvier-de-2012-a-2025";
  const lignes = await ods(DREES_BASE, DATASET, "select=annee,medecine_generale,autres_specialites&limit=100");

  const annees = lignes
    .map(r => ({
      an: anneeDe(r.annee),
      generalistes: Number(r.medecine_generale),
      specialistes: Number(r.autres_specialites),
    }))
    .filter(r => r.an && Number.isFinite(r.generalistes) && Number.isFinite(r.specialistes))
    .sort((a, b) => a.an! - b.an!);
  if (!annees.length) throw new Error("aucune année exploitable");

  const derniere = annees[annees.length - 1];
  const publie = await odsPublie(DREES_BASE, DATASET);
  const commun = {
    theme: "sante",
    source: "DREES",
    source_url: `${DREES_BASE}/explore/dataset/${DATASET}/`,
    series_id: DATASET,
    provider: "drees",
    period: String(derniere.an),
    period_label: `1er janvier ${derniere.an}`,
    published_at: publie,
    updated_at: new Date().toISOString(),
  };

  return [
    {
      ...commun, code: "sante_medecins", sort_order: 1,
      label: "Médecins en activité", unit: "médecins", better_when: "up",
      value: derniere.generalistes + derniere.specialistes,
      sub: `dont ${derniere.generalistes.toLocaleString("fr-FR")} généralistes`,
      history: annees.map(a => ({ period: String(a.an), value: a.generalistes + a.specialistes })),
    },
    {
      ...commun, code: "sante_generalistes", sort_order: 2,
      label: "Médecins généralistes", unit: "médecins", better_when: "up",
      value: derniere.generalistes,
      // On COMPARE au premier millésime plutôt que d'affirmer une tendance : écrire
      // « en recul continu » serait faux, la série étant remontée entre 2023 et 2025.
      // Un commentaire qualitatif figé finit toujours par contredire les données.
      sub: `contre ${annees[0].generalistes.toLocaleString("fr-FR")} en ${annees[0].an}`,
      history: annees.map(a => ({ period: String(a.an), value: a.generalistes })),
    },
  ];
}

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

  console.log("=== Indicateurs officiels ===");
  console.log("\n— Économie (INSEE) —");

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

  console.log("\n— Énergie (RTE via ODRE) —");
  try {
    const energie = await collectEnergie();
    rows.push(...energie);
    for (const e of energie) {
      console.log(`  ✓ ${e.label.padEnd(22)} ${String(e.value).padStart(7)} ${e.unit} (${e.period_label})`);
    }
  } catch (e) {
    // Une source en panne ne doit pas empêcher les autres d'être enregistrées :
    // les indicateurs déjà en base restent affichés tels quels.
    console.warn(`  ⚠ énergie : ${(e as Error).message} — indicateurs laissés tels quels.`);
  }

  console.log("\n— Europe (Eurostat) —");
  try {
    rows.push(...await collectEurope());
  } catch (e) {
    console.warn(`  ⚠ Europe : ${(e as Error).message}`);
  }

  for (const [titre, collecte] of [
    ["Éducation (ministère)", collectEducation],
    ["Santé (DREES)", collectSante],
  ] as const) {
    console.log(`\n— ${titre} —`);
    try {
      const lot = await collecte();
      rows.push(...lot);
      for (const e of lot) {
        console.log(`  ✓ ${e.label.padEnd(26)} ${String(e.value).padStart(9)} ${e.unit} (${e.period_label})`);
      }
    } catch (e) {
      // Un portail en panne n'empêche pas les autres : ses indicateurs déjà en base restent.
      console.warn(`  ⚠ ${titre} : ${(e as Error).message}`);
    }
  }

  if (!rows.length) { console.error("Aucun indicateur exploitable."); return; }
  if (dryRun) { console.log("  (--dry-run : rien n'est écrit)"); return; }

  const { error } = await supabase.from("indicators").upsert(rows, { onConflict: "code" });
  if (error) console.error(`  ✗ écriture : ${error.message}`);
  else console.log(`  → ${rows.length} indicateur(s) enregistré(s)`);
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
