import { FREE_LAWS } from "@/data/free-laws-dossiers";
import LawDetailPageClient from "./LawClient";

export function generateStaticParams() {
  return FREE_LAWS.map((l) => ({ id: l.id }));
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <LawDetailPageClient params={params} />;
}
