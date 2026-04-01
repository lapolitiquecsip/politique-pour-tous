import DeputyCard, { Deputy } from "./DeputyCard";

interface DeputyGridProps {
  deputies: Deputy[];
}

export default function DeputyGrid({ deputies }: DeputyGridProps) {
  if (deputies.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed">
        <p className="text-gray-500 text-lg">Aucun député trouvé pour cette recherche.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {deputies.map((deputy) => (
        <DeputyCard key={deputy.id} deputy={deputy} />
      ))}
    </div>
  );
}
