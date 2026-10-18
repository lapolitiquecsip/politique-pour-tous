import type { Metadata } from "next";

// La page de cette rubrique est un composant client : son titre et sa description
// (lus par les moteurs de recherche et les aperçus de liens) sont posés ici.
export const metadata: Metadata = {
  // « absolute » + « template » : sans gabarit ici, les pages filles (ex. /lois/texte/…)
  // perdaient le nom du site dans leur titre.
  title: { absolute: "Présidentielle 2027 : candidats, programmes, sondages | La politique, c'est simple", template: "%s | La politique, c'est simple" },
  description: "Les candidats à l'élection présidentielle de 2027, leurs propositions comparées enjeu par enjeu, les sondages et les débats.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
