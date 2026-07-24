import { api } from "@/lib/api";
import DeptPresidentClient from "./DeptPresidentClient";

export const dynamic = "force-static";

export async function generateStaticParams() {
  try {
    const pres = await api.getDepartmentPresidents();
    return (pres as any[]).filter(p => p.slug).map(p => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function DeptPresidentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pres = await api.getDepartmentPresidentBySlug(slug);
  if (!pres) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-staatliches uppercase">Président introuvable</h1>
      </div>
    );
  }
  return <DeptPresidentClient p={pres} />;
}
