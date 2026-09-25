/**
 * Les groupes politiques du Sénat : libellé lisible, couleur, place dans
 * l'hémicycle.
 *
 * Cette table servait à l'hémicycle seul ; la page du renouvellement s'en sert
 * désormais aussi pour colorer la carte des départements et le solde des
 * groupes. Deux copies auraient fini par diverger — un groupe rouge d'un côté,
 * bleu de l'autre, sur la même page.
 *
 * L'ordre suit la disposition traditionnelle de l'hémicycle, de la gauche vers
 * la droite ; il sert à ranger les barres et les légendes dans un ordre que le
 * lecteur reconnaît, plutôt que par effectif décroissant.
 */
export type SenateGroup = { label: string; color: string; order: number; slug?: string };

export const SENATE_GROUPS: Record<string, SenateGroup> = {
  "CRCE-K": { label: "CRCE-K", color: "#B01A2E", order: 0, slug: "parti-communiste-francais" },
  GEST: { label: "Écologiste", color: "#4CA85F", order: 1, slug: "les-ecologistes" },
  SER: { label: "Socialiste (SER)", color: "#E24E8B", order: 2, slug: "parti-socialiste" },
  RDSE: { label: "RDSE", color: "#E0A02E", order: 3, slug: "rdse" },
  RDPI: { label: "RDPI", color: "#8B5CF6", order: 4, slug: "renaissance" },
  UC: { label: "Union Centriste", color: "#F2960F", order: 5, slug: "union-centriste" },
  "Les Indépendants": { label: "Les Indépendants", color: "#5B9BD5", order: 6, slug: "les-independants" },
  "Les Républicains": { label: "Les Républicains", color: "#2E5AAC", order: 7, slug: "les-republicains" },
  NI: { label: "Non inscrits", color: "#8D949A", order: 9, slug: "non-inscrits" },
};

/** Groupe inconnu : gris neutre plutôt qu'une couleur prise au hasard. */
export const GROUPE_INCONNU: SenateGroup = { label: "Autre", color: "#8D949A", order: 8 };

export const groupeSenat = (code: string | null | undefined): SenateGroup =>
  (code && SENATE_GROUPS[code]) || { ...GROUPE_INCONNU, label: code || "Sans groupe" };
