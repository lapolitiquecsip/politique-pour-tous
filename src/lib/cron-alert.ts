import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCronAlert(cronName: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack ? `<pre style="font-size:12px;background:#f4f4f4;padding:8px">${error.stack}</pre>` : '';
  try {
    await resend.emails.send({
      from: 'Cron LaPolitique <cron@lapolitique.fr>',
      to: 'mathurin.ache@free.fr',
      subject: `[ALERTE CRON] ${cronName} a échoué`,
      html: `
        <h2>Le cron <strong>${cronName}</strong> a échoué</h2>
        <p><strong>Date :</strong> ${new Date().toISOString()}</p>
        <p><strong>Erreur :</strong> ${message}</p>
        ${stack}
      `,
    });
  } catch (emailErr) {
    console.error(`[CronAlert] Impossible d'envoyer l'alerte pour ${cronName} :`, emailErr);
  }
}
