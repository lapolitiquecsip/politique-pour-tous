"use client";

import { useEffect, useState } from "react";
import { FileText, Trophy, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";

// Classement des initiatives législatives : situe un·e élu·e par rapport à sa chambre selon
// le nombre de textes DÉPOSÉS (auteur principal), et épingle les plus/moins prolifiques.
// 100 % basé sur les données officielles (legislative_dossiers.author_name).
export default function InitiativeRank({
  kind, selfId, primary, cosigned, peerLabel, embedded = false,
}: {
  kind: "deputy" | "senator";
  selfId: string;
  primary: number | null | undefined;  // textes déposés (auteur principal)
  cosigned: number | null | undefined; // total portés (co-signés inclus)
  peerLabel: string;                    // « députés » | « sénateurs »
  embedded?: boolean;                   // intégré sous un en-tête existant (sans cadre ni titre)
}) {
  const [peers, setPeers] = useState<{ id: string; count: number }[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getInitiativeCounts(kind).then(r => { if (active) setPeers(r as any); }).catch(() => { if (active) setPeers([]); });
    return () => { active = false; };
  }, [kind]);

  const p = primary == null ? 0 : Number(primary);

  let rank: number | null = null, count: number | null = null, pct: number | null = null, max = 1, median = 0;
  if (peers && peers.length > 0) {
    const sorted = [...peers].sort((a, b) => b.count - a.count);
    count = sorted.length;
    const idx = sorted.findIndex(x => x.id === selfId);
    rank = idx >= 0 ? idx + 1 : null;
    const below = peers.filter(x => x.count <= p).length;
    pct = Math.round((below / count) * 100);
    max = Math.max(1, ...peers.map(x => x.count));
    const mid = peers.map(x => x.count).sort((a, b) => a - b);
    median = mid[Math.floor(mid.length / 2)];
  }

  const topDecile = rank != null && count != null && rank <= Math.max(1, Math.ceil(count * 0.1)) && p > median;
  const bottomDecile = rank != null && count != null && rank > count - Math.max(1, Math.ceil(count * 0.1));
  const co = cosigned == null ? 0 : Math.max(0, Number(cosigned) - p);

  const Wrapper: any = embedded ? "div" : "section";
  return (
    <Wrapper className={embedded ? "" : "rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8"}>
      {!embedded && (
        <div className="flex items-center gap-3 mb-4">
          <FileText className="text-orange-500" size={22} />
          <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">
            Initiatives <span className="text-orange-500">législatives</span>
          </h2>
        </div>
      )}

      <div className="flex items-center gap-6">
        <p className="text-5xl font-black text-orange-500">{p}</p>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {p === 0 ? "Aucun texte déposé en tant qu'auteur·rice principal·e" : <>Texte{p > 1 ? "s" : ""} <strong>déposé{p > 1 ? "s" : ""}</strong> en tant qu'auteur·rice principal·e</>}
          </p>
          {co > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">+ {co} texte{co > 1 ? "s" : ""} co-signé{co > 1 ? "s" : ""}</p>}
          {/* Barre relative au plus prolifique de la chambre. */}
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.round((p / max) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {rank != null && count != null && (
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-700 dark:text-orange-300">
            <Trophy size={15} /> {rank}ᵉ / {count} {peerLabel}
          </span>
        )}
        {pct != null && (
          pct >= 50 ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">Dépose plus que {pct}% des {peerLabel}</span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-700 dark:text-rose-300">Dépose moins que {100 - pct}% des {peerLabel}</span>
          )
        )}
        {topDecile && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/30">
            <Trophy size={14} /> Parmi les plus prolifiques
          </span>
        )}
        {bottomDecile && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-slate-500/20">
            <TriangleAlert size={14} /> Parmi les moins actifs
          </span>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-snug italic text-slate-400">
        Nombre de propositions de loi déposées comme auteur·rice principal·e (1er signataire du texte officiel).
        Comparaison entre {peerLabel}. Source : dossiers législatifs officiels (Assemblée nationale / Sénat).
      </p>
    </Wrapper>
  );
}
