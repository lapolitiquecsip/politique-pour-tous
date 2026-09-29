"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Retour du lien de confirmation envoyé à l'inscription.
 *
 * Le lien de l'e-mail pointait vers cette adresse alors qu'elle n'existait pas :
 * le nouveau membre cliquait et tombait sur une page introuvable. Supabase a déjà
 * validé l'adresse quand le navigateur arrive ici ; la session revient dans l'URL
 * et le client la lit tout seul (`detectSessionInUrl`). Il ne reste qu'à le dire,
 * puis à ouvrir l'espace du membre.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  // Un lien expiré ou déjà utilisé revient avec son erreur dans l'URL : lue dès
  // le premier rendu, sans attendre la session.
  const [message] = useState(() => {
    if (typeof window === "undefined") return "";
    const erreur = new URLSearchParams(window.location.hash.slice(1) || window.location.search).get("error_description");
    if (!erreur) return "";
    return /expired|invalid/i.test(erreur)
      ? "Ce lien a expiré ou a déjà servi. Connectez-vous : si l'adresse n'est pas encore confirmée, un nouveau lien vous sera proposé."
      : erreur;
  });
  const [etat, setEtat] = useState<"attente" | "connecte" | "confirme" | "erreur">(() => (message ? "erreur" : "attente"));

  useEffect(() => {
    if (message) return;
    let actif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      if (data.session) {
        setEtat("connecte");
        setTimeout(() => router.replace("/dashboard"), 1500);
      } else {
        // Lien ouvert sur un autre appareil que celui de l'inscription : l'adresse
        // est bien confirmée, mais la session n'a pas suivi. Il suffit de se connecter.
        setEtat("confirme");
      }
    });
    return () => { actif = false; };
  }, [router, message]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[32px] border border-border bg-card p-8 text-center shadow-2xl">
        {etat === "attente" && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-amber-500" />
            <p className="text-muted-foreground">Confirmation de votre adresse…</p>
          </>
        )}
        {(etat === "connecte" || etat === "confirme") && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h1 className="mb-2 text-2xl font-extrabold text-foreground">Adresse confirmée !</h1>
            <p className="text-muted-foreground">
              {etat === "connecte"
                ? "Votre compte est actif. Ouverture de votre espace…"
                : "Votre compte est actif. Connectez-vous pour accéder à votre espace."}
            </p>
            {etat === "confirme" && (
              <Link href="/login" className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-blue-600 via-rose-600 to-amber-600 px-6 py-3 font-bold text-white">
                Se connecter
              </Link>
            )}
          </>
        )}
        {etat === "erreur" && (
          <>
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
            <h1 className="mb-2 text-2xl font-extrabold text-foreground">Lien non valide</h1>
            <p className="text-muted-foreground">{message}</p>
            <Link href="/login" className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-blue-600 via-rose-600 to-amber-600 px-6 py-3 font-bold text-white">
              Aller à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
