import { api } from "@/lib/api";
import MepClient from "./MepClient";

export const dynamic = "force-static";

export async function generateStaticParams() {
  try {
    const meps = await api.getMeps();
    return (meps as any[]).filter(m => m.slug).map(m => ({ slug: m.slug }));
  } catch {
    return [];
  }
}

export default async function MepPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mep = await api.getMepBySlug(slug);
  if (!mep) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-staatliches uppercase">Eurodéputé introuvable</h1>
      </div>
    );
  }
  const votes = await api.getMepVotes(String(mep.id), 15);
  return <MepClient mep={mep} initialVotes={votes as any[]} />;
}
