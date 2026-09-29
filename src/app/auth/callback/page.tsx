"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Retour des liens envoyés par e-mail : confirmation d'inscription, et
 * réinitialisation du mot de passe.
 *
 * Le lien de confirmation pointait vers cette adresse alors qu'elle n'existait
 * pas : le nouveau membre cliquait et tombait sur une page introuvable. Supabase
 * a déjà validé l'adresse quand le navigateur arrive ici ; la session revient dans
 * l'URL et le client la lit tout seul (`detectSessionInUrl`).
 *
 * Un lien de réinitialisation arrive avec `type=recovery` : on propose alors de
 * choisir le nouveau mot de passe, la session temporaire le permettant.
 */
type Etat = "attente" | "connecte" | "confirme" | "erreur" | "nouveau_mdp" | "mdp_ok";

const lireUrl = () => {
  if (typeof window === "undefined") return { erreur: "", recuperation: false };
  const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  const e = p.get("error_description") || "";
  return {
    erreur: !e ? "" : /expired|invalid/i.test(e)
      ? "Ce lien a expiré ou a déjà servi. Retournez à la connexion : vous pourrez en demander un nouveau."
      : e,
    recuperation: p.get("type") === "recovery",
  };
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const [url] = useState(lireUrl);
  const [etat, setEtat] = useState<Etat>(() => (url.erreur ? "erreur" : "attente"));
  const [mdp, setMdp] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurMdp, setErreurMdp] = useState("");

  useEffect(() => {
    if (url.erreur) return;
    let actif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      if (url.recuperation && data.session) { setEtat("nouveau_mdp"); return; }
      if (data.session) {
        setEtat("connecte");
        setTimeout(() => router.replace("/dashboard"), 1500);
      } else {
        // Lien ouvert sur un autre appareil que celui de l'inscription : l'adresse
        // est bien confirmée, mais la session n'a pas suivi. Il suffit de se connecter.
        setEtat(url.recuperation ? "erreur" : "confirme");
      }
    });
    return () => { actif = false; };
  }, [router, url]);

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mdp.length < 6) { setErreurMdp("6 caractères au minimum."); return; }
    setEnvoi(true);
    setErreurMdp("");
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnvoi(false);
    if (error) { setErreurMdp("Le changement n'a pas abouti. Redemandez un lien depuis la page de connexion."); return; }
    setEtat("mdp_ok");
    setTimeout(() => router.replace("/dashboard"), 1500);
  };

  const bouton = "mt-6 inline-block rounded-2xl bg-gradient-to-r from-blue-600 via-rose-600 to-amber-600 px-6 py-3 font-bold text-white";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[32px] border border-border bg-card p-8 text-center shadow-2xl">
        {etat === "attente" && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-amber-500" />
            <p className="text-muted-foreground">Vérification du lien…</p>
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
            {etat === "confirme" && <Link href="/login" className={bouton}>Se connecter</Link>}
          </>
        )}
        {etat === "nouveau_mdp" && (
          <form onSubmit={enregistrer} className="text-left">
            <Lock className="mx-auto mb-4 h-10 w-10 text-amber-500" />
            <h1 className="mb-2 text-center text-2xl font-extrabold text-foreground">Nouveau mot de passe</h1>
            <p className="mb-5 text-center text-muted-foreground">Choisissez-en un, vous serez connecté aussitôt.</p>
            <input
              type="password" required minLength={6} autoFocus
              value={mdp} onChange={e => setMdp(e.target.value)}
              placeholder="6 caractères au minimum"
              className="w-full rounded-2xl border border-border bg-muted px-4 py-4 font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
            {erreurMdp && <p className="mt-2 text-sm font-medium text-rose-500">{erreurMdp}</p>}
            <button type="submit" disabled={envoi} className={`${bouton} w-full disabled:opacity-50`}>
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}
        {etat === "mdp_ok" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h1 className="mb-2 text-2xl font-extrabold text-foreground">Mot de passe changé</h1>
            <p className="text-muted-foreground">Ouverture de votre espace…</p>
          </>
        )}
        {etat === "erreur" && (
          <>
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
            <h1 className="mb-2 text-2xl font-extrabold text-foreground">Lien non valide</h1>
            <p className="text-muted-foreground">
              {url.erreur || "Ce lien n'a pas pu être utilisé. Retournez à la connexion pour en demander un nouveau."}
            </p>
            <Link href="/login" className={bouton}>Aller à la connexion</Link>
          </>
        )}
      </div>
    </div>
  );
}
