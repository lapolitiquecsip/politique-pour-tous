/**
 * Miniature Wikimedia d'une photo, à la taille où on l'affiche.
 *
 * Les fiches (candidats, élus) pointent souvent sur l'ORIGINAL du fichier Commons : jusqu'à
 * 17 Mo pour une photo affichée en 171 px (page Présidentielles, 67 Mo pour 23 portraits).
 * Wikimedia ne sert que des largeurs standard — 120, 250, 330, 500 px… (400 ou 640 : HTTP 400).
 * `px` = largeur affichée en pixels CSS ; on vise ~2× pour les écrans haute densité.
 *
 * Adresse DIRECTE (30/10/2026) : « Special:FilePath/X.jpg?width=… » coûte deux redirections
 * (commons → Special:Redirect → thumb), soit ~3 s sur la fiche d'un député avant même le
 * premier octet de l'image. Le chemin de la miniature se déduit du nom du fichier
 * (upload.wikimedia.org/…/thumb/a/ab/X.jpg/330px-X.jpg, « a/ab » = début du MD5 du nom).
 */
const LARGEURS = [120, 250, 330, 500, 960];

export function vignetteWikimedia(url: string | null | undefined, px = 120): string | null {
  if (!url) return null;
  const voulu = Math.min(px * 2, 960);
  const std = LARGEURS.find(l => l >= voulu) ?? 960;
  // https://commons.wikimedia.org/wiki/Special:FilePath/Fichier.jpg?width=600
  const fp = url.match(/^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/);
  if (fp) {
    let nom: string;
    try { nom = decodeURIComponent(fp[1]).replace(/ /g, "_"); } catch { return `${url.split("?")[0]}?width=${std}`; }
    nom = nom.charAt(0).toUpperCase() + nom.slice(1);
    // Autres formats (tif, svg, pdf…) : miniatures au nom particulier, on garde la redirection.
    if (!/\.(jpe?g|png|gif)$/i.test(nom)) return `${url.split("?")[0]}?width=${std}`;
    const h = md5(nom);
    const enc = encodeURIComponent(nom);
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${enc}/${std}px-${enc}`;
  }
  // Miniature déjà calculée, d'un autre wiki (logos de partis : …/fr/thumb/…/langfr-960px-X.svg.png).
  const t = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[a-z-]+\/thumb\/.+\/(?:lang[a-z-]+-)?)\d+(px-[^/]+)$/);
  if (t) return `${t[1]}${std}${t[2]}`;
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)/);
  if (!m || /\.svg$/i.test(m[4])) return url;
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${m[4]}/${std}px-${m[4]}`;
}

/** MD5 (hexadécimal) d'une chaîne, sur ses octets UTF-8 — seulement pour le chemin ci-dessus. */
function md5(texte: string): string {
  const o = new TextEncoder().encode(texte);
  const n = ((o.length + 8) >> 6) + 1;
  const m = new Uint32Array(n * 16);
  for (let i = 0; i < o.length; i++) m[i >> 2] |= o[i] << ((i % 4) * 8);
  m[o.length >> 2] |= 0x80 << ((o.length % 4) * 8);
  m[n * 16 - 2] = o.length * 8;
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let j = 0; j < n * 16; j += 16) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      const r = i >> 4;
      const f = r === 0 ? (b & c) | (~b & d) : r === 1 ? (d & b) | (~d & c) : r === 2 ? b ^ c ^ d : c ^ (b | ~d);
      const g = r === 0 ? i : r === 1 ? (5 * i + 1) % 16 : r === 2 ? (3 * i + 5) % 16 : (7 * i) % 16;
      const t = d; d = c; c = b;
      const x = (a + f + K[i] + m[j + g]) | 0, s = S[r * 4 + (i % 4)];
      b = (b + ((x << s) | (x >>> (32 - s)))) | 0;
      a = t;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  return [a0, b0, c0, d0].map(v => Array.from({ length: 4 }, (_, k) => ((v >>> (k * 8)) & 255).toString(16).padStart(2, "0")).join("")).join("");
}
