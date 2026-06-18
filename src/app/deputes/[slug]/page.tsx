import { api } from "@/lib/api";
import DeputyClient from "./DeputyClient";

export async function generateStaticParams() {
  try {
    const deputies = await api.getDeputies();
    return deputies.map((d: any) => ({ slug: d.slug }));
  } catch (error) {
    console.error("Error generating static params for deputies:", error);
    return [];
  }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <DeputyClient params={params} />;
}
