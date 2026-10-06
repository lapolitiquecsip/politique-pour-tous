"use client";

import { useEffect, useState } from "react";
import { Landmark, Loader2, ArrowUpRight, Check, Hourglass } from "lucide-react";
import { api } from "@/lib/api";

const euros = (n: number) => `${Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * Versement automatique des commissions : le parrain relie une fois son compte de
 * versement chez Stripe (identité + IBAN, jamais saisis sur notre site) ; ensuite chaque
 * commission validée lui est virée dès que le seuil est atteint, sans demande.
 */
export default function VersementsParrainage({ disponible, seuil }: { disponible: number; seuil: number }) {
  const [etat, setEtat] = useState<Awaited<ReturnType<typeof api.etatVersements>> | null>(null);
  const [indispo, setIndispo] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { api.etatVersements().then(setEtat).catch(() => setIndispo(true)); }, []);

  const ouvrir = async (action: "relier" | "tableau") => {
    setEnvoi(true);
    try { window.location.href = await api.lienVersements(action); }
    catch { setIndispo(true); setEnvoi(false); }
  };

  const bouton = "inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-teal-300 disabled:opacity-50";
  let texte: React.ReactNode, action: React.ReactNode = null;
  if (indispo) {
    texte = <>Les versements automatiques ouvrent très bientôt. Vos commissions restent acquises et vous seront versées.</>;
  } else if (!etat) {
    return <div className="flex justify-center py-6"><Loader2 className="animate-spin text-teal-300" /></div>;
  } else if (!etat.relie || etat.a_completer) {
    texte = <><strong className="text-white">Recevez vos commissions automatiquement.</strong> Indiquez une fois votre identité et votre IBAN
      à notre prestataire de paiement Stripe : ensuite, chaque commission validée vous est virée dès {euros(seuil)} disponibles, sans rien demander.</>;
    action = <button onClick={() => ouvrir("relier")} disabled={envoi} className={bouton}>
      {envoi ? <Loader2 size={15} className="animate-spin" /> : <Landmark size={15} />} {etat.relie ? "Terminer mon inscription" : "Configurer mes versements"}</button>;
  } else if (!etat.actif) {
    texte = <><Hourglass size={14} className="mr-1 inline" /> Stripe vérifie vos informations (en général quelques minutes, parfois un jour ou deux). Les versements démarreront ensuite d&apos;eux-mêmes.</>;
    action = <button onClick={() => ouvrir("relier")} disabled={envoi} className={bouton}>Compléter si demandé</button>;
  } else {
    texte = <><Check size={14} className="mr-1 inline text-teal-300" /> <strong className="text-white">Versements automatiques activés.</strong>{" "}
      {disponible >= seuil ? `${euros(disponible)} partent vers votre compte bancaire lors du prochain versement (chaque jour).` : `Virement dès ${euros(seuil)} disponibles.`}</>;
    action = <button onClick={() => ouvrir("tableau")} disabled={envoi} className={bouton}>Mes virements <ArrowUpRight size={14} /></button>;
  }
  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl border border-teal-300/30 bg-teal-400/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-relaxed text-white/85">{texte}</p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
