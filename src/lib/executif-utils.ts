// Nettoie les noms de ministères issus de l'open data (espaces manquants, virgules collées,
// apostrophes typographiques) et met une majuscule initiale.
export function cleanMinistryName(name: string | null | undefined): string {
  if (!name) return "";
  const s = name
    .replace(/’/g, "'")
    .replace(/,(?=\S)/g, ", ")             // virgule collée → ", "
    // mots collés observés dans la source (espace manquant avant la conjonction)
    .replace(/biodiversité *et\b/gi, "biodiversité et")
    .replace(/finances *et\b/gi, "finances et")
    .replace(/alimentaire *et\b/gi, "alimentaire et")
    .replace(/territoire *et\b/gi, "territoire et")
    .replace(/jeunesse *et\b/gi, "jeunesse et")
    .replace(/supérieur *de\b/gi, "supérieur, de")
    .replace(/\s+/g, " ")
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
