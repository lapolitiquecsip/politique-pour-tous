import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { PARTY_SLUGS } from "@/lib/data/partySlugs";
import { EP_GROUP_SLUGS } from "@/lib/data/epGroups";
import { INSTITUTION_GUIDES } from "@/lib/institutions-data";

/**
 * Plan du site (sitemap.xml), construit avec le site : la liste des pages que les moteurs
 * de recherche doivent connaître — rubriques, fiches d'élus et pages des lois. Une source
 * qui ne répond pas au moment de la construction est simplement omise.
 */
export const dynamic = "force-static";

const SITE = "https://lapolitiquecestsimple.fr";

const RUBRIQUES = [
  "", "lois", "deputes", "senateurs", "eurodeputes", "executif", "executif/plf", "local", "presidentielles-2027",
  "promesses", "calendrier", "vocabulaire", "comparateur-parlementaires", "faq", "premium",
  "mentions-legales", "cgu", "cgv", "confidentialite", "contact",
];

async function essai<T>(f: () => Promise<T[]>): Promise<T[]> {
  try { return (await f()) ?? []; } catch { return []; }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const page = (chemin: string, priority = 0.5, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") =>
    ({ url: `${SITE}/${chemin}${chemin ? "/" : ""}`, changeFrequency, priority });

  const [deputes, senateurs, eurodeputes, ministres, presidents, lois] = await Promise.all([
    essai(() => api.getDeputies() as Promise<any[]>),
    essai(() => api.getSenators() as Promise<any[]>),
    essai(() => api.getMeps() as Promise<any[]>),
    essai(() => api.getMinisters() as Promise<any[]>),
    essai(() => api.getPresidents() as Promise<any[]>),
    essai(async () => {
      const out: { id: string; latest_step_at: string | null }[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase.from("legislative_dossiers").select("id, latest_step_at")
          .not("status_code", "in", "(committee,filed)").order("id").range(de, de + 999);
        if (error) throw error;
        out.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return out;
    }),
  ]);

  return [
    ...RUBRIQUES.map(r => page(r, r === "" ? 1 : 0.8, "daily")),
    ...deputes.filter(d => d.slug).map(d => page(`deputes/${d.slug}`, 0.7)),
    ...senateurs.filter(s => s.slug).map(s => page(`senateurs/${s.slug}`, 0.7)),
    ...eurodeputes.filter(m => m.slug).map(m => page(`eurodeputes/${m.slug}`, 0.6)),
    ...ministres.filter(m => m.slug).map(m => page(`executif/ministre/${m.slug}`, 0.6)),
    ...presidents.filter(p => p.slug).map(p => page(`presidents/${p.slug}`, 0.5, "monthly")),
    ...PARTY_SLUGS.map(s => page(`partis/${s}`, 0.6)),
    ...EP_GROUP_SLUGS.map(s => page(`groupes-europeens/${s}`, 0.4, "monthly")),
    ...Object.keys(INSTITUTION_GUIDES).map(s => page(`institutions/${s}`, 0.5, "monthly")),
    ...lois.map(l => ({ ...page(`lois/texte/${l.id}`, 0.7), ...(l.latest_step_at ? { lastModified: l.latest_step_at } : {}) })),
  ];
}
