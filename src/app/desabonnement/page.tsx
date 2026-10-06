"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, MailX } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Désabonnement en un clic du récap « La semaine politique en 5 minutes ».
 * Le lien de l'e-mail porte un jeton propre au membre : pas besoin d'être connecté.
 */
function Contenu() {
  const jeton = useSearchParams().get("t");
  const [etat, setEtat] = useState<"attente" | "ok" | "inconnu" | "erreur">("attente");

  useEffect(() => {
    if (!jeton || !/^[0-9a-f-]{36}$/i.test(jeton)) { setEtat("inconnu"); return; }
    supabase.rpc("desabonner_recap", { p_jeton: jeton })
      .then(({ data, error }) => setEtat(error ? "erreur" : data === "ok" ? "ok" : "inconnu"));
  }, [jeton]);

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl">
      <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${etat === "ok" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
        {etat === "attente" ? <Loader2 className="animate-spin" /> : etat === "ok" ? <Check size={26} /> : <MailX size={26} />}
      </span>
      <h1 className="mt-5 font-staatliches text-3xl uppercase leading-none text-foreground">
        {etat === "attente" ? "Un instant…" : etat === "ok" ? "C'est fait" : "Lien invalide"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {etat === "ok"
          ? "Vous ne recevrez plus « La semaine politique en 5 minutes ». Vos autres alertes ne changent pas."
          : etat === "attente" ? "Nous enregistrons votre choix."
          : "Ce lien de désabonnement n'est pas reconnu. Vous pouvez régler vos e-mails depuis votre espace."}
      </p>
      <Link href="/dashboard#preferences" className="mt-6 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
        {etat === "ok" ? "Le réactiver ou régler mes alertes" : "Régler mes e-mails"}
      </Link>
    </div>
  );
}

export default function DesabonnementPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <Suspense fallback={<Loader2 className="animate-spin text-muted-foreground" />}><Contenu /></Suspense>
    </main>
  );
}
