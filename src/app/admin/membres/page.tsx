"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Crown, Star, UserPlus, Activity, Euro, Search, Download, Loader2, Lock, Gift, BarChart3, ShieldCheck, MailWarning } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Les membres du site : tous les comptes, les abonnés, d'où ils viennent.
 *
 * Lue par une fonction de la base réservée aux administrateurs (`membres_admin`).
 * Le paiement fait foi dans Stripe ; ici, c'est le niveau d'accès du compte, mis à
 * jour par le webhook à chaque achat, renouvellement ou résiliation.
 */

type Membre = {
  id: string; email: string; cree_le: string; derniere_connexion: string | null; confirme: boolean;
  niveau: "free" | "elite" | "pro"; stripe_customer_id: string | null; parrain: string | null;
  filleuls: number; administrateur: boolean; offert?: boolean;
};

const NIVEAUX = {
  free: { libelle: "Classique", classe: "bg-slate-100 text-slate-600" },
  elite: { libelle: "Premium", classe: "bg-amber-100 dark:bg-amber-500/10 text-amber-800" },
  pro: { libelle: "Pro", classe: "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300" },
} as const;

const date = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
const euros = (n: number) => `${Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function Carte({ titre, valeur, detail, Icone, teinte }: { titre: string; valeur: string; detail?: string; Icone: typeof Users; teinte: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${teinte}`}><Icone size={19} /></span>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{titre}</p>
      </div>
      <p className="mt-3 text-4xl font-black tabular-nums leading-none tracking-tight text-slate-900">{valeur}</p>
      {detail && <p className="mt-1.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export default function MembresPage() {
  const [d, setD] = useState<any | null>(null);
  const [refus, setRefus] = useState(false);
  const [filtre, setFiltre] = useState<"tous" | "abonnes" | "elite" | "pro" | "free">("tous");
  const [recherche, setRecherche] = useState("");
  // Changement de niveau en deux temps (choisir, puis confirmer) : un mauvais clic
  // dans la liste ne doit pas donner ni retirer un abonnement.
  const [modif, setModif] = useState<{ id: string; niveau: Membre["niveau"] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const recharger = () => api.getMembresAdmin().then(setD).catch(() => setRefus(true));
  const confirmer = async () => {
    if (!modif) return;
    const m = membres.find(x => x.id === modif.id);
    try {
      const r = await api.definirNiveau(modif.id, modif.niveau);
      setMessage(r === "ok" ? `${m?.email} est maintenant ${NIVEAUX[modif.niveau].libelle}${modif.niveau !== "free" ? " (accès offert)" : ""}.` : "Changement impossible.");
      setModif(null); void recharger();
    } catch (e: any) { setMessage(e?.message ?? "Erreur"); }
  };

  useEffect(() => {
    api.getMembresAdmin().then(setD).catch(() => setRefus(true));
  }, []);

  const membres: Membre[] = useMemo(() => d?.membres ?? [], [d]);
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return membres.filter(m =>
      (filtre === "tous" || (filtre === "abonnes" ? m.niveau !== "free" : m.niveau === filtre))
      && (!q || m.email?.toLowerCase().includes(q) || (m.parrain ?? "").toLowerCase().includes(q)));
  }, [membres, filtre, recherche]);

  const exporter = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const tete = ["E-mail", "Inscription", "Dernière connexion", "Adresse confirmée", "Niveau", "Parrain", "Filleuls", "Client Stripe"];
    const lignes = visibles.map(m => [m.email, date(m.cree_le), date(m.derniere_connexion), m.confirme ? "oui" : "non",
      NIVEAUX[m.niveau]?.libelle ?? m.niveau, m.parrain ?? "", m.filleuls, m.stripe_customer_id ?? ""].map(esc).join(";"));
    const blob = new Blob(["﻿" + [tete.map(esc).join(";"), ...lignes].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `membres-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (refus) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Lock className="mx-auto mb-3 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Accès réservé</h1>
        <p className="mt-2 text-sm text-slate-500">La liste des membres est réservée aux administrateurs du site.</p>
        <Link href="/login" className="mt-5 inline-block rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Se connecter</Link>
      </div>
    );
  }
  if (!d) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-slate-400" /></div>;

  const t = d.totaux ?? {};
  // Inscriptions des 30 derniers jours, jours vides compris.
  const parJour = new Map<string, number>((d.inscriptions_par_jour ?? []).map((x: any) => [x.jour, x.n]));
  const jours = Array.from({ length: 30 }, (_, i) => {
    const j = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10);
    return { jour: j, n: Number(parJour.get(j) ?? 0) };
  });
  const maxJour = Math.max(1, ...jours.map(j => j.n));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-staatliches text-5xl uppercase leading-none text-slate-900">Membres</h1>
          <p className="mt-2 text-sm text-slate-500">Tous les comptes du site, leurs abonnements et d&apos;où ils viennent.</p>
        </div>
        <Link href="/admin/statistiques" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
          <BarChart3 size={16} /> Statistiques de visite
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Carte titre="Comptes" valeur={String(t.comptes ?? 0)} detail={`${t.confirmes ?? 0} adresses confirmées · ${t.actifs_7j ?? 0} connectés cette semaine`} Icone={Users} teinte="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300" />
        <Carte titre="Abonnés" valeur={String((t.premium ?? 0) + (t.pro ?? 0))} detail={`${t.premium ?? 0} Premium · ${t.pro ?? 0} Pro${t.offerts ? ` · dont ${t.offerts} offert${t.offerts > 1 ? "s" : ""}` : ""}`} Icone={Crown} teinte="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" />
        <Carte titre="Revenu mensuel" valeur={euros(t.revenu_mensuel_estime ?? 0)} detail="estimé d'après les abonnés actuels (Stripe fait foi)" Icone={Euro} teinte="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" />
        <Carte titre="Nouveaux" valeur={String(t.nouveaux_7j ?? 0)} detail={`cette semaine · ${t.nouveaux_30j ?? 0} sur 30 jours · ${t.parraines ?? 0} parrainés`} Icone={UserPlus} teinte="bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300" />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-slate-600"><Activity size={15} /> Inscriptions, 30 derniers jours</h2>
        <div className="flex h-36 gap-1">
          {jours.map(j => (
            <div key={j.jour} className="flex flex-1 flex-col items-center" title={`${new Date(j.jour).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${j.n} inscription${j.n > 1 ? "s" : ""}`}>
              <div className="relative w-full flex-1">
                <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-violet-500/85" style={{ height: `${(j.n / maxJour) * 100}%`, minHeight: j.n ? 3 : 1 }} />
              </div>
              <span className="mt-1 h-3 text-[9px] font-bold text-slate-400">{new Date(j.jour).getDate() % 5 === 0 ? new Date(j.jour).getDate() : ""}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {([["tous", `Tous · ${membres.length}`], ["abonnes", `Abonnés · ${(t.premium ?? 0) + (t.pro ?? 0)}`], ["elite", `Premium · ${t.premium ?? 0}`], ["pro", `Pro · ${t.pro ?? 0}`], ["free", "Classiques"]] as const).map(([cle, libelle]) => (
            <button key={cle} onClick={() => setFiltre(cle)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition ${filtre === cle ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {libelle}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Chercher une adresse…"
              className="w-56 rounded-full border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
          </div>
          <button onClick={exporter} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50">
            <Download size={14} /> Export CSV
          </button>
        </div>

        {message && <p className="mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>}
        <p className="mb-2 text-xs text-slate-400">Cliquez sur le niveau d&apos;un membre pour lui donner ou lui retirer un accès Premium ou Pro. Un accès donné ici est marqué « offert » et ne compte pas dans le revenu.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-2">Membre</th><th>Niveau</th><th>Inscription</th><th>Dernière connexion</th><th>Venu par</th><th className="text-right">Filleuls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibles.map(m => (
                <tr key={m.id}>
                  <td className="py-2.5">
                    <span className="font-semibold text-slate-800">{m.email}</span>
                    {m.administrateur && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300"><ShieldCheck size={11} /> admin</span>}
                    {!m.confirme && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300" title="L'adresse n'a pas encore été confirmée"><MailWarning size={11} /> non confirmée</span>}
                  </td>
                  <td>
                    {modif?.id === m.id ? (
                      <span className="inline-flex items-center gap-1">
                        <select value={modif.niveau} onChange={e => setModif({ id: m.id, niveau: e.target.value as Membre["niveau"] })}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold">
                          <option value="free">Classique</option><option value="elite">Premium</option><option value="pro">Pro</option>
                        </select>
                        <button onClick={() => void confirmer()} disabled={modif.niveau === m.niveau}
                          className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white disabled:opacity-30">Confirmer</button>
                        <button onClick={() => setModif(null)} className="px-1.5 text-[11px] font-bold text-slate-400">Annuler</button>
                      </span>
                    ) : (
                      <button onClick={() => { setModif({ id: m.id, niveau: m.niveau }); setMessage(null); }} title="Changer le niveau de ce membre"
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ring-transparent transition hover:ring-slate-300 ${NIVEAUX[m.niveau]?.classe ?? ""}`}>
                        {m.niveau === "pro" ? <Crown size={11} /> : m.niveau === "elite" ? <Star size={11} /> : null}{NIVEAUX[m.niveau]?.libelle ?? m.niveau}
                        {m.offert && m.niveau !== "free" && <span className="ml-1 rounded-full bg-white/70 px-1.5 text-[9px] uppercase">offert</span>}
                        <span className="ml-0.5 text-[10px] opacity-50">▾</span>
                      </button>
                    )}
                  </td>
                  <td className="text-slate-600">{date(m.cree_le)}</td>
                  <td className="text-slate-600">{date(m.derniere_connexion)}</td>
                  <td className="text-slate-600">{m.parrain ? <span className="inline-flex items-center gap-1"><Gift size={12} className="text-teal-700 dark:text-teal-400" /> {m.parrain}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="text-right tabular-nums font-semibold text-slate-700">{m.filleuls || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibles.length && <p className="py-8 text-center text-sm text-slate-400">Aucun membre ne correspond.</p>}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Le niveau est celui du compte sur le site, tenu à jour par Stripe à chaque paiement, renouvellement ou résiliation. Les montants réellement encaissés sont dans votre tableau de bord Stripe.</p>
      </section>
    </div>
  );
}
