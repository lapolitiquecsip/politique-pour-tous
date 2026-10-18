import PartyClient from "./PartyClient";
import { PARTY_SLUGS } from "@/lib/data/partySlugs";

// Liste des fiches de partis : src/lib/data/partySlugs.ts (partagée avec le plan du site).


export function generateStaticParams() {
  return PARTY_SLUGS.map((slug) => ({ slug }));
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PartyClient params={params} />;
}
