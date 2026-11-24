import type { Metadata } from "next";
import { cache } from "react";
import { api } from "@/lib/api";
import PresidentFicheClient from "./PresidentFicheClient";
import DonneesStructurees from "@/components/seo/DonneesStructurees";
import { enBref, filAriane, personnePolitique } from "@/lib/geo";

export const dynamic = "force-static";

// Slugs connus (toujours présents) + tout autre président en base. Garantit que les routes
// existent en export statique même si la table n'est pas encore peuplée au moment du build.
const KNOWN = ["emmanuel-macron", "francois-hollande", "nicolas-sarkozy"];
export async function generateStaticParams() {
  try {
    const list = await api.getPresidents();
    const slugs = new Set<string>(KNOWN);
    for (const p of (list as any[])) if (p.slug) slugs.add(p.slug);
    return [...slugs].map(slug => ({ slug }));
  } catch {
    return KNOWN.map(slug => ({ slug }));
  }
}

const presidentParSlug = cache(async (slug: string) => {
  try { return (await api.getPresidentBySlug(slug)) as any; } catch { return null; }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await presidentParSlug(slug);
  if (!p) return { title: "Présidents de la Ve République" };
  const description = enBref(p.summary, 158) || `${p.full_name}, président de la République${p.term ? ` (${p.term})` : ""} : parcours et bilan.`;
  return {
    title: `${p.full_name} — président de la République${p.term ? ` (${p.term})` : ""}`,
    description,
    alternates: { canonical: `/presidents/${slug}/` },
    openGraph: { title: p.full_name, description, type: "profile", ...(p.photo_url ? { images: [p.photo_url] } : {}) },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await presidentParSlug(slug);
  return (
    <>
      {p && (
        <DonneesStructurees donnees={[
          personnePolitique({
            nom: p.full_name, chemin: `/presidents/${slug}/`, fonction: `Président de la République française${p.term ? ` (${p.term})` : ""}`,
            description: enBref(p.summary, 600) || undefined, image: p.photo_url, parti: p.party, source: p.source_url, maj: p.updated_at,
          }),
          filAriane([["Accueil", "/"], ["Exécutif", "/executif/"], [p.full_name, `/presidents/${slug}/`]]),
        ]} />
      )}
      <PresidentFicheClient params={params} initial={p} />
    </>
  );
}
