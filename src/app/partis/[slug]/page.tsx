// Génère les pages de fiches partis au build (une par force politique).
import { api } from "@/lib/api";
import PartyClient from "./PartyClient";

// Ne pas réutiliser le Data Cache Next au build (évite qu'une ancienne réponse
// vide de political_parties, mise en cache CI, empêche la génération des pages).
export const fetchCache = "force-no-store";

export async function generateStaticParams() {
  try {
    const parties = await api.getParties();
    const params = parties.map((p: any) => ({ slug: p.slug }));
    return params.length ? params : [{ slug: "indisponible" }];
  } catch (error) {
    console.error("Error generating static params for parties:", error);
    return [{ slug: "indisponible" }];
  }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PartyClient params={params} />;
}
