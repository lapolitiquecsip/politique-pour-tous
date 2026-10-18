"use client";

import Link from "next/link";
import { CheckCircle, ArrowRight, Star } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Retour du paiement.
 *
 * La page disait « Premium » à tout le monde et renvoyait à l'accueil : un abonné Pro qui
 * venait de payer se retrouvait sur la page publique, sans savoir par où commencer. Elle
 * nomme maintenant l'offre souscrite et mène à l'endroit utile — pour un Pro, le tutoriel
 * qui règle ses alertes.
 */
export default function SuccessPage() {
  const { isPro, loading } = usePremium();
  const offre = isPro ? "Pro" : "Premium";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card p-8 text-center shadow-2xl dark:bg-slate-900 md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-amber-400/20 blur-[80px]" />{" "}
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-400/20 blur-[80px]" />{" "}

        <div className="relative">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle className="h-12 w-12" />
          </div>{" "}

          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Paiement réussi</h1>{" "}

          <p className="mb-8 text-lg leading-relaxed text-muted-foreground dark:text-slate-400">
            Merci pour votre confiance.{" "}
            {loading
              ? "Votre abonnement est en cours d'activation."
              : <>Votre compte est désormais <strong className="text-amber-700 dark:text-amber-400">{offre}</strong>.</>}
            {isPro && " Il reste trois minutes de réglages pour que vos alertes vous correspondent."}
          </p>{" "}

          <div className="mb-10 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Star className="h-4 w-4 fill-current" />{" "}
            {loading ? "Activation en cours" : `Statut ${offre} actif`}
          </div>{" "}

          <Link
            href={isPro ? "/premium/?bienvenue=1" : "/dashboard/"}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-lg font-bold text-white shadow-xl shadow-slate-900/10 transition-all hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            {isPro ? "Régler mes alertes" : "Ouvrir mon espace"}{" "}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>{" "}
          <Link href="/" className="mt-4 inline-block text-sm font-bold text-muted-foreground underline-offset-4 hover:underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
