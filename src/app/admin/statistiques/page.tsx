"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, Eye, Users, MousePointerClick, Globe, Smartphone, Monitor, Tablet, Loader2, Lock,
  RefreshCw, Gift, CheckCircle2, Crown, Sparkles, UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";

/**
 * Statistiques du site, en temps réel.
 *
 * Lues par une fonction de la base qui refuse quiconque n'est pas inscrit dans
 * la table des administrateurs : la page est publique, ses chiffres non. Elle se
 * rafraîchit toutes les 10 secondes tant que l'onglet est visible.
 */

const PERIODES = [1, 7, 30, 90] as const;

const ACTIONS: Record<string, string> = {
  inscription: "Inscriptions",
  clic_offres: "Clics vers les offres",
  clic_paiement: "Clics vers le paiement",
  paiement_reussi: "Paiements réussis",
  arrivee_parrainage: "Arrivées par un lien de parrainage",
  parrainage_rattache: "Filleuls rattachés",
  partage_parrainage: "Liens de parrainage partagés",
};

const NOMS_PAGES: [RegExp, string][] = [
  [/^\/$/, "Accueil"], [/^\/premium/, "Offres"], [/^\/lois/, "Lois"], [/^\/deputes/, "Députés"],
  [/^\/senateurs/, "Sénateurs"], [/^\/presidentielles-2027/, "Présidentielles 2027"], [/^\/local/, "Local"],
  [/^\/dashboard/, "Espace personnel"], [/^\/login/, "Connexion"], [/^\/executif/, "Exécutif"],
  [/^\/institutions/, "Institutions"], [/^\/europe|^\/eurodeputes/, "Europe"],
];
const nomPage = (p: string) => NOMS_PAGES.find(([r]) => r.test(p))?.[1] ?? null;

/** « /senateurs/gabriel-amard/ » → « Sénateurs › Gabriel Amard » : la page dite en clair. */
function pageEnClair(p: string): string {
  const rubrique = nomPage(p);
  const morceaux = p.split("/").filter(Boolean);
  if (morceaux.length < 2) return rubrique ?? p;
  const detail = decodeURIComponent(morceaux[morceaux.length - 1]).replace(/-/g, " ").replace(/(^|\s)(\p{L})/gu, (_m, avant: string, l: string) => avant + l.toUpperCase());
  return rubrique ? `${rubrique} › ${detail}` : detail;
}

/** 95 → « 1 min 35 » */
const duree = (s: number | null | undefined) => {
  if (!s) return "—";
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m} min${r ? ` ${String(r).padStart(2, "0")}` : ""}` : `${r} s`;
};

const TEINTES_RUBRIQUES = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-fuchsia-500", "bg-teal-500"];

const nombre = (n: number | null | undefined) => (n ?? 0).toLocaleString("fr-FR");
const euros = (n: number | null | undefined) => `${Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function ilYa(date: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Carte({ titre, valeur, detail, Icone, teinte }: { titre: string; valeur: string; detail?: string; Icone: typeof Eye; teinte: string }) {
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

function Bloc({ titre, Icone, children, action }: { titre: string; Icone: typeof Eye; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-slate-600"><Icone size={15} /> {titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Une ligne de classement : libellé, barre proportionnelle, valeur. */
function Ligne({ libelle, sous, valeur, max, teinte = "bg-blue-500" }: { libelle: string; sous?: string; valeur: number; max: number; teinte?: string }) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-slate-800" title={sous || libelle}>
          {libelle}{sous && <span className="ml-2 text-xs font-normal text-slate-400">{sous}</span>}
        </span>
        <span className="shrink-0 tabular-nums font-bold text-slate-700">{nombre(valeur)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${teinte}`} style={{ width: `${max ? Math.max(2, (valeur / max) * 100) : 0}%` }} />
      </div>
    </div>
  );
}

export default function StatistiquesPage() {
  const [jours, setJours] = useState<number>(7);
  const [stats, setStats] = useState<any | null>(null);
  const [parrainage, setParrainage] = useState<any | null>(null);
  const [refus, setRefus] = useState(false);
  const [majA, setMajA] = useState<number>(0);
  const [, setTic] = useState(0);
  const [versement, setVersement] = useState<string | null>(null);
  // Formulaire « influenceur » : lien à son nom et taux négocié.
  const [influ, setInflu] = useState({ email: "", code: "", taux: "", nom: "" });
  const [influMsg, setInfluMsg] = useState<string | null>(null);
  const enregistrerInflu = async () => {
    const taux = influ.taux.trim() === "" ? null : Number(influ.taux.replace(",", ".")) / 100;
    try {
      const r = await api.configurerParrain(influ.email, influ.code, taux, influ.nom);
      const messages: Record<string, string> = {
        ok: `Enregistré. Son lien : ${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${influ.code.trim().toUpperCase()}`,
        compte_introuvable: "Aucun compte avec cette adresse : l'influenceur doit d'abord créer un compte gratuit sur le site.",
        code_invalide: "Code invalide : 3 à 30 lettres, chiffres ou tirets.",
        code_pris: "Ce code est déjà utilisé par un autre parrain.",
        taux_invalide: "Taux invalide : entre 0 et 80 %.",
      };
      setInfluMsg(messages[r] ?? r);
      if (r === "ok") void charger();
    } catch (e: any) { setInfluMsg(e?.message ?? "Erreur"); }
  };

  const charger = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.getStatistiquesSite(jours), api.getParrainageAdmin().catch(() => null)]);
      setStats(s); setParrainage(p); setRefus(false); setMajA(Date.now());
    } catch (e: any) {
      if (/administrateur|JWT|permission/i.test(String(e?.message))) setRefus(true);
    }
  }, [jours]);

  // Chargement, puis toutes les 10 s tant que l'onglet est visible.
  useEffect(() => {
    const premier = setTimeout(() => void charger(), 0);
    const t = setInterval(() => { if (document.visibilityState === "visible") void charger(); }, 10000);
    return () => { clearTimeout(premier); clearInterval(t); };
  }, [charger]);
  // Les « il y a » vieillissent sans attendre la prochaine lecture.
  useEffect(() => { const t = setInterval(() => setTic(x => x + 1), 5000); return () => clearInterval(t); }, []);

  const parJour: { jour: string; vues: number; visiteurs: number }[] = stats?.par_jour ?? [];
  const maxJour = Math.max(1, ...parJour.map(j => j.vues));
  const parHeure = useMemo(() => {
    const m = new Map<number, number>((stats?.par_heure ?? []).map((h: any) => [h.heure, h.vues]));
    return Array.from({ length: 24 }, (_, h) => ({ heure: h, vues: m.get(h) ?? 0 }));
  }, [stats]);
  const maxHeure = Math.max(1, ...parHeure.map(h => h.vues));
  const heureCourante = Number(new Date().toLocaleString("fr-FR", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }));

  if (refus) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Lock className="mx-auto mb-3 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Accès réservé</h1>
        <p className="mt-2 text-sm text-slate-500">Les statistiques sont réservées aux administrateurs du site. Connectez-vous avec un compte administrateur.</p>
        <Link href="/login" className="mt-5 inline-block rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Se connecter</Link>
      </div>
    );
  }
  if (!stats) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-slate-400" /></div>;

  const periode = stats.periode ?? {};
  const appareils: Record<string, number> = stats.appareils ?? {};
  const totalAppareils = Object.values(appareils).reduce((a, b) => a + b, 0) || 1;
  const pages: any[] = stats.pages ?? [];
  const sources: any[] = stats.sources ?? [];
  const actions: any[] = stats.actions ?? [];
  // La mesure a un début : une période plus longue que l'historique compte la même
  // chose qu'une plus courte. Sans cette mention, 7 j, 30 j et 90 j affichant les
  // mêmes chiffres passaient pour un bouton qui ne marche pas.
  const debutMesure = stats.debut_mesure ? new Date(stats.debut_mesure) : null;
  const periodeDepasse = debutMesure ? Date.now() - debutMesure.getTime() < jours * 864e5 : false;
  const depuis = debutMesure?.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* En-tête */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-staatliches text-5xl uppercase leading-none text-slate-900">Statistiques</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
            En direct · mis à jour {majA ? ilYa(new Date(majA).toISOString()) : "…"}
            <button onClick={() => void charger()} className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Actualiser"><RefreshCw size={14} /></button>
          </p>
        </div>
        <Link href="/admin/membres" className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-500">
          <Users size={16} /> Membres et abonnés
        </Link>
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {PERIODES.map(p => (
            <button key={p} onClick={() => setJours(p)}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition ${jours === p ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
              {p === 1 ? "24 h" : `${p} j`}
            </button>
          ))}
        </div>
      </header>

      {periodeDepasse && (
        <p className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-sm text-sky-900">
          <Activity size={16} className="mt-0.5 shrink-0" />
          <span>La mesure des visites fonctionne depuis le <strong>{depuis}</strong>. Tant que l&apos;historique est plus court que la période choisie, 24 h, 7 j, 30 j et 90 j montrent les mêmes visites : les écarts apparaîtront au fil des jours.</span>
        </p>
      )}

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/80"><Activity size={15} /> En ligne maintenant</p>
          <p className="mt-3 text-6xl font-black tabular-nums leading-none tracking-tight">{nombre(stats.en_ligne)}</p>
          <p className="mt-1.5 text-xs text-white/80">visiteur{stats.en_ligne > 1 ? "s" : ""} actifs ces 5 dernières minutes</p>
          {!!stats.en_ligne_pages?.length && (
            <div className="mt-3 space-y-0.5 border-t border-white/20 pt-2 text-[11px] text-white/90">
              {stats.en_ligne_pages.slice(0, 3).map((p: any) => <p key={p.path} className="truncate">{p.n} · {nomPage(p.path) ?? p.path}</p>)}
            </div>
          )}
        </div>
        <Carte titre="Aujourd'hui" valeur={nombre(stats.aujourdhui?.vues)} detail={`pages vues · ${nombre(stats.aujourdhui?.visiteurs)} visiteurs`} Icone={Eye} teinte="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300" />
        <Carte titre={periodeDepasse ? `Depuis le ${depuis}` : jours === 1 ? "24 dernières heures" : `${jours} derniers jours`} valeur={nombre(periode.visiteurs)}
          detail={`visiteurs · ${nombre(periode.vues)} pages vues · ${periode.sessions ? (periode.vues / periode.sessions).toFixed(1).replace(".", ",") : "0"} pages par visite`}
          Icone={Users} teinte="bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300" />
        <Carte titre="Comptes (total)" valeur={nombre(stats.comptes?.total)}
          detail={`dont ${nombre(stats.comptes?.premium)} Premium et ${nombre(stats.comptes?.pro)} Pro · ${nombre(stats.comptes?.nouveaux)} créés sur la période choisie`}
          Icone={UserPlus} teinte="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" />
      </div>

      {/* Ce qui intéresse : la part de chaque rubrique et le temps qu'on y passe. */}
      {(() => {
        const rubriques: any[] = stats.rubriques ?? [];
        const total = rubriques.reduce((s, r) => s + Number(r.vues), 0) || 1;
        const entrees: any[] = stats.entrees ?? [];
        return (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Bloc titre="Ce qui intéresse vos visiteurs" Icone={Sparkles}
                action={<span className="text-xs text-slate-500">Durée moyenne d&apos;une visite : <strong className="text-slate-800">{duree(stats.duree_moyenne_visite)}</strong></span>}>
                {!rubriques.length ? <p className="text-sm text-slate-400">Pas encore de visite enregistrée.</p> : (
                  <>
                    {/* Barre de répartition : d'un coup d'œil, qui prend la plus grande part. */}
                    <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
                      {rubriques.map((r, i) => <div key={r.rubrique} className={TEINTES_RUBRIQUES[i % TEINTES_RUBRIQUES.length]} style={{ width: `${(r.vues / total) * 100}%` }} title={`${r.rubrique} : ${Math.round((r.vues / total) * 100)} %`} />)}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="pb-2">Rubrique</th><th className="pb-2 text-right">Part</th><th className="pb-2 text-right">Vues</th><th className="pb-2 text-right">Visiteurs</th><th className="pb-2 text-right">Temps moyen par page</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {rubriques.map((r, i) => (
                            <tr key={r.rubrique}>
                              <td className="py-2"><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><span className={`h-2.5 w-2.5 rounded-full ${TEINTES_RUBRIQUES[i % TEINTES_RUBRIQUES.length]}`} />{r.rubrique}</span></td>
                              <td className="text-right font-black tabular-nums text-slate-900">{Math.round((r.vues / total) * 100)} %</td>
                              <td className="text-right tabular-nums text-slate-600">{nombre(r.vues)}</td>
                              <td className="text-right tabular-nums text-slate-600">{nombre(r.visiteurs)}</td>
                              <td className="text-right tabular-nums text-slate-600">{duree(r.temps_moyen)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Bloc>
            </div>
            <Bloc titre="Pages d'arrivée" Icone={Globe}>
              <p className="-mt-2 mb-2 text-xs text-slate-400">La première page vue de chaque visite : par où l&apos;on entre sur le site.</p>
              {!entrees.length ? <p className="text-sm text-slate-400">—</p> : entrees.map(e => (
                <Ligne key={e.path} libelle={pageEnClair(e.path)} sous={e.path} valeur={e.n} max={entrees[0].n} teinte="bg-emerald-500" />
              ))}
            </Bloc>
          </div>
        );
      })()}

      {/* Courbes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Fréquentation par jour" Icone={Eye}>
          {parJour.length === 0 ? <p className="text-sm text-slate-400">Pas encore de visite enregistrée.</p> : (
            <div className="flex h-44 gap-1">
              {parJour.map(j => (
                <div key={j.jour} className="group flex flex-1 flex-col items-center" title={`${new Date(j.jour).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} : ${j.vues} vues, ${j.visiteurs} visiteurs`}>
                  <div className="relative w-full flex-1">
                    <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-blue-500/85 transition group-hover:bg-blue-600" style={{ height: `${(j.vues / maxJour) * 100}%`, minHeight: 3 }} />
                  </div>
                  <span className="mt-1 h-3 text-[9px] font-bold text-slate-400">{parJour.length <= 14 ? new Date(j.jour).getDate() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </Bloc>
        <div className="lg:col-span-2">
          <Bloc titre="Aujourd'hui, heure par heure" Icone={Activity}>
            <div className="flex h-44 gap-1">
              {parHeure.map(h => (
                <div key={h.heure} className="flex flex-1 flex-col items-center" title={`${h.heure} h : ${h.vues} vues`}>
                  <div className="relative w-full flex-1">
                    <div className={`absolute inset-x-0 bottom-0 rounded-t-md ${h.heure === heureCourante ? "bg-emerald-500" : "bg-slate-300"}`} style={{ height: `${(h.vues / maxHeure) * 100}%`, minHeight: h.vues ? 3 : 1 }} />
                  </div>
                  <span className="mt-1 h-3 text-[9px] font-bold text-slate-400">{h.heure % 3 === 0 ? `${h.heure}h` : ""}</span>
                </div>
              ))}
            </div>
          </Bloc>
        </div>
      </div>

      {/* Classements */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Pages les plus vues" Icone={Eye}>
          {pages.length === 0 ? <p className="text-sm text-slate-400">—</p> : pages.map(p => (
            <Ligne key={p.path} libelle={pageEnClair(p.path)} sous={p.path} valeur={p.vues} max={pages[0].vues} />
          ))}
        </Bloc>
        <Bloc titre="D'où viennent les visiteurs" Icone={Globe}>
          {sources.length === 0 ? <p className="text-sm text-slate-400">—</p> : sources.map(s => (
            <Ligne key={s.source} libelle={s.source} valeur={s.sessions} max={sources[0].sessions} teinte="bg-violet-500" />
          ))}
        </Bloc>
        <div className="space-y-4">
          <Bloc titre="Appareils" Icone={Smartphone}>
            {Object.keys(appareils).length === 0 ? <p className="text-sm text-slate-400">—</p> : (
              <div className="space-y-2.5">
                {Object.entries(appareils).sort((a, b) => b[1] - a[1]).map(([nom, n]) => {
                  const Icone = nom === "mobile" ? Smartphone : nom === "tablette" ? Tablet : Monitor;
                  const pct = Math.round((n / totalAppareils) * 100);
                  return (
                    <div key={nom} className="flex items-center gap-3 text-sm">
                      <Icone size={16} className="text-slate-400" />
                      <span className="w-24 font-semibold capitalize text-slate-700">{nom}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} /></div>
                      <span className="w-10 text-right font-bold tabular-nums text-slate-700">{pct} %</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Bloc>
          <Bloc titre="Actions" Icone={MousePointerClick}>
            {actions.length === 0 ? <p className="text-sm text-slate-400">Aucune action sur la période.</p> : actions.map(a => (
              <Ligne key={a.name} libelle={ACTIONS[a.name] ?? a.name} valeur={a.n} max={actions[0].n} teinte="bg-amber-500" />
            ))}
          </Bloc>
        </div>
      </div>

      {/* Flux en direct */}
      <Bloc titre="En direct" Icone={Activity}>
        <div className="max-h-96 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
          {(stats.flux ?? []).map((e: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${e.kind === "action" ? "bg-amber-500" : "bg-blue-400"}`} />
              <span className="w-24 shrink-0 text-xs text-slate-400">{ilYa(e.at)}</span>
              <span className="min-w-0 flex-1 truncate text-slate-700">
                {e.kind === "action" ? <strong className="text-amber-700 dark:text-amber-400">{ACTIONS[e.name] ?? e.name}</strong> : (nomPage(e.path) ?? e.path)}
                {e.kind === "action" && <span className="ml-2 text-xs text-slate-400">{e.path}</span>}
              </span>
              <span className="hidden shrink-0 text-xs capitalize text-slate-400 sm:inline">{e.device}</span>
              {e.niveau && e.niveau !== "anonyme" && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${e.niveau === "pro" ? "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300" : e.niveau === "elite" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                  {e.niveau === "elite" ? "Premium" : e.niveau === "pro" ? "Pro" : "Membre"}
                </span>
              )}
            </div>
          ))}
        </div>
      </Bloc>

      {/* Parrainage */}
      {parrainage && (
        <Bloc titre="Parrainage" Icone={Gift}
          action={<span className="text-xs text-slate-500">{Math.round((parrainage.reglages?.taux ?? 0) * 100)} % des paiements pendant {parrainage.reglages?.duree_mois} mois · validé après {parrainage.reglages?.delai_validation_jours} jours</span>}>
          {!(parrainage.parrains ?? []).length ? <p className="text-sm text-slate-400">Aucun parrain pour l&apos;instant : un code est créé dès qu&apos;un membre ouvre son onglet « Parrainage ».</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-2">Parrain</th><th>Code</th><th className="text-right">Taux</th><th className="text-right">Clics</th><th className="text-right">Inscrits</th>
                    <th className="text-right">Abonnés</th><th className="text-right">En validation</th><th className="text-right">À verser</th><th className="text-right">Versé</th><th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parrainage.parrains.map((p: any) => (
                    <tr key={p.user_id}>
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-800">{p.nom || p.email}</span>
                        {p.nom && <span className="block text-xs text-slate-400">{p.email}</span>}
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {p.code}
                        <button onClick={() => { setInflu({ email: p.email, code: p.code, taux: p.taux_propre != null ? String(Math.round(p.taux_propre * 100)) : "", nom: p.nom ?? "" }); setInfluMsg(null); }}
                          className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 font-sans text-[10px] font-bold text-slate-500 hover:bg-slate-50">Régler</button>
                      </td>
                      <td className={`text-right tabular-nums ${p.taux_propre != null ? "font-bold text-violet-700 dark:text-violet-400" : "text-slate-500"}`}>{Math.round((p.taux ?? 0) * 100)} %</td>
                      <td className="text-right tabular-nums">{nombre(p.clics)}</td>
                      <td className="text-right tabular-nums">{nombre(p.inscrits)}</td>
                      <td className="text-right tabular-nums">{nombre(p.abonnes)}</td>
                      <td className="text-right tabular-nums text-slate-500">{euros(p.en_validation)}</td>
                      <td className="text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{euros(p.disponible)}</td>
                      <td className="text-right tabular-nums text-slate-500">{euros(p.verse)}</td>
                      <td className="pl-3 text-right">
                        {Number(p.disponible) > 0 && (
                          versement === p.user_id ? (
                            <span className="inline-flex gap-1">
                              <button onClick={async () => { await api.marquerCommissionsVersees(p.user_id); setVersement(null); void charger(); }}
                                className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black text-white">Confirmer</button>
                              <button onClick={() => setVersement(null)} className="rounded-full px-2 py-1 text-[11px] font-bold text-slate-500">Annuler</button>
                            </span>
                          ) : (
                            <button onClick={() => setVersement(p.user_id)}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50">
                              <CheckCircle2 size={12} /> Virement fait
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Influenceurs : un lien à leur nom, un taux négocié. */}
          <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400">Ajouter ou régler un influenceur</p>
            <p className="mt-1 text-xs text-slate-500">Il crée d&apos;abord un compte gratuit sur le site ; vous lui attribuez ici un lien à son nom et, si vous l&apos;avez négocié, un taux à part (vide = taux général).</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1fr_0.6fr_1fr_auto]">
              <input value={influ.email} onChange={e => setInflu({ ...influ, email: e.target.value })} placeholder="Adresse e-mail de son compte"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400" />
              <input value={influ.code} onChange={e => setInflu({ ...influ, code: e.target.value.toUpperCase() })} placeholder="Code (ex. HUGO)"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm uppercase outline-none focus:border-violet-400" />
              <input value={influ.taux} onChange={e => setInflu({ ...influ, taux: e.target.value })} placeholder="Taux %" inputMode="decimal"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400" />
              <input value={influ.nom} onChange={e => setInflu({ ...influ, nom: e.target.value })} placeholder="Nom affiché (facultatif)"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400" />
              <button onClick={() => void enregistrerInflu()} disabled={!influ.email || !influ.code}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-500 disabled:opacity-40">Enregistrer</button>
            </div>
            {influMsg && <p className="mt-2 break-all text-xs font-semibold text-violet-800">{influMsg}</p>}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Sparkles size={12} /> « À verser » : commissions sorties du délai de rétractation. Après votre virement, « Virement fait » les passe en « Versé ».
            <Crown size={12} className="ml-1" />
          </p>
        </Bloc>
      )}
    </div>
  );
}
