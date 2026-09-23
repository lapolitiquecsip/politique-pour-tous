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
      ...commun, code: "edu_bac_taux", sort_order: 5,
      label: "Réussite au baccalauréat", unit: "%", better_when: "up",
      value: Number((derniere.adm / derniere.pres * 100).toFixed(1)),
      sub: `${derniere.adm.toLocaleString("fr-FR")} admis sur ${derniere.pres.toLocaleString("fr-FR")} candidats présents`,
      history: sessions.map(s => ({ period: String(s.an), value: Number((s.adm / s.pres * 100).toFixed(1)) })),
    },
    {
      ...commun, code: "edu_bacheliers", sort_order: 6,
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

/* ═══════════════════════ Immigration — Eurostat ═══════════════════════ */

/**
 * Lit une série Eurostat pour la France et pour l'Union, sur la dernière période
 * renseignée côté français. Renvoie aussi l'historique français et la date de
 * publication annoncée par Eurostat.
 */
async function eurostatFr(dataset: string, filters: string, periodes = 10) {
  const r = await fetch(
    `${EUROSTAT_BASE}${dataset}?format=JSON&lang=FR&lastTimePeriod=${periodes}&${filters}`,
    { headers: { "User-Agent": "lapolitiquecestsimple/1.0" } },
  );
  if (!r.ok) throw new Error(`Eurostat a répondu ${r.status}`);
  const j: any = await r.json();
  if (j.error || !j.dimension) throw new Error("requête refusée par Eurostat");

  const geoIdx: Record<string, number> = j.dimension.geo.category.index ?? {};
  const timeIdx: Record<string, number> = j.dimension.time.category.index ?? {};
  const values: Record<string, number> = j.value ?? {};
  const nbTime = Object.keys(timeIdx).length;
  const at = (geo: string, time: string) => {
    const gi = geoIdx[geo], ti = timeIdx[time];
    if (gi === undefined || ti === undefined) return undefined;
    const v = values[gi * nbTime + ti] ?? values[String(gi * nbTime + ti)];
    return typeof v === "number" ? v : undefined;
  };

  const toutes = Object.keys(timeIdx).sort();
  const derniere = [...toutes].reverse().find(p => at("FR", p) !== undefined);
  if (!derniere) throw new Error("aucune valeur française");

  return {
    periode: derniere,
    fr: at("FR", derniere)!,
    ue: at("EU27_2020", derniere),
    // Valeurs des États membres à la dernière période, de quoi classer la France. Le
    // tableau se réduit à la France quand l'appelant a filtré sur geo=FR : à lui de
    // vérifier qu'il y a matière à classement avant d'annoncer un rang.
    classement: Object.keys(geoIdx)
      .filter(g => UE27.has(g))
      .map(g => ({ g, v: at(g, derniere) }))
      .filter((p): p is { g: string; v: number } => p.v !== undefined),
    publie: j.updated ? String(j.updated).slice(0, 10) : null,
    histoire: toutes
      .map(p => ({ period: p, value: at("FR", p) }))
      .filter((h): h is { period: string; value: number } => h.value !== undefined),
  };
}

async function collectImmigration(): Promise<any[]> {
  const out: any[] = [];
  const entier = (v: number) => Math.round(v).toLocaleString("fr-FR");

  // 1. Part de la population née à l'étranger — rapport de deux séries du même jeu.
  try {
    const nes = await eurostatFr("migr_pop3ctb", "c_birth=FOR&sex=T&age=TOTAL&geo=FR&geo=EU27_2020");
    const tous = await eurostatFr("migr_pop3ctb", "c_birth=TOTAL&sex=T&age=TOTAL&geo=FR&geo=EU27_2020");
    const partFr = (nes.fr / tous.fr) * 100;
    const parAn = new Map(tous.histoire.map(h => [h.period, h.value]));

    out.push({
      code: "immi_nes_etranger", theme: "immigration", sort_order: 2,
      label: "Personnes nées à l'étranger", unit: "% de la population",
      value: Number(partFr.toFixed(1)),
      // Précision indispensable : Eurostat compte les personnes NÉES À L'ÉTRANGER, ce qui
      // inclut les Français nés hors de France. L'INSEE compte les IMMIGRÉS — nés
      // étrangers à l'étranger — et publie donc un chiffre plus bas. Sans cette note, on
      // paraîtrait contredire l'INSEE alors qu'on ne mesure pas la même chose.
      sub: `${entier(nes.fr)} personnes — définition Eurostat, qui inclut les Français nés hors de France`,
      period: nes.periode, period_label: nes.periode,
      history: nes.histoire
        .filter(h => parAn.get(h.period))
        .map(h => ({ period: h.period, value: Number((h.value / parAn.get(h.period)! * 100).toFixed(1)) })),
      source: "Eurostat", source_url: "https://ec.europa.eu/eurostat/databrowser/view/migr_pop3ctb/default/table?lang=fr",
      series_id: "migr_pop3ctb", provider: "eurostat", published_at: nes.publie,
      better_when: null, updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn(`  ⚠ nés à l'étranger : ${(e as Error).message}`);
  }

  // 2. Premiers titres de séjour, 3. demandes d'asile — même forme, on boucle.
  const flux: { code: string; label: string; dataset: string; filters: string; unit: string; sub: string; ordre: number }[] = [
    {
      code: "immi_titres", label: "Premiers titres de séjour", ordre: 6,
      dataset: "migr_resfirst", filters: "citizen=TOTAL&reason=TOTAL&duration=TOTAL&geo=FR&geo=EU27_2020",
      unit: "titres délivrés", sub: "délivrés dans l'année, tous motifs confondus",
    },
    {
      code: "immi_asile", label: "Demandes d'asile", ordre: 7,
      dataset: "migr_asyappctza", filters: "citizen=TOTAL&sex=T&age=TOTAL&unit=PER&geo=FR&geo=EU27_2020",
      unit: "demandeurs", sub: "demandeurs enregistrés dans l'année",
    },
  ];

  for (const f of flux) {
    try {
      const d = await eurostatFr(f.dataset, f.filters);
      out.push({
        code: f.code, theme: "immigration", sort_order: f.ordre,
        label: f.label, unit: f.unit, value: Math.round(d.fr),
        sub: d.ue !== undefined ? `${f.sub} — ${entier(d.ue)} dans l'ensemble de l'Union` : f.sub,
        period: d.periode, period_label: d.periode,
        history: d.histoire.map(h => ({ period: h.period, value: Math.round(h.value) })),
        source: "Eurostat", source_url: `https://ec.europa.eu/eurostat/databrowser/view/${f.dataset}/default/table?lang=fr`,
        series_id: f.dataset, provider: "eurostat", published_at: d.publie,
        better_when: null, updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`  ⚠ ${f.label} : ${(e as Error).message}`);
    }
  }

  // L'affichage est assuré par la boucle appelante : ne pas le dupliquer ici.
  return out;
}

/* ═══════════ Éducation — effectifs et encadrement (ministère) ═══════════ */

/**
 * Les chiffres de tête de « L'éducation nationale en chiffres », reconstitués depuis
 * l'open data du ministère plutôt que depuis la brochure.
 *
 * La page de la DEPP est protégée par un pare-feu qui impose une épreuve JavaScript :
 * elle répond 403 à toute lecture automatisée, et aucun en-tête de navigateur n'y
 * change rien. Le portail data.education.gouv.fr, lui, sert les mêmes données par une
 * API ouverte, mise à jour à chaque rentrée. On agrège donc établissement par
 * établissement — l'API sait le faire côté serveur — pour retrouver les totaux
 * nationaux, avec l'historique en prime, que la brochure ne donne pas.
 *
 * Les jeux « fr-en-effectifs-premier-degre » et « -second-degre » portent des noms
 * prometteurs mais sont marqués obsolètes et figés depuis 2016 : ce sont les jeux
 * par école et par établissement qui vivent encore.
 */
const EDUC_ELEVES_1D = "fr-en-ecoles-effectifs-nb_classes";
const EDUC_COLLEGE = "fr-en-college-effectifs-niveau-sexe-lv";
const EDUC_LYCEE_GT = "fr-en-lycee_gt-effectifs-niveau-sexe-lv";

/** « 2025-01-01T00:00:00+00:00 » ou « 2025 » → « 2025 ». */
const rentree = (v: unknown) => String(v ?? "").slice(0, 4) || null;

async function collectEducationEffectifs(): Promise<any[]> {
  const out: any[] = [];

  /** Somme d'un champ par rentrée scolaire, calculée par le portail. */
  const parRentree = async (dataset: string, champs: string) =>
    ods(EDUCATION_BASE, dataset,
      "select=" + encodeURIComponent(champs) +
      "&group_by=" + encodeURIComponent("rentree_scolaire as an") + "&order_by=an&limit=40");

  /* 1 et 2. Premier degré : combien d'élèves, et combien par classe. */
  const ecoles = (await parRentree(EDUC_ELEVES_1D,
    "sum(nombre_total_eleves) as eleves,sum(nombre_total_classes) as classes"))
    .map(r => ({ an: rentree(r.an), eleves: Number(r.eleves), classes: Number(r.classes) }))
    .filter(r => r.an && r.eleves > 0 && r.classes > 0)
    .sort((a, b) => a.an!.localeCompare(b.an!));

  const publie = await odsPublie(EDUCATION_BASE, EDUC_ELEVES_1D);
  const commun = {
    theme: "education",
    source: "Ministère de l'Éducation nationale — DEPP",
    provider: "education",
    published_at: publie,
    updated_at: new Date().toISOString(),
  };

  if (ecoles.length) {
    const d = ecoles[ecoles.length - 1];
    const premier = ecoles[0];
    out.push({
      ...commun,
      code: "edu_eleves_1d", sort_order: 1,
      label: "Élèves dans le premier degré", unit: "élèves", better_when: null,
      value: d.eleves,
      sub: `maternelle et élémentaire, public et privé — ${Math.abs(d.eleves - premier.eleves).toLocaleString("fr-FR")} élèves ${d.eleves < premier.eleves ? "de moins" : "de plus"} qu'à la rentrée ${premier.an}`,
      period: d.an, period_label: `rentrée ${d.an}`,
      history: ecoles.map(e => ({ period: e.an!, value: e.eleves })),
      source_url: `${EDUCATION_BASE}/explore/dataset/${EDUC_ELEVES_1D}/`,
      series_id: EDUC_ELEVES_1D,
    });

    const taille = (e: typeof d) => Number((e.eleves / e.classes).toFixed(1));
    out.push({
      ...commun,
      code: "edu_taille_classe", sort_order: 2,
      label: "Élèves par classe", unit: "en moyenne", better_when: "down",
      value: taille(d),
      // Le nombre de classes a peu bougé ; ce sont les élèves qui manquent. Le dire
      // évite de lire la baisse comme un effort d'encadrement qu'elle n'est pas.
      sub: `dans le premier degré, contre ${taille(premier).toLocaleString("fr-FR")} à la rentrée ${premier.an} — ${d.classes.toLocaleString("fr-FR")} classes pour ${d.eleves.toLocaleString("fr-FR")} élèves`,
      period: d.an, period_label: `rentrée ${d.an}`,
      history: ecoles.map(e => ({ period: e.an!, value: taille(e) })),
      source_url: `${EDUCATION_BASE}/explore/dataset/${EDUC_ELEVES_1D}/`,
      series_id: EDUC_ELEVES_1D,
    });
  }

  /* 3 et 4. Collège et lycée général et technologique. */
  const niveaux: { code: string; label: string; dataset: string; champ: string; ordre: number; sub: string }[] = [
    { code: "edu_eleves_college", label: "Collégiens", dataset: EDUC_COLLEGE, champ: "nombre_eleves_total", ordre: 3, sub: "de la sixième à la troisième, public et privé" },
    { code: "edu_eleves_lycee", label: "Lycéens (voie générale et technologique)", dataset: EDUC_LYCEE_GT, champ: "nombre_d_eleves", ordre: 4, sub: "hors voie professionnelle" },
  ];

  for (const n of niveaux) {
    try {
      const lignes = (await parRentree(n.dataset, `sum(${n.champ}) as eleves`))
        .map(r => ({ an: rentree(r.an), eleves: Number(r.eleves) }))
        .filter(r => r.an && r.eleves > 0)
        .sort((a, b) => a.an!.localeCompare(b.an!));
      if (!lignes.length) continue;
      const d = lignes[lignes.length - 1];
      out.push({
        ...commun,
        code: n.code, sort_order: n.ordre,
        label: n.label, unit: "élèves", better_when: null,
        value: d.eleves,
        sub: n.sub,
        period: d.an, period_label: `rentrée ${d.an}`,
        history: lignes.map(l => ({ period: l.an!, value: l.eleves })),
        source_url: `${EDUCATION_BASE}/explore/dataset/${n.dataset}/`,
        series_id: n.dataset,
        published_at: await odsPublie(EDUCATION_BASE, n.dataset),
      });
    } catch (e) {
      // Un niveau manquant n'empêche pas les autres d'être publiés.
      console.warn(`  ⚠ ${n.label} : ${(e as Error).message}`);
    }
  }

  return out;
}

/* ═══════════════ Immigration — INSEE, « L'essentiel sur… » ═══════════════ */

/**
 * La page de synthèse de l'INSEE sur les immigrés et les étrangers.
 *
 * Eurostat compte les personnes NÉES À L'ÉTRANGER (14 % de la population) ; l'INSEE
 * compte les IMMIGRÉS — nées étrangères à l'étranger — soit 11,6 %. L'écart, ce sont
 * les 1,66 million de Français nés hors de France. Publier les deux côte à côte, avec
 * la décomposition, vaut mieux qu'une note de bas de page expliquant pourquoi nos
 * chiffres semblent contredire ceux de l'INSEE.
 *
 * Les tableaux sont retrouvés par leur INTITULÉ, jamais par leur rang : l'INSEE en
 * ajoute et en retire au fil des éditions, et un indice figé finirait par lire le
 * mauvais tableau sans que rien ne le signale.
 */
const INSEE_IMMI_URL = "https://www.insee.fr/fr/statistiques/3633212";

type Tableau = { titre: string; lignes: string[][] };

/** Découpe la page en tableaux, intitulé et cellules nettoyés. */
function lireTableaux(html: string): Tableau[] {
  const sansCode = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const net = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&#160;|&nbsp;| /g, " ")
      .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

  const out: Tableau[] = [];
  for (const tb of sansCode.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const titre = net(tb.match(/<caption[\s\S]*?<\/caption>/i)?.[0] ?? "");
    const lignes: string[][] = [];
    for (const tr of tb.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      const cells = (tr.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? []).map(net);
      if (cells.some(Boolean)) lignes.push(cells);
    }
    out.push({ titre, lignes });
  }
  return out;
}

/**
 * « 7 970 » → 7970 ; « 11,6 » → 11.6 ; « nd » → null.
 *
 * Le contrôle préalable compte : sans lui, « nd » perdait tous ses caractères au
 * nettoyage, `Number("")` rendait zéro, et la fiche annonçait « solde migratoire de 0
 * en 2024 » là où l'INSEE dit seulement qu'il ne le sait pas encore. Un chiffre faux
 * vaut bien pire qu'un chiffre absent, sur ce sujet plus qu'ailleurs.
 */
function nombreFr(v: string | undefined): number | null {
  if (!v) return null;
  const propre = v.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (!/\d/.test(propre)) return null;
  const n = Number(propre);
  return Number.isFinite(n) ? n : null;
}

/** Première ligne dont la première cellule répond au motif. */
const ligneAvec = (t: Tableau, motif: RegExp) => t.lignes.find(l => motif.test(l[0] ?? ""));

async function collectImmigrationInsee(): Promise<any[]> {
  const r = await fetch(INSEE_IMMI_URL, {
    headers: { "User-Agent": "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)" },
  });
  if (!r.ok) throw new Error(`l'INSEE a répondu ${r.status}`);
  const tableaux = lireTableaux(await r.text());

  const trouve = (motif: RegExp) => tableaux.find(t => motif.test(t.titre));
  const decompo = trouve(/D[ée]composition de la population/i);
  const evolution = trouve(/[ÉE]volution de la population immigr[ée]e/i);
  const continents = trouve(/selon leur continent de naissance \(en milliers\)/i);
  const flux = trouve(/Flux migratoires des immigr[ée]s/i);
  if (!decompo || !evolution) throw new Error("tableaux attendus absents de la page");

  const out: any[] = [];
  const commun = {
    theme: "immigration",
    source: "INSEE",
    source_url: INSEE_IMMI_URL,
    provider: "insee",
    updated_at: new Date().toISOString(),
  };
  const milliers = (n: number) => Math.round(n * 1000).toLocaleString("fr-FR");

  /* 1. Population immigrée, et ce qui la sépare du compte d'Eurostat. */
  const annees = evolution.lignes
    .map(l => ({ an: (l[0] ?? "").match(/(\d{4})/)?.[1], part: nombreFr(l[2]), eff: nombreFr(l[1]) }))
    .filter((x): x is { an: string; part: number; eff: number } => !!x.an && x.part != null && x.eff != null);
  const derniere = annees[annees.length - 1];

  const nesEtranger = nombreFr(ligneAvec(decompo, /^N[ée]s à l'étranger$/i)?.[1]);
  const francaisNesAilleurs = nombreFr(ligneAvec(decompo, /N[ée]s à l'étranger de nationalit[ée] fran/i)?.[1]);

  if (derniere) {
    out.push({
      ...commun,
      code: "immi_immigres", sort_order: 1,
      label: "Population immigrée", unit: "% de la population", better_when: null,
      value: derniere.part,
      // La comparaison est mise noir sur blanc : c'est la question que se pose
      // quiconque voit deux chiffres différents pour la même réalité.
      sub: francaisNesAilleurs && nesEtranger
        ? `${milliers(derniere.eff)} personnes nées étrangères à l'étranger. Les ${milliers(nesEtranger)} personnes nées à l'étranger comptent en plus ${milliers(francaisNesAilleurs)} Français nés hors de France, qui ne sont pas des immigrés.`
        : `${milliers(derniere.eff)} personnes nées étrangères à l'étranger`,
      period: derniere.an, period_label: derniere.an,
      history: annees.map(a => ({ period: a.an, value: a.part })),
      series_id: "essentiel-immigres-evolution",
      published_at: null,
    });
  }

  /* 2. Immigrés devenus français : un sur trois. */
  const devenus = nombreFr(ligneAvec(decompo, /Immigr[ée]s ayant acquis la nationalit[ée]/i)?.[1]);
  const ensemble = nombreFr(ligneAvec(decompo, /Ensemble immigr[ée]s/i)?.[1]);
  if (devenus && ensemble) {
    out.push({
      ...commun,
      code: "immi_naturalises", sort_order: 5,
      label: "Immigrés devenus français", unit: "% des immigrés", better_when: null,
      value: Number((devenus / ensemble * 100).toFixed(1)),
      sub: `${milliers(devenus)} personnes sur ${milliers(ensemble)} immigrés ont acquis la nationalité française`,
      period: derniere?.an ?? null, period_label: derniere?.an ?? null,
      history: null,
      series_id: "essentiel-immigres-decomposition",
      published_at: null,
    });
  }

  /* 3. D'où ils viennent. */
  if (continents) {
    const par = (motif: RegExp) => nombreFr(ligneAvec(continents, motif)?.[1]);
    const af = par(/^Afrique/i), eu = par(/^Europe/i), as = par(/^Asie/i), am = par(/^Am[ée]rique/i);
    const tot = par(/^Ensemble/i);
    if (af && tot) {
      const pc = (n: number | null) => (n ? Math.round((n / tot) * 100) : null);
      out.push({
        ...commun,
        code: "immi_origine_afrique", sort_order: 4,
        label: "Immigrés nés en Afrique", unit: "% des immigrés", better_when: null,
        value: Number(((af / tot) * 100).toFixed(1)),
        sub: `puis Europe ${pc(eu)} %, Asie ${pc(as)} %, Amériques et Océanie ${pc(am)} %`,
        period: derniere?.an ?? null, period_label: derniere?.an ?? null,
        history: null,
        series_id: "essentiel-immigres-continents",
        published_at: null,
      });
    }
  }

  /* 4. Combien arrivent chaque année, combien repartent. */
  if (flux) {
    const lignes = flux.lignes
      .map(l => ({ an: (l[0] ?? "").match(/^(\d{4})/)?.[1], entrees: nombreFr(l[1]), solde: nombreFr(l[3]) }))
      .filter((x): x is { an: string; entrees: number; solde: number | null } => !!x.an && x.entrees != null);
    const recente = lignes[lignes.length - 1];
    // Le solde suppose de connaître les sorties, que l'INSEE publie avec deux ans de
    // retard. On donne donc les entrées, à jour, et on date le dernier solde connu.
    const dernierSolde = [...lignes].reverse().find(x => x.solde != null);
    if (recente) {
      out.push({
        ...commun,
        code: "immi_entrees", sort_order: 3,
        label: "Entrées d'immigrés", unit: "par an", better_when: null,
        value: Math.round(recente.entrees * 1000),
        sub: dernierSolde
          ? `solde migratoire des immigrés de ${dernierSolde.solde! > 0 ? "+" : ""}${milliers(dernierSolde.solde!)} en ${dernierSolde.an}, dernière année où les sorties sont connues`
          : "arrivées dans l'année",
        period: recente.an, period_label: recente.an,
        history: lignes.map(x => ({ period: x.an, value: Math.round(x.entrees * 1000) })),
        series_id: "essentiel-immigres-flux",
        published_at: null,
      });
    }
  }

  // Le bilan est déjà imprimé par la boucle principale : pas de doublon ici.
  return out;
}

/* ═══════════════════ Sécurité — SSMSI (ministère de l'Intérieur) ═══════════════════ */

/**
 * Le SSMSI publie la délinquance enregistrée sur data.gouv, à la commune, au département
 * et à la région. On prend la base RÉGIONALE : 350 Ko contre 40 Mo pour la communale, et
 * la somme des régions donne exactement le total national.
 *
 * L'adresse du fichier porte un horodatage de fabrication qui change à chaque
 * republication : on la RÉSOUT à chaque passage par l'API de data.gouv plutôt que de la
 * figer, sinon le cron continuerait de lire l'édition de l'an dernier sans rien signaler.
 *
 * Eurostat expose aussi des statistiques de criminalité, mais s'arrête à 2024 là où le
 * SSMSI publie 2025 : on préfère la source nationale, plus fraîche.
 */
const SSMSI_DATASET = "621df2954fa5a3b5a023e23c";

/** Indicateurs retenus, tels qu'écrits dans le fichier — ils servent de clé de filtre. */
const DELINQUANCE: { code: string; indicateur: string; label: string; ordre: number }[] = [
  { code: "secu_homicides", indicateur: "Homicides", label: "Homicides", ordre: 1 },
  { code: "secu_intrafamiliales", indicateur: "Violences physiques intrafamiliales", label: "Violences intrafamiliales", ordre: 2 },
  { code: "secu_cambriolages", indicateur: "Cambriolages de logement", label: "Cambriolages de logement", ordre: 3 },
  { code: "secu_stupefiants", indicateur: "Trafic de stupéfiants", label: "Trafic de stupéfiants", ordre: 4 },
];

async function collectSecurite(): Promise<any[]> {
  // 1. Résolution de l'adresse courante du fichier régional.
  const meta = await fetch(`https://www.data.gouv.fr/api/1/datasets/${SSMSI_DATASET}/`);
  if (!meta.ok) throw new Error(`data.gouv a répondu ${meta.status}`);
  const mj: any = await meta.json();
  const ressource = (mj.resources ?? []).find((r: any) => /^REG - /.test(r.title ?? "") && r.format === "csv");
  if (!ressource?.url) throw new Error("base régionale introuvable dans le jeu de données");

  // 2. Lecture du CSV : séparateur point-virgule, guillemets, BOM en tête.
  const csv = await (await fetch(ressource.url)).text();
  const lignes = csv.replace(/^﻿/, "").trim().split(/\r?\n/);
  const entetes = lignes[0].split(";").map(h => h.replace(/"/g, ""));
  const iAnnee = entetes.indexOf("annee");
  const iInd = entetes.indexOf("indicateur");
  const iNb = entetes.indexOf("nombre");
  const iPop = entetes.indexOf("insee_pop");
  if (iAnnee < 0 || iInd < 0 || iNb < 0) throw new Error("colonnes attendues absentes du fichier");

  // 3. Somme des régions, par année et par indicateur.
  const totaux = new Map<string, number>();     // "indicateur|année" → nombre
  const population = new Map<string, number>(); // "année" → population
  for (const ligne of lignes.slice(1)) {
    const c = ligne.split(";").map(x => x.replace(/"/g, ""));
    const annee = c[iAnnee], ind = c[iInd];
    const nb = Number(c[iNb]);
    if (!annee || !ind || !Number.isFinite(nb)) continue;
    totaux.set(`${ind}|${annee}`, (totaux.get(`${ind}|${annee}`) ?? 0) + nb);
    // La population régionale est répétée sur chaque ligne : on ne l'additionne qu'une
    // fois par indicateur, sinon on compterait la France dix-huit fois.
    if (ind === DELINQUANCE[0].indicateur && iPop >= 0) {
      const pop = Number(c[iPop]);
      if (Number.isFinite(pop)) population.set(annee, (population.get(annee) ?? 0) + pop);
    }
  }

  const annees = [...new Set([...totaux.keys()].map(k => k.split("|")[1]))].sort();
  const derniere = annees[annees.length - 1];
  if (!derniere) throw new Error("aucune année exploitable");

  const publie = String(mj.last_modified ?? "").slice(0, 10) || null;
  const popFr = population.get(derniere);

  return DELINQUANCE.map(d => {
    const histoire = annees
      .map(a => ({ period: a, value: totaux.get(`${d.indicateur}|${a}`) }))
      .filter((h): h is { period: string; value: number } => h.value !== undefined);
    const valeur = totaux.get(`${d.indicateur}|${derniere}`);
    if (valeur === undefined) return null;

    // Le taux pour 100 000 habitants situe le chiffre : « 1 020 homicides » ne dit rien
    // sans la population à laquelle le rapporter.
    const taux = popFr ? (valeur / popFr) * 100000 : null;

    return {
      code: d.code, theme: "securite", sort_order: d.ordre,
      label: d.label, unit: "faits", better_when: "down",
      value: valeur,
      sub: taux
        ? `soit ${taux.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pour 100 000 habitants — faits enregistrés par la police et la gendarmerie`
        : "faits enregistrés par la police et la gendarmerie",
      period: derniere, period_label: derniere,
      history: histoire,
      source: "SSMSI — ministère de l'Intérieur",
      source_url: `https://www.data.gouv.fr/fr/datasets/${SSMSI_DATASET}/`,
      series_id: d.indicateur,
      provider: "ssmsi",
      published_at: publie,
      updated_at: new Date().toISOString(),
    };
  }).filter(Boolean) as any[];
}

/* ═══════════════════════ Retraites — DREES & Eurostat ═══════════════════════ */

/**
 * Les retraites sont le thème le plus mal outillé : le COR publie des rapports PDF, la
 * CNAV des tableaux Excel, et la plupart des jeux « retraite » de la DREES sont des
 * pièces jointes non interrogeables (l'API leur répond `total_count: 0`). Deux sources
 * tiennent debout :
 *
 *  — la DREES pour l'âge de départ, seul chiffre français faisant autorité, repris de
 *    l'édition 2025 de son Panorama (le jeu historique, lui, s'arrêtait à 2022) ;
 *  — Eurostat pour le reste, qui a l'avantage de situer la France face aux Vingt-Sept.
 *
 * L'âge de départ porte sur 2023 : c'est la dernière année publiée par la DREES, et le
 * `sub` le dit noir sur blanc plutôt que de laisser croire au chiffre du jour.
 */
const DREES_AGE_DEPART = "panorama-retraite2025_graphique-1_age-de-depart";

type RetraiteEuro = {
  code: string;
  label: string;
  dataset: string;
  filters: string;
  unit: string;
  /** Unité abrégée pour la comparaison européenne, que l'unité complète alourdirait. */
  uniteCourte: string;
  ordre: number;
  betterWhen: "up" | "down" | null;
  /** Eurostat livre certains ratios entre 0 et 1 : on les affiche en pourcentage. */
  facteur: number;
  /** Comment nommer le rang une fois la France située : « qui dépense le plus »… */
  rangSuffixe: string;
  sub: (ue: string) => string;
};

const RETRAITES_EURO: RetraiteEuro[] = [
  {
    // Le moteur du déséquilibre : ce ratio explique pourquoi le système se finance de
    // plus en plus mal, mieux qu'un solde comptable qui dépend d'hypothèses de croissance.
    code: "retr_dependance", label: "Seniors pour 100 adultes de 20 à 64 ans", ordre: 2,
    dataset: "demo_pjanind", filters: "indic_de=OLDDEP3",
    // Unité vide : « 39,5 % » se lirait comme « 39,5 % de la population a plus de 65 ans »,
    // ce qui est faux — c'est un rapport entre deux tranches d'âge, pas une part.
    unit: "", uniteCourte: "", betterWhen: null, facteur: 1,
    rangSuffixe: "où ce poids est le plus lourd",
    sub: ue => `personnes de 65 ans et plus rapportées aux 20-64 ans — ${ue} dans l'Union`,
  },
  {
    code: "retr_emploi_seniors", label: "Emploi des 55-64 ans", ordre: 3,
    dataset: "lfsi_emp_a", filters: "sex=T&age=Y55-64&unit=PC_POP&indic_em=EMP_LFS",
    unit: "%", uniteCourte: "%", betterWhen: "up", facteur: 1,
    rangSuffixe: "où les seniors travaillent le plus",
    sub: ue => `contre ${ue} dans l'Union`,
  },
  {
    code: "retr_depenses", label: "Dépense publique de retraite", ordre: 4,
    dataset: "gov_10a_exp", filters: "na_item=TE&sector=S13&unit=PC_GDP&cofog99=GF1002",
    unit: "% du PIB", uniteCourte: "% du PIB", betterWhen: null, facteur: 1,
    rangSuffixe: "qui dépense le plus pour les retraites",
    sub: ue => `contre ${ue} dans l'Union`,
  },
  {
    code: "retr_niveau_vie", label: "Niveau de vie des retraités", ordre: 5,
    dataset: "ilc_pnp2", filters: "sex=T&age=Y_GE65&statinfo=R_MED_I",
    unit: "%", uniteCourte: "%", betterWhen: "up", facteur: 100,
    rangSuffixe: "où les retraités sont les mieux lotis",
    sub: ue => `revenu médian des 65 ans et plus rapporté à celui du reste de la population — ${ue} dans l'Union`,
  },
];

async function collectRetraites(): Promise<any[]> {
  const out: any[] = [];
  const nb = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  // 1. Âge moyen de départ — DREES.
  try {
    const lignes = await ods(DREES_BASE, DREES_AGE_DEPART,
      "select=annee,femme,homme,ensemble&order_by=annee&limit=60");
    const annees = lignes
      .map(r => ({ an: anneeDe(r.annee), ens: Number(r.ensemble), f: Number(r.femme), h: Number(r.homme) }))
      .filter(r => r.an && Number.isFinite(r.ens))
      .sort((a, b) => a.an! - b.an!);
    if (!annees.length) throw new Error("aucune année exploitable");

    const derniere = annees[annees.length - 1];
    const premiere = annees[0];
    const publie = await odsPublie(DREES_BASE, DREES_AGE_DEPART);

    out.push({
      code: "retr_age_depart", theme: "retraites", sort_order: 1,
      label: "Âge moyen de départ à la retraite", unit: "ans", better_when: null,
      value: Number(derniere.ens.toFixed(1)),
      // On date le chiffre dans le texte : la DREES publie avec deux ans de retard, et un
      // « 62,7 ans » nu laisserait croire qu'il intègre déjà la réforme de 2023.
      sub: `femmes ${nb(derniere.f)} ans, hommes ${nb(derniere.h)} ans — dernière année publiée par la DREES (${derniere.an}), contre ${nb(premiere.ens)} ans en ${premiere.an}`,
      period: String(derniere.an), period_label: String(derniere.an),
      history: annees.map(a => ({ period: String(a.an), value: a.ens })),
      source: "DREES — Panorama des retraités",
      source_url: `${DREES_BASE}/explore/dataset/${DREES_AGE_DEPART}/`,
      series_id: DREES_AGE_DEPART, provider: "drees",
      published_at: publie,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn(`  ⚠ âge de départ : ${(e as Error).message}`);
  }

  // 2 à 4. Comparaisons européennes — même forme, on boucle.
  for (const d of RETRAITES_EURO) {
    try {
      // Aucun filtre `geo` : on veut aussi les vingt-six autres pays pour situer la France.
      const s = await eurostatFr(d.dataset, d.filters);
      const classement = [...s.classement].sort((a, b) => b.v - a.v);
      const rang = classement.findIndex(p => p.g === "FR") + 1;
      const morceaux = [
        d.sub(s.ue !== undefined ? `${nb(s.ue * d.facteur)} ${d.uniteCourte}`.trim() : "la moyenne de l'Union"),
        rang > 0 && classement.length > 2
          ? `${rang}${rang === 1 ? "er" : "e"} pays ${d.rangSuffixe} sur ${classement.length}`
          : null,
      ].filter(Boolean);

      out.push({
        code: d.code, theme: "retraites", sort_order: d.ordre,
        label: d.label, unit: d.unit, better_when: d.betterWhen,
        value: Number((s.fr * d.facteur).toFixed(1)),
        sub: morceaux.join(" — "),
        period: s.periode, period_label: s.periode,
        history: s.histoire.map(h => ({ period: h.period, value: Number((h.value * d.facteur).toFixed(1)) })),
        source: "Eurostat",
        source_url: `https://ec.europa.eu/eurostat/databrowser/view/${d.dataset}/default/table?lang=fr`,
        series_id: d.dataset, provider: "eurostat",
        published_at: s.publie,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`  ⚠ ${d.label} : ${(e as Error).message}`);
    }
  }

  return out;
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
    ["Éducation — effectifs (DEPP)", collectEducationEffectifs],
    ["Éducation — baccalauréat", collectEducation],
    ["Santé (DREES)", collectSante],
    ["Immigration (INSEE)", collectImmigrationInsee],
    ["Immigration (Eurostat)", collectImmigration],
    ["Sécurité (SSMSI)", collectSecurite],
    ["Retraites (DREES & Eurostat)", collectRetraites],
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
