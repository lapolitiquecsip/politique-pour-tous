import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // 1. Log for debugging
    console.log(`Nouvelle demande de contact de ${name} (${email})`);

    // 2. Validate input
    if (!name || !email || !message) {
      return NextResponse.json({ 
        success: false, 
        message: "Champs obligatoires manquants." 
      }, { status: 400 });
    }

    // 3. Send email via Resend
    // Important: On the free tier, you can only send TO the email you signed up with unless you verify a domain.
    const { data, error } = await resend.emails.send({
      from: "La Politique C'est Simple <onboarding@resend.dev>",
      to: process.env.CONTACT_RECEIVER_EMAIL || "contact@lapolitiquesimple.fr",
      subject: `[CONTACT] ${subject.toUpperCase()} - ${name}`,
      replyTo: email,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Nouveau Message de Contact</h1>
          </div>
          <div style="padding: 30px;">
            <p><strong>De:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
            <p><strong>Objet:</strong> ${subject}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="white-space: pre-wrap; line-height: 1.6; color: #333;">${message}</p>
          </div>
          <div style="background-color: #f9fafb; color: #666; padding: 20px; text-align: center; font-size: 12px;">
            Ceci est un message automatique envoyé depuis le formulaire de contact de La Politique C'est Simple.
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ 
        success: false, 
        message: "Erreur lors de l'envoi de l'email." 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Message envoyé avec succès !",
      id: data?.id
    });

  } catch (error) {
    console.error("Error in contact API:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur interne est survenue." 
    }, { status: 500 });
  }
}
