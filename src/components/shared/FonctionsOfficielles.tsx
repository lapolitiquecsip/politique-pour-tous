"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ChevronDown, History } from "lucide-react";
import { api, type ChangementElu, type EluKind } from "@/lib/api";
import type { FonctionElu } from "@/lib/data/institutionalRoles";

/**
 * Ce que l'élu exerce aujourd'hui selon les institutions elles-mêmes, et ce qui a changé récemment.
 *
 * Relevé chaque lundi dans les données ouvertes du Sénat, de l'Assemblée nationale et du Parlement
 * européen (revue verifier-elus). La date du dernier contrôle est affichée : le lecteur sait de quand
 * date l'information, et une source en panne ne se fait pas passer pour une information fraîche.
 */
const SECTIONS: [string, string][] = [["bureau", "Au Bureau"], ["groupe", "Groupe politique"], ["commission", "Commissions"], ["organe", "Délégations et organismes"], ["mandat_local", "Mandats locaux et autres fonctions"]];
const SOURCES: Record<EluKind, [string, string]> = {
  senateur: ["le Sénat", "https://data.senat.fr/les-senateurs/"],
  depute: ["l'Assemblée nationale", "https://data.assemblee-nationale.fr/acteurs/deputes-en-exercice"],
  eurodepute: ["le Parlement européen", "https://data.europarl.europa.eu/"],
};
const OUVERTES = 6;
const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const INTITULES: Record<ChangementElu["nature"], string> = { ajout: "Nouveau", retrait: "Fin", modification: "Changement" };

export default function FonctionsOfficielles({ kind, slug }: { kind: EluKind; slug: string }) {
  const [donnees, setDonnees] = useState<{ fonctions: FonctionElu[]; changements: ChangementElu[]; verifieLe: string | null } | null>(null);
  const [tout, setTout] = useState(false);

  useEffect(() => {
    let vivant = true;
    api.getFonctionsElu(kind, slug).then(r => { if (vivant) setDonnees(r); }).catch(() => {});
    return () => { vivant = false; };
  }, [kind, slug]);

  if (!donnees) return null;
  const lignes = donnees.fonctions.filter(f => f.categorie !== "mandat");
  if (!lignes.length && !donnees.changements.length) return null;

  const responsabilite = (f: FonctionElu) => !/^membre|suppl[ée]ant|titulaire/i.test(f.qualite ?? "");
  const trier = (a: FonctionElu, b: FonctionElu) => Number(responsabilite(b)) - Number(responsabilite(a)) || a.libelle.localeCompare(b.libelle, "fr");
  const principales = lignes.filter(f => f.important).sort(trier);
  const autres = lignes.filter(f => !f.important).sort(trier);
  const reste = Math.max(0, principales.length - OUVERTES) + autres.length;
  const visibles = tout ? [...principales, ...autres] : principales.slice(0, OUVERTES);
  const [nomSource, urlSource] = SOURCES[kind];

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:rounded-[2.5rem] md:p-8 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="flex items-center gap-2 font-staatliches text-2xl uppercase tracking-tight text-foreground dark:text-white">
        <BadgeCheck size={20} className="text-emerald-600 dark:text-emerald-400" /> Ses fonctions officielles
      </h3>{" "}

      {SECTIONS.map(([categorie, titre]) => {
        const ici = visibles.filter(f => f.categorie === categorie);
        if (!ici.length) return null;
        return (
          <div key={categorie} className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{titre}</p>{" "}
            <ul className="mt-1.5 space-y-1.5">
              {ici.map(f => (
                <li key={`${f.categorie}${f.libelle}`} className={`text-[14px] leading-snug ${responsabilite(f) ? "font-bold text-foreground dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                  {f.libelle}{f.depuis && <span className="font-normal text-muted-foreground"> · depuis {new Date(f.depuis).getFullYear()}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}{" "}

      {reste > 0 && (
        <button type="button" onClick={() => setTout(t => !t)} aria-expanded={tout} className="mt-3 inline-flex min-h-[40px] items-center gap-1 text-[13px] font-bold text-blue-700 dark:text-sky-300">
          {tout ? "Réduire" : reste > 1 ? `Voir les ${reste} autres` : "Voir l'autre"} <ChevronDown size={14} className={`transition ${tout ? "rotate-180" : ""}`} />
        </button>
      )}{" "}

      {donnees.changements.length > 0 && (
        <div className="mt-5 border-t border-border pt-4 dark:border-slate-800">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><History size={13} /> Évolutions récentes</p>{" "}
          <ul className="mt-2 space-y-2">
            {donnees.changements.map(c => (
              <li key={`${c.detecte_le}${c.apres}${c.avant}`} className="text-[13.5px] leading-snug text-slate-700 dark:text-slate-300">
                <span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-black ${c.nature === "retrait" ? "bg-slate-500/15 text-slate-600 dark:text-slate-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>{INTITULES[c.nature]}</span>
                {c.apres ?? c.avant}{c.nature === "modification" && c.avant && <span className="text-muted-foreground"> (auparavant : {c.avant})</span>}
                <span className="text-muted-foreground"> · relevé le {dateFr(c.detecte_le)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}{" "}

      {donnees.verifieLe && (
        <p className="mt-4 text-[11.5px] leading-snug text-muted-foreground">
          Vérifié le {dateFr(donnees.verifieLe)} d&apos;après <a href={urlSource} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">les données publiées par {nomSource}</a>. Mise à jour chaque semaine.
        </p>
      )}
    </section>
  );
}
