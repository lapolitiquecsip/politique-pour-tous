import { INSTITUTION_GUIDES } from "@/lib/institutions-data";
import InstitutionGuidePageClient from "./InstitutionClient";

export function generateStaticParams() {
  return Object.keys(INSTITUTION_GUIDES).map((slug) => ({ slug }));
}

export default function Page() {
  return <InstitutionGuidePageClient />;
}
