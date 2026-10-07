"use client";

import { Target, ListChecks, Quote, ArrowRight } from "lucide-react";
import type { CommissionMeeting } from "@/lib/commissions";
import MentionIA from "@/components/shared/MentionIA";

/**
 * Rendu d'une analyse de réunion de commission.
 *
 * Extrait du suivi des commissions pour servir aussi au fil quotidien du tableau
 * de bord Pro : la même analyse s'y lit, sans dupliquer sa mise en forme.
 */

/** Classes explicites — Tailwind ne peut pas deviner une classe construite à la volée. */
export const ACCENTS = {
  emerald: {
    text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/15",
    chip: "bg-emerald-600 text-white", ring: "hover:border-emerald-300",
    grad: "from-emerald-500 to-teal-500", dot: "bg-emerald-500",
    hover: "hover:text-emerald-600",
  },
  red: {
    text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/15",
    chip: "bg-red-600 text-white", ring: "hover:border-red-300",
    grad: "from-red-500 to-rose-600", dot: "bg-red-500",
    hover: "hover:text-red-600",
  },
};

/* ─────────────────── Analyse détaillée d'une réunion (Pro) ─────────────────── */
export function CommissionAnalysis({ m, accent, sombre = false }: {
  m: CommissionMeeting;
  accent: typeof ACCENTS.emerald;
  /**
   * Rendu pour un fond sombre imposé.
   *
   * Les variantes `dark:` ne peuvent pas servir ici : le fil Pro est toujours sombre,
   * même quand le site est en thème clair, et il était toujours clair quand le site
   * passait en sombre. Dans les deux cas le texte finissait de la couleur du fond.
   */
  sombre?: boolean;
}) {
  // Couleurs de texte explicites, sans s'en remettre au thème du site.
  const corps = sombre ? "text-white/80" : "text-slate-700 dark:text-slate-300";
  const appui = sombre ? "text-white/60" : "text-muted-foreground dark:text-slate-400";
  const fort = sombre ? "text-white" : "text-foreground dark:text-white";
  const bloc = sombre
    ? "rounded-2xl border border-white/10 bg-white/[0.05] p-3"
    : "rounded-2xl border border-border bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40";
  const a = m.analysis || {};
  const hasStructured =
    !!(a.contexte || a.points_cles?.length || a.chiffres?.length || a.positions?.length || a.suites?.length || a.citations?.length);

  // Repli : tant que l'analyse structurée n'a pas été générée, on affiche le résumé.
  if (!hasStructured) {
    return m.summary
      ? (
        <div>
          <p className={`whitespace-pre-line text-sm leading-relaxed ${corps}`}>{m.summary}</p>
          <MentionIA sombre={sombre} source={{ libelle: "compte rendu officiel de la réunion", url: m.cr_url }} />
        </div>
      )
      : (
        <div className={bloc}>
          <p className={`flex items-center gap-2 text-sm font-bold ${fort}`}>
            <span className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${accent.dot}`} />
            Analyse en préparation
          </p>
          <p className={`mt-1 text-[13px] leading-relaxed ${appui}`}>
            Le compte rendu officiel de cette réunion est publié ; son analyse (ce qui s&apos;est dit,
            positions, chiffres, verbatim vérifié) est rédigée dans les heures qui viennent. En
            attendant, le compte rendu intégral est accessible ci-dessous.
          </p>
        </div>
      );
  }

  return (
    <div className="space-y-5">
      {a.contexte && (
        <div>
          <p className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${accent.text}`}>
            <Target size={12} /> Contexte
          </p>
          <p className={`text-sm leading-relaxed ${corps}`}>{a.contexte}</p>
        </div>
      )}

      {!!a.points_cles?.length && (
        <div>
          <p className={`mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${accent.text}`}>
            <ListChecks size={12} /> Ce qui s&apos;est dit
          </p>
          <ul className="space-y-1.5">
            {a.points_cles.map((p, i) => (
              <li key={i} className={`flex gap-2 text-sm leading-snug ${corps}`}>
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!a.chiffres?.length && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Chiffres avancés</p>
          <div className="flex flex-wrap gap-2">
            {a.chiffres.map((c, i) => (
              <div key={i} className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="font-staatliches text-xl leading-none text-amber-700 dark:text-amber-400">{c.valeur}</p>
                <p className={`mt-1 text-[11px] leading-tight ${appui}`}>{c.quoi}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!a.positions?.length && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400">Positions défendues</p>
          <div className="space-y-2">
            {a.positions.map((p, i) => (
              <div key={i} className={bloc}>
                <p className={`text-[12px] font-black ${fort}`}>
                  {p.orateur}
                  {p.groupe && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{p.groupe}</span>}
                </p>
                <p className={`mt-1 text-sm leading-snug ${appui}`}>{p.position}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!a.citations?.length && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Quote size={12} /> Verbatim
          </p>
          <div className="space-y-2">
            {a.citations.map((c, i) => (
              <blockquote key={i} className="border-l-4 border-border pl-3 dark:border-slate-700">
                <p className={`text-sm italic leading-snug ${corps}`}>« {c.texte} »</p>
                <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">— {c.orateur}</p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {!!a.suites?.length && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">Suites annoncées</p>
          <ul className="space-y-1.5">
            {a.suites.map((p, i) => (
              <li key={i} className={`flex gap-2 text-sm leading-snug ${corps}`}>
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-sky-500" />{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Les citations sont retrouvées mot pour mot dans le verbatim avant publication
          (dropInventedQuotes, scripts/update-commissions.ts) ; le reste ne l'est pas. */}
      <MentionIA sombre={sombre} nature="Analyse" source={{ libelle: "compte rendu officiel de la réunion", url: m.cr_url }}
        verification={a.citations?.length ? "citations vérifiées automatiquement dans le compte rendu" : undefined} />
    </div>
  );
}
