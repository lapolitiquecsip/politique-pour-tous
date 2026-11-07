"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, Radio, Tv } from "lucide-react";
import { api } from "@/lib/api";
import { couleur, heures } from "@/lib/dynamiques";

type Candidat = { slug: string; full_name: string; photo_url: string | null; party: string | null };
type Passage = Awaited<ReturnType<typeof api.getAntennePassages>>[number];

const FORMAT: Record<Passage["format"], string> = { entretien: "Entretien", debat: "Débat", extrait: "Extrait" };
const quand = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const ilYa = (d: string) => {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return min < 60 ? `il y a ${Math.max(min, 1)} min` : min < 1440 ? `il y a ${Math.round(min / 60)} h` : `il y a ${Math.round(min / 1440)} j`;
};

/**
 * Temps d'antenne au jour le jour : les émissions que les chaînes mettent elles-mêmes en ligne
 * (scripts/temps-antenne.ts, relevé horaire). Complète l'Arcom, officielle mais en retard de six semaines.
 */
export default function AntennePanel({ candidats }: { candidats: Candidat[] }) {
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [jours, setJours] = useState<7 | 30>(7);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => { api.getAntennePassages(30).then(setPassages).catch(() => setPassages([])); }, []);
  const parSlug = useMemo(() => new Map(candidats.map(c => [c.slug, c])), [candidats]);

  const lignes = useMemo(() => {
    const depuis = Date.now() - jours * 86400000;
    const m = new Map<string, { slug: string; secondes: number; entretiens: number; extraits: number; medias: Set<string>; liste: Passage[] }>();
    for (const p of passages || []) {
      if (new Date(p.publie_le).getTime() < depuis || !parSlug.has(p.slug)) continue;
      const x = m.get(p.slug) ?? { slug: p.slug, secondes: 0, entretiens: 0, extraits: 0, medias: new Set<string>(), liste: [] };
      x.secondes += p.secondes_attribuees;
      if (p.format === "extrait") x.extraits++; else x.entretiens++;
      x.medias.add(p.media); x.liste.push(p);
      m.set(p.slug, x);
    }
    return [...m.values()].sort((a, b) => b.secondes - a.secondes || (b.entretiens + b.extraits) - (a.entretiens + a.extraits));
  }, [passages, jours, parSlug]);
  const max = Math.max(1, ...lignes.map(l => l.secondes));
  const dernier = passages?.reduce((a, p) => (p.releve_le > a ? p.releve_le : a), "") || null;

  return (
    <div className="rounded-[2rem] border border-border bg-card p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-foreground">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /></span>
            En direct · {jours} derniers jours
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Entretiens, débats et prises de parole diffusés par 19 chaînes de télé et de radio{dernier ? ` · relevé ${ilYa(dernier)}` : ""}</p>
        </div>
        <div className="flex gap-1">
          {([7, 30] as const).map(j => (
            <button key={j} type="button" onClick={() => setJours(j)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${j === jours ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{j} jours</button>
          ))}
        </div>
      </div>

      {!passages ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-rose-500" /></div>
        : !lignes.length ? <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucun passage relevé sur cette période pour l&apos;instant : le relevé tourne chaque heure.</p>
        : (
        <div className="space-y-2">
          {lignes.map((l, i) => {
            const c = parSlug.get(l.slug)!; const col = couleur(l.slug); const open = ouvert === l.slug;
            return (
              <div key={l.slug} className="rounded-2xl border border-transparent transition hover:border-border">
                <button type="button" onClick={() => setOuvert(open ? null : l.slug)} aria-expanded={open} className="flex w-full items-center gap-3 p-2 text-left">
                  <span className="w-5 shrink-0 text-center font-staatliches text-lg text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-black text-foreground">{c.full_name}</span>
                      <span className="shrink-0 text-xs font-black tabular-nums text-foreground">{l.secondes ? heures(l.secondes) : "—"}</span>
                    </span>
                    <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max((l.secondes / max) * 100, l.secondes ? 2 : 0)}%`, background: col }} />
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {l.entretiens > 0 && `${l.entretiens} entretien${l.entretiens > 1 ? "s" : ""} ou débat${l.entretiens > 1 ? "s" : ""}`}
                      {l.entretiens > 0 && l.extraits > 0 && " · "}
                      {l.extraits > 0 && `${l.extraits} extrait${l.extraits > 1 ? "s" : ""}`}
                      {` · ${l.medias.size} média${l.medias.size > 1 ? "s" : ""}`}
                    </span>
                  </span>
                  <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <ul className="space-y-1.5 px-3 pb-3 sm:px-10">
                    {l.liste.map(p => (
                      <li key={p.video_id}>
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 text-xs">
                          {p.type_media === "radio" ? <Radio size={13} className="mt-0.5 shrink-0 text-muted-foreground" /> : <Tv size={13} className="mt-0.5 shrink-0 text-muted-foreground" />}
                          <span className="min-w-0 flex-1">
                            <span className="font-bold text-foreground group-hover:underline">{p.titre}</span> <ExternalLink size={10} className="inline opacity-50" />
                            <span className="block text-[11px] text-muted-foreground">{p.media} · {quand(p.publie_le)} · {FORMAT[p.format]} {Math.round(p.duree_s / 60)} min{p.format !== "extrait" && p.secondes_attribuees !== p.duree_s ? ` (compté ${Math.round(p.secondes_attribuees / 60)} min)` : ""}</span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
