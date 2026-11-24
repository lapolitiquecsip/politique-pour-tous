import { api } from "@/lib/api";
import Link from "next/link";
import SenatorClient from "./SenatorClient";
import { Metadata } from "next";
import { senateurParSlug, extrait } from "@/lib/seo-donnees";
import DonneesStructurees from "@/components/seo/DonneesStructurees";
import { filAriane, personnePolitique } from "@/lib/geo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const senator: any = await senateurParSlug(slug);
  if (!senator) return { title: "Fiche introuvable" };
  const nom = `${senator.first_name} ${senator.last_name}`;
  const description = extrait(senator.bio)
    || `${nom} (Sénat${senator.department ? `, ${senator.department}` : ""}${senator.senate_group ? `, ${senator.senate_group}` : ""}) : votes, propositions de loi et parcours.`;
  return {
    title: `${nom} — Sénat${senator.department ? `, ${senator.department}` : ""}`,
    description,
    alternates: { canonical: `/senateurs/${slug}/` },
    openGraph: { title: nom, description, type: "profile", ...(senator.photo_url ? { images: [senator.photo_url] } : {}) },
  };
}

export default async function SenatorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const senator = await senateurParSlug(slug);

  if (!senator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Sénateur non trouvé</h1>{" "}
        <Link href="/deputes" className="text-blue-700 dark:text-blue-400 underline">Retour à la recherche</Link>
      </div>
    );
  }

  const s: any = senator;
  const nom = `${s.first_name} ${s.last_name}`;
  return (
    <>
      {/* Données structurées (GEO) : qui est cette personne, pour les moteurs de recherche et génératifs. */}
      <DonneesStructurees donnees={[
        personnePolitique({
          nom, chemin: `/senateurs/${slug}/`,
          fonction: s.sitting === false ? "Ancien membre du Sénat" : "Membre du Sénat (sénatrice ou sénateur)",
          description: extrait(s.bio, 600) || extrait(s.biography, 600) || undefined, image: s.photo_url, parti: s.senate_group || s.party,
          lieu: s.department, source: s.senate_url || s.source_url, liens: [s.twitter, s.facebook, s.website], maj: s.updated_at,
        }),
        filAriane([["Accueil", "/"], ["Sénat", "/senateurs/"], [nom, `/senateurs/${slug}/`]]),
      ]} />
      <SenatorClient senator={senator} />
    </>
  );
}

export async function generateStaticParams() {
  try {
    const senators = await api.getSenators();
    const params = senators.map((s: any) => ({ slug: s.slug }));
    return params.length ? params : [{ slug: "indisponible" }];
  } catch (error) {
    console.error("Error generating static params for senators:", error);
    return [{ slug: "indisponible" }];
  }
}
