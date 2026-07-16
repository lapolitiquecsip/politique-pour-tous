import { api } from "@/lib/api";
import MinisterFicheClient from "./MinisterFicheClient";

// Évite qu'une réponse vide mise en cache au build empêche la génération des pages.
export const fetchCache = "force-no-store";

const slugify = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function generateStaticParams() {
  try {
    const gov = await api.getGovernment();
    const members = Array.isArray(gov) ? gov : (gov?.members || []);
    const params = members
      .map((m: any) => ({ slug: slugify(`${m.first_name || ""} ${m.last_name || ""}`.trim()) }))
      .filter((p: any) => p.slug);
    return params.length ? params : [{ slug: "indisponible" }];
  } catch {
    return [{ slug: "indisponible" }];
  }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <MinisterFicheClient params={params} />;
}
