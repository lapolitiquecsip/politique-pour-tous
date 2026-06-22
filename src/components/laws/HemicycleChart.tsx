"use client";

/**
 * HemicycleChart — Représentation simplifiée de l'hémicycle
 * Chaque groupe parlementaire est positionné de gauche à droite
 * et coloré selon son vote (POUR = vert, CONTRE = rouge, ABSTENTION = gris).
 */

interface GroupVote {
  name: string;
  seats: number;
  vote: "pour" | "contre" | "abstention";
}

// Données exemple des groupes — positionnés de gauche (LFI) à droite (RN)
const DEFAULT_GROUPS: GroupVote[] = [
  { name: "LFI-NFP", seats: 75, vote: "contre" },
  { name: "Écologiste", seats: 23, vote: "contre" },
  { name: "Socialistes", seats: 31, vote: "pour" },
  { name: "LIOT", seats: 22, vote: "pour" },
  { name: "EPR", seats: 99, vote: "pour" },
  { name: "MoDem", seats: 51, vote: "pour" },
  { name: "Horizons", seats: 30, vote: "pour" },
  { name: "Droite Rép.", seats: 47, vote: "contre" },
  { name: "RN", seats: 88, vote: "contre" },
];

const VOTE_COLORS = {
  pour: "#22c55e",
  contre: "#ef4444",
  abstention: "#9ca3af",
};

export default function HemicycleChart({ groups }: { groups?: GroupVote[] }) {
  const data = groups || DEFAULT_GROUPS;
  const totalSeats = data.reduce((sum, g) => sum + g.seats, 0);

  // Générer les points en demi-cercle
  const allSeats: { x: number; y: number; color: string; group: string }[] = [];
  const rows = 5;
  const centerX = 200;
  const centerY = 190;

  let seatIndex = 0;
  for (const group of data) {
    for (let s = 0; s < group.seats; s++) {
      const row = Math.floor(seatIndex / Math.ceil(totalSeats / rows));
      const seatsInRow = Math.ceil(totalSeats / rows);
      const posInRow = seatIndex % seatsInRow;
      const progress = posInRow / (seatsInRow - 1);
      const angle = Math.PI * (0.05 + progress * 0.9);
      const radius = 80 + row * 22;
      const x = centerX - Math.cos(angle) * radius;
      const y = centerY - Math.sin(angle) * radius;

      allSeats.push({
        x,
        y,
        color: VOTE_COLORS[group.vote],
        group: group.name,
      });
      seatIndex++;
    }
  }

  return (
    <div className="w-full">
      <svg viewBox="0 0 400 220" className="w-full max-w-lg mx-auto">
        {/* Sièges */}
        {allSeats.map((seat, i) => (
          <circle
            key={i}
            cx={seat.x}
            cy={seat.y}
            r={3.5}
            fill={seat.color}
            opacity={0.85}
          >
            <title>{seat.group}</title>
          </circle>
        ))}
        {/* Ligne de base de l'hémicycle */}
        <line x1="30" y1="195" x2="370" y2="195" stroke="#e2e8f0" strokeWidth="2" />
      </svg>

      {/* Légende */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Pour
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Contre
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> Abstention
        </span>
      </div>

      {/* Liste des groupes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5">
        {data.map((group) => (
          <div
            key={group.name}
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: VOTE_COLORS[group.vote] }}
            ></span>
            <span className="font-semibold text-slate-700 truncate">{group.name}</span>
            <span className="text-slate-400 ml-auto">{group.seats}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
