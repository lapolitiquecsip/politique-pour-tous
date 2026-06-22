import { NextResponse } from 'next/server';
import { scrapeAndUpdateContent } from '@/lib/services/contentScrapingService';
import { sendCronAlert } from '@/lib/cron-alert';

// Vercel Cron : Cette route est appelée chaque jour à 6h (heure de Paris)
// Configuré dans vercel.json : "0 4 * * *" (4h UTC = 6h Paris)

export const maxDuration = 300; // 300s max for Vercel Pro plan

export async function GET(request: Request) {
  // Vérification du jeton de sécurité
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
    // Vercel Cron envoie un header spécial qu'on peut aussi vérifier
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  try {
    console.log('[Cron/Content] 🕐 Démarrage du cron de scraping...');
    
    const result = await scrapeAndUpdateContent();

    console.log('[Cron/Content] ✅ Résultat:', JSON.stringify(result, null, 2));

    if (result.totalInserted === 0 && (result.totalFetched ?? 0) > 0) {
      await sendCronAlert(
        'update-content',
        `0 articles insérés malgré ${result.totalFetched} articles RSS récupérés. Détails : ${result.details?.join(' | ')}`
      );
    }

    return NextResponse.json({
      message: 'Scraping terminé',
      ...result,
    });
  } catch (error: any) {
    console.error('[Cron/Content] ❌ Erreur critique:', error);
    await sendCronAlert('update-content', error);
    return NextResponse.json(
      { error: 'Erreur lors du scraping', details: error.message },
      { status: 500 }
    );
  }
}
