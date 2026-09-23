"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, KeyRound, ShieldCheck, LogOut, Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Les réglages du compte : adresse, mot de passe, abonnement, déconnexion.
 *
 * Écran volontairement sobre : un abonné Pro vient ici pour changer son mot de passe
 * ou vérifier son abonnement, pas pour travailler. Le travail, lui, a sa propre page.
 */

const NIVEAUX: Record<string, { nom: string; detail: string }> = {
  pro: { nom: "Pro", detail: "24,99 €/mois — suivi des commissions, Journal officiel, veille réseaux sociaux." },
  elite: { nom: "Premium", detail: "3,99 €/mois — décryptages illimités, suivi de vos élus, alertes personnalisées." },
  free: { nom: "Compte citoyen", detail: "Gratuit — l'essentiel du site, sans les outils réservés." },
};

export default function ParametresCompte() {
  const { tier } = usePremium();
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

      {/* Abonnement */}
      <div className={carte}>
        <p className={titre}><ShieldCheck size={13} /> Abonnement</p>
        <p className="mt-2 text-lg font-bold text-white">{niveau.nom}</p>
        <p className="mt-1 text-[13px] leading-snug text-white/60">{niveau.detail}</p>
        {tier !== "pro" && (
          <Link href="/premium"
            className="mt-4 inline-flex rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-600 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-950 transition hover:brightness-110">
            {tier === "elite" ? "Passer à l'offre Pro" : "Découvrir les abonnements"}
          </Link>
        )}
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
