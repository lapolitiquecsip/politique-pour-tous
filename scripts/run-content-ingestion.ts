/**
 * Point d'entrée CRON : ingestion des actualités du fil d'accueil.
 *
 * Réutilise le service EXISTANT `scrapeAndUpdateContent()` (RSS officiels + presse →
 * résumés IA Anthropic → table `content`). Le service dé-duplique sur `source_url` :
 * relancer plus souvent NE crée AUCUN doublon et ne résume QUE les nouveaux articles.
 *
 * Objectif : combler le « trou de la journée ». L'ingestion historique tourne le soir/la nuit
 * (≈19h-06h Paris), donc en journée le fil affichait la veille. Ce cron ajoute des passages
 * le MATIN et le MIDI (voir .github/workflows/update-content.yml) pour du frais dès le matin.
 *
 * Exécuté en CI via `npx tsx scripts/run-content-ingestion.ts`.
 * Variables requises : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
 */
import { scrapeAndUpdateContent } from "../src/lib/services/contentScrapingService";

async function main() {
  console.log("=== Ingestion des actualités (fil d'accueil) ===");
  // Une clé d'IA suffit : la gratuite (Google AI Studio) d'abord, Claude en secours.
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
  if (!process.env.LLM_FREE_API_KEY && !process.env.ANTHROPIC_API_KEY) missing.push("LLM_FREE_API_KEY (ou ANTHROPIC_API_KEY)");
  if (missing.length) {
    console.error(`❌ Variables manquantes : ${missing.join(", ")}`);
    process.exit(1);
  }
  const result = await scrapeAndUpdateContent();
  console.log("Résultat :", JSON.stringify(result));
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
