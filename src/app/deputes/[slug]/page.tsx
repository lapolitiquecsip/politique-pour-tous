import { api } from "@/lib/api";
import DeputyClient from "./DeputyClient";

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

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <DeputyClient params={params} />;
}
