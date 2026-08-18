// Illustrations SVG sur-mesure des 3 cartes d'accueil. Vectorielles (nettes à toute taille,
// légères), avec dégradés, profondeur et animations douces (respectent prefers-reduced-motion
// via les classes .ha-* définies dans globals.css). Adaptées aux thèmes clair/sombre.

// Enveloppe de vote (bulletin) — corps blanc + rabat coloré, coche optionnelle.
function Envelope({ flap, check = false }: { flap: string; check?: boolean }) {
  return (
    <>
      <ellipse cx="0" cy="17" rx="20" ry="4" fill="#0f172a" opacity="0.10" />
      <rect x="-19" y="-12" width="38" height="24" rx="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.1" />
      <path d="M -19 -12 L 0 3 L 19 -12" fill={flap} opacity="0.18" />
      <path d="M -19 -12 L 0 3 L 19 -12" fill="none" stroke={flap} strokeWidth="1.5" strokeLinejoin="round" />
      {check && <path d="M -6 2 L -1 7 L 8 -4" fill="none" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
    </>
  );
}

// Urne + enveloppes — « Qui vote quoi ? »
function VoteArt() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" role="img" aria-label="Vote">
      <defs>
        <linearGradient id="vote-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.14" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" rx="18" fill="url(#vote-bg)" />
      {/* petits accents colorés (groupes) */}
      {[["#f43f5e", 40, 30], ["#f59e0b", 285, 40], ["#8b5cf6", 44, 74], ["#10b981", 280, 96]].map(([c, x, y], i) => (
        <circle key={i} cx={x as number} cy={y as number} r="4" fill={c as string} opacity="0.85" />
      ))}
      {/* Urne transparente + fente */}
      <g>
        <ellipse cx="160" cy="140" rx="52" ry="6" fill="#0f172a" opacity="0.10" />
        <rect x="120" y="98" width="80" height="42" rx="9" fill="#ffffff" opacity="0.5" />
        <rect x="120" y="98" width="80" height="42" rx="9" fill="none" stroke="#3b82f6" strokeWidth="1.6" opacity="0.7" />
        <rect x="144" y="93" width="32" height="7" rx="3.5" fill="#1d4ed8" />
      </g>
      {/* Enveloppes (bulletins) qui « votent » */}
      <g transform="translate(116 72) rotate(-13)"><g className="ha-float d1"><Envelope flap="#3b82f6" /></g></g>
      <g transform="translate(206 66) rotate(13)"><g className="ha-float d2"><Envelope flap="#10b981" check /></g></g>
      <g transform="translate(160 58) rotate(-3)"><g className="ha-float"><Envelope flap="#6366f1" /></g></g>
    </svg>
  );
}

// Pièces à 3 niveaux (commune / département / région) + courbe — « L'argent public ? »
function MoneyArt() {
  const stacks: { x: number; n: number; pin: string }[] = [
    { x: 74, n: 2, pin: "#3b82f6" },   // commune
    { x: 148, n: 3, pin: "#8b5cf6" },  // département
    { x: 222, n: 4, pin: "#f43f5e" },  // région
  ];
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" role="img" aria-label="Budget">
      <defs>
        <linearGradient id="money-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f59e0b" stopOpacity="0.16" />
          <stop offset="1" stopColor="#f43f5e" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" rx="18" fill="url(#money-bg)" />
      {/* Courbe budget qui se trace */}
      <path className="ha-draw" d="M 30 116 C 74 108 100 96 140 84 C 184 70 214 60 292 30" fill="none" stroke="#f59e0b" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      {/* 3 piles de pièces = 3 niveaux de collectivité */}
      {stacks.map((s, si) => (
        <g key={si} transform={`translate(${s.x} 126)`}>
          <ellipse cx="0" cy="6" rx="30" ry="6" fill="#0f172a" opacity="0.10" />
          {Array.from({ length: s.n }).map((_, i) => (
            <g key={i} transform={`translate(0 ${-i * 12})`}>
              <ellipse cx="0" cy="4" rx="24" ry="8" fill="#d97706" />
              <rect x="-24" y="-2" width="48" height="6" fill="#f59e0b" />
              <ellipse cx="0" cy="-2" rx="24" ry="8" fill="#fbbf24" />
              <ellipse cx="0" cy="-2" rx="13" ry="4.4" fill="#f59e0b" opacity="0.45" />
            </g>
          ))}
          {/* repère de niveau (commune / département / région) */}
          <circle cx="0" cy={-s.n * 12 - 6} r="4.5" fill={s.pin} />
        </g>
      ))}
      {/* Badge € */}
      <g transform="translate(268 30)"><g className="ha-float">
        <circle cx="0" cy="0" r="17" fill="#0f172a" />
        <text x="0" y="6" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fbbf24" fontFamily="Arial, sans-serif">€</text>
      </g></g>
    </svg>
  );
}

// Balance parole / actes (animée) — « Votre élu est sincère ? »
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
      <path d="M 160 26 L 196 40 V 74 C 196 100 180 116 160 124 C 140 116 124 100 124 74 V 40 Z" fill="#10b981" opacity="0.08" />
      {/* Mât + socle (fixes) */}
      <rect x="157" y="40" width="6" height="78" rx="3" fill="#334155" />
      <circle cx="160" cy="44" r="6" fill="#334155" />
      <path d="M 146 122 H 174 L 178 130 H 142 Z" fill="#334155" />
      {/* Fléau + plateaux (oscillent autour du pivot 160,44) */}
      <g className="ha-sway">
        <rect x="72" y="41" width="176" height="5" rx="2.5" fill="#334155" transform="rotate(-7 160 44)" />
        {/* Plateau gauche : PAROLE (bulle) */}
        <g transform="translate(90 74)">
          <line x1="0" y1="-26" x2="0" y2="-2" stroke="#94a3b8" strokeWidth="1.6" />
          <ellipse cx="0" cy="20" rx="24" ry="5" fill="#0f172a" opacity="0.08" />
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
      </g>
    </svg>
  );
}

export default function HomeCardArt({ kind }: { kind: "vote" | "money" | "sincere" }) {
  if (kind === "vote") return <VoteArt />;
  if (kind === "money") return <MoneyArt />;
  return <SincereArt />;
}
