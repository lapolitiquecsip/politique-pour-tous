"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileCheck2, Loader2, Search, X } from "lucide-react";
import { api, type LoiApplication, type MesureApplication } from "@/lib/api";
import SuivreBouton from "@/components/shared/SuivreBouton";
import { telechargerCsv } from "@/lib/csv";
import { LigneMesure, SOURCE_APPLICATION, dateCourte, echeanceDepassee } from "@/components/lois/ApplicationLoi";

/**
 * Suivi des décrets d'application, pour les membres Pro (01/11/2026, demande d'un collaborateur
 * parlementaire). Les données sont publiques ; ce que l'outil ajoute : toutes les lois au même
 * endroit, les échéances dépassées, l'export pour un dossier et l'alerte à la parution d'un texte.
 *
 * « Échéance dépassée » reste factuel : la date annoncée par le Gouvernement est passée et le
 * baromètre ne recense pas de texte. Une publication « éventuelle » n'est jamais comptée.
 */
const PAR_PAGE = 20;
const DEBUT_17E = "2024-07-18";
type Vue = "attente" | "retard" | "toutes";
const VUES: [Vue, string][] = [["attente", "En attente"], ["retard", "Échéance dépassée"], ["toutes", "Toutes"]];
const ETATS_CSV: Record<string, string> = { applique: "Texte paru", attente: "En attente", sans_objet: "Sans objet" };
const nettoyer = (q: string) => q.replace(/[,()*%\\]/g, " ").trim();

function CarteLoi({ loi, ouvertDEmblee }: { loi: LoiApplication; ouvertDEmblee: boolean }) {
  const [ouvert, setOuvert] = useState(ouvertDEmblee);
  const [mesures, setMesures] = useState<MesureApplication[] | null>(null);
  useEffect(() => {
    if (!ouvert || mesures) return;
    api.getApplicationLoi(loi.jorf_id).then(r => setMesures(r?.mesures || [])).catch(() => setMesures([]));
  }, [ouvert, mesures, loi.jorf_id]);
  const pc = loi.nb_mesures ? Math.round((loi.nb_appliquees / loi.nb_mesures) * 100) : 0;
  const triees = useMemo(() => [...(mesures || [])].sort((a, b) => Number(a.etat === "applique") - Number(b.etat === "applique") || a.ordre - b.ordre), [mesures]);

  return (
    <li className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
      <div className="p-4">
        <p className="text-[15px] font-semibold leading-snug text-white">{loi.titre}</p>{" "}
        <p className="mt-1 text-[12.5px] text-white/50">{[dateCourte(loi.publiee_le), loi.commission].filter(Boolean).join(" · ")}</p>{" "}
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10"><span className="bg-emerald-500" style={{ width: `${pc}%` }} /></div>{" "}
        <p className="mt-2 text-[13px] text-white/75">
          <strong className="text-white">{loi.nb_appliquees}</strong> mesure{loi.nb_appliquees > 1 ? "s" : ""} prise{loi.nb_appliquees > 1 ? "s" : ""} sur {loi.nb_mesures}
          {loi.nb_attente > 0 && <> · {loi.nb_attente} en attente</>}
          {loi.nb_retard > 0 && <span className="font-bold text-rose-300"> · {loi.nb_retard} échéance{loi.nb_retard > 1 ? "s" : ""} dépassée{loi.nb_retard > 1 ? "s" : ""}</span>}
        </p>{" "}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} className="inline-flex min-h-[36px] items-center gap-1 text-[13px] font-bold text-fuchsia-300">
            {ouvert ? "Replier" : "Voir les mesures"} <ChevronDown size={14} className={`transition ${ouvert ? "rotate-180" : ""}`} />
          </button>{" "}
          {loi.nb_attente > 0 && <SuivreBouton kind="app_loi" refId={loi.jorf_id} label={loi.titre} libelles={["M'alerter de ses décrets", "Alertes activées"]} className="!normal-case !tracking-normal" />}
        </div>
      </div>{" "}
      {ouvert && (
        <div className="border-t border-white/10 px-4 pb-2">
          {!mesures ? <div className="flex justify-center py-5"><Loader2 className="animate-spin text-fuchsia-300" /></div> : (
            <ul className="divide-y divide-white/10">{triees.map(m => <LigneMesure key={m.ordre} m={m} sombre />)}</ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function DecretsApplication() {
  const [vue, setVue] = useState<Vue>("attente");
  const [toutes, setToutes] = useState(false);       // toutes les lois depuis 2002, pas seulement la législature
  const [commission, setCommission] = useState("");
  const [saisie, setSaisie] = useState("");
  const [recherche, setRecherche] = useState("");
  const [cible, setCible] = useState("");            // ?app-loi=… : lien d'un e-mail d'alerte
  const [liste, setListe] = useState<LoiApplication[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [bilan, setBilan] = useState<LoiApplication[] | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("app-loi");
    if (c) { setCible(c); setVue("toutes"); setToutes(true); }
    api.getLoisApplicationBilan(DEBUT_17E).then(setBilan).catch(() => setBilan([]));
  }, []);
  useEffect(() => { const t = setTimeout(() => setRecherche(nettoyer(saisie)), 350); return () => clearTimeout(t); }, [saisie]);
  useEffect(() => { setPage(0); }, [vue, toutes, commission, recherche, cible]);

  const filtres = useMemo(() => ({ vue, depuis: toutes ? null : DEBUT_17E, commission, recherche, jorfId: cible }), [vue, toutes, commission, recherche, cible]);

  useEffect(() => {
    let vivant = true;
    setCharge(true); setErreur(false);
    api.getLoisApplication(filtres, page, PAR_PAGE).then(({ lois, total: t }) => {
      if (!vivant) return;
      setListe(l => (page === 0 ? lois : [...l, ...lois]));
      if (page === 0) setTotal(t);
      setCharge(false);
    }).catch(() => { if (vivant) { setErreur(true); setCharge(false); } });
    return () => { vivant = false; };
  }, [filtres, page]);

  const somme = (k: "nb_mesures" | "nb_appliquees" | "nb_attente" | "nb_retard") => (bilan || []).reduce((t, l) => t + (l[k] || 0), 0);
  const commissions = useMemo(() => [...new Set((bilan || []).map(l => l.commission).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr")), [bilan]);
  const derniere = useMemo(() => (bilan || []).reduce((m, l) => (l.maj_le > m ? l.maj_le : m), ""), [bilan]);

  const exporter = async () => {
    setExportEnCours(true);
    try {
      // L'export suit la vue : « Échéance dépassée » ne sort que les mesures concernées, pas toute la loi.
      const lignes = (await api.getMesuresExport(filtres)).filter(m => (vue === "retard" ? echeanceDepassee(m) : vue === "attente" ? m.etat === "attente" : true));
      telechargerCsv("decrets-application", ["Loi", "Publiée le", "Commission", "Article", "Objet", "État", "Échéance", "Observation", "Texte d'application"],
        lignes.map(m => [m.loi_titre, m.publiee_le, m.commission, m.articles, m.objet, echeanceDepassee(m) ? "Échéance dépassée" : ETATS_CSV[m.etat] || m.etat, m.echeance, m.observation,
          m.decret_id ? `https://www.legifrance.gouv.fr/jorf/id/${m.decret_id}` : ""]));
    } catch { setErreur(true); }
    setExportEnCours(false);
  };

  const select = "w-full min-h-[44px] appearance-none rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm font-medium text-white focus:border-fuchsia-400/50 focus:outline-none [&>option]:bg-slate-900";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 md:rounded-[2.5rem] md:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"><FileCheck2 size={22} /></span>{" "}
        <div className="min-w-0 flex-1">
          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white">Décrets <span className="text-emerald-300">d&apos;application</span></h2>{" "}
          <p className="mt-1 text-sm leading-relaxed text-white/65">
            Ce que chaque loi attend encore, et ce qui est paru. Suivez une loi pour être alerté par e-mail dès qu&apos;un texte d&apos;application paraît ou qu&apos;une échéance passe.
            {derniere && <span className="text-white/50"> Relevé le {dateCourte(derniere)}.</span>}
          </p>
        </div>
      </div>{" "}

      {bilan && bilan.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">Depuis le début de la législature (juillet 2024)</p>{" "}
          <div className="mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {([["nb_mesures", "Mesures attendues", "text-white"], ["nb_appliquees", "Prises", "text-emerald-300"], ["nb_attente", "En attente", "text-amber-200"], ["nb_retard", "Échéance dépassée", "text-rose-300"]] as const).map(([k, l, ton]) => (
              <div key={k} className="rounded-2xl bg-white/[0.05] p-3.5 ring-1 ring-white/10">
                <p className={`text-2xl font-black tabular-nums ${ton}`}>{somme(k).toLocaleString("fr-FR")}</p>{" "}
                <p className="mt-0.5 text-[12px] text-white/60">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}{" "}

      <div className="mt-5 inline-flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-black/20 p-1" role="group" aria-label="Vue">
        {VUES.map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setCible(""); setVue(v); }} aria-pressed={vue === v}
            className={`min-h-[40px] rounded-xl px-4 text-[13px] font-black transition ${vue === v ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" : "text-white/60 hover:text-white"}`}>{l}</button>
        ))}
      </div>{" "}

      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        <label className="block"><span className="sr-only">Commission</span>
          <select value={commission} onChange={e => { setCible(""); setCommission(e.target.value); }} className={select}>
            <option value="">Toutes les commissions</option>
            {commissions.map(c => <option key={c} value={c}>{c.slice(0, 80)}</option>)}
          </select>
        </label>{" "}
        <label className="block"><span className="sr-only">Période</span>
          <select value={toutes ? "toutes" : "17e"} onChange={e => { setCible(""); setToutes(e.target.value === "toutes"); }} className={select}>
            <option value="17e">Législature en cours (depuis juillet 2024)</option>
            <option value="toutes">Toutes les lois depuis 2002</option>
          </select>
        </label>{" "}
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
          <input value={saisie} onChange={e => { setCible(""); setSaisie(e.target.value); }} placeholder="Un mot du titre de la loi…" enterKeyHint="search"
            className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 text-[15px] text-white placeholder-white/45 focus:border-fuchsia-400/50 focus:outline-none" />
          {saisie && <button type="button" onClick={() => setSaisie("")} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white/60"><X size={16} /></button>}
        </div>
      </div>{" "}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/60">
        <span>{total != null && <><strong className="font-bold text-white">{total.toLocaleString("fr-FR")}</strong> loi{total > 1 ? "s" : ""}</>}
          {cible && <button type="button" onClick={() => { setCible(""); setVue("attente"); setToutes(false); }} className="ml-2 font-bold text-fuchsia-300">Voir toutes les lois</button>}
        </span>{" "}
        <button type="button" onClick={exporter} disabled={exportEnCours || !total} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] px-3 text-[12px] font-bold text-white transition hover:bg-white/10 disabled:opacity-50">
          {exportEnCours ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exporter en CSV
        </button>
      </div>{" "}

      {erreur ? <p className="mt-4 rounded-2xl bg-rose-500/10 p-5 text-center text-sm text-rose-200">Le chargement a échoué. Réessayez dans un instant.</p>
        : !charge && !liste.length ? <p className="mt-4 rounded-2xl bg-white/[0.04] p-6 text-center text-sm text-white/60">Aucune loi ne correspond à ces filtres.</p>
        : <ul className="mt-3 space-y-2.5">{liste.map(l => <CarteLoi key={l.jorf_id} loi={l} ouvertDEmblee={l.jorf_id === cible} />)}</ul>}{" "}
      {charge ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-fuchsia-300" /></div>
        : total != null && liste.length < total && (
          <button type="button" onClick={() => setPage(p => p + 1)} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white transition hover:bg-white/10">
            Voir plus <span className="font-normal text-white/60">({(total - liste.length).toLocaleString("fr-FR")} autres)</span> <ChevronDown size={16} />
          </button>
        )}{" "}

      <p className="mt-5 text-[12px] leading-relaxed text-white/50">
        Source : <a href={SOURCE_APPLICATION} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">baromètre de l&apos;application des lois</a> de l&apos;Assemblée nationale (LexImpact), d&apos;après l&apos;échéancier de Légifrance, licence ouverte. Ces comptes peuvent différer de ceux du Sénat et du Gouvernement, et une loi récente peut apparaître avant la publication de son échéancier.
      </p>
    </section>
  );
}
