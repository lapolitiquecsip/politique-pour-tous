import { NextResponse } from 'next/server';
import { syncTerritoryPresidents } from '@/lib/services/territoryService';

// Vercel Cron : Cette route est appelée périodiquement
// Pour l'activer sur Vercel, ajouter dans vercel.json :
// "crons": [{ "path": "/api/cron/update-territories", "schedule": "0 2 * * 1" }] (Chaque lundi à 2h)

export async function GET(request: Request) {
  // Optionnel : Vérifier un jeton de sécurité dans l'URL pour éviter les appels malveillants
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const result = await syncTerritoryPresidents();

  if (result.success) {
    return NextResponse.json({ message: 'Synchronisation réussie' });
  } else {
    return NextResponse.json({ error: 'Erreur lors de la synchronisation', details: result.error }, { status: 500 });
  }
}
