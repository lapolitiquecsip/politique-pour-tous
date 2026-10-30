"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Hand, Loader2, Users } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Le vote d'un amendement (30/10/2026) : qui a voté pour, qui contre.
 *
 * Trois cas, dits tels qu'ils sont :
 *   • scrutin public (amendements_an.scrutin_id, relié par le backend lier-amendements-scrutins) :
 *     les totaux, puis le vote de chaque groupe, puis de chaque député, à la demande ;
 *   • main levée : l'Assemblée ne publie aucun décompte par député — on le dit, sans inventer ;
 *   • commission : pas de scrutin public en commission.
 */
const POS: Record<string, { mot: string; ton: string }> = {
  POUR: { mot: "Pour", ton: "text-emerald-700 dark:text-emerald-300" },
  CONTRE: { mot: "Contre", ton: "text-rose-700 dark:text-rose-300" },
  ABSTENTION: { mot: "Abstention", ton: "text-amber-700 dark:text-amber-300" },
};

export default function VoteAmendement({ scrutinId, mode, sort }: { scrutinId: string | null; mode: string | null; sort: string | null }) {
  const [s, setS] = useState<Awaited<ReturnType<typeof api.getScrutinAmendement>>>(null);
  const [ouvert, setOuvert] = useState(false);
  const [deputes, setDeputes] = useState<any[] | null>(null);
  const [chargeDeputes, setChargeDeputes] = useState(false);

  useEffect(() => { if (scrutinId) api.getScrutinAmendement(scrutinId).then(setS).catch(() => {}); }, [scrutinId]);

  if (!sort || !["Adopté", "Rejeté"].includes(sort)) return null;
  if (mode === "main_levee") return (
    <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted-foreground">
      <Hand size={14} className="mt-0.5 shrink-0" /> Voté à main levée : l&apos;Assemblée ne publie pas le vote de chaque député.
    </p>
  );
  if (mode === "commission") return (
    <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">Examiné en commission : pas de scrutin public, donc pas de vote par député.</p>
  );
  if (!scrutinId || !s) return null;

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
    <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3 dark:border-white/10 dark:bg-white/[0.04]" onClick={e => e.stopPropagation()}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">Scrutin public n° {s.numero}</p>{" "}
        <p className="text-[13px] font-bold">
          <span className="text-emerald-700 dark:text-emerald-300">{s.pour} pour</span> · <span className="text-rose-700 dark:text-rose-300">{s.contre} contre</span> · <span className="text-muted-foreground">{s.abstention} abst.</span>
        </p>
      </div>{" "}
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <span className="bg-emerald-500" style={{ width: pc(s.pour) }} /><span className="bg-rose-500" style={{ width: pc(s.contre) }} /><span className="bg-amber-400" style={{ width: pc(s.abstention) }} />
      </div>{" "}
      <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
        className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-[12.5px] font-black text-blue-700 dark:text-sky-300">
        Qui a voté quoi ? <ChevronDown size={14} className={`transition ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div className="mt-1 space-y-3">
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              <th className="py-1 font-black">Groupe</th><th className="py-1 text-right text-emerald-700 dark:text-emerald-300">Pour</th><th className="py-1 text-right text-rose-700 dark:text-rose-300">Contre</th><th className="py-1 text-right">Abst.</th>
            </tr></thead>
            <tbody>
              {groupes.map((g: any) => (
                <tr key={g.group_id} className="border-t border-border dark:border-white/10">
                  <td className="py-1.5 pr-2 font-semibold text-foreground">{g.group_label}</td>
                  <td className="py-1.5 text-right tabular-nums">{g.pour || "–"}</td><td className="py-1.5 text-right tabular-nums">{g.contre || "–"}</td><td className="py-1.5 text-right tabular-nums">{g.abstention || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>{" "}
          {!deputes ? (
            <button type="button" onClick={voirDeputes} className="inline-flex min-h-[32px] items-center gap-1.5 text-[12.5px] font-black text-blue-700 dark:text-sky-300">
              {chargeDeputes ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} Voir le vote de chaque député
            </button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {(["POUR", "CONTRE", "ABSTENTION"] as const).map(p => {
                const liste = deputes.filter(d => d.position === p);
                return (
                  <div key={p}>
                    <p className={`text-[11px] font-black uppercase tracking-wider ${POS[p].ton}`}>{POS[p].mot} · {liste.length}</p>
                    <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto pr-1 text-[12.5px]">
                      {liste.map(d => <li key={d.slug || d.last_name}><Link href={`/deputes/${d.slug}/`} className="text-foreground hover:underline">{d.first_name} {d.last_name}</Link> <span className="text-muted-foreground">· {d.party}</span></li>)}
                      {!liste.length && <li className="text-muted-foreground">—</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
