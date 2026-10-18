import type { Metadata } from "next";

// Page personnelle ou de passage : rien à indexer pour les moteurs de recherche.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
