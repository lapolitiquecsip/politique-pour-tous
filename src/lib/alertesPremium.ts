import { INTEREST_DOMAINS } from "@/lib/data/interestDomains";

/**
 * Les règles du moteur d'alertes Premium, pour montrer dans le guide d'accueil ce qu'un profil
 * aurait reçu. COPIE de generate-interest-notifications.ts et interest-domains.ts (backend) :
 * à tenir synchronisée.
 */
const PROFESSION_INTERESTS: Record<string, string[]> = {
  etudiant: ["education", "emploi"], salarie_prive: ["emploi", "economie"],
  fonctionnaire: ["institutions", "emploi"], independant: ["economie", "emploi"],
  demandeur: ["emploi", "social"], retraite: ["retraites", "sante"],
};
const AGE_INTERESTS: Record<string, string[]> = {
  "-18": ["education"], "18-24": ["education", "emploi"], "65+": ["retraites", "sante"],
};
const IMPORTANCE_PAR_TYPE: Record<string, number> = {
  loi: 5, decision: 4, decret: 4, budget: 4, mesure: 4, projet: 3, actualite: 3, annonce: 3,
  lancement: 3, equipement: 3, bilan: 3, travaux: 2, evenement: 2, conseil_municipal: 2, nomination: 2,
};

const ACTE_INDIVIDUEL = /^(?:r[ée]int[ée]gration|admission|radiation|nomination|promotion|(?:renouvellement de )?d[ée]tachement|naturalisation|titularisation|d[ée]l[ée]gation|cessation|mise [àa] disposition|maintien|affectation|inscription|tableau d'avancement|habilitation|agr[ée]ment|changement de nom|fin de fonctions|composition|francisation|rapportant|modificatif de d[ée]crets portant naturalisation|repr[ée]sentation|publication d(?:e|es)\b|le d[ée]cret portant reconnaissance)\b|\s-\s(?:M\.|Mme|MM\.|Mmes)\s|\(acc[èe]s prot[ée]g[ée]\)/i;

/** Le Journal officiel publie surtout des actes qui ne concernent qu'une personne ou un corps : jamais d'alerte. */
export const acteIndividuel = (titre: string) => ACTE_INDIVIDUEL.test((titre || "").trim());

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const importanceDe = (type: string | null) => IMPORTANCE_PAR_TYPE[String(type || "").toLowerCase()] ?? 3;

/** Les sujets cochés, plus ceux que la profession et l'âge impliquent. */
export function sujetsDuProfil(sujets: string[], profession: string, age: string): string[] {
  return [...new Set([...sujets, ...(PROFESSION_INTERESTS[profession] || []), ...(AGE_INTERESTS[age] || [])])];
}

/** Les libellés des sujets du membre que ce titre touche, par recherche de mots-clés. */
export function sujetsTouches(titre: string, sujets: string[]): string[] {
  // « Sécurité sociale » n'est pas le sujet « sécurité ».
  const t = norm(titre.replace(/s[ée]curit[ée] sociale/gi, "protection sociale"));
  return INTEREST_DOMAINS
    .filter(d => sujets.includes(d.code) && d.keywords.some(k => t.includes(norm(k))))
    .map(d => d.label);
}
