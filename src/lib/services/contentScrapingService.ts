import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import Anthropic from '@anthropic-ai/sdk';

// --- Configuration ---
// On instanciera Supabase et Anthropic à l'intérieur des fonctions pour s'assurer que les variables d'environnement sont chargées.


// --- Sources RSS officielles & vérifiées ---
const RSS_SOURCES = [
  {
    url: 'https://news.google.com/news/rss/headlines/section/topic/POLITICS?hl=fr&gl=FR&ceid=FR:fr',
    institution: 'média',
    source_name: 'Google News (Agrégateur)',
  },
  {
    url: 'https://www.lemonde.fr/politique/rss_full.xml',
    institution: 'média',
    source_name: 'Le Monde',
  },
  {
    url: 'https://www.challenges.fr/rss.xml',
    institution: 'média',
    source_name: 'Challenges',
  },
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
          content: `Tu es un rédacteur en chef d'un média politique français strictement factuel.
Voici une large liste d'articles récents (issus de Google News, Le Monde, Challenges, l'Assemblée et le Sénat).

TA MISSION ABSOLUE :
1. Regroupe les articles par sujet politique.
2. ÉLIMINE IMPITOYABLEMENT :
   - Tous les articles d'opinion, éditoriaux ou tribunes.
   - Les "portraits", "biographies" ou résumés de carrière (ex: "En 8 ans, Gabriel Attal a enchaîné les postes..."). CELA N'APPORTE AUCUNE VALEUR.
   - Les polémiques stériles ou les "petites phrases".
3. SELECTIONNE UNIQUEMENT les faits majeurs à HAUTE VALEUR AJOUTÉE :
   - Nouvelles lois, projets de lois et votes
   - Décisions économiques et annonces gouvernementales concrètes
   - Chiffres clés officiels de la semaine (déficit, chômage, budget)
   - Résultats d'enquêtes officielles (justice, déontologie, etc.)
   Maximum 8 sujets. Si tu n'as rien de concret et de chiffré, ne crée pas de sujet.
4. Pour chaque sujet sélectionné, TU DOIS FAIRE UNE SYNTHÈSE de CE QUE DISENT PLUSIEURS JOURNAUX (au moins 2 si possible). 
5. Si un chiffre important ou une donnée factuelle est disponible, tu dois l'inclure.

IMPORTANT :
- Aucun parti pris, aucune opinion. 100% FACTUEL.
- L'institution doit être 'média' si ça vient de la presse, ou 'assemblée' / 'sénat'.
- Dans "source_name", liste les VRAIS journaux mentionnés dans les textes (ex: "Le Monde, Challenges, Mediapart"). Déduis-les de la description ou du titre si possible.

Réponds UNIQUEMENT en JSON, sous cette forme (un tableau) :
[
  {
    "titre_simplifie": "Titre ultra-factuel (max 80 car, ex: 'Le déficit public atteint 5.5% en 2025')",
    "resume_flash": "Synthèse très dense avec valeur ajoutée (chiffres, faits concrets). Interdit de faire des biographies ou phrases creuses. (max 200 car)",
    "source_name": "Liste des journaux croisés (ex: 'Le Monde, Challenges, Libération')",
    "source_url": "L'URL de la source la plus pertinente",
    "institution": "média",
    "date_publication": "La date (format ISO)"
  }
]

Voici l'agrégation web :

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
