import PartyClient from "./PartyClient";

// Ensemble curé et stable des forces politiques → on génère les pages à partir de
// cette liste fixe (déterministe, sans dépendre d'un fetch DB au build). Le contenu
// de chaque fiche est chargé depuis Supabase côté client.
const PARTY_SLUGS = [
  "rassemblement-national",
  "renaissance",
  "la-france-insoumise",
  "parti-socialiste",
  "les-republicains",
  "les-ecologistes",
  "les-democrates",
  "horizons",
  "liot",
  "parti-communiste-francais",
  "union-des-droites",
  "union-centriste",
  "rdse",
  "les-independants",
  "non-inscrits",
];

export function generateStaticParams() {
  return PARTY_SLUGS.map((slug) => ({ slug }));
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PartyClient params={params} />;
}
