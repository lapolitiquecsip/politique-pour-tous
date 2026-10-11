"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, ExternalLink, Users, CheckCircle2, ArrowRight, Info } from "lucide-react";
import { api } from "@/lib/api";
import type { ResultatPrimaire } from "@/lib/primaires";

/**
 * Le résultat d'une primaire : le vainqueur, puis chaque candidat avec son score.
 *
 * Les battus n'ont plus de fiche — ils ne sont plus candidats à la présidentielle — mais ils
 * restent nommés ici, avec leur score : c'est le seul endroit de la page où ils figurent encore.
 */

type Personne = { slug: string; full_name: string; party: string | null; photo_url: string | null };

const nf = new Intl.NumberFormat("fr-FR");
const pct = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

function jour(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

const initiales = (nom: string) => nom.split(/\s+/).map(m => m[0]).slice(0, 2).join("").toUpperCase();

function Portrait({ p, nom, className }: { p?: Personne; nom: string; className: string }) {
  const [rate, setRate] = useState(false);
  if (!p?.photo_url || rate) {
    return (
      <span className={`flex items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600 font-black text-white ${className}`}>
        {initiales(nom)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.photo_url} alt={nom} onError={() => setRate(true)} className={`object-cover object-top ${className}`} />;
}

export default function PrimaireResultat({
  r, onOuvrir,
}: { r: ResultatPrimaire; onOuvrir?: (slug: string) => void }) {
  const [gens, setGens] = useState<Map<string, Personne>>(new Map());

  useEffect(() => {
    let vivant = true;
    api.getCandidatesBySlugs([r.vainqueur, ...r.perdants])
      .then(l => { if (vivant) setGens(new Map((l as Personne[]).map(p => [p.slug, p]))); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [r]);

  const d = r.detail;
  const gagnant = gens.get(r.vainqueur);
  const scoreGagnant = d?.scores.find(s => s.slug === r.vainqueur);
  const nomGagnant = scoreGagnant?.nom ?? gagnant?.full_name ?? r.vainqueur;
  const partiGagnant = scoreGagnant?.parti ?? gagnant?.party ?? null;
  const max = d ? Math.max(...d.scores.map(s => s.pct)) : 100;
  const participation = d?.votants && d?.inscrits_environ ? Math.round((d.votants / d.inscrits_environ) * 100) : null;

  return (
    <section id="resultat-primaire" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-10">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-slate-900/5">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">

          {/* ── Le vainqueur ── */}
          <div className="relative isolate overflow-hidden bg-slate-950 p-6 text-white sm:p-8">
            <div className="absolute -left-20 -top-24 -z-10 h-72 w-72 rounded-full bg-rose-500/40 blur-[90px]" />
            <div className="absolute -bottom-28 -right-16 -z-10 h-72 w-72 rounded-full bg-fuchsia-600/30 blur-[100px]" />

            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ring-1 ring-white/15">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Résultat · {r.primaire}
            </p>

            <div className="mt-6 flex items-center gap-4">
              <span className="relative shrink-0">
                <Portrait p={gagnant} nom={nomGagnant} className="h-24 w-24 rounded-3xl text-2xl ring-2 ring-white/30 sm:h-28 sm:w-28" />
                <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg shadow-orange-500/40 ring-2 ring-slate-950">
                  <Trophy size={17} strokeWidth={2.5} />
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">Vainqueur</p>
                <h2 className="mt-1 font-staatliches text-4xl uppercase leading-[0.95] sm:text-5xl">{nomGagnant}</h2>
                {partiGagnant && <p className="mt-1.5 text-sm font-bold text-white/70">{partiGagnant}</p>}
              </div>
            </div>

            {scoreGagnant ? (
              <div className="mt-7 flex items-end gap-3">
                <span className="font-staatliches text-7xl leading-none tracking-tight sm:text-8xl">
                  {scoreGagnant.pct.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}
                  <span className="ml-1 text-4xl text-white/60 sm:text-5xl">%</span>
                </span>
                <span className="pb-2 text-xs font-bold leading-snug text-white/70">
                  des suffrages exprimés
                  {scoreGagnant.voix ? <><br />{nf.format(scoreGagnant.voix)} voix</> : null}
                </span>
              </div>
            ) : r.presse && (
              <p className="mt-6 text-sm leading-relaxed text-white/75">
                Victoire annoncée par {r.presse.medias} médias. Les scores détaillés seront
                affichés ici dès qu&apos;ils auront été recoupés.
              </p>
            )}

            {d && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 text-xs font-bold ring-1 ring-white/15">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                {d.tour} · proclamé le {jour(d.proclame_le)}
              </p>
            )}

            <p className="mt-5 text-sm leading-relaxed text-white/75">
              {`Désigné par cette primaire, ${nomGagnant} est candidat à l'élection présidentielle de 2027. Les autres participants ne le sont plus : leur fiche a été retirée de la liste.`}
            </p>

            {onOuvrir && gagnant && (
              <button
                type="button" onClick={() => onOuvrir(r.vainqueur)}
                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-amber-300"
              >
                Voir sa fiche
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
            {!d && r.presse?.url && (
              <a href={r.presse.url} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-white/60 hover:text-white">
                <ExternalLink size={12} className="mt-0.5 shrink-0" /> {r.presse.titre}
              </a>
            )}
          </div>

          {/* ── Candidat par candidat ── */}
          {d && (
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-staatliches text-2xl uppercase tracking-tight text-foreground">Candidat par candidat</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">% des suffrages exprimés</p>
              </div>

              <ol className="mt-5 space-y-3.5">
                {d.scores.map((s, i) => {
                  const elu = s.slug === r.vainqueur;
                  return (
                    <li key={s.slug} className="flex items-center gap-3">
                      <span className={`w-4 shrink-0 text-center text-xs font-black tabular-nums ${elu ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>{i + 1}</span>
                      <Portrait p={gens.get(s.slug)} nom={s.nom}
                        className={`h-11 w-11 shrink-0 rounded-2xl text-xs ${elu ? "ring-2 ring-rose-500" : "opacity-90 grayscale-[35%]"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-bold text-foreground">
                            {s.nom}
                            {s.parti && <span className="ml-2 hidden text-xs font-medium text-muted-foreground sm:inline">{s.parti}</span>}
                          </p>
                          <p className={`shrink-0 text-sm font-black tabular-nums ${elu ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{pct(s.pct)}</p>
                        </div>
                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(s.pct / max) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: 0.08 * i, ease: "easeOut" }}
                            className={`h-full rounded-full ${elu ? "bg-gradient-to-r from-pink-500 to-rose-600" : "bg-slate-400 dark:bg-slate-500"}`}
                          />
                        </div>
                        {s.parti && <p className="mt-1 truncate text-[11px] text-muted-foreground sm:hidden">{s.parti}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {(d.votants || d.exprimes || d.inscrits_environ) && (
                <dl className="mt-6 grid grid-cols-3 gap-2.5">
                  {[
                    d.votants ? { k: "Votants", v: nf.format(d.votants), s: participation ? `≈ ${participation} % des inscrits` : null } : null,
                    d.exprimes ? { k: "Exprimés", v: nf.format(d.exprimes), s: d.votants ? `${nf.format(d.votants - d.exprimes)} blancs ou nuls` : null } : null,
                    d.inscrits_environ ? { k: "Inscrits", v: `≈ ${nf.format(d.inscrits_environ)}`, s: "ordre de grandeur" } : null,
                  ].filter(Boolean).map(x => (
                    <div key={x!.k} className="rounded-2xl bg-muted px-3 py-2.5">
                      <dt className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <Users size={10} /> {x!.k}
                      </dt>
                      <dd className="mt-0.5 whitespace-nowrap text-[13px] font-black tabular-nums text-foreground sm:text-lg">{x!.v}</dd>
                      {x!.s && <dd className="text-[10px] leading-tight text-muted-foreground">{x!.s}</dd>}
                    </div>
                  ))}
                </dl>
              )}

              {d.contexte && <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">{d.contexte}</p>}

              {d.note && (
                <p className="mt-3 flex items-start gap-2 rounded-2xl border border-border px-3.5 py-2.5 text-[12px] leading-snug text-muted-foreground">
                  <Info size={14} className="mt-0.5 shrink-0" /> {d.note}
                </p>
              )}

              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Sources
                {d.sources.map(s => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 normal-case tracking-normal underline-offset-2 hover:text-foreground hover:underline">
                    <ExternalLink size={11} /> {s.titre}
                  </a>
                ))}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
