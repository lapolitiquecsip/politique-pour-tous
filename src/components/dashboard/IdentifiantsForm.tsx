"use client";

import { useEffect, useState } from "react";
import { Mail, KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Changer son adresse e-mail et son mot de passe, depuis l'espace personnel.
 *
 * Il n'existait aucun moyen de le faire : l'adresse était figée et le mot de passe
 * ne se changeait nulle part. Les deux passent par Supabase Auth :
 *   — l'adresse : un lien de confirmation part vers la nouvelle adresse (et vers
 *     l'ancienne si le « changement sécurisé » est actif) ; rien ne change tant
 *     qu'il n'est pas cliqué ;
 *   — le mot de passe : effectif immédiatement.
 *
 * `adresseModifiable` : faux pour un abonné, dont l'adresse est aussi celle de sa
 * facturation Stripe — la changer ici désaccorderait les deux. Il écrit alors à
 * l'équipe (voir ParametresCompte).
 */
type Etat = { type: "ok" | "erreur"; texte: string } | null;

const traduire = (m: string) => {
  if (/same|identical|different from the old/i.test(m)) return "Le nouveau mot de passe doit être différent de l'actuel.";
  if (/at least|weak password|should be/i.test(m)) return "Mot de passe trop court : 8 caractères au minimum.";
  if (/already been registered|already exists|already in use/i.test(m)) return "Cette adresse est déjà utilisée par un autre compte.";
  if (/rate limit|for security purposes/i.test(m)) return "Trop de demandes rapprochées. Réessayez dans quelques minutes.";
  if (/invalid email|unable to validate/i.test(m)) return "Cette adresse e-mail n'est pas valide.";
  if (/reauthentication|recent login/i.test(m)) return "Par sécurité, reconnectez-vous puis réessayez.";
  return m || "L'opération n'a pas abouti.";
};

function Message({ etat }: { etat: Etat }) {
  if (!etat) return null;
  const ok = etat.type === "ok";
  return (
    <p className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-snug ${ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
      {ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
      {etat.texte}
    </p>
  );
}

const champ = "w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-sky-400/60 focus:bg-white/[0.08]";
const bouton = "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-staatliches text-lg uppercase leading-none tracking-wide text-slate-950 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50";

export default function IdentifiantsForm({ adresseModifiable = true }: { adresseModifiable?: boolean }) {
  const [courriel, setCourriel] = useState<string | null>(null);
  const [nouvelle, setNouvelle] = useState("");
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [envoiMail, setEnvoiMail] = useState(false);
  const [envoiMdp, setEnvoiMdp] = useState(false);
  const [etatMail, setEtatMail] = useState<Etat>(null);
  const [etatMdp, setEtatMdp] = useState<Etat>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCourriel(data.user?.email ?? null));
  }, []);

  const changerAdresse = async (e: React.FormEvent) => {
    e.preventDefault();
    const adresse = nouvelle.trim();
    if (!adresse || adresse === courriel) return;
    setEnvoiMail(true); setEtatMail(null);
    const { error } = await supabase.auth.updateUser(
      { email: adresse },
      { emailRedirectTo: `${window.location.origin}/auth/callback` },
    );
    setEnvoiMail(false);
    if (error) { setEtatMail({ type: "erreur", texte: traduire(error.message) }); return; }
    setNouvelle("");
    setEtatMail({ type: "ok", texte: `Un lien de confirmation a été envoyé à ${adresse}. Votre adresse changera dès que vous l'aurez cliqué (s'il vous en parvient aussi un sur l'adresse actuelle, confirmez-le également).` });
  };

  const changerMdp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mdp.length < 8) { setEtatMdp({ type: "erreur", texte: "8 caractères au minimum." }); return; }
    if (mdp !== mdp2) { setEtatMdp({ type: "erreur", texte: "Les deux saisies ne correspondent pas." }); return; }
    setEnvoiMdp(true); setEtatMdp(null);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnvoiMdp(false);
    if (error) { setEtatMdp({ type: "erreur", texte: traduire(error.message) }); return; }
    setMdp(""); setMdp2("");
    setEtatMdp({ type: "ok", texte: "Mot de passe modifié. Il vous servira dès votre prochaine connexion." });
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Adresse e-mail */}
      <form onSubmit={changerAdresse} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
          <Mail size={14} /> Adresse e-mail
        </p>
        <p className="mt-3 break-all text-lg font-bold text-white">{courriel ?? "…"}</p>
        {adresseModifiable ? (
          <>
            <label className="mt-5 block text-[11px] font-bold uppercase tracking-widest text-white/45" htmlFor="nouvelle-adresse">Nouvelle adresse</label>
            <input
              id="nouvelle-adresse" type="email" required value={nouvelle}
              onChange={e => setNouvelle(e.target.value)} placeholder="nouvelle@adresse.fr"
              className={`mt-2 ${champ}`}
            />
            <button type="submit" disabled={envoiMail || !nouvelle.trim()} className={`mt-4 w-full ${bouton}`}>
              {envoiMail ? <Loader2 size={16} className="animate-spin" /> : null} Changer d&apos;adresse
            </button>
            <Message etat={etatMail} />
          </>
        ) : (
          <p className="mt-4 text-[13px] leading-snug text-white/50">
            Votre adresse sert aussi à la facturation de votre abonnement : pour la changer, écrivez-nous
            depuis la page Contact, nous mettons les deux à jour ensemble.
          </p>
        )}
      </form>

      {/* Mot de passe */}
      <form onSubmit={changerMdp} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
          <KeyRound size={14} /> Mot de passe
        </p>
        <label className="mt-5 block text-[11px] font-bold uppercase tracking-widest text-white/45" htmlFor="nouveau-mdp">Nouveau mot de passe</label>
        <input
          id="nouveau-mdp" type="password" required minLength={8} autoComplete="new-password"
          value={mdp} onChange={e => setMdp(e.target.value)} placeholder="8 caractères au minimum"
          className={`mt-2 ${champ}`}
        />
        <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest text-white/45" htmlFor="nouveau-mdp-2">Confirmer</label>
        <input
          id="nouveau-mdp-2" type="password" required autoComplete="new-password"
          value={mdp2} onChange={e => setMdp2(e.target.value)} placeholder="Retapez-le"
          className={`mt-2 ${champ}`}
        />
        <button type="submit" disabled={envoiMdp || !mdp || !mdp2} className={`mt-4 w-full ${bouton}`}>
          {envoiMdp ? <Loader2 size={16} className="animate-spin" /> : null} Changer le mot de passe
        </button>
        <Message etat={etatMdp} />
      </form>
    </div>
  );
}
