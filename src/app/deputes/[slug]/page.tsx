import { api } from "@/lib/api";
import UnifiedPersonClient from "@/components/shared/UnifiedPersonClient";

export async function generateStaticParams() {
  try {
    const deputies = await api.getDeputies();
    const params = deputies.map((d: any) => ({ slug: d.slug }));
    return params.length ? params : [{ slug: "indisponible" }];
  } catch (error) {
    console.error("Error generating static params for deputies:", error);
    return [{ slug: "indisponible" }];
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <UnifiedPersonClient entryType="deputy" slug={slug} />;
}
