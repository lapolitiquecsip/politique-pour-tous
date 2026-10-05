"use client";

import { useEffect, useMemo, useState } from "react";
import { Tv, Loader2, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import VerrouPro, { Flou, BadgePro } from "./VerrouPro";
import { couleur, heures } from "@/lib/dynamiques";

type Candidat = { slug: string; full_name: string; photo_url: string | null; party: string | null };
type Releve = Awaited<ReturnType<typeof api.getArcomTempsParole>>[number];

const nomMois = (iso: string, long = true) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", long ? { month: "long", year: "numeric" } : { month: "short" });

function Barres({ valeurs, couleur: col }: { valeurs: number[]; couleur: string }) {
  const max = Math.max(1, ...valeurs);
  return (
    <span className="flex h-7 items-end gap-[2px]" aria-hidden>
      {valeurs.map((v, i) => <span key={i} className="w-1.5 rounded-sm" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: col, opacity: i === valeurs.length - 1 ? 1 : 0.45 }} />)}
    </span>
  );
}

export default function ArcomPanel({ candidats }: { candidats: Candidat[] }) {
  const { isPro } = usePremium();
  const [rel, setRel] = useState<Releve[] | null>(null);
  const [mois, setMois] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => { api.getArcomTempsParole().then(r => { setRel(r); }).catch(() => setRel([])); }, []);

  const tousMois = useMemo(() => [...new Set((rel || []).map(r => r.mois))].sort(), [rel]);
  const courant = mois ?? tousMois[tousMois.length - 1];
  const precedent = tousMois[tousMois.indexOf(courant) - 1];
  const parSlug = useMemo(() => new Map(candidats.map(c => [c.slug, c])), [candidats]);

  const lignes = useMemo(() => {
    if (!rel || !courant) return [];
    const douze = tousMois.slice(Math.max(0, tousMois.indexOf(courant) - 11), tousMois.indexOf(courant) + 1);
    return rel.filter(r => r.mois === courant && parSlug.has(r.slug)).map(r => ({
      ...r,
      avant: rel.find(x => x.slug === r.slug && x.mois === precedent)?.secondes ?? null,
      histo: douze.map(m => rel.find(x => x.slug === r.slug && x.mois === m)?.secondes ?? 0),
    })).sort((a, b) => b.secondes - a.secondes);
  }, [rel, courant, precedent, tousMois, parSlug]);
  const total = lignes.reduce((a, x) => a + x.secondes, 0);

  return (
    <section id="temps-de-parole" className="scroll-mt-28">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg">
          <Tv size={22} />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-staatliches text-3xl uppercase tracking-tight text-foreground">
              Temps de parole <span className="text-sky-700 dark:text-sky-400">télé et radio</span>
            </h2>
            <BadgePro />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Chiffres officiels de l&apos;Arcom : le temps pendant lequel chaque candidat a lui-même pris la parole sur une trentaine de chaînes
            et de radios, mois par mois. L&apos;Arcom les publie avec environ deux mois de décalage.
          </p>
        </div>
      </div>

      {!isPro && <VerrouPro titre="Le temps de parole est réservé à l'abonnement Pro" texte="Heures d'antenne par candidat, évolution mensuelle et détail chaîne par chaîne." />}

      {!rel ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>
        : !lignes.length ? <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune donnée Arcom disponible pour l&apos;instant.</p>
        : (
        <div className="rounded-[2rem] border border-border bg-card p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{nomMois(courant)}</h3>
              <p className="text-[11px] text-muted-foreground"><Flou ok={isPro}>{heures(total)}</Flou> de parole au total pour les candidats déclarés</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {tousMois.slice(-6).map(m => (
                <button key={m} onClick={() => setMois(m)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${m === courant ? "bg-sky-700 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{nomMois(m, false)}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {lignes.map((l, i) => {
              const c = parSlug.get(l.slug)!; const col = couleur(l.slug); const open = ouvert === l.slug;
              const evol = l.avant ? ((l.secondes - l.avant) / l.avant) * 100 : null;
              const chaines = Object.entries(l.detail).sort((a, b) => b[1] - a[1]).slice(0, 8);
              return (
                <div key={l.slug} className="rounded-2xl border border-transparent transition hover:border-border">
                  <button onClick={() => setOuvert(open ? null : l.slug)} aria-expanded={open} className="flex w-full items-center gap-3 p-2 text-left">
                    <span className="w-5 shrink-0 text-center font-staatliches text-lg text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-black text-foreground">{c.full_name}</span>
                        <span className="shrink-0 text-xs font-black tabular-nums text-foreground"><Flou ok={isPro}>{heures(l.secondes)} · {Math.round((l.secondes / total) * 100)} %</Flou></span>
                      </span>
                      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span className="block h-full rounded-full" style={{ width: `${(l.secondes / lignes[0].secondes) * 100}%`, background: col }} />
                      </span>
                    </span>
                    <span className="hidden sm:block"><Barres valeurs={l.histo} couleur={col} /></span>
                    <span className="hidden w-16 shrink-0 text-right text-[11px] font-black sm:block">
                      {evol != null && <span className={`inline-flex items-center gap-0.5 ${evol >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{evol >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}<Flou ok={isPro}>{evol >= 0 ? "+" : ""}{Math.round(evol)} %</Flou></span>}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className={`grid gap-x-6 gap-y-1.5 px-10 pb-3 sm:grid-cols-2 ${isPro ? "" : "select-none blur-sm"}`}>
                      {chaines.map(([ch, s]) => (
                        <div key={ch} className="flex items-center gap-2 text-xs">
                          <span className="w-28 shrink-0 truncate font-bold text-foreground">{ch}</span>
                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full" style={{ width: `${(s / chaines[0][1]) * 100}%`, background: col }} /></span>
                          <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">{heures(s)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Source : Arcom, relevés « hors période électorale » (journaux, magazines et autres émissions). Temps de parole de la personne
            elle-même, hors soutiens. Un candidat sous le seuil de publication de l&apos;Arcom n&apos;apparaît pas. Les barres résument les douze
            derniers mois publiés ; chaque nouvelle publication de l&apos;Arcom est reprise automatiquement.
          </p>
        </div>
      )}
    </section>
  );
}
