/**
 * GEO (optimisation pour les moteurs génératifs) — briques communes, 24/11/2026.
 *
 * Les moteurs génératifs citent une page quand elle (1) est lisible sans JavaScript, (2) dit
 * clairement de quoi elle parle et d'où viennent ses chiffres, (3) se rattache à des entités
 * connues (personne, parti, loi) par des données structurées. Ces fonctions fabriquent les
 * données structurées schema.org des fiches du site.
 */
export const SITE = "https://lapolitiquecestsimple.fr";
export const NOM_SITE = "La politique, c'est simple";
export const ID_ORGANISATION = `${SITE}/#organisation`;
export const ID_SITE = `${SITE}/#site`;

/** Texte brut d'un champ (chaîne, ou objet bio versionné) ramené à quelques phrases. */
export function enBref(source: unknown, max = 320): string {
  const t = typeof source === "string" ? source : "";
  const propre = t.replace(/\s+/g, " ").trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const fin = Math.max(coupe.lastIndexOf(". "), coupe.lastIndexOf("! "), coupe.lastIndexOf("? "));
  return fin > 80 ? coupe.slice(0, fin + 1) : propre.slice(0, propre.indexOf(" ", max) > 0 ? propre.indexOf(" ", max) : max);
}

/** L'organisation éditrice et le site : servis sur toutes les pages (mise en page). */
export function organisationEtSite() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ID_ORGANISATION,
      name: NOM_SITE,
      alternateName: ["LPCS", "lapolitiquecestsimple.fr"],
      url: `${SITE}/`,
      logo: { "@type": "ImageObject", url: `${SITE}/icons/icon-512.png`, width: 512, height: 512 },
      description: "Média indépendant et non partisan qui explique la politique française à partir des sources officielles : lois et votes du Parlement, députés et sénateurs, budget de l'État, Journal officiel, élections.",
      areaServed: { "@type": "Country", name: "France" },
      inLanguage: "fr-FR",
      knowsAbout: ["Assemblée nationale", "Sénat", "lois françaises", "votes des députés", "budget de l'État", "élection présidentielle 2027", "institutions de la Ve République"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": ID_SITE,
      name: NOM_SITE,
      url: `${SITE}/`,
      inLanguage: "fr-FR",
      publisher: { "@id": ID_ORGANISATION },
    },
  ];
}

/** Fil d'Ariane : aide les moteurs à situer la page (Accueil › Assemblée › Nom). */
export function filAriane(etapes: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map(([nom, chemin], i) => ({ "@type": "ListItem", position: i + 1, name: nom, item: `${SITE}${chemin}` })),
  };
}

/** Une personne politique (député, sénateur, eurodéputé, ministre, président). */
export function personnePolitique(p: {
  nom: string; chemin: string; fonction: string; description?: string; image?: string | null;
  parti?: string | null; lieu?: string | null; source?: string | null; liens?: (string | null | undefined)[]; maj?: string | null;
}) {
  const url = `${SITE}${p.chemin}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#page`,
    url,
    name: `${p.nom} — ${p.fonction}`,
    inLanguage: "fr-FR",
    isPartOf: { "@id": ID_SITE },
    publisher: { "@id": ID_ORGANISATION },
    ...(p.maj ? { dateModified: p.maj } : {}),
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#personne`,
      name: p.nom,
      jobTitle: p.fonction,
      nationality: { "@type": "Country", name: "France" },
      ...(p.description ? { description: p.description } : {}),
      ...(p.image ? { image: p.image } : {}),
      ...(p.parti ? { affiliation: { "@type": "Organization", name: p.parti } } : {}),
      ...(p.lieu ? { workLocation: { "@type": "Place", name: p.lieu } } : {}),
      sameAs: [p.source, ...(p.liens || [])].filter((x): x is string => !!x && /^https?:\/\//.test(x)),
    },
  };
}
