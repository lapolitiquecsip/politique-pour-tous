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
 * Utilise Claude pour regrouper les sujets, croiser les sources et créer des synthèses
 */
async function processWithClaude(articles: RawArticle[]): Promise<ProcessedArticle[]> {
  if (articles.length === 0) return [];

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });

  // Envoyer tous les articles pour avoir une vue d'ensemble et faire la synthèse
  const articlesForPrompt = articles.map((a, idx) => 
    `[ARTICLE ${idx + 1}]\nTitre original: ${a.title}\nDescription: ${a.description?.substring(0, 500) || 'Aucune description'}\nSource: ${a.source_name}\nInstitution: ${a.institution}\nURL: ${a.link}\nDate: ${a.pubDate || 'Inconnue'}`
  ).join('\n\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Tu es un journaliste politique français expert chargé de faire la synthèse de l'actualité. 
Voici une liste d'articles récents issus de différentes sources (médias, assemblée, sénat).

TA MISSION :
1. Analyse tous ces articles et regroupe ceux qui parlent du **même sujet**.
2. Pour chaque grand sujet politique abordé (sélectionne les plus pertinents, maximum 15 sujets), croise les sources : fais la synthèse de ce que disent les différents journaux/institutions.
3. Crée un résumé neutre et croisé.

IMPORTANT :
- Reste factuel, neutre politiquement, n'invente rien. Ne prends pas parti.
- Croise les sources : si Le Figaro et France Info parlent du même sujet, synthétise les deux visions dans ton résumé.
- L'institution doit être 'média' si c'est majoritairement tiré de la presse, ou 'assemblée' / 'sénat' si cela concerne uniquement un texte officiel. Si tu mélanges des sources, mets 'média'.

Réponds UNIQUEMENT en JSON, sous cette forme exacte (un tableau) :
[
  {
    "titre_simplifie": "Le titre clair du sujet (max 80 caractères)",
    "resume_flash": "Ta synthèse croisée du sujet en une ou deux phrases percutantes (max 200 caractères)",
    "source_name": "Noms des sources utilisées (ex: 'Le Figaro, France Info')",
    "source_url": "L'URL de la source principale (ou la première utilisée)",
    "institution": "média",
    "date_publication": "La date la plus récente parmi les articles du groupe (format ISO)"
  }
]

Voici les articles :

${articlesForPrompt}`
        }
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`[Scraper/Claude] Impossible de parser la réponse JSON de synthèse.`);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as ProcessedArticle[];
    
    // S'assurer que les dates sont bien au format ISO
    for (const item of parsed) {
      item.date_publication = normalizeDate(item.date_publication);
    }

    console.log(`[Scraper/Claude] ✅ Synthèse croisée terminée : ${parsed.length} sujets uniques identifiés.`);
    return parsed;
  } catch (err: any) {
    console.error(`[Scraper/Claude] ❌ Erreur Claude lors de la synthèse:`, err.message);
    return [];
  }
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
