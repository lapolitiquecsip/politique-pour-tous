import { api } from "@/lib/api";
import UnifiedPersonClient from "@/components/shared/UnifiedPersonClient";

// Évite qu'une réponse vide mise en cache au build empêche la génération des pages.
export const fetchCache = "force-no-store";

const slugify = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function generateStaticParams() {
  try {
    // Toutes les fiches (membres du gouvernement + anciens Premiers ministres).
    const profiles = await api.getMinisters();
    const params = (profiles || []).map((m: any) => ({ slug: m.slug })).filter((p: any) => p.slug);
    if (params.length) return params;
    // Repli : dérive depuis le gouvernement courant.
    const gov = await api.getGovernment();
    const members = Array.isArray(gov) ? gov : (gov?.members || []);
    const fallback = members.map((m: any) => ({ slug: slugify(`${m.first_name || ""} ${m.last_name || ""}`.trim()) })).filter((p: any) => p.slug);
    return fallback.length ? fallback : [{ slug: "indisponible" }];
  } catch {
    return [{ slug: "indisponible" }];
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <UnifiedPersonClient entryType="minister" slug={slug} />;
}
