import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** robots.txt : tout est ouvert aux moteurs, sauf les pages personnelles et de passage. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/login/", "/auth/", "/success/", "/cancel/", "/desabonnement/", "/retour/"],
    }],
    sitemap: "https://lapolitiquecestsimple.fr/sitemap.xml",
    host: "https://lapolitiquecestsimple.fr",
  };
}
