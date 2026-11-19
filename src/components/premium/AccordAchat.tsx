"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { mesurerAction } from "@/lib/mesure";

/**
 * Dernière étape avant Stripe (C. conso. L221-5, L221-25) : récapitulatif de l'offre,
 * acceptation des CGV, et demande expresse d'accès immédiat — sans elle, le service ne
 * pourrait commencer qu'après les 14 jours de rétractation. L'accord est daté en base.
 *
 * Sans compte (18/11/2026) : on paie directement. Avant, la fenêtre demandait de se connecter
 * d'abord et renvoyait vers /login sans retour au paiement : sur 14 visiteurs partis de l'offre
 * vers la connexion, aucun n'est revenu payer. Le paiement crée désormais le compte (webhook
 * Stripe → compteDeLAcheteur) avec l'adresse saisie chez Stripe ; l'accord est gardé dans le
 * navigateur et versé au compte à la première connexion (api.verserAccordEnAttente).
 */
export default function AccordAchat({ cle, offre, prix, periode, userId, onFermer, onContinuer }: {
  cle: "elite" | "pro"; offre: string; prix: string; periode: "mois" | "an"; userId: string | null;
  onFermer: () => void; onContinuer: () => void;
}) {
  const [cgv, setCgv] = useState(false);
  const [immediat, setImmediat] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);

  const continuer = async () => {
    setEnvoi(true); setErreur(false);
    try { await api.enregistrerAccordAchat(offre, periode === "an" ? "annuel" : "mensuel"); onContinuer(); }
    catch { setErreur(true); setEnvoi(false); }
  };
  // Un membre pas encore connecté : il se connecte et retrouve cette même fenêtre.
  const suite = `/premium/?commande=${cle}${periode === "an" ? "&annuel=1" : ""}`;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="accord-titre" className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onFermer}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="accord-titre" className="text-lg font-black text-slate-900 dark:text-white">Votre abonnement {offre}</h2>{" "}
          <button onClick={onFermer} aria-label="Fermer" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>{" "}

        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
          {cle === "elite"
            ? <li><strong>7 jours d&apos;essai gratuit</strong>, puis <strong>{prix} TTC par {periode}</strong>. Rien n&apos;est prélevé si vous résiliez pendant l&apos;essai.</li>
            : <li><strong>{prix} TTC par {periode}</strong>, prélevé à la souscription puis à chaque échéance.</li>}{" "}
          <li>Renouvellement automatique chaque {periode === "an" ? "année" : "mois"}, au même prix, jusqu&apos;à résiliation.</li>{" "}
          <li>Résiliable à tout moment en ligne, depuis votre espace ; effet à la fin de la période payée.</li>{" "}
          {!userId && <li>Pas besoin de compte : il est créé avec l&apos;adresse e-mail saisie au paiement.</li>}
        </ul>{" "}

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-snug">
          <input type="checkbox" checked={cgv} onChange={e => setCgv(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500" />{" "}
          <span>J&apos;ai lu et j&apos;accepte les <Link href="/cgv" target="_blank" className="font-bold underline">conditions générales de vente</Link> et la <Link href="/confidentialite" target="_blank" className="font-bold underline">politique de confidentialité</Link>.</span>
        </label>{" "}
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-snug">
          <input type="checkbox" checked={immediat} onChange={e => setImmediat(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500" />{" "}
          <span>Je demande à accéder à l&apos;offre dès maintenant, avant la fin du délai de rétractation de 14 jours. Si je me rétracte
            pendant ce délai, je serai remboursé déduction faite des jours déjà écoulés.</span>
        </label>{" "}

        {erreur && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">Votre accord n&apos;a pas pu être enregistré. Réessayez dans un instant.</p>}{" "}

        <button onClick={continuer} disabled={!cgv || !immediat || envoi}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
          {envoi ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {cle === "elite" ? "Démarrer l'essai gratuit" : "Continuer vers le paiement"}
        </button>{" "}
        <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Vous validerez la commande, avec obligation de paiement, sur la page sécurisée de Stripe.
        </p>{" "}

        {!userId && (
          <p className="mt-4 border-t border-slate-100 pt-4 text-center text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
            Vous avez déjà un compte ?{" "}
            <Link href={`/login/?suite=${encodeURIComponent(suite)}`} onClick={() => { void mesurerAction("achat_connexion"); }}
              className="font-bold text-slate-900 underline underline-offset-2 dark:text-white">Connectez-vous d&apos;abord</Link>
            {" "}pour y rattacher l&apos;abonnement.
          </p>
        )}
      </div>
    </div>
  );
}
