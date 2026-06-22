import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

// Initialiser Supabase et Claude
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Sources pour l'agenda
const SOURCES = {
  elysee: 'https://www.elysee.fr/agenda',
  assemblee: 'https://www2.assemblee-nationale.fr/agendas/les-agendas',
  senat: 'https://www.senat.fr/seances/seances.html'
};

async function fetchHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 0 } 
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error(`Erreur lors du fetch de ${url}:`, error);
    return null;
  }
}

async function extractEventsWithClaude(htmlText: string, institution: string, dateStr: string) {
  const prompt = `Tu es un assistant politique. Voici le texte brut extrait de la page agenda de l'institution : ${institution}.
La date visée est : ${dateStr}.

Texte brut extrait :
"""
${htmlText.substring(0, 8000)} // Limite pour ne pas dépasser le contexte
"""

Ta mission :
Extrais tous les événements prévus pour la date ${dateStr}. S'il n'y a pas d'événement explicitement pour cette date, ou si la page indique que l'agenda est vide, retourne un tableau vide [].

Pour chaque événement trouvé pour la date ${dateStr}, génère un objet JSON avec les propriétés suivantes :
- "institution": "${institution}" (fixe, soit "Élysée", "AN", ou "Sénat")
- "date": "${dateStr}" (format YYYY-MM-DD)
- "category": La catégorie de l'événement (ex: "Conseil des ministres", "Déplacement", "Séance publique", "Commission", etc.)
- "time": L'heure de l'événement au format "HHhMM" (ex: "10h00"). Si l'heure n'est pas précisée, mets "JOUR" ou "Matin" / "Après-midi".
- "title": Le titre avec l'heure entre crochets (ex: "[10h00] Conseil des ministres" ou "[JOUR] Séance publique").
- "short_title": Le titre court sans l'heure (ex: "Conseil des ministres").
- "description": Une description détaillée si disponible, sinon répète le titre.
- "short_summary": Un résumé très court (1 phrase max).

Renvoie UNIQUEMENT un tableau JSON valide contenant ces objets, sans aucun autre texte. Si aucun événement, renvoie [].`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonStr = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
    
    if (!jsonStr) return [];
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error(`Erreur Claude pour ${institution}:`, error);
    return [];
  }
}

export async function scrapeAndStoreAgenda() {
  const today = new Date();
  // Format local YYYY-MM-DD for France
  const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(today);
  
  console.log(`[AgendaScrapingService] Lancement de la récupération pour le ${todayStr}...`);
  let allEvents: any[] = [];

  // 1. Élysée (Gouvernement)
  const htmlElysee = await fetchHtml(SOURCES.elysee);
  if (htmlElysee) {
    const $ = cheerio.load(htmlElysee);
    // On extrait le texte des balises principales pour réduire la taille envoyée à Claude
    const textContext = $('main').text().replace(/\s+/g, ' ').trim();
    const eventsElysee = await extractEventsWithClaude(textContext, 'Élysée', todayStr);
    allEvents = [...allEvents, ...eventsElysee];
  }

  // 2. Assemblée Nationale
  const htmlAssemblee = await fetchHtml(SOURCES.assemblee);
  if (htmlAssemblee) {
    const $ = cheerio.load(htmlAssemblee);
    const textContext = $('#agendas-les-agendas, .zone-centrale').text().replace(/\s+/g, ' ').trim() || $('body').text().replace(/\s+/g, ' ').trim();
    const eventsAssemblee = await extractEventsWithClaude(textContext, 'AN', todayStr);
    allEvents = [...allEvents, ...eventsAssemblee];
  }

  // 3. Sénat
  const htmlSenat = await fetchHtml(SOURCES.senat);
  if (htmlSenat) {
    const $ = cheerio.load(htmlSenat);
    const textContext = $('#main-content, .seances').text().replace(/\s+/g, ' ').trim() || $('body').text().replace(/\s+/g, ' ').trim();
    const eventsSenat = await extractEventsWithClaude(textContext, 'Sénat', todayStr);
    allEvents = [...allEvents, ...eventsSenat];
  }

  console.log(`[AgendaScrapingService] ${allEvents.length} événements trouvés pour aujourd'hui.`);

  if (allEvents.length > 0) {
    // Supprimer les anciens événements du jour pour éviter les doublons si on relance
    await supabase.from('events').delete().eq('date', todayStr);
    
    // Insérer les nouveaux événements
    const { error } = await supabase.from('events').insert(allEvents);
    if (error) {
      console.error("[AgendaScrapingService] Erreur lors de l'insertion:", error);
      throw error;
    }
    console.log(`[AgendaScrapingService] Événements insérés avec succès.`);
  }

  return { success: true, count: allEvents.length, events: allEvents };
}
