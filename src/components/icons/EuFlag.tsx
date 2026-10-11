// Drapeau de l'Union européenne (12 étoiles d'or en cercle sur fond bleu).
// Interface compatible lucide ({ size, className }) pour l'usage dans la barre de navigation.
export default function EuFlag({ size = 16, className = "" }: { size?: number; className?: string }) {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    // Arrondi à 3 décimales : sans lui, Node et le navigateur ne calculent pas exactement le même
    // cosinus (8.749999999999996 contre 8.75) et React signale un écart d'hydratation à chaque page.
    const r3 = (n: number) => Math.round(n * 1000) / 1000;
    return [r3(12 + 6.5 * Math.cos(a)), r3(12 + 6.5 * Math.sin(a))] as const;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#003399" />
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.15} fill="#FFCC00" />
      ))}
    </svg>
  );
}
