"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { CalendarEvent } from "@/components/calendar/EventItem";

// Vue « liste » de l'agenda : les prochains rendez-vous, jour par jour. Sur téléphone,
// la grille du mois n'affiche que des points de couleur ; il fallait toucher chaque jour
// pour savoir ce qui s'y passait.

const COULEUR: Record<string, string> = {
  "Assemblée nationale": "bg-blue-500",
  "Assemblée": "bg-blue-500",
  "Sénat": "bg-indigo-500",
  "Élysée": "bg-amber-500",
  "Gouvernement": "bg-amber-500",
  "Élection": "bg-emerald-600",
};

const heureDe = (titre: string) => {
  const m = titre.match(/^\[(\d{1,2})[h:](\d{2})\]/);
  return m ? `${m[1]}h${m[2]}` : null;
};
const titrePropre = (e: CalendarEvent) =>
  (e.short_title || e.title).replace(/^\[\d{1,2}[h:]\d{2}\]\s*/, "").replace(/^-+\s*/, "").trim();
const cleJour = (d: Date) => d.toLocaleDateString("en-CA");

/** Jours affichés au départ, puis par tranche avec « Voir la suite ». */
const PAR_TRANCHE = 7;

export default function ProchainsEvenements({ events }: { events: CalendarEvent[] }) {
  const [jours, setJours] = useState(PAR_TRANCHE);
  // Lu une fois à l'affichage (et non à chaque rendu).
  const [{ aujourdhui, demain }] = useState(() => ({ aujourdhui: cleJour(new Date()), demain: cleJour(new Date(Date.now() + 86400000)) }));

  const parJour = new Map<string, CalendarEvent[]>();
  for (const e of [...events].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const k = cleJour(e.date);
    if (k < aujourdhui) continue;
    parJour.set(k, [...(parJour.get(k) ?? []), e]);
  }
  const cles = [...parJour.keys()];

  if (!cles.length) {
    return <p className="rounded-2xl border border-border bg-card p-5 text-[15px] text-muted-foreground">Aucun rendez-vous à venir avec ce filtre.</p>;
  }

  return (
    <div className="space-y-6">
      {cles.slice(0, jours).map(k => {
        const d = new Date(`${k}T12:00:00`);
        const libelle = k === aujourdhui ? "Aujourd'hui" : k === demain ? "Demain" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
        const liste = parJour.get(k)!.sort((a, b) => (heureDe(a.title) || "99").localeCompare(heureDe(b.title) || "99"));
        return (
          <section key={k}>
            <h3 className="mb-2.5 flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
              <span className="text-lg font-bold capitalize text-foreground">{libelle}</span>{" "}
              <span className="text-[13px] text-muted-foreground">{liste.length} rendez-vous</span>
            </h3>{" "}
            <ul className="space-y-2">
              {liste.map(e => {
                const heure = heureDe(e.title);
                return (
                  <li key={e.id}>
                    <details className="group rounded-2xl border border-border bg-card p-3.5 dark:border-slate-800">
                      <summary className="flex cursor-pointer list-none items-start gap-3">
                        <span className="w-12 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-foreground">{heure ?? "Jour"}</span>{" "}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold leading-snug text-foreground">{titrePropre(e)}</span>{" "}
                          <span className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            <span className={`h-2 w-2 rounded-full ${COULEUR[e.institution] ?? "bg-slate-400"}`} />{" "}
                            {e.institution === "Élection" ? "Élection" : e.institution}
                          </span>
                        </span>{" "}
                        {(e.description || e.source_url) && <ChevronDown size={18} className="mt-0.5 shrink-0 text-muted-foreground transition group-open:rotate-180" />}
                      </summary>{" "}
                      {(e.description || e.source_url) && (
                        <div className="mt-3 border-t border-border pt-3 pl-[3.75rem] text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                          {e.description && <p className="whitespace-pre-line">{e.description}</p>}{" "}
                          {e.source_url && !/\/agenda\/?$/.test(e.source_url) && (
                            <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline dark:text-blue-300">
                              Page officielle <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      )}
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {jours < cles.length && (
        <button onClick={() => setJours(j => j + PAR_TRANCHE)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-foreground transition hover:bg-muted">
          Voir la suite de l&apos;agenda <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
