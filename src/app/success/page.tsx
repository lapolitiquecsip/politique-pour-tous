"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, KeyRound, Layers, Loader2, Mail, MapPin, ShieldCheck, Users, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Retour du paiement (refait le 02/11/2026).
 *
 * Les liens de paiement s'ouvrent sans être connecté : la page affirmait « votre compte est
 * Premium » sans rien vérifier, puis son bouton menait à la page de vente. Elle relie maintenant
 * le navigateur au compte de l'achat (fonction session-paiement), ne dit « actif » qu'une fois
 * l'abonnement lu en base, et n'a qu'une action : ouvrir le guide de personnalisation.
 *
 * Le lien vers le guide recharge la page (<a>, pas <Link>) : le niveau d'abonnement est gardé en
 * mémoire quelques secondes, et il faut ici le relire tout juste activé.
 */
type Offre = "elite" | "pro";
type Etat =
  | { nom: "chargement" }
  | { nom: "pret"; offre: Offre; email: string; nouveau: boolean }
  | { nom: "activation"; email: string }                 // connecté, mais Stripe n'a pas encore prévenu
  | { nom: "lien"; offre: Offre | null; email: string; envoye: boolean }
  | { nom: "autre_compte"; offre: Offre | null; email: string; actuel: string }
  | { nom: "sans_session" };                             // arrivée sans identifiant de paiement, non connecté

const GUIDE = "/premium/?bienvenue=1";
const CONNEXION = `/login/?suite=${encodeURIComponent(GUIDE)}&retour_paiement=1`;
const nomOffre = (o: Offre | null) => (o === "pro" ? "Pro" : o === "elite" ? "Premium" : "");
const ETAPES = [
  { Icone: UserRound, texte: "Votre situation" },
  { Icone: MapPin, texte: "Votre territoire" },
  { Icone: Layers, texte: "Vos sujets" },
  { Icone: Users, texte: "Vos élus à suivre" },
];

/** Le niveau lu en base : c'est le webhook de Stripe qui l'écrit, parfois quelques secondes après le retour. */
async function attendreNiveau(userId: string): Promise<Offre | null> {
  for (let essai = 0; essai < 15; essai++) {
    const { data } = await supabase.from("profiles").select("subscription_tier, is_premium").eq("id", userId).maybeSingle();
    const t = String(data?.subscription_tier || "").toLowerCase();
    if (t === "pro") return "pro";
    if (t === "elite" || data?.is_premium) return "elite";
    await new Promise(fin => setTimeout(fin, 2000));
  }
  return null;
}

export default function SuccessPage() {
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });
  const lance = useRef(false);

  const finirConnecte = useCallback(async (userId: string, email: string, nouveau: boolean) => {
    const offre = await attendreNiveau(userId);
    setEtat(offre ? { nom: "pret", offre, email, nouveau } : { nom: "activation", email });
  }, []);

  const appeler = useCallback(async (sessionId: string, renvoyer = false) => {
    const { data, error } = await supabase.functions.invoke("session-paiement", { body: { session_id: sessionId, renvoyer } });
    if (error) throw error;
    return data as { etat: string; offre?: Offre; email?: string; token_hash?: string; nouveau?: boolean; envoye?: boolean };
  }, []);

  useEffect(() => {
    if (lance.current) return;   // le jeton de connexion ne sert qu'une fois
    lance.current = true;
    (async () => {
      const sessionId = new URLSearchParams(window.location.search).get("session_id");
      const { data: { session } } = await supabase.auth.getSession();
      const moi = session?.user ?? null;

      if (!sessionId) {
        if (moi) await finirConnecte(moi.id, moi.email ?? "", false);
        else setEtat({ nom: "sans_session" });
        return;
      }
      const r = await appeler(sessionId);
      if (r.etat === "connecte" && moi) return finirConnecte(moi.id, moi.email ?? "", false);
      if (r.etat === "autre_compte" && moi) return setEtat({ nom: "autre_compte", offre: r.offre ?? null, email: r.email ?? "", actuel: moi.email ?? "" });
      if (r.etat === "lien") return setEtat({ nom: "lien", offre: r.offre ?? null, email: r.email ?? "", envoye: !!r.envoye });
      if (r.etat === "connexion" && r.token_hash) {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: r.token_hash, type: "magiclink" });
        if (data?.user && !error) return finirConnecte(data.user.id, data.user.email ?? "", true);
        const secours = await appeler(sessionId, true);
        return setEtat({ nom: "lien", offre: r.offre ?? null, email: r.email ?? "", envoye: !!secours.envoye });
      }
      if (moi) return finirConnecte(moi.id, moi.email ?? "", false);
      setEtat({ nom: "sans_session" });
    })().catch(() => setEtat({ nom: "sans_session" }));
  }, [appeler, finirConnecte]);

  const renvoyer = async () => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    return id ? !!(await appeler(id, true)).envoye : false;
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-5rem)] items-start justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-4 pb-16 pt-6 text-white md:items-center md:py-16">
      <div aria-hidden className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-amber-500/25 blur-[110px]" />{" "}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-[110px]" />{" "}
      <div className="relative w-full max-w-md">
        {etat.nom === "chargement" && <Chargement />}
        {etat.nom === "pret" && <Pret offre={etat.offre} email={etat.email} nouveau={etat.nouveau} />}
        {etat.nom === "activation" && <Activation email={etat.email} />}
        {etat.nom === "lien" && <LienEnvoye offre={etat.offre} email={etat.email} envoye={etat.envoye} renvoyer={renvoyer} />}
        {etat.nom === "autre_compte" && (
          <AutreCompte offre={etat.offre} email={etat.email} actuel={etat.actuel} changer={async () => {
            await supabase.auth.signOut();
            const envoye = await renvoyer().catch(() => false);
            setEtat({ nom: "lien", offre: etat.offre, email: etat.email, envoye });
          }} />
        )}
        {etat.nom === "sans_session" && <SansSession />}
      </div>
    </div>
  );
}

function PastilleOk({ texte }: { texte: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[12px] font-black text-emerald-300 ring-1 ring-emerald-400/30">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-slate-950"><Check size={11} strokeWidth={4} /></span>{" "}
      {texte}
    </p>
  );
}

function Chargement() {
  return (
    <div className="pt-16 text-center" role="status">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-400" />{" "}
      <p className="mt-4 text-lg font-bold">Nous activons votre abonnement…</p>{" "}
      <p className="mt-1 text-sm text-white/60">Quelques secondes, ne fermez pas cette page.</p>
    </div>
  );
}

/** L'état attendu : un seul bouton, celui qui rend l'abonnement utile. */
function Pret({ offre, email, nouveau }: { offre: Offre; email: string; nouveau: boolean }) {
  const pro = offre === "pro";
  return (
    <>
      <PastilleOk texte="Paiement confirmé" />{" "}
      <h1 className="mt-4 font-staatliches text-[44px] uppercase leading-[0.95] tracking-tight md:text-6xl">
        Bienvenue dans <span className={pro ? "text-fuchsia-300" : "text-amber-400"}>{nomOffre(offre)}</span>
      </h1>{" "}
      <p className="mt-3 text-[16px] leading-relaxed text-white/75">
        Dernière étape : dites-nous ce qui vous concerne, et vos alertes se règlent toutes seules.
      </p>{" "}

      <ul className="mt-5 grid grid-cols-2 gap-2">
        {ETAPES.map(({ Icone, texte }) => (
          <li key={texte} className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[13px] font-bold ring-1 ring-white/10">
            <Icone size={15} className={`shrink-0 ${pro ? "text-fuchsia-300" : "text-amber-400"}`} />{" "}
            {texte}
          </li>
        ))}
      </ul>{" "}

      <a href={GUIDE} className={`group mt-5 flex min-h-[60px] w-full items-center justify-center gap-2.5 rounded-2xl px-5 text-[17px] font-black shadow-xl transition hover:brightness-110 active:scale-[0.99] ${pro
        ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-fuchsia-500/25"
        : "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/25"}`}>
        Personnaliser mes alertes <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
      </a>{" "}
      <p className="mt-2.5 text-center text-[13px] font-bold text-white/60">{pro ? "3 minutes" : "2 minutes"}, modifiable à tout moment</p>{" "}

      {nouveau && <MotDePasse email={email} />}{" "}

      <p className="mt-5 text-center text-[13px] text-white/55">
        <a href="/premium/" className="font-bold underline underline-offset-4 hover:text-white">Plus tard, aller à mon espace</a>
      </p>{" "}
      <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-[12px] leading-snug text-white/45">
        <ShieldCheck size={13} className="mt-px shrink-0" /> Confirmation envoyée par e-mail. Sans engagement, résiliable en ligne à tout moment.
      </p>
    </>
  );
}

/** Le compte vient d'être créé pour l'acheteur : le mot de passe reste facultatif, un lien par e-mail suffit à revenir. */
function MotDePasse({ email }: { email: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [mdp, setMdp] = useState("");
  const [fait, setFait] = useState<"" | "envoi" | "ok" | "erreur">("");
  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mdp.length < 6) { setFait("erreur"); return; }
    setFait("envoi");
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setFait(error ? "erreur" : "ok");
  };
  return (
    <div className="mt-5 rounded-2xl bg-white/[0.05] p-3.5 text-[13px] leading-snug text-white/70 ring-1 ring-white/10">
      <p>Votre compte a été créé avec <strong className="break-all text-white">{email}</strong>. Pour revenir, un lien envoyé à cette adresse suffit.</p>{" "}
      {fait === "ok" ? <p className="mt-2 font-bold text-emerald-300">Mot de passe enregistré.</p>
        : !ouvert ? <button type="button" onClick={() => setOuvert(true)} className="mt-2 font-bold text-white underline underline-offset-4">Choisir un mot de passe (facultatif)</button>
        : (
          <form onSubmit={enregistrer} className="mt-2.5 flex gap-2">
            <input type="password" value={mdp} onChange={e => setMdp(e.target.value)} autoComplete="new-password" aria-label="Mot de passe" placeholder="6 caractères minimum"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-[16px] text-white placeholder-white/40 focus:border-amber-400/60 focus:outline-none" />{" "}
            <button type="submit" disabled={fait === "envoi"} className="min-h-[44px] rounded-xl bg-white px-4 font-black text-slate-900 disabled:opacity-60">OK</button>
          </form>
        )}{" "}
      {fait === "erreur" && <p className="mt-2 font-bold text-rose-300">6 caractères au minimum. Si l&apos;erreur persiste, un lien par e-mail reste possible.</p>}
    </div>
  );
}

function Activation({ email }: { email: string }) {
  return (
    <>
      <PastilleOk texte="Paiement reçu" />{" "}
      <h1 className="mt-4 font-staatliches text-[40px] uppercase leading-[0.95] tracking-tight">Activation en cours</h1>{" "}
      <p className="mt-3 text-[16px] leading-relaxed text-white/75">
        Votre abonnement met plus de temps que prévu à s&apos;activer sur <strong className="break-all text-white">{email || "votre compte"}</strong>. Rien n&apos;est perdu : cela se règle en général en une minute.
      </p>{" "}
      <button type="button" onClick={() => window.location.reload()} className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-[16px] font-black text-slate-900">
        Vérifier à nouveau
      </button>{" "}
      <p className="mt-4 text-center text-[13px] text-white/60">
        Toujours rien ? <Link href="/contact" className="font-bold underline underline-offset-4">Écrivez-nous</Link>, nous l&apos;activons à la main.
      </p>
    </>
  );
}

/** Compte déjà existant : on ne connecte jamais d'office, le lien prouve que l'adresse est bien la sienne. */
function LienEnvoye({ offre, email, envoye, renvoyer }: { offre: Offre | null; email: string; envoye: boolean; renvoyer: () => Promise<boolean> }) {
  const [renvoi, setRenvoi] = useState<"" | "envoi" | "ok" | "echec">(envoye ? "" : "echec");
  return (
    <>
      <PastilleOk texte={`Abonnement ${nomOffre(offre)} activé`} />{" "}
      <h1 className="mt-4 font-staatliches text-[44px] uppercase leading-[0.95] tracking-tight">Ouvrez votre <span className="text-amber-400">e-mail</span></h1>{" "}
      <p className="mt-3 text-[16px] leading-relaxed text-white/75">
        Cette adresse a déjà un compte. Par sécurité, confirmez que c&apos;est bien le vôtre : le lien envoyé à <strong className="break-all text-white">{email}</strong> vous connecte et ouvre vos réglages.
      </p>{" "}
      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Mail size={20} /></span>{" "}
        <p className="text-[13px] leading-snug text-white/70">Le lien arrive en moins d&apos;une minute. Pensez à regarder dans les courriers indésirables.</p>
      </div>{" "}
      <a href={CONNEXION} className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-[16px] font-black text-slate-900">
        <KeyRound size={18} className="shrink-0" /> Me connecter par mot de passe
      </a>{" "}
      <button type="button" disabled={renvoi === "envoi"} onClick={async () => { setRenvoi("envoi"); setRenvoi((await renvoyer().catch(() => false)) ? "ok" : "echec"); }}
        className="mt-3 min-h-[44px] w-full text-center text-[14px] font-bold text-white/75 underline underline-offset-4 disabled:opacity-60">
        {renvoi === "envoi" ? "Envoi…" : renvoi === "ok" ? "Lien renvoyé" : "Renvoyer le lien"}
      </button>{" "}
      {renvoi === "echec" && <p className="mt-1 text-center text-[13px] font-bold text-rose-300">L&apos;envoi a échoué. Réessayez, ou connectez-vous avec votre mot de passe.</p>}
    </>
  );
}

function AutreCompte({ offre, email, actuel, changer }: { offre: Offre | null; email: string; actuel: string; changer: () => void }) {
  return (
    <>
      <PastilleOk texte="Paiement confirmé" />{" "}
      <h1 className="mt-4 font-staatliches text-[40px] uppercase leading-[0.95] tracking-tight">Un autre compte est ouvert</h1>{" "}
      <p className="mt-3 text-[16px] leading-relaxed text-white/75">
        Votre abonnement {nomOffre(offre)} est lié à <strong className="break-all text-white">{email}</strong>, mais vous êtes connecté avec <strong className="break-all text-white">{actuel}</strong>.
      </p>{" "}
      <button type="button" onClick={changer} className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 text-[16px] font-black text-slate-950">
        Passer sur le compte de l&apos;abonnement <ArrowRight size={18} />
      </button>{" "}
      <p className="mt-4 text-center text-[13px] text-white/60">
        Vous vouliez l&apos;autre compte ? <Link href="/contact" className="font-bold underline underline-offset-4">Écrivez-nous</Link>, nous le déplaçons.
      </p>
    </>
  );
}

/** Arrivée sans identifiant de paiement et sans connexion : l'adresse utilisée chez Stripe suffit. */
function SansSession() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"" | "envoi" | "ok" | "echec">("");
  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("envoi");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${GUIDE}` },
    });
    // Une adresse sans compte ne doit pas se distinguer d'une autre : même réponse. Seule la limite d'envoi est signalée.
    setEtat(error?.status === 429 ? "echec" : "ok");
  };
  return (
    <>
      <PastilleOk texte="Merci pour votre abonnement" />{" "}
      <h1 className="mt-4 font-staatliches text-[44px] uppercase leading-[0.95] tracking-tight">Accédez à votre <span className="text-amber-400">espace</span></h1>{" "}
      {etat === "ok" ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Mail size={20} /></span>{" "}
          <p className="text-[14px] leading-snug text-white/80">Si cette adresse est celle de votre abonnement, le lien de connexion arrive en moins d&apos;une minute.</p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[16px] leading-relaxed text-white/75">Saisissez l&apos;adresse utilisée pour le paiement : nous vous envoyons un lien qui vous connecte et ouvre vos réglages.</p>{" "}
          <form onSubmit={envoyer} className="mt-5">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" aria-label="Adresse e-mail" placeholder="exemple@mail.com"
              className="min-h-[56px] w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-[16px] text-white placeholder-white/40 focus:border-amber-400/60 focus:outline-none" />{" "}
            <button type="submit" disabled={etat === "envoi"} className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 text-[16px] font-black text-slate-950 disabled:opacity-60">
              {etat === "envoi" ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} Recevoir mon lien
            </button>
          </form>{" "}
          {etat === "echec" && <p className="mt-2 text-center text-[13px] font-bold text-rose-300">Un lien vient déjà de partir : regardez vos e-mails, ou réessayez dans une minute.</p>}
        </>
      )}{" "}
      <a href={CONNEXION} className="mt-4 block min-h-[44px] pt-2 text-center text-[14px] font-bold text-white/75 underline underline-offset-4">
        Me connecter avec mon mot de passe
      </a>
    </>
  );
}
