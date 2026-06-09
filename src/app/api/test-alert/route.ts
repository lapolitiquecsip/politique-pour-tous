import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Route temporaire pour diagnostiquer l'envoi d'email — à supprimer après vérification

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY manquante dans les variables Vercel' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: 'Cron LaPolitique <cron@lapolitique.fr>',
    to: 'hippolytebelyaev74@gmail.com',
    subject: '[TEST] Alerte cron LaPolitique',
    html: '<p>Email de test. Si tu reçois ça, les alertes fonctionnent.</p>',
  });

  return NextResponse.json({ resend_response: result });
}
