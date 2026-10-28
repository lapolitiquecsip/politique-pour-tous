"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ExternalLink, ArrowRight, Info, ChevronDown, Mic2, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import type { ResultatPrimaire } from "@/lib/primaires";
import PrimaryDebates from "@/components/presidentielles/PrimaryDebates";
import { vignetteWikimedia } from "@/lib/wikimedia";

/**
 * Une primaire tranchée, en un bandeau : le vainqueur, le score de chaque candidat, et —
 * repliés — le détail du vote et les débats.
 *
 * Le bandeau est volontairement bas : il annonce un résultat, il ne doit pas repousser la
 * liste des candidats, qui reste l'objet de la page. Ce qui prend de la place (participation,
 * contexte du vote, retransmissions) ne s'ouvre qu'à la demande.
 *
 * Les battus n'ont plus de fiche — ils ne sont plus candidats à la présidentielle — mais ils
 * restent nommés ici, avec leur score : c'est le seul endroit de la page où ils figurent encore.
 */

type Personne = { slug: string; full_name: string; party: string | null; photo_url: string | null };
type Volet = "vote" | "debats";

const nf = new Intl.NumberFormat("fr-FR");
const pct = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

function jour(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T12:00:00Z`));
}

const initiales = (nom: string) => nom.split(/\s+/).map(m => m[0]).slice(0, 2).join("").toUpperCase();

/** « Primaire de gauche » : c'est le camp qui parle au lecteur, pas le nom de marque du scrutin. */
const CAMPS: Record<string, string> = {
  gauche: "Primaire de gauche", droite: "Primaire de droite",
  centre: "Primaire du centre", ecologistes: "Primaire écologiste",
};

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
  return <img src={vignetteWikimedia(p.photo_url, 96)!} loading="lazy" decoding="async" alt={nom} onError={() => setRate(true)} className={`object-cover object-top ${className}`} />;
}

function Onglet({
  ouvert, onClick, icone: Icone, children,
}: { ouvert: boolean; onClick: () => void; icone: typeof Mic2; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-expanded={ouvert}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
        ouvert ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icone size={12} /> {children}{" "}
      <ChevronDown size={12} className={`transition-transform ${ouvert ? "rotate-180" : ""}`} />
    </button>
  );
}

export default function PrimaireResultat({
  r, onOuvrir,
}: { r: ResultatPrimaire; onOuvrir?: (slug: string) => void }) {
  const [gens, setGens] = useState<Map<string, Personne>>(new Map());
  const [volet, setVolet] = useState<Volet | null>(null);
  const basculer = (v: Volet) => setVolet(x => (x === v ? null : v));

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
  const issue = d
    ? `${d.tour}, le ${jour(d.proclame_le)}. `
    : r.presse ? `Victoire annoncée par ${r.presse.medias} médias ; scores en cours de vérification. ` : "";

  return (
    // Ancre visée par les débats de primaire du fil « Mes candidats suivis ».
    <section id="primaires" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-8 pt-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg shadow-slate-900/5">
        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">

          {/* ── Le vainqueur ── */}
          <div className="relative isolate overflow-hidden bg-slate-950 p-4 text-white sm:p-5">
            <div className="absolute -left-16 -top-20 -z-10 h-48 w-48 rounded-full bg-rose-500/40 blur-[70px]" />{" "}
            <div className="absolute -bottom-20 -right-12 -z-10 h-48 w-48 rounded-full bg-fuchsia-600/30 blur-[80px]" />{" "}

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-rose-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                {CAMPS[r.camp] ?? "Primaire"}
              </span>{" "}
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                {r.primaire.replace(/^Primaire\s+/i, "")}
              </span>
            </p>{" "}

            <div className="mt-3.5 flex items-center gap-3">
              <span className="relative shrink-0">
                <Portrait p={gagnant} nom={nomGagnant} className="h-14 w-14 rounded-2xl text-base ring-2 ring-white/30" />{" "}
                <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg ring-2 ring-slate-950">
                  <Trophy size={12} strokeWidth={2.5} />
                </span>
              </span>{" "}
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Vainqueur</p>{" "}
                <h2 className="font-staatliches text-2xl uppercase leading-none">{nomGagnant}</h2>{" "}
                {partiGagnant && <p className="mt-0.5 truncate text-[11px] font-bold text-white/65">{partiGagnant}</p>}
              </div>{" "}
              {scoreGagnant && (
                <p className="shrink-0 font-staatliches text-4xl leading-none">
                  {scoreGagnant.pct.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}
                  <span className="ml-0.5 text-xl text-white/60">%</span>
                </p>
              )}
            </div>{" "}

            <p className="mt-3 text-[11px] leading-snug text-white/70">
              {`${issue}Les autres participants ne sont plus candidats.`}
            </p>{" "}

            {onOuvrir && gagnant && (
              <button
                type="button" onClick={() => onOuvrir(r.vainqueur)}
                className="group mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-amber-300"
              >
                Voir sa fiche <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>{" "}

          {/* ── Candidat par candidat ── */}
          <div className="p-4 sm:p-5">
            {d ? (
              <ol className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {d.scores.map((s, i) => {
                  const elu = s.slug === r.vainqueur;
                  return (
                    <li key={s.slug} className={`flex items-center gap-2.5 ${i === 0 ? "sm:col-span-2" : ""}`}>
                      <Portrait p={gens.get(s.slug)} nom={s.nom}
                        className={`h-7 w-7 shrink-0 rounded-lg text-[9px] ${elu ? "ring-2 ring-rose-500" : "grayscale-[35%]"}`} />{" "}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 truncate text-[13px] font-bold text-foreground">
                            {s.nom}
                            {s.parti && <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">{s.parti}</span>}
                          </p>{" "}
                          <p className={`shrink-0 text-[13px] font-black tabular-nums ${elu ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{pct(s.pct)}</p>
                        </div>{" "}
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(s.pct / max) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.06 * i, ease: "easeOut" }}
                            className={`h-full rounded-full ${elu ? "bg-gradient-to-r from-pink-500 to-rose-600" : "bg-slate-400 dark:bg-slate-500"}`}
                          />
                        </div>
                      </div>{" "}
                    </li>
                  );
                })}
              </ol>
            ) : r.presse?.url ? (
              <a href={r.presse.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-1.5 text-xs leading-snug text-muted-foreground hover:text-foreground">
                <ExternalLink size={12} className="mt-0.5 shrink-0" /> {r.presse.titre}
              </a>
            ) : null}{" "}

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {d && <Onglet ouvert={volet === "vote"} onClick={() => basculer("vote")} icone={BarChart3}>Détail du vote</Onglet>}{" "}
              <Onglet ouvert={volet === "debats"} onClick={() => basculer("debats")} icone={Mic2}>Débats et votes</Onglet>
            </div>
          </div>
        </div>{" "}

        {/* ── Volets repliés ── */}
        <AnimatePresence initial={false}>
          {volet && (
            <motion.div
              key={volet}
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-t border-border"
            >
              <div className="p-4 sm:p-5">
                {volet === "vote" && d && (
                  <>
                    <dl className="grid grid-cols-3 gap-2">
                      {[
                        d.votants ? { k: "Votants", v: nf.format(d.votants), s: participation ? `≈ ${participation} % des inscrits` : null } : null,
                        d.exprimes ? { k: "Exprimés", v: nf.format(d.exprimes), s: d.votants ? `${nf.format(d.votants - d.exprimes)} blancs ou nuls` : null } : null,
                        d.inscrits_environ ? { k: "Inscrits", v: `≈ ${nf.format(d.inscrits_environ)}`, s: "ordre de grandeur" } : null,
                      ].filter(Boolean).map(x => (
                        <div key={x!.k} className="rounded-2xl bg-muted px-3 py-2">
                          <dt className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{x!.k}</dt>{" "}
                          <dd className="whitespace-nowrap text-[13px] font-black tabular-nums text-foreground sm:text-base">{x!.v}</dd>{" "}
                          {x!.s && <dd className="text-[10px] leading-tight text-muted-foreground">{x!.s}</dd>}{" "}
                        </div>
                      ))}
                    </dl>{" "}
                    {d.contexte && <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{d.contexte}</p>}{" "}
                    {d.note && (
                      <p className="mt-2 flex items-start gap-2 text-[12px] leading-snug text-muted-foreground">
                        <Info size={13} className="mt-0.5 shrink-0" /> {d.note}
                      </p>
                    )}{" "}
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Sources{" "}
                      {d.sources.map(s => (
                        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 normal-case tracking-normal underline-offset-2 hover:text-foreground hover:underline">
                          <ExternalLink size={11} /> {s.titre}{" "}
                        </a>
                      ))}
                    </p>
                  </>
                )}
                {volet === "debats" && <PrimaryDebates integre seule={r.primaire} />}
              </div>{" "}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
