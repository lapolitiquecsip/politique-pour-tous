import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DonneesStructurees from "@/components/seo/DonneesStructurees";
import { SITE, ID_ORGANISATION, ID_SITE, enBref, filAriane } from "@/lib/geo";

// La page de cette rubrique est un composant client : son titre et sa description
// (lus par les moteurs de recherche et les aperçus de liens) sont posés ici.
export const metadata: Metadata = {
  // « absolute » + « template » : sans gabarit ici, les pages filles (ex. /lois/texte/…)
  // perdaient le nom du site dans leur titre.
  title: { absolute: "Présidentielle 2027 : candidats, programmes, sondages | La politique, c'est simple", template: "%s | La politique, c'est simple" },
  description: "Les candidats à l'élection présidentielle de 2027, leurs propositions comparées enjeu par enjeu, les sondages et les débats.",
  alternates: { canonical: "/presidentielles-2027/" },
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateFr = (d?: string | null) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3] === 1 ? "1er" : +m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
};

type Candidat = { slug: string; full_name: string; party: string | null; declared_at: string | null; summary: string | null };

/**
 * La liste des candidats déclarés, construite avec le site et écrite dans le HTML (24/11/2026,
 * GEO) : la page interactive ne s'affiche qu'avec JavaScript, et « qui sont les candidats à la
 * présidentielle 2027 ? » est une question qu'on pose aux moteurs génératifs.
 */
async function candidatsDeclares(): Promise<Candidat[]> {
  try {
    const { data } = await supabase.from("presidential_candidates")
      .select("slug, full_name, party, declared_at, summary").eq("status", "declared").order("full_name");
    return (data ?? []) as Candidat[];
  } catch { return []; }
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const candidats = await candidatsDeclares();
  const url = `${SITE}/presidentielles-2027/`;
  return (
    <>
      {children}
      {candidats.length > 0 && (
        <>
          <DonneesStructurees donnees={[
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "@id": `${url}#page`,
              url,
              name: "Élection présidentielle 2027 : les candidats déclarés",
              inLanguage: "fr-FR",
              isPartOf: { "@id": ID_SITE },
              publisher: { "@id": ID_ORGANISATION },
              about: { "@type": "Event", name: "Élection présidentielle française de 2027", location: { "@type": "Country", name: "France" } },
              mainEntity: {
                "@type": "ItemList",
                name: "Candidats déclarés à l'élection présidentielle de 2027",
                numberOfItems: candidats.length,
                itemListElement: candidats.map((c, i) => ({
                  "@type": "ListItem", position: i + 1,
                  url: `${url}?candidat=${c.slug}`,
                  item: { "@type": "Person", name: c.full_name, ...(c.party ? { affiliation: { "@type": "Organization", name: c.party } } : {}), ...(c.summary ? { description: enBref(c.summary, 300) } : {}) },
                })),
              },
            },
            filAriane([["Accueil", "/"], ["Présidentielle 2027", "/presidentielles-2027/"]]),
          ]} />
          <section aria-labelledby="candidats-declares" className="border-t border-border bg-background px-4 py-12">
            <div className="mx-auto max-w-5xl">
              <h2 id="candidats-declares" className="font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground">
                Les {candidats.length} candidats déclarés à la présidentielle 2027
              </h2>
              <p className="mt-2 text-[13px] text-muted-foreground">Candidatures annoncées publiquement, par ordre alphabétique. Une candidature ne devient officielle qu&apos;après la validation des 500 parrainages par le Conseil constitutionnel.</p>
              <ul className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {candidats.map(c => (
                  <li key={c.slug} className="text-[14px] leading-snug text-slate-700 dark:text-slate-300">
                    <Link href={`/presidentielles-2027/?candidat=${c.slug}`} className="font-bold text-foreground hover:underline dark:text-white">{c.full_name}</Link>
                    {c.party ? ` — ${c.party}` : ""}
                    {c.declared_at ? <span className="text-muted-foreground">{` · candidature annoncée le ${dateFr(c.declared_at)}`}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </>
  );
}
