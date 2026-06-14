import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import Anthropic from '@anthropic-ai/sdk';

// --- Configuration ---
// On instanciera Supabase et Anthropic à l'intérieur des fonctions pour s'assurer que les variables d'environnement sont chargées.


// --- Sources RSS officielles & vérifiées ---
const RSS_SOURCES = [
  // === TIER 1 — SOURCES OFFICIELLES (autoritaires, peuvent être seules) ===
  // { // ❌ [FAIL] 500 Internal Server Error (besoin solution avancée pour le MVP, on laisse commenté)
  //   url: 'https://www.insee.fr/fr/information/rss/4632381',
  //   institution: 'donnée_officielle',
  //   source_name: 'INSEE',
  //   tier: 1,
  // },
  {
    url: 'https://www.vie-publique.fr/actualites-feeds.xml', // ✅ URL corrigée
    institution: 'donnée_officielle',
    source_name: 'Vie-publique.fr',
    tier: 1,
  },
  {
    url: 'https://www.economie.gouv.fr/rss/toutesactualites', // ✅ Remplace gouvernement.fr
    institution: 'gouvernement',
    source_name: 'Ministère de l\'Économie',
    tier: 1,
  },
  // { // ❌ [FAIL] 404 Not Found (besoin solution avancée pour le MVP, on laisse commenté)
  //   url: 'https://www.ccomptes.fr/fr/rss.xml',
  //   institution: 'donnée_officielle',
  //   source_name: 'Cour des comptes',
  //   tier: 1,
  // },
  {
    url: 'https://www.assemblee-nationale.fr/dyn/rss/communiques-de-presse.xml', // ✅ Corrigé (chemin /dyn/)
    institution: 'assemblée',
    source_name: 'Assemblée Nationale',
    tier: 1,
  },
  {
    url: 'http://www2.assemblee-nationale.fr/feeds/detail/documents-parlementaires', // ✅ Nouveau et valide
    institution: 'assemblée',
    source_name: 'Assemblée Nationale (documents)',
    tier: 1,
  },
  {
    url: 'https://www.senat.fr/rss/presse.rss',
    institution: 'sénat',
    source_name: 'Sénat — Presse',
    tier: 1,
  },
  {
    url: 'https://www.senat.fr/rss/textes.rss',
    institution: 'sénat',
    source_name: 'Sénat — Textes de loi',
    tier: 1,
  },
  {
    url: 'https://www.elysee.fr/feed', // ✅ URL corrigée
    institution: 'gouvernement',
    source_name: 'Élysée',
    tier: 1,
  },

  // === TIER 2 — PRESSE DE RÉFÉRENCE ===
  {
    url: 'https://www.lemonde.fr/politique/rss_full.xml',
    institution: 'média',
    source_name: 'Le Monde',
    tier: 2,
  },

  {
    url: 'https://www.mediapart.fr/articles/feed',
    institution: 'média',
    source_name: 'Mediapart',
    tier: 2,
  },
  {
    url: 'https://www.liberation.fr/arc/outboundfeeds/rss-all/category/politique/',
    institution: 'média',
    source_name: 'Libération',
    tier: 2,
  },
  {
    url: 'https://www.la-croix.com/RSS/UNIVERS_WFRA',
    institution: 'média',
    source_name: 'La Croix',
    tier: 2,
  },
  {
    url: 'https://www.challenges.fr/rss.xml',
    institution: 'média',
    source_name: 'Challenges',
    tier: 2,
  },
  {
    url: 'https://www.alternatives-economiques.fr/rss.xml',
    institution: 'média',
    source_name: 'Alternatives Économiques',
    tier: 2,
  },

  // === TIER 3 — APPOINT (jamais seuls dans une carte) ===
  {
    url: 'https://www.francetvinfo.fr/politique.rss',
    institution: 'média',
    source_name: 'France Info',
    tier: 3,
  },
  {
    url: 'https://www.publicsenat.fr/feed/rss', // ✅ URL corrigée
    institution: 'média',
    source_name: 'Public Sénat',
    tier: 3,
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
  tier: number;
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
function parseRSSFeed(xml: string, institution: string, source_name: string, tier: number): RawArticle[] {
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

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 30); // 30 jours pour récupérer les actus manquantes

    return items
      .map((item: any) => {
        const title = cleanHtml(item.title || item['media:title'] || '');
        const description = cleanHtml(
          item.description || item.summary || item['content:encoded'] || item.content?.['#text'] || ''
        );
        const link = typeof item.link === 'string' ? item.link : item.link?.['@_href'] || item.guid || '';
        const pubDate = item.pubDate || item.published || item['dc:date'] || item.updated || '';

        return { title, description, link, pubDate, institution, source_name, tier };
      })
      .filter((a: RawArticle) => {
        // Filtrer les articles trop vieux (> 60 jours)
        if (!a.pubDate) return true; // Garder si pas de date
        try {
          const d = new Date(a.pubDate);
          return d >= limitDate;
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
 * Utilise Claude pour regrouper les sujets, croiser les sources et créer des synthèses en traitant par lots (chunks)
 */
async function processWithClaude(articles: RawArticle[]): Promise<ProcessedArticle[]> {
  if (articles.length === 0) return [];

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });

  const allProcessed: ProcessedArticle[] = [];
  const chunkSize = 40; // Traiter par lots de 40 articles pour éviter de saturer Claude et garantir un gros volume de fiches
  
  const chunks: RawArticle[][] = [];
  for (let i = 0; i < articles.length; i += chunkSize) {
    chunks.push(articles.slice(i, i + chunkSize));
  }
  
  console.log(`[Scraper/Claude] 🤖 Séparation en ${chunks.length} lots pour maximiser le nombre de fiches...`);

  for (let batchIndex = 0; batchIndex < chunks.length; batchIndex++) {
    const chunk = chunks[batchIndex];
    console.log(`[Scraper/Claude] Traitement du lot ${batchIndex + 1}/${chunks.length} (${chunk.length} articles)...`);

    const articlesForPrompt = chunk.map((a, i) => `
[Article ${i + 1}]
Source : ${a.source_name} (Tier ${a.tier}, ${a.institution})
Date : ${a.pubDate}
Titre : ${a.title}
Extrait : ${a.description?.slice(0, 400) || ''}
URL : ${a.link}
`).join('\n---\n');

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 4000,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: `Tu es rédacteur en chef d'un fil d'actualité politique française strictement factuel.
Ton seul rôle est de SÉLECTIONNER, pas d'écrire des commentaires.

============================================
RÈGLES DE REJET ABSOLU (refuse de créer une fiche si UNE SEULE s'applique)
============================================

REJET #1 — OPINION / JUGEMENT DE VALEUR
Si le titre OU le résumé contiendrait : "doit", "devrait", "il faut", "il est temps de",
"un défi majeur", "un enjeu crucial", "le grand retour de", "doit verdir", "doit accélérer"
→ REJET. Tu ne crées PAS la fiche.
Tu ne reformules pas pour contourner. Si le sujet de fond est "X devrait faire Y", c'est REJET.

REJET #2 — ABSENCE DE FAIT DUR
Chaque fiche DOIT contenir au moins UN de ces éléments dans le résumé :
- un chiffre précis (%, €, voix, sièges, milliards, points, etc.)
- un acte institutionnel daté (loi déposée, décret signé, vote, nomination, démission,
  condamnation, saisine, rapport publié, amendement, ordonnance, décision juridictionnelle)
Si tu n'as ni chiffre ni acte → REJET.

REJET #3 — INTERNATIONAL
Toute actualité étrangère, géopolitique, élection américaine, démission internationale → REJET.

REJET #4 — PORTRAIT / RÉTROSPECTIVE
"En 8 ans, X a enchaîné…", "le parcours de Y", biographies, bilans de carrière → REJET.

REJET #5 — PETITE PHRASE / CLASH
Polémiques entre politiques, "clash", "tacle", "tweet polémique", désaccord verbal sans
décision concrète → REJET.

============================================
RÈGLES DE SOURCES
============================================

SOURCES BANNIES (n'apparaissent JAMAIS dans source_name) :
CNews, Valeurs Actuelles, Causeur, Frontières, Sud Radio.
Si une info n'existe QUE dans ces médias → REJET du sujet.

DIVERSITÉ DES SOURCES :
- Minimum 2 sources DIFFÉRENTES par fiche.
- EXCEPTION : si la source est officielle (INSEE, Vie-publique, gouvernement.fr, Ministère de l'Économie, economie.gouv.fr,
  Cour des comptes, Assemblée Nationale, Sénat, Élysée, Légifrance, Conseil constitutionnel,
  Conseil d'État, Banque de France), elle peut être seule — c'est une source autoritaire.
- Si tu n'as qu'une seule source non officielle → REJET.

HIÉRARCHIE DES SOURCES (cite-les en priorité dans cet ordre) :
- Tier 1 (officielles) : INSEE, Vie-publique.fr, gouvernement.fr, Cour des comptes, Ministère de l'Économie,
  Assemblée Nationale, Sénat, Élysée, Légifrance, Banque de France.
- Tier 2 (presse de référence) : Le Monde, Les Echos, Mediapart, Libération, La Croix,
  Challenges, Alternatives Économiques, AFP, Contexte.
- Tier 3 (presse mainstream) : Le Figaro, Le Parisien, France Info, France Inter, Public Sénat.
Quand un sujet est couvert par un Tier 1, tu DOIS l'inclure dans source_name.

============================================
CONTRAT DE RÉDACTION
============================================

Pour chaque fiche retenue, produis EXACTEMENT ces champs en JSON :

- titre_simplifie (≤ 80 caractères)
- resume_flash (≤ 250 caractères)
  STRUCTURE OBLIGATOIRE : "Selon [Source1] et [Source2], [QUI] a [QUOI] le [QUAND], avec [CHIFFRE ou ACTE]."
- source_name : liste des médias réellement croisés, séparés par des virgules.
- source_url : URL la plus autoritaire disponible.
- institution : "média" | "assemblée" | "sénat" | "gouvernement" | "donnée_officielle".
- date_publication : ISO 8601.

============================================
QUANTITÉ - TRÈS IMPORTANT
============================================

EXTRAIS ABSOLUMENT TOUTES LES FICHES POSSIBLES qui respectent les filtres. 
Il n'y a PAS de limite maximale. Ne fais aucun remplissage avec des infos futiles, mais NE RATE AUCUN fait validé.
Génère autant de fiches que possible à partir de ce lot d'articles.

Réponds UNIQUEMENT par un tableau JSON valide, sans texte autour.

Voici le lot d'articles :

${articlesForPrompt}`
          }
        ],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ProcessedArticle[];
        for (const item of parsed) {
          item.date_publication = normalizeDate(item.date_publication);
          allProcessed.push(item);
        }
        console.log(`[Scraper/Claude] Lot ${batchIndex + 1} : ${parsed.length} fiches extraites.`);
      } else {
        console.warn(`[Scraper/Claude] Lot ${batchIndex + 1} : Impossible de parser la réponse JSON.`);
      }
    } catch (err: any) {
      console.error(`[Scraper/Claude] ❌ Erreur Claude sur le lot ${batchIndex + 1}:`, err.message);
    }
  }

  console.log(`[Scraper/Claude] ✅ Synthèse croisée terminée : ${allProcessed.length} sujets identifiés au total.`);
  return allProcessed;
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

      // Normalisation de l'institution pour respecter le check constraint de la BDD (uniquement: média, assemblée, sénat, gouvernement)
      let mappedInstitution = article.institution;
      if (mappedInstitution === 'donnée_officielle') {
        mappedInstitution = 'gouvernement';
      } else if (!['média', 'assemblée', 'sénat', 'gouvernement'].includes(mappedInstitution)) {
        mappedInstitution = 'gouvernement'; // fallback de sécurité
      }

      const { error } = await supabase
        .from('content')
        .insert({
          institution: mappedInstitution,
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

// === Filtre 1 : sources bannies ===
const BANNED_SOURCE_PATTERNS = [
  /cnews/i,
  /valeurs.?actuelles/i,
  /causeur/i,
  /\bfrontières\b/i,
  /sud.?radio/i,
];

// === Filtre 2 : marqueurs d'opinion / éditorial ===
const OPINION_RED_FLAGS = [
  /\bdoit\s+(verdir|s['']adapter|changer|repenser|accélérer|repartir|réinventer)/i,
  /\bdevrait\b/i,
  /\bdevraient\b/i,
  /\bil\s+faut\b/i,
  /\bil\s+est\s+temps\b/i,
  /\bun\s+défi\s+majeur\b/i,
  /\benjeu\s+(crucial|majeur)\b/i,
  /\ble\s+grand\s+retour\b/i,
  /\b(portrait|biographie)\b/i,
];

// === Filtre 3 : présence d'un fait dur ===
const HARD_FACT_NUMBER = /\d+([.,]\d+)?\s*(%|€|milliards?|millions?|points?|voix|sièges?|jours?|mois|ans)/i;
const HARD_FACT_ACT = /\b(loi|projet de loi|décret|arrêté|vote|adopté|rejeté|nomination|démission|condamné|condamnation|saisine|rapport|décision|amendement|motion|ordonnance)\b/i;

const OFFICIAL_SOURCES = [
  'insee', 'vie-publique', 'gouvernement.fr', 'cour des comptes',
  'assemblée nationale', 'sénat', 'élysée', 'légifrance',
  'conseil constitutionnel', 'conseil d\'état', 'banque de france',
  'économie', 'economie.gouv.fr', 'ministère de l\'économie',
];

function isOfficialSource(name: string): boolean {
  const lower = name.toLowerCase();
  return OFFICIAL_SOURCES.some(o => lower.includes(o));
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  cleanedCard?: ProcessedArticle;
}

function validateCard(card: ProcessedArticle): ValidationResult {
  // 1. Nettoyer les sources bannies de la liste
  const rawSources = card.source_name.split(',').map(s => s.trim()).filter(Boolean);
  const cleanedSources = rawSources.filter(
    s => !BANNED_SOURCE_PATTERNS.some(p => p.test(s))
  );
  
  if (cleanedSources.length === 0) {
    return { valid: false, reason: 'Toutes les sources sont bannies' };
  }

  // 2. Exigence multi-sources (sauf source officielle Tier 1)
  const hasOfficial = cleanedSources.some(isOfficialSource);
  if (cleanedSources.length < 2 && !hasOfficial) {
    return { valid: false, reason: `Source unique non officielle : ${cleanedSources[0]}` };
  }

  // 3. Détection d'opinion
  const text = `${card.titre_simplifie} ${card.resume_flash}`.toLowerCase();
  const opinionMatch = OPINION_RED_FLAGS.find(re => re.test(text));
  if (opinionMatch) {
    return { valid: false, reason: `Opinion détectée : ${opinionMatch.source}` };
  }

  // 4. Exigence d'au moins un fait dur (chiffre ou acte institutionnel)
  const hasNumber = HARD_FACT_NUMBER.test(card.resume_flash);
  const hasAct = HARD_FACT_ACT.test(card.resume_flash);
  if (!hasNumber && !hasAct) {
    return { valid: false, reason: 'Aucun chiffre ni acte institutionnel concret' };
  }

  // 5. Titre suffisamment factuel
  if (card.titre_simplifie.length < 25) {
    return { valid: false, reason: 'Titre trop court / non descriptif' };
  }

  return {
    valid: true,
    cleanedCard: { ...card, source_name: cleanedSources.join(', ') },
  };
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
    const articles = parseRSSFeed(xml, source.institution, source.source_name, source.tier);
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

  // 3. Filtrer les articles déjà existants dans la base de données (économie majeure de tokens Claude)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let articlesToProcess = uniqueArticles;

  if (supabaseUrl && supabaseKey && uniqueArticles.length > 0) {
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      const urlsToCheck = uniqueArticles.map(a => a.link);
      
      const existingUrls = new Set<string>();
      const batchSize = 100;
      for (let i = 0; i < urlsToCheck.length; i += batchSize) {
        const batch = urlsToCheck.slice(i, i + batchSize);
        const { data, error } = await supabaseClient
          .from('content')
          .select('source_url')
          .in('source_url', batch);
          
        if (!error && data) {
          data.forEach(row => existingUrls.add(row.source_url));
        }
      }
      
      articlesToProcess = uniqueArticles.filter(a => !existingUrls.has(a.link));
      details.push(`🎯 ${articlesToProcess.length} nouveaux articles à envoyer à Claude (après filtrage base de données)`);
    } catch (dbErr: any) {
      console.warn(`[Scraper] Erreur lors du pré-filtrage DB :`, dbErr.message);
    }
  }

  // LIMIT TO 300 ARTICLES PER RUN FOR VERCEL PRO
  if (articlesToProcess.length > 300) {
    console.log(`[Scraper] ⚠️ Trop d'articles (${articlesToProcess.length}), limitation à 300 pour éviter le timeout Vercel.`);
    articlesToProcess = articlesToProcess.slice(0, 300);
    details.push(`⚠️ Limité à 300 articles pour ce passage (les autres seront traités au prochain passage)`);
  }

  // 4. Traitement par Claude (simplification des titres + résumés flash)
  console.log(`[Scraper] 🤖 Envoi de ${articlesToProcess.length} articles à Claude pour traitement...`);
  const processedArticles = await processWithClaude(articlesToProcess);
  details.push(`🤖 Claude a généré ${processedArticles.length} cartes`);

  // --- FILTRAGE ET VALIDATION ---
  const validCards: ProcessedArticle[] = [];
  let rejectedCount = 0;
  for (const card of processedArticles) {
    const result = validateCard(card);
    if (result.valid && result.cleanedCard) {
      validCards.push(result.cleanedCard);
    } else {
      console.warn(`[REJET] "${card.titre_simplifie}" — ${result.reason}`);
      details.push(`❌ Rejet : "${card.titre_simplifie}" (${result.reason})`);
      rejectedCount++;
    }
  }
  
  if (rejectedCount > 0) {
    console.log(`[Scraper/Validation] 🛡️ ${rejectedCount} cartes rejetées par les filtres stricts.`);
  }

  // 4. Insertion dans Supabase
  console.log(`[Scraper] 💾 Insertion de ${validCards.length} articles validés dans Supabase...`);
  const { inserted, errors } = await upsertArticles(validCards);
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
