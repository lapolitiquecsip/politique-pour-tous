import type { Metadata } from "next";
import { cache } from "react";
import PartyClient from "./PartyClient";
import { PARTY_SLUGS } from "@/lib/data/partySlugs";
import { api } from "@/lib/api";
import DonneesStructurees from "@/components/seo/DonneesStructurees";
import { SITE, ID_ORGANISATION, ID_SITE, enBref, filAriane } from "@/lib/geo";

// Liste des fiches de partis : src/lib/data/partySlugs.ts (partagée avec le plan du site).

export function generateStaticParams() {
  return PARTY_SLUGS.map((slug) => ({ slug }));
}

const partiParSlug = cache(async (slug: string) => {
  try { return (await api.getPartyBySlug(slug)) as any; } catch { return null; }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await partiParSlug(slug);
  if (!p) return { title: "Fiche d'un parti politique" };
  const nom = `${p.name}${p.abbrev && p.abbrev !== p.name ? ` (${p.abbrev})` : ""}`;
  const description = enBref(p.summary, 158)
    || `${nom} : orientation, dirigeants, élus, financement public et votes du groupe au Parlement.`;
  return {
    title: `${nom} : élus, votes, financement`,
    description,
    alternates: { canonical: `/partis/${slug}/` },
    openGraph: { title: nom, description, ...(p.logo_url ? { images: [p.logo_url] } : {}) },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await partiParSlug(slug);
  const url = `${SITE}/partis/${slug}/`;
  return (
    <>
      {/* Données structurées (GEO) : le parti, ses dirigeants, ses chiffres publics et leurs sources. */}
      {p && (
        <DonneesStructurees donnees={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${url}#page`,
            url,
            name: `${p.name} — fiche du parti`,
            inLanguage: "fr-FR",
            isPartOf: { "@id": ID_SITE },
            publisher: { "@id": ID_ORGANISATION },
            ...(p.updated_at ? { dateModified: p.updated_at } : {}),
            mainEntity: {
              "@type": "PoliticalParty",
              "@id": `${url}#parti`,
              name: p.name,
              ...(p.abbrev ? { alternateName: p.abbrev } : {}),
              ...(p.summary ? { description: enBref(p.summary, 600) } : {}),
              ...(p.logo_url ? { logo: p.logo_url } : {}),
              ...(p.founded ? { foundingDate: String(p.founded) } : {}),
              ...(p.leader ? { leader: { "@type": "Person", name: p.leader } } : {}),
              ...(p.headquarters ? { location: { "@type": "Place", name: p.headquarters } } : {}),
              ...(p.ideology?.length ? { keywords: p.ideology.join(", ") } : {}),
              sameAs: [p.source_url, p.website, p.twitter, p.facebook, p.instagram, p.youtube, p.tiktok].filter((x: unknown): x is string => typeof x === "string" && /^https?:\/\//.test(x)),
            },
          },
          filAriane([["Accueil", "/"], ["Partis politiques", "/deputes/"], [p.name, `/partis/${slug}/`]]),
        ]} />
      )}
      <PartyClient params={params} initialParty={p} />
    </>
  );
}
