"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, ThumbsDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

const CATEGORIES: Record<string, string> = {
  suivis: "ce que vous suivez", local: "l'actualité près de chez vous", sujets: "vos sujets",
  textes: "les textes qui vous concernent", tele: "les passages télé",
};

/**
 * « Pas intéressant », depuis un e-mail Pro : un clic, sans connexion (jeton personnel).
 * Deux clics sur une même source en 60 jours la font taire dans le récap (pour un parti
 * ou un candidat suivi, seuls ses faits majeurs passent encore).
 */
function Contenu() {
  const q = useSearchParams();
  const jeton = q.get("j"), categorie = q.get("c") || "", entite = q.get("e") || "", titre = q.get("t") || "";
  const [etat, setEtat] = useState<"attente" | "ok" | "inconnu" | "erreur">("attente");
  const [nb, setNb] = useState(1);

  useEffect(() => {
    if (!jeton || !/^[0-9a-f-]{36}$/i.test(jeton) || !CATEGORIES[categorie]) { setEtat("inconnu"); return; }
    supabase.rpc("signaler_pas_interessant", { p_jeton: jeton, p_categorie: categorie, p_entite: entite, p_titre: titre })
      .then(({ data, error }) => {
        if (error) return setEtat("erreur");
        if (!data?.ok) return setEtat("inconnu");
        setNb(data.nb || 1); setEtat("ok");
      });
  }, [jeton, categorie, entite, titre]);

  const source = entite || CATEGORIES[categorie];
  return (
    <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl">
      <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${etat === "ok" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
        {etat === "attente" ? <Loader2 className="animate-spin" /> : etat === "ok" ? <Check size={26} /> : <ThumbsDown size={24} />}
      </span>
      <h1 className="mt-5 font-staatliches text-3xl uppercase leading-none text-foreground">
        {etat === "attente" ? "Un instant…" : etat === "ok" ? "Merci, c'est noté" : "Lien invalide"}
      </h1>
      {titre && etat === "ok" && <p className="mt-3 text-xs italic text-muted-foreground">« {titre} »</p>}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {etat === "ok"
          ? nb >= 2
            ? `Désormais, ${categorie === "suivis" ? `seuls les faits majeurs de « ${source} » (candidature, programme, décision de justice…) vous seront envoyés` : `« ${source} » ne figurera plus dans votre récap`}.`
            : `Encore un clic sur « ${source} » et votre récap en tiendra compte : ${categorie === "suivis" ? "vous n'en recevrez plus que les faits majeurs" : "cette source disparaîtra"}.`
          : etat === "attente" ? "Nous enregistrons votre avis."
          : "Ce lien n'est pas reconnu. Vous pouvez régler vos e-mails depuis votre espace."}
      </p>
      <Link href="/dashboard#preferences" className="mt-6 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
        Régler mes alertes
      </Link>
    </div>
  );
}

export default function RetourPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <Suspense fallback={<Loader2 className="animate-spin text-muted-foreground" />}><Contenu /></Suspense>
    </main>
  );
}
