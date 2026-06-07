import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

// Vercel Cron : appelée toutes les 2h — "0 */2 * * *"
// Scrape l'Assemblée Nationale pour les projets et propositions de loi,
// génère une analyse via Claude, et insère dans la table `laws`.

export const maxDuration = 120;

const SOURCES = [
  { url: 'https://www2.assemblee-nationale.fr/documents/liste?type=projets-loi', category: 'Projet de loi' },
  { url: 'https://www2.assemblee-nationale.fr/documents/liste?type=propositions-loi', category: 'Proposition de loi' },
];

const MONTHS: Record<string, string> = {
  janvier: '01', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', août: '08', septembre: '09', octobre: '10', novembre: '11', décembre: '12',
};

async function generateBillAnalysis(bill: any, dossierHtml: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const $ = cheerio.load(dossierHtml);

  const status =
    $('.dossier-etape-label').first().text().trim() ||
    $('.etape-label').first().text().trim() ||
    'Dépôt du texte';

  const introText =
    $('.dossier-intro').text().trim() ||
    $('.expose-motifs').text().trim() ||
    bill.summary;

  const prompt = `Tu es un expert en droit parlementaire français.
Analyse ce projet ou proposition de loi :
Titre : ${bill.title}
Auteur : ${bill.author}
Type : ${bill.category}
Extrait du dossier : ${introText.substring(0, 2000)}

Génère un JSON avec les champs suivants :
- summary: Un résumé court et clair pour le grand public (2-3 phrases).
- premium_summary: Un résumé TRÈS DÉTAILLÉ et PRÉCIS pour les membres Premium. Tu dois obligatoirement utiliser les titres suivants en majuscules :
  CONTEXTE : (pour expliquer pourquoi le texte est déposé)
  MESURES PROPOSÉES : (pour détailler ce que le texte propose concrètement, avec des retours à la ligne pour chaque mesure).
  Sois technique et exhaustif, inclus tous les chiffres clés.
- status: L'état d'avancement actuel (ex: "En commission", "Adopté en 1ère lecture", etc. basé sur ${status}).

Réponds UNIQUEMENT avec le JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (err: any) {
    console.error(`[Cron/Laws] Erreur Claude pour "${bill.title}":`, err.message);
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Variables Supabase manquantes' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('[Cron/Laws] 🕐 Démarrage du scraping Assemblée Nationale...');

  const allBills: any[] = [];

  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: { 'User-Agent': 'LaPolitique-Bot/1.0 (https://lapolitique.fr)' },
      });
      if (!res.ok) {
        console.warn(`[Cron/Laws] HTTP ${res.status} pour ${source.url}`);
        continue;
      }
      const html = await res.text();
      const $ = cheerio.load(html);

      $('ul.liens-liste li[data-id], .liens-liste li[data-id]').each((_i, el) => {
        const id = $(el).attr('data-id')?.replace('OMC_', '');
        const title = $(el).find('h3').text().trim();
        const dateTextRaw = $(el).find('span.heure, .date').text().trim();
        const subtitle = $(el).find('p').first().text().trim();

        let author = source.category === 'Projet de loi' ? 'Le Gouvernement' : '';
        if (source.category === 'Proposition de loi') {
          const authorLink = $(el).find('p a[href*="/deputes/"]').first();
          if (authorLink.length > 0) {
            author = authorLink.text().trim();
          } else {
            const authorMatch = subtitle.match(
              /(?:de loi organique de|de loi de)\s+([^,]+?)(?:\s+et plusieurs|\s+relative|\s+visant|\s+déposée|$)/i
            );
            author = authorMatch ? authorMatch[1].trim() : 'Député(s)';
          }
        }

        const dateMatch = dateTextRaw.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
        let publishedAt = 0;
        let dateIso = '1900-01-01';

        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = MONTHS[dateMatch[2].toLowerCase()] || '01';
          const year = dateMatch[3];
          publishedAt = parseInt(`${year}${month}${day}`);
          dateIso = `${year}-${month}-${day}`;
        }

        if (title && id) {
          const legis = id.match(/L(\d+)/)?.[1] || '17';
          const fullDossierLink = `https://www.assemblee-nationale.fr/dyn/${legis}/dossiers_legislatifs/${id}`;
          allBills.push({
            title: title.replace(/&amp;#13;/g, ' ').replace(/\s+/g, ' '),
            summary: subtitle || `${source.category} mis à jour le ${dateTextRaw || 'récemment'}.`,
            context: `[${dateIso}] Dossier n°${id.split('B')[1] || id}`,
            category: source.category,
            author,
            source_urls: [fullDossierLink],
            publishedAt,
          });
        }
      });
    } catch (err: any) {
      console.warn(`[Cron/Laws] Erreur scraping ${source.url}:`, err.message);
    }
  }

  // Traiter les plus récents en premier
  allBills.sort((a, b) => b.publishedAt - a.publishedAt);

  // Limiter à 15 analyses par run pour tenir dans les 120s Vercel
  const MAX_ANALYSES = 15;
  let processedCount = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const bill of allBills) {
    const { data: existing } = await supabase
      .from('laws')
      .select('id, content, timeline')
      .eq('title', bill.title)
      .maybeSingle();

    const needsAnalysis =
      !existing ||
      !existing.content ||
      existing.timeline === 'Analyse du parcours législatif en cours...';

    if (!needsAnalysis) {
      skipped++;
      continue;
    }

    if (processedCount >= MAX_ANALYSES) break;
    processedCount++;

    console.log(`[Cron/Laws] Analyse de : ${bill.title}`);

    await new Promise(resolve => setTimeout(resolve, 800));

    let dossierHtml = '';
    try {
      const dossierRes = await fetch(bill.source_urls[0], {
        headers: { 'User-Agent': 'LaPolitique-Bot/1.0 (https://lapolitique.fr)' },
      });
      if (dossierRes.ok) dossierHtml = await dossierRes.text();
    } catch {
      // continue sans HTML de dossier
    }

    const analysis = await generateBillAnalysis(bill, dossierHtml);
    const { publishedAt, ...billToSync } = bill;

    if (analysis) {
      Object.assign(billToSync, {
        summary: analysis.summary,
        content: analysis.premium_summary,
        timeline: analysis.status,
        created_at: new Date().toISOString(),
      });
    }

    if (existing) {
      await supabase.from('laws').update(billToSync).eq('id', existing.id);
      updated++;
    } else {
      await supabase.from('laws').insert(billToSync);
      inserted++;
    }
  }

  console.log(`[Cron/Laws] ✅ Terminé — ${inserted} insérés, ${updated} mis à jour, ${skipped} déjà à jour.`);

  return NextResponse.json({
    success: true,
    total_scraped: allBills.length,
    analysed: processedCount,
    inserted,
    updated,
    skipped,
  });
}
