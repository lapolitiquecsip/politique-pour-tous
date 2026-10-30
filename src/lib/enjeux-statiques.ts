import { api } from "@/lib/api";

/**
 * Enjeux des scrutins (lois et articles) : d'abord le fichier écrit à la construction du site
 * (app/donnees/enjeux-scrutins.json), puis la base pour les seuls scrutins récents — ceux
 * qui ont pu être étiquetés depuis. Repli complet sur la base si le fichier manque.
 */
type Fichier = { genere_le: string | null; enjeux: any[]; tags: Record<string, string[]> };

let fichier: Promise<Fichier | null> | null = null;
export const fichierEnjeux = () =>
  (fichier ??= fetch("/donnees/enjeux-scrutins.json").then(r => (r.ok ? r.json() : null)).catch(() => null));

/** `scrutins` : identifiant et date (AAAA-MM-JJ… ou horodatage) de chaque scrutin voté. */
export async function enjeuxDesScrutins(scrutins: { id: string | null | undefined; date: string | number | null | undefined }[]): Promise<{
  enjeux: any[]; tags: Record<string, string[]>; complement: Promise<Record<string, string[]>> | null;
}> {
  const ids = scrutins.map(x => x.id).filter(Boolean) as string[];
  const f = await fichierEnjeux();
  if (!f?.genere_le) return { enjeux: await api.getIssues(), tags: await api.getScrutinIssues(ids), complement: null };
  const tags: Record<string, string[]> = {};
  for (const id of ids) if (f.tags[id]) tags[id] = f.tags[id];
  // Étiquetage de la nuit et votes du jour : trois jours de marge avant la construction.
  const depuis = new Date(f.genere_le).getTime() - 3 * 864e5;
  const recents = scrutins.filter(x => x.id && (x.date == null || new Date(x.date).getTime() >= depuis)).map(x => x.id!);
  return { enjeux: f.enjeux.length ? f.enjeux : await api.getIssues(), tags, complement: recents.length ? api.getScrutinIssues(recents) : null };
}
