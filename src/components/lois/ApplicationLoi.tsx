"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, FileCheck2 } from "lucide-react";
import { api, type LoiApplication, type MesureApplication } from "@/lib/api";
import SuivreBouton from "@/components/shared/SuivreBouton";

/**
 * Les décrets d'application d'une loi, sur sa fiche (01/11/2026).
 *
 * Une loi promulguée n'est pas toujours applicable : il lui manque souvent des décrets. Ces données
 * sont publiques (baromètre de l'Assemblée nationale) : le bloc est ouvert à tous, et l'alerte
 * à la parution d'un décret est réservée au Pro. Sans échéancier connu, rien n'est affirmé.
 */
export const SOURCE_APPLICATION = "https://www.assemblee-nationale.fr/dyn/taux-application-lois/";
const OUVERTES = 6;

export const dateCourte = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
export const echeanceDepassee = (m: Pick<MesureApplication, "etat" | "eventuelle" | "echeance">) =>
  m.etat === "attente" && !m.eventuelle && !!m.echeance && m.echeance < new Date().toISOString().slice(0, 10);

export default function ApplicationLoi({ jorfId, titre }: { jorfId: string | null | undefined; titre?: string }) {
  const [loi, setLoi] = useState<LoiApplication | null>(null);
  const [mesures, setMesures] = useState<MesureApplication[]>([]);
  const [tout, setTout] = useState(false);

  useEffect(() => {
    if (!jorfId) return;
    let vivant = true;
    api.getApplicationLoi(jorfId).then(r => { if (vivant && r) { setLoi(r.loi); setMesures(r.mesures); } }).catch(() => {});
    return () => { vivant = false; };
  }, [jorfId]);

  if (!loi) return null;
  const pc = loi.nb_mesures ? Math.round((loi.nb_appliquees / loi.nb_mesures) * 100) : 0;
  const utiles = mesures.filter(m => m.etat !== "sans_objet")
    .sort((a, b) => Number(echeanceDepassee(b)) - Number(echeanceDepassee(a)) || Number(a.etat === "applique") - Number(b.etat === "applique") || a.ordre - b.ordre);
  const visibles = tout ? utiles : utiles.slice(0, OUVERTES);

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><FileCheck2 size={14} /> Décrets d&apos;application</h3>{" "}
        {loi.nb_attente > 0 && <SuivreBouton kind="app_loi" refId={loi.jorf_id} label={titre || loi.titre} libelles={["M'alerter de ses décrets", "Alertes activées"]} className="!normal-case !tracking-normal" />}
      </div>{" "}
      {loi.nb_mesures === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {loi.application_directe ? "Loi d'application directe : elle n'appelle pas de décret d'application."
            : loi.sans_echeancier ? "Aucun échéancier d'application n'est publié pour cette loi à ce jour."
            : "L'échéancier officiel ne recense aucune mesure réglementaire à prendre à ce jour."}
        </p>
      ) : (
        <>
          <p className="mt-2 text-[15px] font-bold text-foreground">
            {loi.nb_appliquees} mesure{loi.nb_appliquees > 1 ? "s" : ""} prise{loi.nb_appliquees > 1 ? "s" : ""} sur {loi.nb_mesures}
            {loi.nb_retard > 0 && <span className="font-semibold text-rose-700 dark:text-rose-300"> · {loi.nb_retard} échéance{loi.nb_retard > 1 ? "s" : ""} dépassée{loi.nb_retard > 1 ? "s" : ""}</span>}
          </p>{" "}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><span className="block h-full bg-emerald-500" style={{ width: `${pc}%` }} /></div>{" "}
          <ul className="mt-4 divide-y divide-border dark:divide-white/10">
            {visibles.map(m => <LigneMesure key={m.ordre} m={m} />)}
          </ul>{" "}
          {utiles.length > OUVERTES && (
            <button type="button" onClick={() => setTout(t => !t)} className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-[13px] font-bold text-blue-700 dark:text-sky-300">
              {tout ? "Réduire" : `Voir les ${utiles.length} mesures`} <ChevronDown size={14} className={`transition ${tout ? "rotate-180" : ""}`} />
            </button>
          )}
        </>
      )}{" "}
      <p className="mt-3 text-[11.5px] text-muted-foreground">
        Source : <a href={SOURCE_APPLICATION} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">baromètre de l&apos;application des lois</a>, Assemblée nationale, d&apos;après l&apos;échéancier de Légifrance. Relevé le {dateCourte(loi.maj_le)}.
      </p>
    </section>
  );
}

export function LigneMesure({ m, sombre = false }: { m: MesureApplication; sombre?: boolean }) {
  const depassee = echeanceDepassee(m);
  const fort = sombre ? "text-white" : "text-foreground";
  const doux = sombre ? "text-white/55" : "text-muted-foreground";
  const pastille = m.etat === "applique"
    ? (sombre ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")
    : depassee ? (sombre ? "bg-rose-500/15 text-rose-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300")
    : m.etat === "sans_objet" ? (sombre ? "bg-white/10 text-white/60" : "bg-slate-500/15 text-slate-600 dark:text-slate-300")
    : (sombre ? "bg-amber-500/15 text-amber-200" : "bg-amber-500/15 text-amber-700 dark:text-amber-300");
  const etat = m.etat === "applique" ? "Texte paru" : depassee ? "Échéance dépassée" : m.etat === "sans_objet" ? "Sans objet" : "En attente";
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${pastille}`}>{etat}</span>{" "}
        {m.articles && <span className={`text-[12px] font-bold ${doux}`}>{m.articles}</span>}
      </div>{" "}
      {m.objet && <p className={`mt-1.5 text-[14px] leading-snug ${fort}`}>{m.objet}</p>}{" "}
      <p className={`mt-1 text-[12.5px] leading-snug ${doux}`}>
        {m.etat === "attente" && (m.observation || (m.echeance ? `Échéance : ${dateCourte(m.echeance)}` : "Aucune date annoncée"))}
        {m.etat === "applique" && m.delai_jours != null && (m.delai_jours < 1 ? "Paru le jour même de la loi." : `Paru ${m.delai_jours} jour${m.delai_jours > 1 ? "s" : ""} après la loi.`)}
        {m.etat === "sans_objet" && m.observation}
      </p>{" "}
      {m.decret_id && (
        <a href={`https://www.legifrance.gouv.fr/jorf/id/${m.decret_id}`} target="_blank" rel="noopener noreferrer"
          className={`mt-1 inline-flex items-center gap-1 text-[12.5px] font-bold ${sombre ? "text-sky-300" : "text-blue-700 dark:text-sky-300"}`}>
          Lire le texte sur Légifrance <ExternalLink size={12} />
        </a>
      )}
    </li>
  );
}
