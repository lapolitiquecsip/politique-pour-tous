import { supabase } from "@/lib/supabase";
import { PARTY_SLUGS } from "@/lib/data/partySlugs";
import { SITE, NOM_SITE, enBref } from "@/lib/geo";

/**
 * /llms.txt et /llms-full.txt (format proposé sur llmstxt.org), écrits à la construction du site.
 *
 * Un moteur génératif qui arrive sur le site y trouve, en Markdown simple : ce qu'est le site, d'où
 * viennent ses données, les rubriques, et (version complète) la liste des fiches — lois, élus,
 * partis, ministres — avec l'adresse de chacune. Il sait ainsi quoi lire et quoi citer.
 */

async function tout<T>(lire: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    let r = await lire(de, de + 999);
    for (let essai = 1; essai < 3 && (r.error || !r.data); essai++) {
      await new Promise(ok => setTimeout(ok, 1500 * essai));
      r = await lire(de, de + 999);
    }
    if (r.error || !r.data) return out;
    out.push(...r.data);
    if (r.data.length < 1000) break;
  }
  return out;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateFr = (d?: string | null) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
};
const ligne = (s: string) => s.replace(/\s+/g, " ").trim();

const PRESENTATION = `# ${NOM_SITE}

> Média indépendant et non partisan qui explique la politique française à partir des sources officielles : chaque loi résumée en clair, le vote de chaque député et sénateur, le budget de l'État, le Journal officiel, les partis, le gouvernement et l'élection présidentielle de 2027. Site en français, mis à jour chaque jour.

Les données viennent des publications officielles : open data de l'Assemblée nationale et du Sénat (dossiers législatifs, scrutins, amendements, comptes rendus), Journal officiel et Légifrance (DILA), data.gouv.fr, documents budgétaires (projets de loi de finances), Parlement européen. Chaque fiche renvoie à sa source. Les résumés et analyses sont rédigés avec l'aide d'une intelligence artificielle à partir de ces documents, puis contrôlés : seul le texte officiel fait foi. Le site ne prend pas position.

Pour citer une information, citer la page du site qui la présente (adresse ci-dessous) et, si besoin, la source officielle qu'elle indique.`;

const RUBRIQUES: [string, string, string][] = [
  ["Les lois expliquées", "/lois/", "Toutes les lois promulguées et les textes en cours au Parlement, résumés en clair : ce qui change, pour qui, qui a voté quoi."],
  ["Les 577 députés", "/deputes/", "Chaque député : ses votes sur chaque loi, ses propositions, ses amendements, son parcours, sa participation."],
  ["Les sénateurs", "/senateurs/", "Chaque sénateur : votes, travaux, parcours."],
  ["Les eurodéputés français", "/eurodeputes/", "Les députés européens élus en France et leurs votes au Parlement européen."],
  ["Le gouvernement et l'exécutif", "/executif/", "Le président de la République, le Premier ministre, les ministres et leurs ministères."],
  ["Le budget de l'État (PLF 2027)", "/executif/plf/", "Le projet de loi de finances pour 2027 décrypté, comparé aux budgets 2024, 2025 et 2026."],
  ["Politique locale", "/local/", "Communes, départements, régions : élus locaux, budgets et fiscalité."],
  ["Présidentielle 2027", "/presidentielles-2027/", "Les candidats, leurs programmes comparés enjeu par enjeu, les sondages et la campagne."],
  ["Promesses tenues ou non", "/promesses/", "Le suivi des engagements de campagne."],
  ["Calendrier parlementaire", "/calendrier/", "Les séances, votes et échéances à venir."],
  ["Lexique de la politique", "/vocabulaire/", "Les mots des institutions expliqués simplement, de « 49.3 » à « navette parlementaire »."],
  ["Comparateur de parlementaires", "/comparateur-parlementaires/", "Comparer deux élus vote par vote."],
  ["Questions fréquentes", "/faq/", "D'où viennent les données, neutralité du site, abonnements."],
];

/** Version courte : présentation, sources, rubriques. */
export function llmsCourt(): string {
  return [
    PRESENTATION,
    "## Rubriques",
    ...RUBRIQUES.map(([t, c, d]) => `- [${t}](${SITE}${c}): ${d}`),
    "## Fiches détaillées",
    `- [Liste complète des fiches (lois, élus, partis, ministres)](${SITE}/llms-full.txt): toutes les pages de référence du site, avec leur adresse.`,
    `- [Plan du site](${SITE}/sitemap.xml)`,
    "## Optional",
    `- [Abonnements Premium et Pro](${SITE}/premium/): analyses détaillées des lois, alertes par e-mail, suivi des commissions.`,
    `- [Mentions légales](${SITE}/mentions-legales/)`,
    "",
  ].join("\n\n").replace(/\n\n- /g, "\n- ");
}

/** Version complète : en plus, chaque fiche de référence avec son adresse et une ligne d'explication. */
export async function llmsComplet(): Promise<string> {
  const [lois, titres, impacts, resumes, deputes, senateurs, partis, ministres] = await Promise.all([
    tout<any>((de, a) => supabase.from("legislative_dossiers").select("id, title, short_title, status_label, latest_step_at")
      .not("status_code", "in", "(committee,filed)").order("latest_step_at", { ascending: false, nullsFirst: false }).range(de, a)),
    tout<any>((de, a) => supabase.from("dossier_display_title").select("dossier_id, display_title").range(de, a)),
    tout<any>((de, a) => supabase.from("law_citizen_impact").select("dossier_id, impact").range(de, a)),
    tout<any>((de, a) => supabase.from("legislative_analyses").select("dossier_id, summary").eq("audience", "public").range(de, a)),
    tout<any>((de, a) => supabase.from("deputies").select("slug, first_name, last_name, party, department, constituency_number, sitting").order("last_name").range(de, a)),
    tout<any>((de, a) => supabase.from("senators").select("slug, first_name, last_name, party, senate_group, department, sitting").order("last_name").range(de, a)),
    tout<any>((de, a) => supabase.from("political_parties").select("slug, name, abbrev, leader, orientation").range(de, a)),
    tout<any>((de, a) => supabase.from("minister_profiles").select("slug, full_name, title, ministry_name").range(de, a)),
  ]);
  const titreDe = new Map(titres.map(t => [t.dossier_id, t.display_title]));
  const impactDe = new Map(impacts.map(t => [t.dossier_id, t.impact]));
  // À défaut de « ce qui change pour vous », le résumé public du texte (une ou deux phrases).
  for (const r of resumes) if (!impactDe.has(r.dossier_id) && typeof r.summary === "string") impactDe.set(r.dossier_id, r.summary);
  const partisPublies = new Set(PARTY_SLUGS);

  const sections: string[] = [llmsCourt().trim()];
  sections.push(`## Lois et textes au Parlement (${lois.length})\n\nChaque page présente le texte en clair, ce qu'il change, son parcours au Parlement et ses sources officielles.\n` +
    lois.map(l => {
      const titre = ligne(titreDe.get(l.id) || l.short_title || l.title || "Texte de loi");
      const etat = [l.status_label, dateFr(l.latest_step_at)].filter(Boolean).join(", ");
      // Les résumés sont écrits en Markdown (« **En bref** … », intertitres, puces) : texte brut ici.
      const brut = String(impactDe.get(l.id) ?? "").replace(/^\s*(\*\*)?\s*En bref\s*(\*\*)?\s*:?\s*/i, "").replace(/^#+\s.*$/gm, " ").replace(/[*_`#>]/g, "").replace(/^\s*-\s+/gm, "");
      const resume = enBref(brut, 220);
      return `- [${titre}](${SITE}/lois/texte/${l.id}/)${etat ? ` (${etat})` : ""}${resume ? `: ${ligne(resume)}` : ""}`;
    }).join("\n"));
  const dep = deputes.filter(d => d.slug && d.sitting !== false);
  sections.push(`## Députés en fonction (${dep.length})\n\n` + dep.map(d =>
    `- [${d.first_name} ${d.last_name}](${SITE}/deputes/${d.slug}/): ${[d.party, d.department ? `${d.department}${d.constituency_number ? `, ${d.constituency_number}e circonscription` : ""}` : null].filter(Boolean).join(" · ")}`).join("\n"));
  const sen = senateurs.filter(s => s.slug && s.sitting !== false);
  sections.push(`## Sénateurs en fonction (${sen.length})\n\n` + sen.map(s =>
    `- [${s.first_name} ${s.last_name}](${SITE}/senateurs/${s.slug}/): ${[s.senate_group || s.party, s.department].filter(Boolean).join(" · ")}`).join("\n"));
  const par = partis.filter(p => partisPublies.has(p.slug));
  sections.push(`## Partis politiques (${par.length})\n\n` + par.map(p =>
    `- [${p.name}${p.abbrev && p.abbrev !== p.name ? ` (${p.abbrev})` : ""}](${SITE}/partis/${p.slug}/): ${[p.orientation, p.leader ? `dirigé par ${p.leader}` : null].filter(Boolean).join(", ")}`).join("\n"));
  sections.push(`## Gouvernement et anciens Premiers ministres (${ministres.length})\n\n` + ministres.filter(m => m.slug).map(m =>
    `- [${m.full_name}](${SITE}/executif/ministre/${m.slug}/): ${ligne(m.title || m.ministry_name || "")}`).join("\n"));
  return sections.join("\n\n") + "\n";
}
