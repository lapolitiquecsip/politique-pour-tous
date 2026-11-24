import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const PRIVE = ["/admin/", "/dashboard/", "/login/", "/auth/", "/success/", "/cancel/", "/desabonnement/", "/retour/"];

/**
 * Robots des moteurs génératifs, nommés un par un et explicitement autorisés (24/11/2026, GEO) :
 * certains hébergeurs et pare-feu les bloquent par défaut, et une règle nominative lève le doute.
 * Les robots de recherche (OAI-SearchBot, Claude-SearchBot, PerplexityBot…) font citer le site
 * dans les réponses ; ceux d'entraînement (GPTBot, ClaudeBot, Google-Extended…) font connaître
 * ses données publiques — décision de l'éditeur : tout ce qui est public leur est ouvert.
 */
const IA = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "GoogleOther", "Applebot", "Applebot-Extended",
  "Bingbot", "MistralAI-User", "Meta-ExternalAgent", "Meta-ExternalFetcher",
  "DuckAssistBot", "YouBot", "CCBot", "cohere-ai", "Amazonbot",
];

/** robots.txt : tout est ouvert aux moteurs, sauf les pages personnelles et de passage. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVE },
      { userAgent: IA, allow: "/", disallow: PRIVE },
    ],
    sitemap: "https://lapolitiquecestsimple.fr/sitemap.xml",
    host: "https://lapolitiquecestsimple.fr",
  };
}
