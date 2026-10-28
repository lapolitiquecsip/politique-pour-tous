/**
 * Miniature Wikimedia d'une photo, à la taille où on l'affiche.
 *
 * Les fiches (candidats, élus) pointent souvent sur l'ORIGINAL du fichier Commons : jusqu'à
 * 17 Mo pour une photo affichée en 171 px (page Présidentielles, 67 Mo pour 23 portraits).
 * Wikimedia ne sert que des largeurs standard — 120, 250, 330, 500 px… (400 ou 640 : HTTP 400).
 * `px` = largeur affichée en pixels CSS ; on vise ~2× pour les écrans haute densité.
 */
const LARGEURS = [120, 250, 330, 500, 960];

export function vignetteWikimedia(url: string | null | undefined, px = 120): string | null {
  if (!url) return null;
  const voulu = Math.min(px * 2, 960);
  const std = LARGEURS.find(l => l >= voulu) ?? 960;
  // https://commons.wikimedia.org/wiki/Special:FilePath/Fichier.jpg?width=600
  if (/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(url)) return `${url.split("?")[0]}?width=${std}`;
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)/);
  if (!m || /\.svg$/i.test(m[4])) return url;
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${m[4]}/${std}px-${m[4]}`;
}
