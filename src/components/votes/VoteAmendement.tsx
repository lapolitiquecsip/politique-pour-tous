"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Clock, ExternalLink, Hand, Loader2, Users, Vote } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Le vote d'un amendement (30/10/2026) : qui a voté pour, qui contre.
 *
 * Tout amendement voté affiche un encart, chaque cas dit tel qu'il est :
 *   • scrutin public (amendements_an.scrutin_id, relié par le backend lier-amendements-scrutins) :
 *     les totaux, le vote de chaque groupe, puis de chaque député à la demande ;
 *   • main levée ou commission : l'Assemblée ne publie aucun décompte par député, on le dit ;
 *   • pas encore classé : le relevé des scrutins passe la nuit, le détail arrive au plus tard sous 48 h ;
 *   • tombé, retiré, non soutenu : pas de vote.
 *
 * `sombre` : sur le fond sombre de l'espace Pro, quel que soit le thème du site (les variantes dark:
 * ne s'y appliquent pas). `deplie` : le tableau des groupes est ouvert d'emblée.
 */
const POS = {
  POUR: { mot: "Pour", clair: "text-emerald-700 dark:text-emerald-300", sombre: "text-emerald-300" },
  CONTRE: { mot: "Contre", clair: "text-rose-700 dark:text-rose-300", sombre: "text-rose-300" },
  ABSTENTION: { mot: "Abstention", clair: "text-amber-700 dark:text-amber-300", sombre: "text-amber-300" },
} as const;

const SANS_VOTE: Record<string, string> = {
  "Tombé": "Tombé : cet amendement n'a pas été mis aux voix, un vote précédent l'a rendu sans objet.",
  "Retiré": "Retiré par son auteur : pas de vote.",
  "Non soutenu": "Non soutenu en séance : pas de vote.",
};

export default function VoteAmendement({ scrutinId, mode, sort, sombre = false, deplie = false }: {
  scrutinId: string | null; mode: string | null; sort: string | null; sombre?: boolean; deplie?: boolean;
}) {
  const [s, setS] = useState<Awaited<ReturnType<typeof api.getScrutinAmendement>>>(null);
  const [charge, setCharge] = useState(!!scrutinId);
  const [ouvert, setOuvert] = useState(deplie);
  const [deputes, setDeputes] = useState<any[] | null>(null);
  const [chargeDeputes, setChargeDeputes] = useState(false);

  useEffect(() => {
    if (!scrutinId) return;
    api.getScrutinAmendement(scrutinId).then(setS).catch(() => {}).finally(() => setCharge(false));
  }, [scrutinId]);

  const t = sombre
    ? { cadre: "border-white/10 bg-white/[0.05]", fort: "text-white", doux: "text-white/60", trait: "border-white/10", piste: "bg-white/10", lien: "text-sky-300" }
    : { cadre: "border-border bg-muted/40 dark:border-white/10 dark:bg-white/[0.04]", fort: "text-foreground", doux: "text-muted-foreground", trait: "border-border dark:border-white/10", piste: "bg-slate-200 dark:bg-white/10", lien: "text-blue-700 dark:text-sky-300" };
  const ton = (p: keyof typeof POS) => (sombre ? POS[p].sombre : POS[p].clair);
  const encart = (icone: React.ReactNode, texte: React.ReactNode) => (
    <p className={`mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12.5px] leading-snug ${t.cadre} ${t.doux}`}>
      <span className="mt-0.5 shrink-0">{icone}</span><span>{texte}</span>
    </p>
  );

  if (!sort) return null;
  if (SANS_VOTE[sort]) return <p className={`mt-1 text-[12.5px] leading-snug ${t.doux}`}>{SANS_VOTE[sort]}</p>;
  if (sort !== "Adopté" && sort !== "Rejeté") return null;

  if (!scrutinId) {
    if (mode === "main_levee") return encart(<Hand size={14} />, <><strong className={t.fort}>{sort} à main levée.</strong> L&apos;Assemblée ne publie ni décompte ni vote par député pour ce type de vote.</>);
    if (mode === "commission") return encart(<Hand size={14} />, <><strong className={t.fort}>{sort} en commission.</strong> L&apos;Assemblée ne publie pas le vote de chaque député.</>);
    return encart(<Clock size={14} />, <><strong className={t.fort}>{sort}, détail du vote en cours de relevé.</strong> S&apos;il y a eu un scrutin public, le vote de chaque groupe et de chaque député s&apos;affiche ici au plus tard sous 48 h.</>);
  }
  if (!s) return charge ? encart(<Loader2 size={14} className="animate-spin" />, "Chargement du vote…") : null;

  const total = (s.pour || 0) + (s.contre || 0) + (s.abstention || 0) || 1;
  const pc = (n: number) => `${(n / total) * 100}%`;
  const groupes = [...(s.group_results || [])].filter((g: any) => (g.pour || 0) + (g.contre || 0) + (g.abstention || 0) > 0)
    .sort((a: any, b: any) => (b.pour + b.contre + b.abstention) - (a.pour + a.contre + a.abstention));
  const voirDeputes = () => {
    if (deputes || chargeDeputes) return;
    setChargeDeputes(true);
    api.getVotantsScrutin(s.id).then(d => { setDeputes(d); setChargeDeputes(false); }).catch(() => setChargeDeputes(false));
  };

  return (
    <div className={`mt-3 rounded-2xl border p-3 ${t.cadre}`} onClick={e => e.stopPropagation()}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className={`flex items-center gap-1.5 text-[12px] font-black uppercase tracking-widest ${t.doux}`}><Vote size={13} /> Scrutin public n° {s.numero}</p>{" "}
        <p className="text-[13px] font-bold">
          <span className={ton("POUR")}>{s.pour} pour</span> · <span className={ton("CONTRE")}>{s.contre} contre</span> · <span className={ton("ABSTENTION")}>{s.abstention} abst.</span>
        </p>
      </div>{" "}
      <div className={`mt-2 flex h-2 overflow-hidden rounded-full ${t.piste}`}>
        <span className="bg-emerald-500" style={{ width: pc(s.pour) }} /><span className="bg-rose-500" style={{ width: pc(s.contre) }} /><span className="bg-amber-400" style={{ width: pc(s.abstention) }} />
      </div>{" "}
      <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
        className={`mt-2 inline-flex min-h-[32px] items-center gap-1 text-[12.5px] font-black ${t.lien}`}>
        Qui a voté quoi ? <ChevronDown size={14} className={`transition ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div className="mt-1 space-y-3">
          <table className="w-full text-[12.5px]">
            <thead><tr className={`text-left text-[11px] font-black uppercase tracking-wider ${t.doux}`}>
              <th className="py-1 font-black">Groupe</th><th className={`py-1 text-right ${ton("POUR")}`}>Pour</th><th className={`py-1 text-right ${ton("CONTRE")}`}>Contre</th><th className={`py-1 text-right ${ton("ABSTENTION")}`}>Abst.</th>
            </tr></thead>
            <tbody>
              {groupes.map((g: any) => (
                <tr key={g.group_id} className={`border-t ${t.trait}`}>
                  <td className={`py-1.5 pr-2 font-semibold ${t.fort}`}>{g.group_label}</td>
                  <td className={`py-1.5 text-right tabular-nums ${t.fort}`}>{g.pour || "–"}</td><td className={`py-1.5 text-right tabular-nums ${t.fort}`}>{g.contre || "–"}</td><td className={`py-1.5 text-right tabular-nums ${t.fort}`}>{g.abstention || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>{" "}
          {!deputes ? (
            <button type="button" onClick={voirDeputes} className={`inline-flex min-h-[32px] items-center gap-1.5 text-[12.5px] font-black ${t.lien}`}>
              {chargeDeputes ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} Voir le vote de chaque député
            </button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {(["POUR", "CONTRE", "ABSTENTION"] as const).map(p => {
                const liste = deputes.filter(d => d.position === p);
                return (
                  <div key={p}>
                    <p className={`text-[11px] font-black uppercase tracking-wider ${ton(p)}`}>{POS[p].mot} · {liste.length}</p>
                    <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto pr-1 text-[12.5px]">
                      {liste.map(d => <li key={d.slug || d.last_name}><Link href={`/deputes/${d.slug}/`} className={`${t.fort} hover:underline`}>{d.first_name} {d.last_name}</Link> <span className={t.doux}>· {d.party}</span></li>)}
                      {!liste.length && <li className={t.doux}>—</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}{" "}
          <a href={`https://www.assemblee-nationale.fr/dyn/17/scrutins/${s.numero}`} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-[11.5px] ${t.doux} hover:underline`}>
            Source : Assemblée nationale <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}
