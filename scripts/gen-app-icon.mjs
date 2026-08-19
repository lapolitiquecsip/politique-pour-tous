import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

// Génère le jeu d'icônes de l'app à partir d'un SVG (dégradé rose/fuchsia + bâtiment institution
// + chevron), pour remplacer l'ancienne icône navy. Recrée l'icône « rose » du design.

const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FB5EA9"/><stop offset="0.55" stop-color="#E4268F"/><stop offset="1" stop-color="#C21FB2"/>
  </linearGradient>`;

// Contenu (chevron + bâtiment) centré sur un canevas 512.
const CONTENT = `
  <!-- chevron -->
  <path d="M 214 150 L 256 116 L 298 150" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- bâtiment (institution) -->
  <g transform="translate(150 196) scale(8.83)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 20 7 4 7" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
    <line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/>
    <line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/>
    <line x1="3" y1="21" x2="21" y2="21"/>
  </g>`;

// Variante arrondie (icônes classiques) et pleine (maskable = fond bord à bord, icône zone sûre).
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${GRAD}</defs>
  <rect x="0" y="0" width="512" height="512" rx="115" fill="url(#g)"/>${CONTENT}</svg>`;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${GRAD}</defs>
  <rect x="0" y="0" width="512" height="512" fill="url(#g)"/>${CONTENT}</svg>`;

const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });
const buf = s => Buffer.from(s);

async function png(svg, size, file) {
  await sharp(buf(svg)).resize(size, size).png().toFile(file);
  console.log("→", file, size + "px");
}

// Aperçu si preview, sinon écrit le jeu complet.
if (process.env.PREVIEW === "1") {
  await png(rounded, 512, "public/icons/_preview.png");
  console.log("Aperçu écrit : public/icons/_preview.png");
} else {
  await png(rounded, 192, `${OUT}/icon-192.png`);
  await png(rounded, 512, `${OUT}/icon-512.png`);
  await png(rounded, 180, `${OUT}/apple-touch-icon.png`);
  await png(maskable, 512, `${OUT}/icon-maskable-512.png`);
  // favicon.ico (48px PNG encapsulé) pour l'onglet navigateur.
  const p48 = await sharp(buf(rounded)).resize(48, 48).png().toBuffer();
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(48, 0); entry.writeUInt8(48, 1); entry.writeUInt8(0, 2); entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6); entry.writeUInt32LE(p48.length, 8); entry.writeUInt32LE(22, 12);
  writeFileSync("src/app/favicon.ico", Buffer.concat([header, entry, p48]));
  console.log("→ src/app/favicon.ico");
  // Favicon SVG net pour les navigateurs modernes (servi via public/).
  writeFileSync(`${OUT}/icon.svg`, rounded);
  console.log("→ public/icons/icon.svg");
}
