import type { Metadata } from "next";
import { api } from "@/lib/api";
import { deputeParSlug, extrait } from "@/lib/seo-donnees";
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d: any = await deputeParSlug(slug);
  if (!d) return { title: "Fiche d'un membre de l'Assemblée nationale" };
  const nom = `${d.first_name} ${d.last_name}`;
  // Pas de genre en base : formulations neutres (« Assemblée nationale » plutôt que « député »).
  const lieu = d.department ? `${d.department}${d.constituency_number ? `, ${d.constituency_number}e circonscription` : ""}` : "";
  const description = extrait(d.bio)
    || `${nom} (Assemblée nationale${lieu ? `, ${lieu}` : ""}${d.party ? `, ${d.party}` : ""}) : votes sur chaque loi, propositions et parcours.`;
  return {
    title: `${nom} — Assemblée nationale${lieu ? `, ${lieu}` : ""}`,
    description,
    alternates: { canonical: `/deputes/${slug}/` },
    openGraph: { title: nom, description, type: "profile", ...(d.photo_url ? { images: [d.photo_url] } : {}) },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // La fiche arrive remplie dans le HTML ; votes et lois se chargent ensuite dans le navigateur.
  const initialDeputy = await deputeParSlug(slug);
  return <DeputyClient params={params} initialDeputy={initialDeputy} />;
}
