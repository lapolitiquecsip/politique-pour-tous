"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";
import { EnTete, ZonePro, Methode, CsvPro } from "./VerrouPro";
import { couleur, heures, evolution } from "@/lib/dynamiques";
import { telechargerCsv } from "@/lib/csv";
import AntennePanel from "./AntennePanel";

type Candidat = { slug: string; full_name: string; photo_url: string | null; party: string | null };
type Releve = Awaited<ReturnType<typeof api.getArcomTempsParole>>[number];

// L'Arcom distingue la chaîne franceinfo (« franceinfo: ») et la radio (« France Info »).
const CHAINES: Record<string, string> = { "franceinfo:": "franceinfo (télé)", "franceinfo": "franceinfo (télé)", "France Info": "franceinfo (radio)" };
const chaine = (c: string) => CHAINES[c] ?? CHAINES[c.replace(/:$/, "")] ?? c;
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
  // Le mois le plus récent publié, quand il a été relevé, et le suivant attendu (~6 semaines après sa fin).
  const dernierMois = tousMois[tousMois.length - 1];
  const releve = (rel || []).filter(r => r.mois === dernierMois).map(r => r.maj_le).filter(Boolean).sort().pop() ?? null;
  const attendu = dernierMois ? (() => { const d = new Date(dernierMois + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + 1); const pub = new Date(d); pub.setUTCMonth(pub.getUTCMonth() + 2); return { mois: nomMois(d.toISOString().slice(0, 10)), vers: pub.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) }; })() : null;

  return (
    <section id="temps-de-parole" className="scroll-mt-36">
      <EnTete numero="03" rubrique="Télé et radio" pro titre="Temps de" accent="parole" degrade="from-sky-500 to-cyan-500"
        chapeau="Deux mesures complémentaires. En direct : chaque heure, les entretiens, débats et prises de parole des candidats diffusés par 19 chaînes de télé et de radio. Officiel : le temps de parole décompté par l'Arcom sur une trentaine d'antennes, publié mois par mois avec environ six semaines de retard." />

      {!rel ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>
        : !lignes.length ? <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune donnée Arcom disponible pour l&apos;instant.</p>
        : (
        <ZonePro titre="Le temps de parole" points={["Passages télé et radio relevés chaque heure", "Temps de parole officiel de l'Arcom, mois par mois", "Détail chaîne par chaîne, avec les liens"]}>
        <AntennePanel candidats={candidats} />
        <div className="mt-4 rounded-[2rem] border border-border bg-card p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">Officiel · Arcom</p>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{nomMois(courant)}</h3>{" "}
              <p className="text-[11px] text-muted-foreground">{heures(total)} de parole au total pour les candidats suivis (déclarés ou pressentis)</p>
            </div>{" "}
            <div className="flex flex-wrap items-center gap-1">
              <CsvPro disabled={!rel?.length} onClick={() => telechargerCsv("temps-de-parole-arcom",
                ["Candidat", "Mois", "Chaîne ou radio", "Temps de parole (secondes)", "Temps de parole"],
                (rel || []).filter(r => parSlug.has(r.slug)).flatMap(r => [
                  [parSlug.get(r.slug)!.full_name, r.mois.slice(0, 7), "Total", r.secondes, heures(r.secondes)],
                  ...Object.entries(r.detail).sort((a, b) => b[1] - a[1]).map(([ch, s]) => [parSlug.get(r.slug)!.full_name, r.mois.slice(0, 7), chaine(ch), s, heures(s)]),
                ]))} />
              {tousMois.slice(-6).map(m => (
                <button key={m} onClick={() => setMois(m)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${m === courant ? "bg-sky-700 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{nomMois(m, false)}{" "}</button>
              ))}
            </div>
          </div>{" "}

          {attendu && (
            <p className="mb-4 rounded-xl bg-sky-500/[0.07] px-3 py-2 text-[12px] leading-snug text-foreground">
              Dernier mois publié par l&apos;Arcom : <strong>{nomMois(dernierMois)}</strong>{releve ? `, relevé le ${new Date(releve).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}.
              {" "}{attendu.mois.replace(/^./, x => x.toUpperCase())} est attendu vers {attendu.vers} ; il apparaîtra ici le jour même de sa publication.
            </p>
          )}
          <div className="space-y-2">
            {lignes.map((l, i) => {
              const c = parSlug.get(l.slug)!; const col = couleur(l.slug); const open = ouvert === l.slug;
              // Sous 2 h le mois précédent, un pourcentage ne veut rien dire : on donne l'écart en heures.
              const evol = evolution(l.secondes, l.avant, 7200, heures);
              const chaines = Object.entries(l.detail).sort((a, b) => b[1] - a[1]).slice(0, 8);
              return (
                <div key={l.slug} className="rounded-2xl border border-transparent transition hover:border-border">
                  <button onClick={() => setOuvert(open ? null : l.slug)} aria-expanded={open} className="flex w-full items-center gap-3 p-2 text-left">
                    <span className="w-5 shrink-0 text-center font-staatliches text-lg text-muted-foreground">{i + 1}</span>{" "}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-black text-foreground">{c.full_name}</span>{" "}
                        <span className="shrink-0 text-xs font-black tabular-nums text-foreground">{heures(l.secondes)} · {Math.round((l.secondes / total) * 100)} %</span>
                      </span>{" "}
                      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span className="block h-full rounded-full" style={{ width: `${(l.secondes / lignes[0].secondes) * 100}%`, background: col }} />
                      </span>
                    </span>{" "}
                    <span className="hidden sm:block"><Barres valeurs={l.histo} couleur={col} /></span>{" "}
                    <span className="hidden w-16 shrink-0 text-right text-[11px] font-black sm:block">
                      {evol && <span title={l.avant != null ? `${nomMois(precedent)} : ${heures(l.avant)}` : undefined} className={`inline-flex items-center gap-0.5 ${evol.texte === "stable" ? "text-muted-foreground" : evol.hausse ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{evol.texte !== "stable" && (evol.hausse ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}{" "}{evol.texte}</span>}
                    </span>{" "}
                    <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>{" "}
                  {open && (
                    <div className="px-10 pb-3">
                    {precedent && (
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        {nomMois(precedent)} : {l.avant != null ? heures(l.avant) : "sous le seuil de publication"} → {nomMois(courant)} : <strong className="text-foreground">{heures(l.secondes)}</strong>
                        {evol && evol.texte !== "stable" && <> ({evol.texte})</>}
                      </p>
                    )}{" "}
                    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {chaines.map(([ch, s]) => (
                        <div key={ch} className="flex items-center gap-2 text-xs">
                          <span className="w-32 shrink-0 truncate font-bold text-foreground">{chaine(ch)}</span>{" "}
                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full" style={{ width: `${(s / chaines[0][1]) * 100}%`, background: col }} /></span>{" "}
                          <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">{heures(s)}</span>{" "}
                        </div>
                      ))}
                    </div>
                    </div>
                  )}{" "}
                </div>
              );
            })}
          </div>

        </div>
        <Methode>
            En direct : vidéos mises en ligne par les chaînes officielles de France Inter, franceinfo, RTL, BFMTV, LCI, RMC, Europe 1, CNews,
            TF1 Info, Public Sénat, LCP, France Culture, Quotidien, C à vous, Télématin, Sud Radio, BFM Business, Radio J et ici, relevées
            chaque heure. Un passage compte quand le titre montre le candidat parler (invité, entretien, débat, citation dont il est l&apos;auteur) ;
            un sujet sur lui ne compte pas. La durée des entretiens et débats est comptée (partagée entre les candidats d&apos;un débat ; une
            émission complète compte au plus 30 min) ; un extrait de moins de 6 min est compté en nombre, pas en temps. C&apos;est du temps
            d&apos;antenne questions comprises, une estimation et non le décompte officiel.
            <br /><br />
            Officiel : Arcom, relevés « hors période électorale » (journaux, magazines et autres émissions). Temps de parole de la personne
            elle-même, hors soutiens. Un candidat sous le seuil de publication de l&apos;Arcom n&apos;apparaît pas. Les barres résument les douze
            derniers mois publiés ; chaque nouvelle publication de l&apos;Arcom est reprise automatiquement. L&apos;évolution compare au mois
            précédent : en heures quand ce mois comptait moins de 2 h (un pourcentage serait trompeur), en multiple (×2, ×3…) quand le temps a
            au moins doublé. Les mois d&apos;été, plus creux, gonflent mécaniquement les hausses de la rentrée.
        </Methode>
        </ZonePro>
      )}
    </section>
  );
}
