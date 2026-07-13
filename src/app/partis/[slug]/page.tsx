// Génère les pages de fiches partis au build (une par force politique).
import { api } from "@/lib/api";
import PartyClient from "./PartyClient";

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
