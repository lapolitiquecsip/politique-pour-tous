"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, ShieldCheck, Crown, ScrollText, Vote, BellRing, Mail, Landmark, Sparkles, Check, ArrowRight, type LucideIcon } from "lucide-react";
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
 *
 * Premium (22/11/2026) : la fenêtre s'ouvre aussi depuis la carte « Essai gratuit » de
 * l'accueil, sans passer par /premium. Elle montre donc d'abord ce que l'abonnement apporte,
 * avec de vraies captures du site (public/premium-apercu, tirées des captures des vidéos de
 * l'offre). Le récapitulatif légal, lui, est inchangé.
 */
type Props = {
  cle: "elite" | "pro"; offre: string; prix: string; periode: "mois" | "an"; userId: string | null;
  onFermer: () => void; onContinuer: () => void;
};

export default function AccordAchat(props: Props) {
  const { onFermer } = props;
  // Fenêtre au premier plan : la page ne défile plus derrière, Échap ferme.
  useEffect(() => {
    const avant = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", touche);
    return () => { document.documentElement.style.overflow = avant; window.removeEventListener("keydown", touche); };
  }, [onFermer]);

  if (props.cle === "elite") return <FenetrePremium {...props} />;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="accord-titre" className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onFermer}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="accord-titre" className="text-lg font-black text-slate-900 dark:text-white">Votre abonnement {props.offre}</h2>{" "}
          <button onClick={onFermer} aria-label="Fermer" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>{" "}
        <Formulaire {...props} />
      </div>
    </div>
  );
}

/* ─────────────────────────── Le récapitulatif légal et l'accord ─────────────────────────── */

function Formulaire({ cle, offre, prix, periode, userId, onContinuer, premium = false }: Props & { premium?: boolean }) {
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
  const pret = cgv && immediat && !envoi;

  return (
    <>
      <ul className={`mt-3 space-y-1.5 leading-relaxed ${premium ? "text-[13px] text-slate-600 dark:text-slate-400" : "text-sm"}`}>
        {cle === "elite"
          ? <li><strong className="text-slate-900 dark:text-white">7 jours d&apos;essai gratuit</strong>, puis <strong className="text-slate-900 dark:text-white">{prix} TTC par {periode}</strong>. Rien n&apos;est prélevé si vous résiliez pendant l&apos;essai.</li>
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

      <button onClick={continuer} disabled={!pret}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 ${premium && pret ? "sword-shine shadow-[0_12px_34px_-8px_rgba(245,158,11,0.7)]" : ""}`}>
        {envoi ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {cle === "elite" ? (premium ? "Démarrer mes 7 jours gratuits" : "Démarrer l'essai gratuit") : "Continuer vers le paiement"}
      </button>{" "}
      {premium && !cgv && !immediat && <p className="mt-2 text-center text-[11px] font-semibold text-amber-700 dark:text-amber-300">Cochez les deux cases pour continuer.</p>}
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
    </>
  );
}

/* ─────────────────────────── Premium : la vitrine, puis l'accord ─────────────────────────── */

// Chaque ligne correspond à un verrou réel du site (voir COMPARATIF dans app/premium/page.tsx) ;
// chaque image est une capture réelle de l'interface d'un membre Premium.
const ATOUTS: { id: string; court: string; Icone: LucideIcon; titre: string; texte: string; image: string; alt: string }[] = [
  { id: "loi", court: "Lois", Icone: ScrollText, titre: "Chaque loi, analysée en détail",
    texte: "Toutes les mesures, une par une : ce qui existait avant, ce qui change, les chiffres clés, qui est concerné et quand ça s'applique.",
    image: "/premium-apercu/loi.webp", alt: "Analyse détaillée d'une loi : chaque mesure avec la situation avant et ce qui change" },
  { id: "vote", court: "Votes", Icone: Vote, titre: "Chaque vote décrypté",
    texte: "Comment a voté chaque groupe, scrutin par scrutin, et ce que votaient vos élus.",
    image: "/premium-apercu/vote.webp", alt: "Détail d'un scrutin : le vote de chaque groupe de l'Assemblée" },
  { id: "elus", court: "Élus suivis", Icone: BellRing, titre: "Vos élus suivis",
    texte: "Suivez vos députés, sénateurs et candidats : une alerte à chacun de leurs votes, réunies dans votre espace.",
    image: "/premium-apercu/alertes.webp", alt: "Espace Premium : les alertes sur les votes des élus suivis" },
  { id: "mail", court: "E-mails", Icone: Mail, titre: "Un e-mail à chaque texte voté",
    texte: "Le résultat, le vote de chaque groupe, de vos élus et de vos partis, dès que le scrutin officiel est publié.",
    image: "/premium-apercu/mail.webp", alt: "E-mail d'alerte reçu après le vote d'un texte" },
  { id: "budget", court: "Budget", Icone: Landmark, titre: "Le budget de l'État décrypté",
    texte: "Le projet de loi de finances en détail : les grands chiffres, ce qui augmente, ce qui baisse, comparé aux années précédentes.",
    image: "/premium-apercu/budget.webp", alt: "Budget 2027 décrypté : l'essentiel en un coup d'œil" },
];
const AUSSI = ["Les coulisses des niches parlementaires", "Les auditions des ministres résumées", "Des alertes sur votre territoire"];
const ROTATION_MS = 4500;

/**
 * Publicité Premium (23/11/2026) : film de 20 s, sans son, en 16:9 pour ce cadre (ordinateur et
 * téléphone), tourné avec de vraies captures du site (projet motion-lpcs, composition PubPremiumSite).
 * Les pastilles suivent le film ; un clic sur une pastille y saute. En cas d'échec de lecture,
 * on revient au diaporama de captures.
 */
const VIDEO = { src: "/premium-apercu/pub-premium.mp4", affiche: "/premium-apercu/pub-premium.jpg" };
const DEBUTS = [2.1, 5.0, 8.0, 11.0, 14.0];   // secondes : Lois, Votes, Élus suivis, E-mails, Budget
// À partir de 17 s : la scène « espace Premium » puis la conclusion — aucune pastille, légende dédiée.
const atoutAuTemps = (t: number) => (t < 5 ? 0 : t < 8 ? 1 : t < 11 ? 2 : t < 14 ? 3 : t < 17 ? 4 : -1);
const ESPACE = { id: "espace", court: "Espace", Icone: Crown, titre: "Tout, centralisé dans votre espace Premium",
  texte: "Vos alertes, vos élus, vos lois et votre territoire, au même endroit.", image: "/premium-apercu/alertes.webp", alt: "Mon espace Premium" };

function FenetrePremium(props: Props) {
  const { onFermer, prix } = props;
  const [actif, setActif] = useState(0);
  const [auto, setAuto] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(true);
  useEffect(() => {
    if (!auto || videoOk) return;
    const t = setTimeout(() => setActif(a => (a + 1) % ATOUTS.length), ROTATION_MS);
    return () => clearTimeout(t);
  }, [actif, auto, videoOk]);
  const choisir = (i: number) => {
    setAuto(false); setActif(i);
    const v = video.current;
    if (videoOk && v) { v.currentTime = DEBUTS[i] + 0.2; void v.play().catch(() => {}); }
  };
  const a = actif >= 0 ? ATOUTS[actif] : ESPACE;
  const offre = useRef<HTMLElement>(null);
  const [offreVue, setOffreVue] = useState(false);
  useEffect(() => {
    const el = offre.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOffreVue(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="accord-titre"
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/75 backdrop-blur-md sm:items-center sm:p-4" onClick={onFermer}>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}
        className="relative w-full max-w-5xl overflow-hidden rounded-t-[28px] bg-white shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)] ring-1 ring-amber-300/40 dark:bg-slate-900 sm:rounded-[28px]"
        onClick={e => e.stopPropagation()}>
        {/* La croix reste en place : elle est hors de la zone qui défile. */}
        <button onClick={onFermer} aria-label="Fermer"
          className="absolute right-3 top-3 z-30 rounded-full bg-slate-900/40 p-1.5 text-white/90 backdrop-blur transition hover:bg-slate-900/60 hover:text-white md:bg-slate-900/5 md:text-slate-500 md:hover:bg-slate-900/10 md:hover:text-slate-800 dark:md:text-slate-400">
          <X size={18} />
        </button>
        {/* Un seul défilement pour toute la fenêtre (23/11/2026) : avant, chaque colonne défilait
            seule dans une hauteur bloquée, et le bas du formulaire devenait inaccessible. */}
        <div className="grid max-h-[94dvh] overflow-y-auto overscroll-contain scroll-smooth scrollbar-hide md:grid-cols-[1.3fr_1fr]">

        {/* ═════ La vitrine ═════ */}
        <section className="relative overflow-hidden bg-[#0a0f1f] px-5 pb-6 pt-6 text-white md:px-8 md:py-8">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-500/25 blur-[90px]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-yellow-300/10 blur-[100px]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-300/15 to-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
              <Crown size={12} className="text-amber-300" /> Premium
            </span>
            <h2 id="accord-titre" className="mt-3 font-staatliches text-[2.2rem] uppercase leading-[0.9] tracking-tight md:text-[2.6rem]">
              Comprenez <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent">vraiment</span> la politique.
            </h2>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-slate-300">Ce que vous débloquez dès aujourd&apos;hui, gratuitement pendant 7 jours :</p>

            {/* Les atouts : une pastille par fonction, qui montre sa capture */}
            <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Fonctions Premium">
              {ATOUTS.map((x, i) => {
                const on = i === actif;
                return (
                  <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => choisir(i)}
                    className={`relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.4)]" : "bg-white/[0.06] text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1]"}`}>
                    <x.Icone size={14} /> {x.court}
                    {on && auto && !videoOk && (
                      <motion.span key={`p${actif}`} aria-hidden className="absolute bottom-0 left-0 h-[2px] bg-slate-950/40"
                        initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: ROTATION_MS / 1000, ease: "linear" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Le film Premium (16:9), et sa légende synchronisée */}
            <div className="relative mt-4">
              <div aria-hidden className="absolute -inset-3 rounded-[22px] bg-gradient-to-br from-amber-300/30 via-amber-500/10 to-transparent blur-xl" />
              <div className="relative overflow-hidden rounded-2xl border border-amber-300/25 bg-[#0a0f1f] shadow-2xl">
                <div className="relative aspect-[16/9]">
                  {videoOk ? (
                    <video ref={video} src={VIDEO.src} poster={VIDEO.affiche} autoPlay muted loop playsInline preload="auto"
                      aria-label="Ce que débloque Premium : analyses des lois, votes décryptés, élus suivis, alertes par e-mail, budget de l'État"
                      onTimeUpdate={e => setActif(atoutAuTemps(e.currentTarget.currentTime))}
                      onError={() => setVideoOk(false)}
                      className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.img key={a.id} src={a.image} alt={a.alt} loading="eager"
                        initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
                        className="absolute inset-0 h-full w-full bg-white object-cover object-top" />
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                className="mt-4 flex min-h-[72px] items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.4)]"><a.Icone size={17} /></span>
                <span>
                  <span className="block text-[16px] font-black leading-snug text-white">{a.titre}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-400">{a.texte}</span>
                </span>
              </motion.div>
            </AnimatePresence>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
              <span className="font-bold text-amber-200/90">Et aussi</span>
              {AUSSI.map(x => <span key={x} className="inline-flex items-center gap-1"><Check size={12} className="text-amber-300" /> {x}</span>)}
            </p>
          </div>
        </section>

        {/* ═════ L'offre et l'accord ═════ */}
        <section ref={offre} className="flex flex-col p-6 md:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Votre essai Premium</p>
          <div className="mt-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50/40 p-4 dark:border-amber-400/30 dark:from-amber-400/10 dark:to-transparent">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400">Aujourd&apos;hui</p>
                <p className="font-staatliches text-5xl leading-none text-slate-900 dark:text-white">0 €</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400">Après 7 jours</p>
                <p className="text-[15px] font-black text-slate-900 dark:text-white">{prix} <span className="text-[12px] font-semibold text-slate-500">/ mois</span></p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-amber-200/70 pt-3 text-[12px] font-semibold text-slate-700 dark:border-amber-400/20 dark:text-slate-300">
              <span className="inline-flex items-center gap-1"><Sparkles size={12} className="text-amber-500" /> Accès immédiat</span>
              <span className="inline-flex items-center gap-1"><Check size={12} className="text-amber-500" /> Sans engagement</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-amber-500" /> Paiement Stripe</span>
            </div>
          </div>
          <Formulaire {...props} premium />
        </section>

        {/* Téléphone : la vitrine est longue, l'essai reste à portée de pouce jusqu'à l'offre. */}
        {!offreVue && (
          <div className="sticky bottom-0 z-10 col-span-full border-t border-amber-300/30 bg-[#0a0f1f]/95 p-3 backdrop-blur md:hidden">
            <button type="button" onClick={() => offre.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="sword-shine flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-5 py-3.5 text-slate-950 shadow-[0_10px_30px_-8px_rgba(245,158,11,0.7)]">
              <span className="text-left"><span className="block text-[11px] font-bold opacity-70">Aujourd&apos;hui</span><span className="font-staatliches text-2xl leading-none">0 €</span></span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wider">Démarrer l&apos;essai <ArrowRight size={16} /></span>
            </button>
          </div>
        )}
        </div>
      </motion.div>
    </div>
  );
}
