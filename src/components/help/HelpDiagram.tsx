// Mini-schémas pédagogiques affichés dans certaines étapes de la bulle d'aide.
// SVG légers, lisibles en clair/sombre (couleurs explicites).

function Box({ x, y, w, h, fill, stroke, children }: { x: number; y: number; w: number; h: number; fill: string; stroke: string; children: React.ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={800} fill="#fff">{children}</text>
    </g>
  );
}

// L'UE : la Commission propose, le Parlement et le Conseil co-décident.
function EuTriangle() {
  return (
    <svg viewBox="0 0 340 168" className="w-full">
      <defs>
        <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#64748b" /></marker>
      </defs>
      <Box x={110} y={8} w={120} h={34} fill="#003399" stroke="#00297a">Commission</Box>
      <text x={170} y={57} textAnchor="middle" fontSize={9} fontStyle="italic" fill="#64748b">propose la loi</text>
      <line x1={170} y1={42} x2={170} y2={70} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#ar)" />
      <rect x={120} y={70} width={100} height={26} rx={6} fill="#FFCC00" />
      <text x={170} y={83} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800} fill="#5b4a00">Loi européenne</text>
      <line x1={95} y1={132} x2={150} y2={97} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#ar)" />
      <line x1={245} y1={132} x2={190} y2={97} stroke="#64748b" strokeWidth={1.5} markerEnd="url(#ar)" />
      <Box x={20} y={132} w={130} h={30} fill="#2E5AAC" stroke="#264a8c">Parlement (élu)</Box>
      <Box x={190} y={132} w={130} h={30} fill="#5B9BD5" stroke="#4a86bd">Conseil (États)</Box>
      <text x={170} y={152} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#64748b">co-décision</text>
    </svg>
  );
}

// La navette parlementaire AN ↔ Sénat → accord → promulgation.
function Navette() {
  return (
    <svg viewBox="0 0 340 96" className="w-full">
      <defs>
        <marker id="ar2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" /></marker>
      </defs>
      <Box x={12} y={20} w={92} h={34} fill="#2563eb" stroke="#1d4ed8">Assemblée</Box>
      <Box x={124} y={20} w={92} h={34} fill="#e11d48" stroke="#be123c">Sénat</Box>
      <path d="M104,30 L124,30" stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#ar2)" />
      <path d="M124,44 L104,44" stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#ar2)" />
      <text x={114} y={70} textAnchor="middle" fontSize={8.5} fontStyle="italic" fill="#64748b">allers-retours</text>
      <path d="M216,37 L236,37" stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#ar2)" />
      <Box x={236} y={20} w={92} h={34} fill="#16a34a" stroke="#15803d">Promulgation</Box>
    </svg>
  );
}

// Présidentielle : 1er tour → 2 finalistes → 2ᵉ tour.
function DeuxTours() {
  return (
    <svg viewBox="0 0 340 92" className="w-full">
      <defs>
        <marker id="ar3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" /></marker>
      </defs>
      <Box x={10} y={30} w={96} h={34} fill="#6366f1" stroke="#4f46e5">1er tour</Box>
      <text x={58} y={20} textAnchor="middle" fontSize={8.5} fill="#64748b">tous les candidats</text>
      <path d="M106,47 L134,47" stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#ar3)" />
      <rect x={134} y={16} width={72} height={26} rx={6} fill="#e2e8f0" /><text x={170} y={29} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={800} fill="#334155">1ᵉʳ</text>
      <rect x={134} y={52} width={72} height={26} rx={6} fill="#e2e8f0" /><text x={170} y={65} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={800} fill="#334155">2ᵉ</text>
      <path d="M206,29 L228,42" stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#ar3)" />
      <path d="M206,65 L228,52" stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#ar3)" />
      <Box x={230} y={30} w={100} h={34} fill="#e11d48" stroke="#be123c">2ᵉ tour</Box>
    </svg>
  );
}

export default function HelpDiagram({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    "eu-triangle": <EuTriangle />,
    navette: <Navette />,
    "deux-tours": <DeuxTours />,
  };
  const el = map[name];
  if (!el) return null;
  return <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">{el}</div>;
}
