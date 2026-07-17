import { Scale, Sprout, Zap, Vote, Wind } from "lucide-react";

export type ItddRow = { variable: string; sub_field: string; year: number; value: number };
export type ItddCard = { category: string; label: string; display: string; pct: number | null; help?: string };

// Nouvelles catégories (celles qui n'existent pas déjà dans les fiches) + leur style.
export const ITDD_NEW_CATEGORIES = [
  { title: "Égalité femmes-hommes", icon: Scale, iconClass: "bg-fuchsia-100 text-fuchsia-600", textClass: "text-fuchsia-600", bgClass: "bg-fuchsia-50/40", borderClass: "border-fuchsia-100", progressClass: "bg-fuchsia-500" },
  { title: "Agriculture", icon: Sprout, iconClass: "bg-green-100 text-green-600", textClass: "text-green-600", bgClass: "bg-green-50/40", borderClass: "border-green-100", progressClass: "bg-green-500" },
  { title: "Énergie", icon: Zap, iconClass: "bg-amber-100 text-amber-600", textClass: "text-amber-600", bgClass: "bg-amber-50/40", borderClass: "border-amber-100", progressClass: "bg-amber-500" },
  { title: "Vie démocratique", icon: Vote, iconClass: "bg-indigo-100 text-indigo-600", textClass: "text-indigo-600", bgClass: "bg-indigo-50/40", borderClass: "border-indigo-100", progressClass: "bg-indigo-500" },
  { title: "Qualité de l'air", icon: Wind, iconClass: "bg-cyan-100 text-cyan-600", textClass: "text-cyan-600", bgClass: "bg-cyan-50/40", borderClass: "border-cyan-100", progressClass: "bg-cyan-500" },
];

function fmt(value: number, unit: string): string {
  if (unit === "%" || unit === "‰") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`;
  if (unit === "ans") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ans`;
  return `${Math.round(value).toLocaleString("fr-FR")}${unit ? " " + unit : ""}`;
}

// Dernière valeur pour une variable (sous-champ exact ou prédicat).
function latest(rows: ItddRow[], variable: string, sub?: string | ((s: string) => boolean)): number | null {
  let rs = rows.filter(r => r.variable === variable && r.value != null);
  if (typeof sub === "string") rs = rs.filter(r => r.sub_field === sub);
  else if (typeof sub === "function") rs = rs.filter(r => sub(r.sub_field));
  if (!rs.length) return null;
  rs.sort((a, b) => b.year - a.year);
  return Number(rs[0].value);
}

// Somme des sous-champs à l'année la plus récente (conso énergie, puissance).
function sumLatest(rows: ItddRow[], variable: string): number | null {
  const rs = rows.filter(r => r.variable === variable && r.value != null);
  if (!rs.length) return null;
  const maxYear = Math.max(...rs.map(r => r.year));
  return rs.filter(r => r.year === maxYear).reduce((s, r) => s + Number(r.value), 0);
}

export function buildItddCards(rows: ItddRow[], level: "region" | "department" | "commune"): ItddCard[] {
  const cards: ItddCard[] = [];
  const push = (category: string, label: string, value: number | null, unit: string, help?: string) => {
    if (value == null) return;
    cards.push({ category, label, display: fmt(value, unit), pct: unit === "%" ? Math.min(value, 100) : null, help });
  };

  push("Santé", "Espérance de vie (femmes)", latest(rows, "esper_vie", "femme"), "ans");
  push("Santé", "Espérance de vie (hommes)", latest(rows, "esper_vie", "homme"), "ans");
  push("Économie & Emploi", "Taux de chômage (BIT)", latest(rows, "taux_chom_bit", "total"), "%");
  push("Éducation", "6ᵉ en difficulté — français", latest(rows, "bas_niveau_francais", ""), "%");
  push("Éducation", "6ᵉ en difficulté — maths", latest(rows, "bas_niveau_maths", ""), "%");
  push("Égalité femmes-hommes", "Nombre de femmes maires", latest(rows, "nb_maires_femme", ""), "");
  push("Égalité femmes-hommes", "Part de femmes maires", latest(rows, "part_maires_femme", ""), "%");
  push("Agriculture", "Exploitations en agriculture bio", latest(rows, "agribio_nbexp", ""), "");
  push("Agriculture", "Surfaces en agriculture bio", latest(rows, "part_agribio_surf", ""), "%");
  push("Énergie", "Consommation finale d'énergie", sumLatest(rows, "conso_fin_ener"), "GWh");
  push("Énergie", "Puissance renouvelable installée", sumLatest(rows, "puissance_inst"), "MW");
  push("Logement", "Logements sociaux (nombre)", latest(rows, "log_hlm_tot", ""), "");
  push("Logement", "Part de logements sociaux", latest(rows, "part_pls", ""), "%");
  push("Logement", "Logements sociaux vacants", latest(rows, "nb_vacant_pls", ""), "");
  push("Sécurité", "Usages de stupéfiants", latest(rows, "infrac_tx_usagstup", ""), "‰");
  push("Sécurité", "Trafics de stupéfiants", latest(rows, "infrac_tx_traficstup", ""), "‰");
  push("Vie démocratique", "Votants présidentielle 2022 (1er tour)", latest(rows, "ElectionPres_T1_votants", ""), "");

  // Qualité de l'air : au niveau commune, indicateur de conformité (0/1) ;
  // sinon, nombre de stations ne respectant pas la norme.
  const pollutants: Array<[string, string]> = [["qualair_PM10", "PM10"], ["qualair_PM25", "PM2,5"], ["qualair_NO2", "NO₂"], ["qualair_O3", "O₃"], ["qualair_SO2", "SO₂"]];
  for (const [v, name] of pollutants) {
    if (level === "commune") {
      const val = latest(rows, v, s => s.includes("situation de la commune"));
      if (val != null) cards.push({ category: "Qualité de l'air", label: `Air — ${name}`, display: val >= 1 ? "Dépassement" : "Conforme", pct: null });
    } else {
      const val = latest(rows, v, s => s.includes("ne respectent pas la norme"));
      if (val != null) {
        const n = Math.round(val);
        cards.push({
          category: "Qualité de l'air",
          label: `Air — ${name}`,
          // « 0 station(s) > norme » était illisible : on dit ce que ça signifie.
          display: n === 0 ? "Conforme" : `${n} station(s) > norme`,
          pct: null,
          help: n === 0
            ? "Aucune station de mesure ne dépasse la norme réglementaire pour ce polluant."
            : `${n} station(s) de mesure dépasse(nt) la norme réglementaire pour ce polluant.`,
        });
      }
    }
  }

  return cards;
}
