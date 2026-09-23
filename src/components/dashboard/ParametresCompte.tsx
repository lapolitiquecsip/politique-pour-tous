"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, KeyRound, ShieldCheck, LogOut, Loader2, Check, AlertTriangle, CreditCard, ArrowUpRight } from "lucide-react";
import { STRIPE_PORTAL_URL, CONTACT_EMAIL } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Les réglages du compte : adresse, mot de passe, abonnement, déconnexion.
 *
 * Écran volontairement sobre : un abonné Pro vient ici pour changer son mot de passe
 * ou vérifier son abonnement, pas pour travailler. Le travail, lui, a sa propre page.
 */

const NIVEAUX: Record<string, { nom: string; prix: string | null; detail: string }> = {
  pro: { nom: "Pro", prix: "24,99 € / mois", detail: "Suivi des commissions, Journal officiel du jour expliqué, veille des réseaux sociaux des candidats." },
  elite: { nom: "Premium", prix: "3,99 € / mois", detail: "Décryptages illimités, suivi de vos élus, alertes personnalisées." },
  free: { nom: "Compte citoyen", prix: null, detail: "Gratuit — l'essentiel du site, sans les outils réservés." },
};

export default function ParametresCompte() {
  const { tier } = usePremium();
  const reduce = useReducedMotion();
  const [courriel, setCourriel] = useState<string | null>(null);
  const [depuis, setDepuis] = useState<string | null>(null);

  // Changement de mot de passe.
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    let vivant = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!vivant) return;
      setCourriel(data.user?.email ?? null);
      setDepuis(data.user?.created_at ?? null);
    });
    return () => { vivant = false; };
  }, []);

  const changerMotDePasse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Contrôles côté navigateur d'abord : inutile d'aller jusqu'au serveur pour
    // apprendre que les deux champs diffèrent.
    if (motDePasse.length < 8) {
      setMessage({ ton: "erreur", texte: "Le mot de passe doit faire au moins 8 caractères." });
      return;
    }
    if (motDePasse !== confirmation) {
      setMessage({ ton: "erreur", texte: "Les deux mots de passe ne correspondent pas." });
      return;
    }

    setEnCours(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: motDePasse });
      if (error) throw error;
      setMotDePasse(""); setConfirmation("");
      setMessage({ ton: "ok", texte: "Mot de passe modifié. Il sera demandé à votre prochaine connexion." });
    } catch (err) {
      setMessage({ ton: "erreur", texte: (err as Error).message || "La modification a échoué." });
    } finally {
      setEnCours(false);
    }
  };

  const deconnexion = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const niveau = NIVEAUX[tier] ?? NIVEAUX.free;
  const champ = "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-amber-400/60";
  const carte = "rounded-3xl border border-white/10 bg-white/[0.04] p-6";
  const titre = "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300";

  return (
    <div className="container mx-auto max-w-3xl space-y-4 px-4">
      {/* Identifiants */}
      <div className={carte}>
        <p className={titre}><Mail size={13} /> Adresse de connexion</p>
        <p className="mt-2 break-all text-lg font-bold text-white">{courriel ?? "…"}</p>
        {depuis && (
          <p className="mt-1 text-[12px] text-white/45">
            Compte ouvert le {new Date(depuis).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        <p className="mt-3 text-[12px] leading-snug text-white/45">
          L&apos;adresse sert à la connexion et aux alertes. Pour en changer, écrivez-nous :
          elle est liée au paiement, et la modifier sans précaution couperait l&apos;abonnement.
        </p>
      </div>

      {/* Abonnement — la carte la plus regardée de l'écran : on lui donne l'habillage
          de l'offre, un halo qui respire, et surtout une sortie claire vers la gestion
          de l'abonnement. Un abonné qui ne trouve pas comment changer de formule finit
          par écrire, ou par partir. */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-6 shadow-xl">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/25 blur-3xl"
          animate={reduce ? undefined : { scale: [1, 1.18, 1], opacity: [0.45, 0.85, 0.45] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
            <ShieldCheck size={13} /> Abonnement
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-staatliches text-4xl uppercase leading-none tracking-tight text-white">{niveau.nom}</span>
            {niveau.prix && (
              <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-500/30">
                {niveau.prix}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/65">{niveau.detail}</p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {STRIPE_PORTAL_URL ? (
              <a
                href={STRIPE_PORTAL_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110"
              >
                <CreditCard size={15} /> Gérer mon abonnement <ArrowUpRight size={14} />
              </a>
            ) : (
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Changement d'abonnement")}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite modifier mon abonnement (actuellement : ${niveau.nom}).\n\nCompte : ${courriel ?? ""}\n`)}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110"
              >
                <CreditCard size={15} /> Changer ou résilier
              </a>
            )}

            {tier !== "pro" && (
              <Link href="/premium"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white/80 transition hover:border-white/50 hover:text-white">
                {tier === "elite" ? "Passer à l'offre Pro" : "Voir les formules"}
              </Link>
            )}
          </div>

          <p className="mt-3 text-[11px] leading-snug text-white/35">
            {STRIPE_PORTAL_URL
              ? "Changement de formule, moyen de paiement, factures et résiliation se font depuis l'espace de facturation sécurisé de Stripe."
              : "L'espace de facturation en libre-service n'est pas encore ouvert : écrivez-nous et le changement sera fait sous 48 heures."}
          </p>
        </div>
      </div>


      {/* Mot de passe */}
      <form onSubmit={changerMotDePasse} className={carte}>
        <p className={titre}><KeyRound size={13} /> Mot de passe</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)}
            placeholder="Nouveau mot de passe" autoComplete="new-password" className={champ}
          />
          <input
            type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)}
            placeholder="Confirmer" autoComplete="new-password" className={champ}
          />
        </div>

        {message && (
          <p className={`mt-3 flex items-start gap-2 text-[13px] leading-snug ${message.ton === "ok" ? "text-emerald-300" : "text-rose-300"}`}>
            {message.ton === "ok" ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
            {message.texte}
          </p>
        )}

        <button
          type="submit" disabled={enCours || !motDePasse}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-900 transition hover:brightness-95 disabled:opacity-40"
        >
          {enCours && <Loader2 size={14} className="animate-spin" />}
          Modifier le mot de passe
        </button>
      </form>

      {/* Déconnexion */}
      <div className={carte}>
        <p className={titre}><LogOut size={13} /> Session</p>
        <button
          onClick={deconnexion}
          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/20"
        >
          <LogOut size={14} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
