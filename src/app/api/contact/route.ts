import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Log the message for the demo
    console.log("--- NOUVEAU MESSAGE DE CONTACT ---");
    console.log(`De: ${name} (${email})`);
    console.log(`Objet: ${subject}`);
    console.log(`Message: ${message}`);
    console.log("-----------------------------------");

    // Simulate success
    return NextResponse.json({ 
      success: true, 
      message: "Message reçu avec succès !" 
    });

  } catch (error) {
    console.error("Error in contact API:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Erreur lors de la réception du message." 
    }, { status: 500 });
  }
}
