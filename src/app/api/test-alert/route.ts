import { NextResponse } from 'next/server';
import { sendCronAlert } from '@/lib/cron-alert';

// Route temporaire pour tester l'envoi d'email d'alerte — à supprimer après vérification

export async function GET() {
  await sendCronAlert('test-alert', 'Ceci est un email de test. Si tu le reçois, les alertes cron fonctionnent correctement.');
  return NextResponse.json({ message: 'Email de test envoyé à hippolytebelyaev74@gmail.com' });
}
