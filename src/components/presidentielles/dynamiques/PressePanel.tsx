"use client";

import { useEffect, useMemo, useState } from "react";
import { Newspaper, Loader2, TrendingUp, TrendingDown, ExternalLink, Info } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import CourbeMulti, { type Serie } from "./CourbeMulti";
import VerrouPro, { Flou, BadgePro } from "./VerrouPro";
import { couleur, court } from "@/lib/dynamiques";

type Candidat = { slug: string; full_name: string; photo_url: string | null; party: string | null };
type Donnees = Awaited<ReturnType<typeof api.getVeillePresse>>;
const JOUR = 86400000;
const PANEL = 32;   // médias relus par la veille (backend : veille-presse-candidats.ts)

const ilYa = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export default function PressePanel({ candidats }: { candidats: Candidat[] }) {
  const { isPro } = usePremium();
  const [jours, setJours] = useState<7 | 30>(7);
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => { setD(null); api.getVeillePresse(jours).then(setD).catch(() => setErreur(true)); }, [jours]);

  const parSlug = useMemo(() => new Map(candidats.map(c => [c.slug, c])), [candidats]);
  const nom = (s: string) => parSlug.get(s)?.full_name ?? s;
  const totalMentions = d ? d.totaux.reduce((a, x) => a + x.n, 0) : 0;
  const depuis = d?.depuis ? new Date(d.depuis).getTime() : Date.now();
  const comparable = Date.now() - depuis > 2 * jours * JOUR;   // la période précédente est entièrement mesurée
  const joursMesures = Math.min(jours, Math.max(1, Math.ceil((Date.now() - depuis) / JOUR)));

  const series: Serie[] = useMemo(() => {
    if (!d) return [];
    const debut = Date.now() - jours * JOUR;
    return d.totaux.slice(0, 6).map(x => {
      const pts: { x: number; y: number }[] = [];
      for (let j = Math.max(debut, depuis); j <= Date.now(); j += JOUR) {
        const jour = new Date(j).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
        pts.push({ x: new Date(jour + "T12:00:00").getTime(), y: d.par_jour.find(p => p.slug === x.slug && p.jour === jour)?.n ?? 0 });
      }
      return { id: x.slug, label: court(nom(x.slug)), couleur: couleur(x.slug), points: pts };
    });
  }, [d, jours, depuis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carte médias × candidats : les dix médias qui parlent le plus des candidats en tête.
  const carte = useMemo(() => {
    if (!d) return null;
    const tete = d.totaux.slice(0, 8).map(x => x.slug);
    const parMedia = new Map<string, number>();
    for (const p of d.par_media) if (tete.includes(p.slug)) parMedia.set(p.media, (parMedia.get(p.media) || 0) + p.n);
    const medias = [...parMedia].sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
    const val = (s: string, m: string) => d.par_media.find(p => p.slug === s && p.media === m)?.n ?? 0;
    const max = Math.max(1, ...tete.flatMap(s => medias.map(m => val(s, m))));
    return { tete, medias, val, max };
  }, [d]);

  return (
    <section id="presse" className="scroll-mt-28">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
          <Newspaper size={22} />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-staatliches text-3xl uppercase tracking-tight text-foreground">
              Exposition <span className="text-amber-700 dark:text-amber-400">médiatique</span>
            </h2>
            <BadgePro />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Combien d&apos;articles citent chaque candidat, dans un panel fixe de {PANEL} médias —
            presse nationale et régionale, radios et chaînes d&apos;information — relu toutes les deux heures.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {([[7, "7 jours"], [30, "30 jours"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setJours(v)}
              className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${jours === v ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>

      {!isPro && <VerrouPro titre="La veille médiatique est réservée à l'abonnement Pro" texte="Classement, part de voix, évolution jour par jour et répartition par média : côté Pro." />}

      {erreur ? <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">La veille n&apos;a pas pu être chargée.</p>
        : !d ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-500" /></div>
        : !d.totaux.length ? <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucun article relevé sur la période pour l&apos;instant.</p>
        : (
        <>
          {!comparable && (
            <p className="mb-4 flex items-start gap-2 rounded-2xl border border-border bg-muted p-3 text-[12px] text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0" />
              Mesure démarrée le {new Date(depuis).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} : la période affichée couvre {joursMesures} jour{joursMesures > 1 ? "s" : ""},
              et l&apos;évolution par rapport à la période précédente apparaîtra quand elle sera entièrement mesurée.
            </p>
          )}

          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              ["Articles", <Flou key="a" ok={isPro}>{d.articles.toLocaleString("fr-FR")}</Flou>, `citant au moins un candidat`],
              ["Médias", String(d.medias), "ont parlé des candidats"],
              ["Le plus cité", court(nom(d.totaux[0].slug)), <Flou key="p" ok={isPro}>{Math.round((d.totaux[0].n / totalMentions) * 100)} % des citations</Flou>],
            ].map(([t, v, s], i) => (
              <div key={i} className="rounded-3xl border border-border bg-card p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t}</p>
                <p className="mt-1 truncate font-staatliches text-2xl uppercase leading-none text-foreground">{v}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {/* Part de voix */}
            <div className="rounded-[2rem] border border-border bg-card p-4 md:p-6 lg:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Part de voix</h3>
              <p className="mb-4 text-[11px] text-muted-foreground">Part des citations de candidats qui revient à chacun.</p>
              <div className="space-y-2.5">
                {d.totaux.slice(0, 12).map(x => {
                  const part = (x.n / totalMentions) * 100; const evol = comparable && x.n_prec ? ((x.n - x.n_prec) / x.n_prec) * 100 : null;
                  return (
                    <div key={x.slug} onMouseEnter={() => setFocus(x.slug)} onMouseLeave={() => setFocus(null)}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2 truncate font-black text-foreground"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleur(x.slug) }} />{nom(x.slug)}</span>
                        <span className="shrink-0 text-xs font-black tabular-nums text-foreground"><Flou ok={isPro}>{x.n} art. · {Math.round(part)} %</Flou></span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full" style={{ width: `${(x.n / d.totaux[0].n) * 100}%`, background: couleur(x.slug) }} />
                      </div>
                      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                        <span><Flou ok={isPro}>{x.nb_medias} média{x.nb_medias > 1 ? "s" : ""}</Flou></span>
                        {evol != null && <span className={`inline-flex items-center gap-0.5 font-black ${evol >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{evol >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}<Flou ok={isPro}>{evol >= 0 ? "+" : ""}{Math.round(evol)} %</Flou></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jour par jour */}
            <div className="rounded-[2rem] border border-border bg-card p-4 md:p-6 lg:col-span-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Jour par jour</h3>
              <p className="mb-3 text-[11px] text-muted-foreground">Articles par jour pour les six candidats les plus cités.</p>
              {joursMesures < 3
                ? <p className="rounded-2xl bg-muted p-6 text-center text-[13px] text-muted-foreground">La courbe se dessine à partir de trois jours de mesure.</p>
                : <div className={isPro ? "" : "pointer-events-none select-none blur-sm"}>
                    <CourbeMulti series={series} debut={Math.max(Date.now() - jours * JOUR, depuis)} fin={Date.now()} hauteur={280} unite="" decimales={0} pasJour focus={focus} onFocus={setFocus} />
                  </div>}
            </div>
          </div>

          {/* Médias × candidats */}
          {carte && carte.medias.length > 0 && (
            <div className="mt-5 rounded-[2rem] border border-border bg-card p-4 md:p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Qui parle de qui</h3>
              <p className="mb-4 text-[11px] text-muted-foreground">Nombre d&apos;articles par média, pour les candidats les plus cités.</p>
              <div className={`overflow-x-auto ${isPro ? "" : "pointer-events-none select-none blur-sm"}`}>
                <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-[11px]">
                  <thead>
                    <tr><th />{carte.tete.map(s => <th key={s} className="px-1 pb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{court(nom(s))}</th>)}</tr>
                  </thead>
                  <tbody>
                    {carte.medias.map(m => (
                      <tr key={m}>
                        <td className="whitespace-nowrap pr-2 text-left text-xs font-bold text-foreground">{m}</td>
                        {carte.tete.map(s => {
                          const v = carte.val(s, m);
                          return (
                            <td key={s} className="h-8 rounded-md font-black tabular-nums"
                              style={{ background: v ? `color-mix(in srgb, ${couleur(s)} ${15 + (v / carte.max) * 70}%, transparent)` : undefined, color: v / carte.max > 0.55 ? "#fff" : undefined }}>
                              <span className={v / carte.max > 0.55 ? "" : "text-foreground"}>{v || ""}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Derniers articles */}
          <div className="mt-5 rounded-[2rem] border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-foreground">Derniers articles</h3>
            <ul className="divide-y divide-border">
              {d.derniers.slice(0, isPro ? 25 : 5).map(a => (
                <li key={a.url} className="flex items-start gap-3 py-2.5">
                  <span className="w-28 shrink-0 pt-0.5">
                    <span className="block truncate text-[11px] font-black text-foreground">{a.media}</span>
                    <span className="block text-[10px] text-muted-foreground">{ilYa(a.publie_le)}</span>
                  </span>
                  <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 text-sm font-bold leading-snug text-foreground hover:underline">
                    {a.titre} <ExternalLink size={11} className="inline text-muted-foreground" />
                  </a>
                  <span className="hidden shrink-0 gap-1 sm:flex">
                    {a.candidats.slice(0, 3).map(s => <span key={s} title={nom(s)} className="h-2.5 w-2.5 rounded-full" style={{ background: couleur(s) }} />)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="font-bold">Méthode.</strong> Un article compte pour un candidat s&apos;il le nomme dans son titre ou son chapeau
            (nom complet, ou nom de famille quand il est sans ambiguïté). Le panel ne change pas, ce qui rend les chiffres comparables d&apos;un jour
            à l&apos;autre ; il mesure une visibilité dans la presse, pas l&apos;opinion des médias sur les candidats.
          </p>
        </>
      )}
    </section>
  );
}
