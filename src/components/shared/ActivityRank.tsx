"use client";

import { useEffect, useState } from "react";
import { Activity, Trophy, TriangleAlert, Minus } from "lucide-react";
import { api } from "@/lib/api";

// Bloc comparatif d'activité : situe un·e élu·e par rapport à l'ensemble de sa chambre
// (rang, centile, médiane) et épingle les plus/moins assidus. Réutilisé pour eurodéputés,
// députés et sénateurs — même donnée honnête (participation aux votes).
export default function ActivityRank({
  kind, rate, selfId, peerLabel, participated, total, note,
}: {
  kind: "mep" | "deputy" | "senator";
  rate: number | null | undefined;
  selfId: string;
  peerLabel: string;             // ex. « eurodéputés français », « députés », « sénateurs »
  participated?: number | null;
  total?: number | null;
  note?: string;
}) {
  const [rates, setRates] = useState<{ id: string; rate: number }[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getActivityRates(kind).then(r => { if (active) setRates(r as any); }).catch(() => { if (active) setRates([]); });
    return () => { active = false; };
  }, [kind]);

  if (rate == null) return null;
  const r = Number(rate);
  const clr = r >= 90 ? "text-emerald-600" : r >= 70 ? "text-amber-600" : "text-rose-600";
  const barClr = r >= 90 ? "bg-emerald-500" : r >= 70 ? "bg-amber-500" : "bg-rose-500";

  // Statistiques comparatives (une fois les pairs chargés).
  let rank: number | null = null, count: number | null = null, pct: number | null = null, median: number | null = null;
  if (rates && rates.length > 0) {
    const sorted = [...rates].sort((a, b) => b.rate - a.rate);
    count = sorted.length;
    const idx = sorted.findIndex(x => x.id === selfId);
    rank = idx >= 0 ? idx + 1 : null;
    // Centile = part des pairs que l'élu·e dépasse ou égale.
    const below = rates.filter(x => x.rate <= r).length;
    pct = Math.round((below / count) * 100);
    const mid = [...rates].map(x => x.rate).sort((a, b) => a - b);
    median = mid[Math.floor(mid.length / 2)];
  }

  // Épinglage seuil-conscient : le classement seul ne suffit pas (au Sénat, le vote délégué
  // par groupe sature les taux vers 100 %). On n'épingle « plus assidu » que si le taux est
  // réellement élevé, et « moins assidu » que si le taux est réellement bas — pour ne jamais
  // stigmatiser à tort un·e élu·e à 95 %.
  const topDecile = rank != null && count != null && rank <= Math.max(1, Math.ceil(count * 0.1)) && r >= 90;
  const bottomDecile = rank != null && count != null && rank > count - Math.max(1, Math.ceil(count * 0.1)) && r < 75;

  return (
    <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="text-sky-600" size={22} />
        <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">
          Présence aux <span className="text-sky-600">votes</span>
        </h2>
      </div>

      <div className="flex items-center gap-6">
        <p className={`text-5xl font-black ${clr}`}>{r.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%</p>
        <div className="flex-1">
          {/* Barre + repère de la médiane des pairs */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-full rounded-full ${barClr}`} style={{ width: `${r}%` }} />
            {median != null && (
              <div className="absolute top-[-3px] h-[18px] w-[2px] bg-slate-400 dark:bg-slate-500" style={{ left: `calc(${median}% - 1px)` }} title={`Médiane : ${median}%`} />
            )}
          </div>
          {participated != null && total != null && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              A pris part à <strong>{participated.toLocaleString("fr-FR")}</strong> des <strong>{total.toLocaleString("fr-FR")}</strong> scrutins.
            </p>
          )}
          {median != null && (
            <p className="mt-0.5 text-[11px] text-slate-400">Trait gris = médiane des {peerLabel} ({median}%).</p>
          )}
        </div>
      </div>

      {/* Classement comparatif */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {rank != null && count != null ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-700 dark:text-sky-300">
            <Trophy size={15} /> {rank}ᵉ / {count} {peerLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-400">
            <Minus size={15} /> Classement indisponible
          </span>
        )}
        {pct != null && (
          pct >= 50 ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              Plus assidu·e que {pct}% des {peerLabel}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-700 dark:text-rose-300">
              Moins assidu·e que {100 - pct}% des {peerLabel}
            </span>
          )
        )}
        {topDecile && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-500/30">
            <Trophy size={14} /> Parmi les plus assidu·e·s
          </span>
        )}
        {bottomDecile && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-rose-400 to-red-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-rose-500/30">
            <TriangleAlert size={14} /> Parmi les moins assidu·e·s
          </span>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-snug italic text-slate-400">
        {note || "Participation aux votes nominaux (position exprimée). Comparaison entre élu·e·s d'une même chambre pour situer l'assiduité de chacun·e."}
      </p>
    </section>
  );
}
