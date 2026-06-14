import { NextResponse } from 'next/server';
import { scrapeAndStoreAgenda } from '@/lib/services/agendaScrapingService';
import { sendCronAlert } from '@/lib/cron-alert';

// Vercel Cron : appelée tous les jours à 3h00 — "0 3 * * *"
export const maxDuration = 300; // Limite à 300s pour Vercel Pro

export async function GET(req: Request) {
  // Vérification de sécurité CRON Vercel (sauf en dev)
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[CRON Agenda] Démarrage du scraping de l\'agenda des institutions...');
    const result = await scrapeAndStoreAgenda();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Agenda mis à jour avec succès.',
      data: result
    });
  } catch (error: any) {
    console.error('[CRON Agenda] Erreur critique:', error);
    
    // Envoyer l'alerte e-mail en cas de crash
    try {
      await sendCronAlert('Agenda (Élysée/AN/Sénat)', error);
    } catch (alertError) {
      console.error('[CRON Agenda] Échec de l\'envoi de l\'alerte e-mail:', alertError);
    }

    return NextResponse.json({ 
      error: 'Erreur lors de la mise à jour de l\'agenda',
      details: error.message 
    }, { status: 500 });
  }
}
