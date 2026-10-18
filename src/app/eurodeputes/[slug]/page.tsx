import { api } from "@/lib/api";
import type { Metadata } from "next";
import { eurodeputeParSlug, extrait } from "@/lib/seo-donnees";
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m: any = await eurodeputeParSlug(slug);
  if (!m) return { title: "Fiche introuvable" };
  const nom = m.full_name || `${m.first_name} ${m.last_name}`;
  const description = extrait(m.bio)
    || `${nom} (Parlement européen${m.ep_group ? `, ${m.ep_group}` : ""}${m.national_party ? `, ${m.national_party}` : ""}) : votes au Parlement européen et parcours.`;
  return {
    title: `${nom} — Parlement européen`,
    description,
    alternates: { canonical: `/eurodeputes/${slug}/` },
    openGraph: { title: nom, description, type: "profile", ...(m.photo_url ? { images: [m.photo_url] } : {}) },
  };
}

export default async function MepPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mep = await eurodeputeParSlug(slug);
  if (!mep) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-staatliches uppercase">Eurodéputé introuvable</h1>
      </div>
    );
  }
  const votes = await api.getMepVotes(String(mep.id), { limit: 20, onlyMain: true });
  return <MepClient mep={mep} initialVotes={votes as any[]} />;
}
