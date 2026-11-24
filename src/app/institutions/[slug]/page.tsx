import type { Metadata } from "next";
import { INSTITUTION_GUIDES } from "@/lib/institutions-data";
import InstitutionGuidePageClient from "./InstitutionClient";
import DonneesStructurees from "@/components/seo/DonneesStructurees";
import { SITE, ID_ORGANISATION, ID_SITE, enBref, filAriane } from "@/lib/geo";

export function generateStaticParams() {
  return Object.keys(INSTITUTION_GUIDES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = INSTITUTION_GUIDES[slug];
  if (!g) return { title: "Les institutions françaises" };
  const description = enBref(g.role, 158);
  return {
    title: `${g.name} : rôle, pouvoirs, fonctionnement`,
    description,
    alternates: { canonical: `/institutions/${slug}/` },
    openGraph: { title: g.name, description },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = INSTITUTION_GUIDES[slug];
  const url = `${SITE}/institutions/${slug}/`;
  return (
    <>
      {/* Données structurées (GEO) : la page explique une institution ; ses pouvoirs en liste. */}
      {g && (
        <DonneesStructurees donnees={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${url}#article`,
            url,
            headline: `${g.name} : ${g.fullTitle}`,
            description: enBref(g.role, 300),
            inLanguage: "fr-FR",
            isPartOf: { "@id": ID_SITE },
            publisher: { "@id": ID_ORGANISATION },
            author: { "@id": ID_ORGANISATION },
            about: { "@type": "GovernmentOrganization", name: g.name, areaServed: { "@type": "Country", name: "France" } },
            articleBody: [g.role, g.history, ...g.keyPowers.map(k => `${k.title} : ${k.description}`), g.importance].join("\n\n"),
          },
          filAriane([["Accueil", "/"], ["Institutions", "/vocabulaire/"], [g.name, `/institutions/${slug}/`]]),
        ]} />
      )}
      <InstitutionGuidePageClient />
    </>
  );
}
