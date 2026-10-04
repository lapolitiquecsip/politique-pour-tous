"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Copy, Check, Share2, MousePointerClick, UserPlus, Crown, Hourglass, Wallet, BadgeCheck, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { mesurerAction } from "@/lib/mesure";

/**
 * Le parrainage, côté membre : son lien, ce qu'il a rapporté, comment c'est payé.
 *
 * Ouvert à tous les comptes, abonnés ou non : on recommande un site parce qu'on
 * s'en sert, pas parce qu'on y paie. Les règles (taux, durée, délai, seuil)
 * viennent de la base et ne sont jamais écrites en dur ici.
 */

const euros = (n: number) => `${Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

type Donnees = Awaited<ReturnType<typeof api.getMonParrainage>>;

export default function Parrainage() {
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    api.getMonParrainage().then(setD).catch(() => setErreur(true));
  }, []);

  if (erreur) return <p className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70">Le parrainage n&apos;a pas pu être chargé. Réessayez dans un instant.</p>;
  if (!d) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-300" /></div>;

  const lien = `${typeof window !== "undefined" ? window.location.origin : "https://lapolitiquecestsimple.fr"}/?ref=${d.code}`;
  const pct = Math.round(d.taux * 100);
  const message = `Je suis la politique sur « La politique, c'est simple » : les lois, les votes de nos élus et l'actualité expliqués clairement. Essayez :`;

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); } catch { /* sélection manuelle possible */ }
    setCopie(true); mesurerAction("partage_parrainage");
    setTimeout(() => setCopie(false), 2000);
  };
  const partager = async () => {
    mesurerAction("partage_parrainage");
    if (navigator.share) { try { await navigator.share({ title: "La politique, c'est simple", text: message, url: lien }); } catch { /* annulé */ } }
    else void copier();
  };
  const reseaux = [
    { nom: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(`${message} ${lien}`)}`, teinte: "bg-[#25D366]" },
    { nom: "X", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(lien)}`, teinte: "bg-black ring-1 ring-white/20" },
    { nom: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(lien)}`, teinte: "bg-[#1877F2]" },
    { nom: "LinkedIn", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(lien)}`, teinte: "bg-[#0A66C2]" },
  ];

  const chiffres = [
    { titre: "Clics sur votre lien", valeur: String(d.clics), Icone: MousePointerClick },
    { titre: "Inscrits grâce à vous", valeur: String(d.inscrits), Icone: UserPlus },
    { titre: "Abonnés actifs", valeur: String(d.abonnes), Icone: Crown },
  ];
  const gains = [
    { titre: "En validation", valeur: euros(d.en_validation), detail: `${d.delai_validation_jours} jours après chaque paiement`, Icone: Hourglass, teinte: "text-white/80" },
    { titre: "Disponible", valeur: euros(d.disponible), detail: `versé par virement dès ${euros(d.seuil_versement)}`, Icone: Wallet, teinte: "text-teal-300" },
    { titre: "Déjà versé", valeur: euros(d.verse), detail: "depuis le début", Icone: BadgeCheck, teinte: "text-white/80" },
  ];

  return (
    <div className="space-y-6">
      {/* Accroche + lien */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-teal-300/25 bg-gradient-to-br from-teal-500/[0.14] via-white/[0.03] to-transparent p-6 md:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/30 bg-teal-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-200">
          <Gift size={12} /> Parrainage
        </span>
        {/* Ton sobre : on recommande un site qu'on utilise, la rétribution vient ensuite. */}
        <h3 className="mt-4 font-staatliches text-4xl uppercase leading-none text-white md:text-5xl">
          Partagez le site <span className="text-teal-300">à vos proches</span>
        </h3>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/75">
          Si quelqu&apos;un s&apos;abonne après avoir suivi votre lien, vous recevez en retour {pct} % de son abonnement,
          chaque mois pendant {d.duree_mois} mois — par exemple {euros(24.99 * d.taux)} par mois pour un abonnement Pro.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5">
            <span className="truncate font-mono text-sm text-white/90">{lien}</span>
          </div>
          <button onClick={copier}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-400 px-6 py-3.5 font-staatliches text-xl uppercase leading-none tracking-wide text-slate-950 transition hover:bg-teal-300 active:scale-[0.98]">
            {copie ? <><Check size={18} /> Copié</> : <><Copy size={18} /> Copier</>}
          </button>
          <button onClick={partager} aria-label="Partager"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 sm:hidden">
            <Share2 size={17} /> Partager
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">Partager sur</span>
          {reseaux.map(r => (
            <a key={r.nom} href={r.url} target="_blank" rel="noopener noreferrer" onClick={() => mesurerAction("partage_parrainage")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 ${r.teinte}`}>{r.nom}</a>
          ))}
          <span className="text-xs text-white/45">· votre code : <strong className="font-mono text-white/80">{d.code}</strong></span>
        </div>
      </section>

      {/* Chiffres */}
      <div className="grid gap-3 sm:grid-cols-3">
        {chiffres.map(c => (
          <div key={c.titre} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/50"><c.Icone size={14} /> {c.titre}</p>
            <p className="mt-2 text-4xl font-black tabular-nums leading-none tracking-tight text-white">{c.valeur}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {gains.map(g => (
          <div key={g.titre} className={`rounded-3xl border p-5 ${g.titre === "Disponible" ? "border-teal-300/40 bg-teal-400/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/50"><g.Icone size={14} /> {g.titre}</p>
            <p className={`mt-2 text-4xl font-black tabular-nums leading-none tracking-tight ${g.teinte}`}>{g.valeur}</p>
            <p className="mt-1.5 text-xs text-white/50">{g.detail}</p>
          </div>
        ))}
      </div>

      {d.disponible >= d.seuil_versement && (
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-teal-300/30 bg-teal-400/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/85"><strong className="text-white">{euros(d.disponible)} vous attendent.</strong> Demandez votre virement en nous indiquant votre IBAN.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-teal-300">
            <Mail size={15} /> Demander mon versement
          </Link>
        </div>
      )}

      {/* Fonctionnement */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-white/50">Comment ça marche</h4>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Partagez votre lien", "Par message, sur vos réseaux, dans une newsletter. Il reste valable 90 jours sur l'appareil de la personne."],
            ["Elle crée son compte", `Puis s'abonne à Premium ou Pro. Elle est rattachée à vous si elle s'inscrit dans les 90 jours.`],
            ["Vous recevez " + pct + " % en retour", `Sur chacun de ses paiements pendant ${d.duree_mois} mois, validés après ${d.delai_validation_jours} jours (délai de rétractation), puis versés par virement.`],
          ].map(([t, x], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400 font-black text-slate-950">{i + 1}</span>
              <div><p className="font-bold text-white">{t}</p><p className="mt-1 text-sm leading-relaxed text-white/60">{x}</p></div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs leading-relaxed text-white/40">
          Les sommes perçues sont des revenus à déclarer. Au-delà d&apos;une activité occasionnelle, un statut (par exemple micro-entrepreneur) peut être nécessaire.
          Un paiement remboursé annule la commission correspondante.
        </p>
      </section>

      {/* Historique */}
      {!!d.historique.length && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h4 className="mb-3 text-[11px] font-black uppercase tracking-widest text-white/50">Vos commissions</h4>
          <div className="divide-y divide-white/10">
            {d.historique.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-white/60">{new Date(c.creee_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="text-white/50">paiement de {euros(c.montant_paye)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${c.statut === "versee" ? "bg-white/10 text-white/70" : c.statut === "annulee" ? "bg-rose-500/15 text-rose-300" : "bg-teal-400/15 text-teal-200"}`}>
                  {c.statut === "versee" ? "Versée" : c.statut === "annulee" ? "Annulée" : "En cours"}
                </span>
                <span className="w-24 text-right font-bold tabular-nums text-white">{euros(c.commission)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
