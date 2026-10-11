// « Ce texte vous concerne » : les règles de rapprochement entre un texte et un profil.
//
// Copie fidèle de `raisons()` et `publicsDuMembre()` du moteur d'alertes (dépôt des mises à
// jour, src/scripts/automation/alertes-textes.ts), qui reste la référence : c'est lui qui
// décide des e-mails. Cette copie ne sert qu'à MONTRER au membre, pendant qu'il règle son
// profil, les textes récents qui lui auraient été signalés — pour qu'il voie tout de suite
// l'effet de ses réponses. Toute évolution des règles côté moteur doit être reportée ici.

export type ProfilAlerte = {
  profession?: string | null; age_range?: string | null; logement?: string | null;
  enfants?: string | null; secteur?: string | null; interests?: string[] | null;
  department?: string | null;
};

export type TexteAnalyse = {
  id: number; source: string; titre: string; explication: string | null; extrait: string | null;
  importance: number; publics: string[]; secteurs: string[]; domaines: string[];
  territoire: string; date_texte: string | null; url: string | null;
};

const PUBLICS_DU_STATUT: Record<string, string[]> = {
  etudiant: ["etudiants", "jeunes"], salarie_prive: ["salaries"], fonctionnaire: ["fonctionnaires", "salaries"],
  independant: ["independants", "chefs_entreprise"], demandeur: ["demandeurs_emploi"], retraite: ["retraites", "seniors"],
};

const LIBELLE_PUBLIC: Record<string, string> = {
  salaries: "les salariés", fonctionnaires: "les agents publics", independants: "les indépendants",
  chefs_entreprise: "les chefs d'entreprise", agriculteurs: "les agriculteurs", demandeurs_emploi: "les demandeurs d'emploi",
  retraites: "les retraités", etudiants: "les étudiants", jeunes: "les jeunes", seniors: "les seniors", parents: "les parents",
  locataires: "les locataires", proprietaires: "les propriétaires", automobilistes: "les automobilistes",
};

export function publicsDuMembre(p: ProfilAlerte): string[] {
  const s = new Set<string>();
  for (const x of PUBLICS_DU_STATUT[p.profession ?? ""] ?? []) s.add(x);
  if (p.age_range === "-18" || p.age_range === "18-24") s.add("jeunes");
  if (p.age_range === "65+") s.add("seniors");
  if (p.logement === "locataire") s.add("locataires");
  if (p.logement === "proprietaire") s.add("proprietaires");
  if (p.enfants && p.enfants !== "aucun") s.add("parents");
  if (p.secteur === "agriculture") s.add("agriculteurs");
  return [...s];
}

/** Pourquoi ce texte concerne ce profil (liste vide : il ne le concerne pas assez). */
export function raisons(t: TexteAnalyse, p: ProfilAlerte): string[] {
  // Un texte qui ne vise qu'un territoire n'est montré ici que si le département du profil
  // est donné par son code ; le moteur, lui, sait aussi partir de la ville.
  if (t.territoire !== "national") {
    const dept = String(p.department ?? "").trim().toLowerCase();
    const dom = ["971", "972", "973", "974", "976"].includes(dept);
    if (t.territoire === "outre-mer" ? !dom : t.territoire !== dept) return [];
  }
  const out: string[] = [];
  const communs = (t.publics ?? []).filter(x => publicsDuMembre(p).includes(x));
  if ((t.publics ?? []).includes("tous") && t.importance >= 4) out.push("il concerne tout le monde");
  else if (communs.length && t.importance >= 3) out.push(`il concerne ${communs.map(x => LIBELLE_PUBLIC[x] ?? x).join(", ")}`);
  if (p.secteur && (t.secteurs ?? []).includes(p.secteur) && t.importance >= 3) out.push("il touche votre secteur d'activité");
  if (t.importance >= 4 && (p.interests ?? []).some(d => (t.domaines ?? []).includes(d))) out.push("il porte sur un sujet que vous suivez");
  if (t.territoire !== "national") out.push("il vise votre territoire");
  return out;
}
