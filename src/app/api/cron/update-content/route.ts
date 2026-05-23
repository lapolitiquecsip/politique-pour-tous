import { NextResponse } from 'next/server';
import { scrapeAndUpdateContent } from '@/lib/services/contentScrapingService';

// Vercel Cron : Cette route est appelée chaque jour à 6h (heure de Paris)
// Configuré dans vercel.json : "0 4 * * *" (4h UTC = 6h Paris)

export const maxDuration = 120; // 2 minutes max (les flux RSS + Claude peuvent prendre du temps)

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

    return NextResponse.json({
      message: 'Scraping terminé',
      ...result,
    });
  } catch (error: any) {
    console.error('[Cron/Content] ❌ Erreur critique:', error);
    return NextResponse.json(
      { error: 'Erreur lors du scraping', details: error.message },
      { status: 500 }
    );
  }
}
