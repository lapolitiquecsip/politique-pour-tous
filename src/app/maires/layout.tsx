import type { Metadata } from "next";

// La page de cette rubrique est un composant client : son titre et sa description
// (lus par les moteurs de recherche et les aperçus de liens) sont posés ici.
export const metadata: Metadata = {
  // « absolute » + « template » : sans gabarit ici, les pages filles (ex. /lois/texte/…)
  // perdaient le nom du site dans leur titre.
  title: { absolute: "Les maires de France | La politique, c'est simple", template: "%s | La politique, c'est simple" },
  description: "Les 34 000 maires de France : qui dirige votre commune, depuis quand, avec quelle étiquette.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
