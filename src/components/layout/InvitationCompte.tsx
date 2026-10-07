"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Bookmark, Vote } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";
import { mesurerAction } from "@/lib/mesure";

/**
 * Invitation à créer un compte gratuit, après 20 secondes de visite (cumulées d'une page
 * à l'autre). Jamais pour un membre connecté, jamais sur les pages de connexion, de
 * paiement, juridiques ou d'administration ; une fois fermée, elle ne revient pas avant
 * 7 jours. Rien n'est demandé ici : le bouton mène au formulaire d'inscription.
 */
const DELAI_MS = 20_000;
const CLE_DEBUT = "lpcs.visite-debut";
const CLE_REFUS = "lpcs.invitation-fermee";
const SILENCE_JOURS = 7;
const PAGES_EXCLUES = /^\/(login|auth|premium|success|cancel|admin|retour|desabonnement|mentions-legales|cgu|cgv|confidentialite|dashboard|parrainage)/;

export default function InvitationCompte() {
  const chemin = usePathname() || "/";
  const { userId, loading } = usePremium();
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (loading || userId || PAGES_EXCLUES.test(chemin)) { setOuvert(false); return; }
    let restant = DELAI_MS;
    try {
      const refus = Number(localStorage.getItem(CLE_REFUS) || 0);
      if (refus && Date.now() - refus < SILENCE_JOURS * 864e5) return;
      // Temps cumulé sur l'onglet : la navigation entre pages ne remet pas le compteur à zéro.
      let debut = Number(sessionStorage.getItem(CLE_DEBUT) || 0);
      if (!debut) { debut = Date.now(); sessionStorage.setItem(CLE_DEBUT, String(debut)); }
      restant = Math.max(0, DELAI_MS - (Date.now() - debut));
    } catch { /* stockage indisponible : délai simple */ }
    const t = setTimeout(() => { setOuvert(true); mesurerAction("invitation_compte_vue"); }, restant);
    return () => clearTimeout(t);
  }, [chemin, userId, loading]);

  const fermer = () => {
    setOuvert(false);
    try { localStorage.setItem(CLE_REFUS, String(Date.now())); } catch { /* rien */ }
  };

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={fermer}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="invitation-titre"
            className="relative w-full max-w-md rounded-[2rem] bg-card p-7 text-foreground shadow-2xl dark:bg-slate-900"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            onClick={e => e.stopPropagation()}>
            <button type="button" aria-label="Fermer" onClick={fermer}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <X size={18} />
            </button>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-700 dark:text-sky-400">Gratuit, en 30 secondes</p>
            <h2 id="invitation-titre" className="mt-2 font-staatliches text-3xl uppercase leading-none">Créez votre compte</h2>
            <ul className="mt-5 space-y-3 text-sm leading-snug text-foreground/85">
              <li className="flex gap-3"><Bell size={18} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" /> Suivez vos élus : leurs votes et leur actualité, au même endroit.</li>
              <li className="flex gap-3"><Vote size={18} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" /> Donnez votre avis sur les lois et comparez-le aux votes des députés.</li>
              <li className="flex gap-3"><Bookmark size={18} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" /> Enregistrez les lois et les fiches qui vous intéressent.</li>
            </ul>
            <Link href={`/login/?inscription=1&suite=${encodeURIComponent(chemin)}`} onClick={() => { mesurerAction("invitation_compte_clic"); fermer(); }}
              className="mt-6 block rounded-2xl bg-sky-600 px-5 py-3.5 text-center text-sm font-black uppercase tracking-widest text-white transition hover:bg-sky-700">
              Créer mon compte gratuit
            </Link>
            <button type="button" onClick={fermer} className="mt-3 w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground">
              Plus tard
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
