import type { Metadata } from "next";
import { cache } from "react";
import { api } from "@/lib/api";
import MinisterFicheClient from "./MinisterFicheClient";
import DonneesStructurees from "@/components/seo/DonneesStructurees";
import { enBref, filAriane, personnePolitique } from "@/lib/geo";

// Évite qu'une réponse vide mise en cache au build empêche la génération des pages.
export const fetchCache = "force-no-store";

const slugify = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function generateStaticParams() {
  try {
    // Toutes les fiches (membres du gouvernement + anciens Premiers ministres).
    const profiles = await api.getMinisters();
    const params = (profiles || []).map((m: any) => ({ slug: m.slug })).filter((p: any) => p.slug);
    if (params.length) return params;
    // Repli : dérive depuis le gouvernement courant.
    const gov = await api.getGovernment();
    const members = Array.isArray(gov) ? gov : (gov?.members || []);
    const fallback = members.map((m: any) => ({ slug: slugify(`${m.first_name || ""} ${m.last_name || ""}`.trim()) })).filter((p: any) => p.slug);
    return fallback.length ? fallback : [{ slug: "indisponible" }];
  } catch {
    return [{ slug: "indisponible" }];
  }
}

const ministreParSlug = cache(async (slug: string) => {
  try { return (await api.getMinisterBySlug(slug)) as any; } catch { return null; }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = await ministreParSlug(slug);
  if (!m) return { title: "Fiche d'un membre du gouvernement" };
  const fonction = m.title || m.ministry_name || "Membre du gouvernement";
  const description = enBref(m.summary, 158) || `${m.full_name}, ${fonction} : parcours, ministère, budget et décisions.`;
  return {
    title: `${m.full_name} — ${fonction}`,
    description,
    alternates: { canonical: `/executif/ministre/${slug}/` },
    openGraph: { title: m.full_name, description, type: "profile", ...(m.photo_url ? { images: [m.photo_url] } : {}) },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await ministreParSlug(slug);
  return (
    <>
      {/* Données structurées (GEO) : qui est cette personne, sa fonction, sa source. */}
      {m && (
        <DonneesStructurees donnees={[
          personnePolitique({
            nom: m.full_name, chemin: `/executif/ministre/${slug}/`, fonction: m.title || m.ministry_name || "Membre du gouvernement",
            description: enBref(m.summary, 600) || undefined, image: m.photo_url, lieu: "Gouvernement de la République française",
            source: m.source_url, maj: m.updated_at,
          }),
          filAriane([["Accueil", "/"], ["Exécutif", "/executif/"], [m.full_name, `/executif/ministre/${slug}/`]]),
        ]} />
      )}
      <MinisterFicheClient params={params} initial={m} />
    </>
  );
}
