/**
 * Médias jamais repris comme source sur le site (décision éditoriale de l'éditeur, 08/11/2026).
 * Les collecteurs (backend) les écartent déjà et la base a été nettoyée ; ce filtre d'affichage
 * est le dernier rempart si une ligne passait quand même.
 *
 * Même liste côté backend : lapolitique-backend/src/lib/medias-bannis.ts — À TENIR IDENTIQUES.
 */
export const DOMAINES_BANNIS = ["valeursactuelles.com", "frontieresmedia.fr", "frontieres.media"];
const NOMS_BANNIS = /^\s*(valeurs\s+actuelles|fronti[eè]res(\s+m[eé]dia)?)\s*$/i;

/** Vrai si l'adresse ou le nom de média désigne un média banni. */
export function mediaBanni(...valeurs: (string | null | undefined)[]): boolean {
  for (const v of valeurs) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    if (NOMS_BANNIS.test(s)) return true;
    if (/valeursactuelles\.com|frontieresmedia\.fr|frontieres\.media/i.test(s)) return true;
  }
  return false;
}
