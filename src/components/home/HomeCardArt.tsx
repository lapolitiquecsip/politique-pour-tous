// Illustrations SVG sur-mesure des 3 cartes d'accueil. Vectorielles (nettes à toute taille,
// légères), avec dégradés et profondeur, raccord avec la charte, et adaptées aux thèmes
// clair/sombre (fond en teintes translucides, formes en couleurs pleines de marque).

const PALETTE = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6"];

// Hémicycle de sièges — « Qui vote quoi ? »
function VoteArt() {
  const cx = 160, cy = 122;
  const dots: { x: number; y: number; c: string }[] = [];
  const rows = [50, 70, 90];
  rows.forEach((r, ri) => {
    const n = 9 + ri * 2;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI; // 180° → 360°
      dots.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), c: PALETTE[(i + ri) % PALETTE.length] });
    }
  });
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" role="img" aria-label="Hémicycle">
      <defs>
        <linearGradient id="vote-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.14" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" rx="18" fill="url(#vote-bg)" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="4.6" fill={d.c} opacity="0.92" />
      ))}
      {/* Badge « voté » (coche) posé sur l'hémicycle */}
      <g transform="translate(160 118)">
        <ellipse cx="0" cy="20" rx="26" ry="6" fill="#0f172a" opacity="0.10" />
        <circle cx="0" cy="0" r="19" fill="#3b82f6" />
        <circle cx="0" cy="0" r="19" fill="#fff" opacity="0.08" />
        <path d="M -8 1 L -2 8 L 9 -6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// Pièces + courbe ascendante — « L'argent public ? »
function MoneyArt() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" role="img" aria-label="Budget">
      <defs>
        <linearGradient id="money-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f59e0b" stopOpacity="0.16" />
          <stop offset="1" stopColor="#f43f5e" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="money-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f59e0b" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" rx="18" fill="url(#money-bg)" />
      {/* Aire + courbe budget */}
      <path d="M 28 108 C 70 96 96 104 130 78 C 165 52 200 66 250 34 L 292 34 L 292 122 L 28 122 Z" fill="url(#money-area)" />
      <path d="M 28 108 C 70 96 96 104 130 78 C 165 52 200 66 250 34 L 292 34" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      {/* Pile de pièces */}
      <g transform="translate(74 118)">
        <ellipse cx="0" cy="14" rx="34" ry="7" fill="#0f172a" opacity="0.10" />
        {[0, -13, -26].map((dy, i) => (
          <g key={i} transform={`translate(0 ${dy})`}>
            <ellipse cx="0" cy="6" rx="27" ry="9" fill="#d97706" />
            <rect x="-27" y="-1" width="54" height="7" fill="#f59e0b" />
            <ellipse cx="0" cy="-1" rx="27" ry="9" fill="#fbbf24" />
            <ellipse cx="0" cy="-1" rx="15" ry="5" fill="#f59e0b" opacity="0.5" />
          </g>
        ))}
      </g>
      {/* Badge € */}
      <g transform="translate(250 34)">
        <circle cx="0" cy="0" r="17" fill="#0f172a" />
        <text x="0" y="6" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fbbf24" fontFamily="Arial, sans-serif">€</text>
      </g>
    </svg>
  );
}

// Balance parole / actes — « Votre élu est sincère ? »
function SincereArt() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" role="img" aria-label="Sincérité">
      <defs>
        <linearGradient id="sinc-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" stopOpacity="0.15" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" rx="18" fill="url(#sinc-bg)" />
      {/* Bouclier translucide en fond */}
      <path d="M 160 26 L 196 40 V 74 C 196 100 180 116 160 124 C 140 116 124 100 124 74 V 40 Z" fill="#10b981" opacity="0.08" />
      {/* Mât + fléau de balance */}
      <rect x="157" y="40" width="6" height="78" rx="3" fill="#334155" />
      <circle cx="160" cy="44" r="6" fill="#334155" />
      <rect x="72" y="41" width="176" height="5" rx="2.5" fill="#334155" transform="rotate(-7 160 44)" />
      {/* Plateau gauche : PAROLE (bulle) */}
      <g transform="translate(90 74)">
        <line x1="0" y1="-26" x2="0" y2="-2" stroke="#94a3b8" strokeWidth="1.6" />
        <ellipse cx="0" cy="20" rx="24" ry="5" fill="#0f172a" opacity="0.08" />
        <path d="M -22 0 H 22 A 6 6 0 0 1 28 6 V 6 A 6 6 0 0 1 22 12 H -22 A 6 6 0 0 1 -28 6 V 6 A 6 6 0 0 1 -22 0 Z" fill="#8b5cf6" opacity="0.15" />
        <rect x="-26" y="-16" width="52" height="30" rx="9" fill="#8b5cf6" />
        <path d="M -6 14 L 2 14 L -4 22 Z" fill="#8b5cf6" />
        <circle cx="-10" cy="-1" r="2.6" fill="#fff" />
        <circle cx="0" cy="-1" r="2.6" fill="#fff" />
        <circle cx="10" cy="-1" r="2.6" fill="#fff" />
      </g>
      {/* Plateau droit : ACTE (coche / vote) */}
      <g transform="translate(230 62)">
        <line x1="0" y1="-24" x2="0" y2="-2" stroke="#94a3b8" strokeWidth="1.6" />
        <ellipse cx="0" cy="20" rx="24" ry="5" fill="#0f172a" opacity="0.08" />
        <rect x="-24" y="-14" width="48" height="30" rx="9" fill="#10b981" />
        <path d="M -10 1 L -3 9 L 10 -6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Socle */}
      <path d="M 146 122 H 174 L 178 130 H 142 Z" fill="#334155" />
    </svg>
  );
}

export default function HomeCardArt({ kind }: { kind: "vote" | "money" | "sincere" }) {
  if (kind === "vote") return <VoteArt />;
  if (kind === "money") return <MoneyArt />;
  return <SincereArt />;
}
