/**
 * Données structurées (JSON-LD, schema.org), écrites DANS le HTML construit.
 *
 * C'est ce que lisent les moteurs de recherche et les moteurs génératifs (Google AI Overviews,
 * ChatGPT, Perplexity, Claude…) pour comprendre qui est une personne, ce qu'est un parti, une loi,
 * une question/réponse — et pour citer la page comme source (24/11/2026, optimisation GEO).
 *
 * Composant serveur : rien ne s'exécute dans le navigateur. « < » est échappé pour qu'aucune
 * donnée ne puisse fermer la balise <script>.
 */
export default function DonneesStructurees({ donnees }: { donnees: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(donnees, (_, v) => (v === null || v === "" ? undefined : v))
    .replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
