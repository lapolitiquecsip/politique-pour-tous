import { api } from "@/lib/api";
import PresidentFicheClient from "./PresidentFicheClient";

export const dynamic = "force-static";

// Slugs connus (toujours présents) + tout autre président en base. Garantit que les routes
// existent en export statique même si la table n'est pas encore peuplée au moment du build.
const KNOWN = ["emmanuel-macron", "francois-hollande", "nicolas-sarkozy"];
export async function generateStaticParams() {
  try {
    const list = await api.getPresidents();
    const slugs = new Set<string>(KNOWN);
    for (const p of (list as any[])) if (p.slug) slugs.add(p.slug);
    return [...slugs].map(slug => ({ slug }));
  } catch {
    return KNOWN.map(slug => ({ slug }));
  }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PresidentFicheClient params={params} />;
}
