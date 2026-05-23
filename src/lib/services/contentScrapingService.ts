import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import Anthropic from '@anthropic-ai/sdk';

// --- Configuration ---
// On instanciera Supabase et Anthropic à l'intérieur des fonctions pour s'assurer que les variables d'environnement sont chargées.


// --- Sources RSS officielles & vérifiées ---
const RSS_SOURCES = [
  {
    url: 'https://www.assemblee-nationale.fr/rss/communiques-de-presse.xml',
    institution: 'assemblée',
    source_name: 'Assemblée Nationale',
  },
  {
    url: 'https://www.senat.fr/rss/presse.rss',
    institution: 'sénat',
    source_name: 'Sénat — Presse',
  },
  {
    url: 'https://www.senat.fr/rss/textes.rss',
    institution: 'sénat',
    source_name: 'Sénat — Textes de loi',
  },
  {
    url: 'https://www.francetvinfo.fr/politique.rss',
    institution: 'média',
    source_name: 'France Info',
  },
  {
    url: 'https://www.lefigaro.fr/rss/figaro_politique.xml',
    institution: 'média',
    source_name: 'Le Figaro',
  },
];

// --- Types ---
interface RawArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  institution: string;
  source_name: string;
}

interface ProcessedArticle {
  institution: string;
  titre_simplifie: string;
  resume_flash: string;
  date_publication: string;
  source_url: string;
  source_name: string;
}

// --- Helpers ---

/**
 * Nettoie le HTML du texte (tags, entités, CDATA)
 */
function cleanHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[/gi, '')
    .replace(/\]\]>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse un flux RSS/Atom et extrait les articles
 */
function parseRSSFeed(xml: string, institution: string, source_name: string): RawArticle[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true,
  });

  try {
    const parsed = parser.parse(xml);

    // RSS 2.0 format
    let items = parsed?.rss?.channel?.item;
    // Atom format fallback
    if (!items) {
      items = parsed?.feed?.entry;
    }
    // RDF format fallback
    if (!items) {
      items = parsed?.['rdf:RDF']?.item;
    }

    if (!items) {
      console.warn(`[Scraper] Aucun article trouvé dans le flux ${source_name}`);
      return [];
    }

    // Normaliser en tableau
    if (!Array.isArray(items)) {
      items = [items];
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return items
      .map((item: any) => {
        const title = cleanHtml(item.title || item['media:title'] || '');
        const description = cleanHtml(
          item.description || item.summary || item['content:encoded'] || item.content?.['#text'] || ''
        );
        const link = typeof item.link === 'string' ? item.link : item.link?.['@_href'] || item.guid || '';
        const pubDate = item.pubDate || item.published || item['dc:date'] || item.updated || '';

        return { title, description, link, pubDate, institution, source_name };
      })
      .filter((a: RawArticle) => {
        // Filtrer les articles trop vieux (> 7 jours)
        if (!a.pubDate) return true; // Garder si pas de date
        try {
          const d = new Date(a.pubDate);
          return d >= sevenDaysAgo;
        } catch {
          return true;
        }
      })
      .filter((a: RawArticle) => a.title && a.link); // Filtrer les articles sans titre ou lien
  } catch (err) {
    console.error(`[Scraper] Erreur parsing RSS pour ${source_name}:`, err);
    return [];
  }
}

/**
 * Fetch un flux RSS avec timeout et retry
 */
async function fetchRSSFeed(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LaPolitique-Bot/1.0 (https://lapolitique.fr)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Scraper] HTTP ${response.status} pour ${url}`);
      return null;
    }

    return await response.text();
  } catch (err: any) {
    console.warn(`[Scraper] Erreur fetch ${url}:`, err.message);
    return null;
  }
}

/**
 * Utilise Claude pour simplifier les titres et créer des résumés flash
 */
async function processWithClaude(articles: RawArticle[]): Promise<ProcessedArticle[]> {
  if (articles.length === 0) return [];

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });

  // Traiter par lots de 15 pour éviter de surcharger le contexte
  const BATCH_SIZE = 15;
  const results: ProcessedArticle[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    const articlesForPrompt = batch.map((a, idx) => 
      `[ARTICLE ${idx + 1}]\nTitre original: ${a.title}\nDescription: ${a.description?.substring(0, 500) || 'Aucune description'}\nSource: ${a.source_name}\nInstitution: ${a.institution}`
    ).join('\n\n');

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Tu es un journaliste politique français expert. Pour chaque article ci-dessous, génère :
1. Un **titre simplifié** (max 80 caractères) : clair, accrocheur, compréhensible par un citoyen non-expert. Utilise un langage simple et direct.
2. Un **résumé flash** (max 200 caractères) : l'essentiel en une ou deux phrases percutantes. Doit donner envie de lire la source.

IMPORTANT :
- Reste factuel et neutre politiquement
- N'invente RIEN, base-toi uniquement sur le titre et la description fournis
- Si la description est vide ou incompréhensible, base-toi uniquement sur le titre

Réponds UNIQUEMENT en JSON, sous cette forme exacte (un tableau) :
[
  { "index": 1, "titre_simplifie": "...", "resume_flash": "..." },
  { "index": 2, "titre_simplifie": "...", "resume_flash": "..." }
]

Voici les articles :

${articlesForPrompt}`
          }
        ],
      });

      // Extract JSON from Claude's response
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Find JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`[Scraper/Claude] Impossible de parser la réponse JSON pour le lot ${i / BATCH_SIZE + 1}`);
        // Fallback: utiliser les titres/descriptions originaux
        for (const article of batch) {
          results.push({
            institution: article.institution,
            titre_simplifie: article.title.substring(0, 80),
            resume_flash: article.description?.substring(0, 200) || article.title,
            date_publication: normalizeDate(article.pubDate),
            source_url: article.link,
            source_name: article.source_name,
          });
        }
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; titre_simplifie: string; resume_flash: string }>;

      for (const item of parsed) {
        const originalArticle = batch[item.index - 1];
        if (!originalArticle) continue;

        results.push({
          institution: originalArticle.institution,
          titre_simplifie: item.titre_simplifie || originalArticle.title.substring(0, 80),
          resume_flash: item.resume_flash || originalArticle.description?.substring(0, 200) || originalArticle.title,
          date_publication: normalizeDate(originalArticle.pubDate),
          source_url: originalArticle.link,
          source_name: originalArticle.source_name,
        });
      }

      console.log(`[Scraper/Claude] ✅ Lot ${i / BATCH_SIZE + 1} traité : ${parsed.length} articles`);
    } catch (err: any) {
      console.error(`[Scraper/Claude] ❌ Erreur Claude pour le lot ${i / BATCH_SIZE + 1}:`, err.message);
      // Fallback: utiliser les données brutes
      for (const article of batch) {
        results.push({
          institution: article.institution,
          titre_simplifie: article.title.substring(0, 80),
          resume_flash: article.description?.substring(0, 200) || article.title,
          date_publication: normalizeDate(article.pubDate),
          source_url: article.link,
          source_name: article.source_name,
        });
      }
    }
  }

  return results;
}

/**
 * Normalise une date en ISO string
 */
function normalizeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Insère les articles dans Supabase avec déduplication sur source_url
 */
async function upsertArticles(articles: ProcessedArticle[]): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Scraper] Erreur: Variables d'environnement Supabase manquantes");
    return { inserted: 0, errors: articles.length };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  for (const article of articles) {
    try {
      // Vérifier si l'article existe déjà (par source_url)
      const { data: existing } = await supabase
        .from('content')
        .select('id')
        .eq('source_url', article.source_url)
        .maybeSingle();

      if (existing) {
        // Article déjà existant, skip
        continue;
      }

      const { error } = await supabase
        .from('content')
        .insert({
          institution: article.institution,
          titre_simplifie: article.titre_simplifie,
          resume_flash: article.resume_flash,
          date_publication: article.date_publication,
          source_url: article.source_url,
          source_name: article.source_name,
        });

      if (error) {
        // Si erreur de duplication, c'est OK
        if (error.code === '23505') continue;
        console.warn(`[Scraper] Erreur insert pour "${article.titre_simplifie}":`, error.message);
        errors++;
      } else {
        inserted++;
      }
    } catch (err: any) {
      console.warn(`[Scraper] Erreur inattendue insert:`, err.message);
      errors++;
    }
  }

  return { inserted, errors };
}

// --- MAIN EXPORT ---

/**
 * Fonction principale : scrape tous les flux RSS, traite avec Claude, insère dans Supabase
 */
export async function scrapeAndUpdateContent(): Promise<{
  success: boolean;
  totalFetched: number;
  totalProcessed: number;
  totalInserted: number;
  totalErrors: number;
  details: string[];
}> {
  const details: string[] = [];
  let totalFetched = 0;
  let allRawArticles: RawArticle[] = [];

  console.log('[Scraper] 🚀 Démarrage du scraping de l\'actualité politique...');

  // 1. Fetch tous les flux RSS en parallèle
  const feedPromises = RSS_SOURCES.map(async (source) => {
    console.log(`[Scraper] Fetching ${source.source_name}...`);
    const xml = await fetchRSSFeed(source.url);
    if (!xml) {
      details.push(`⚠️ ${source.source_name}: flux indisponible`);
      return [];
    }
    const articles = parseRSSFeed(xml, source.institution, source.source_name);
    details.push(`✅ ${source.source_name}: ${articles.length} articles trouvés`);
    return articles;
  });

  const feedResults = await Promise.all(feedPromises);
  for (const articles of feedResults) {
    allRawArticles = allRawArticles.concat(articles);
  }
  totalFetched = allRawArticles.length;
  console.log(`[Scraper] 📰 ${totalFetched} articles bruts récupérés au total`);

  if (totalFetched === 0) {
    return {
      success: true,
      totalFetched: 0,
      totalProcessed: 0,
      totalInserted: 0,
      totalErrors: 0,
      details,
    };
  }

  // 2. Déduplication par URL avant envoi à Claude (économiser des tokens)
  const uniqueByUrl = new Map<string, RawArticle>();
  for (const article of allRawArticles) {
    if (!uniqueByUrl.has(article.link)) {
      uniqueByUrl.set(article.link, article);
    }
  }
  const uniqueArticles = Array.from(uniqueByUrl.values());
  details.push(`📊 ${uniqueArticles.length} articles uniques (après déduplication URL)`);

  // 3. Traitement par Claude (simplification des titres + résumés flash)
  console.log(`[Scraper] 🤖 Envoi de ${uniqueArticles.length} articles à Claude pour traitement...`);
  const processedArticles = await processWithClaude(uniqueArticles);
  details.push(`🤖 Claude a traité ${processedArticles.length} articles`);

  // 4. Insertion dans Supabase
  console.log(`[Scraper] 💾 Insertion de ${processedArticles.length} articles dans Supabase...`);
  const { inserted, errors } = await upsertArticles(processedArticles);
  details.push(`💾 ${inserted} nouveaux articles insérés, ${errors} erreurs`);

  console.log(`[Scraper] ✅ Terminé ! ${inserted} nouveaux articles, ${errors} erreurs`);

  return {
    success: errors === 0,
    totalFetched,
    totalProcessed: processedArticles.length,
    totalInserted: inserted,
    totalErrors: errors,
    details,
  };
}
