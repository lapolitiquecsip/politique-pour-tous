import GroupClient from "./GroupClient";
import { EP_GROUP_SLUGS } from "@/lib/data/epGroups";

// Les 9 groupes du Parlement européen (10e législature) — liste fixe et déterministe
// pour l'export statique. Le contenu est curé (epGroups.ts) ; la liste des élus français
// est chargée en direct depuis Supabase côté client.
export function generateStaticParams() {
  return EP_GROUP_SLUGS.map((slug) => ({ slug }));
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <GroupClient params={params} />;
}
