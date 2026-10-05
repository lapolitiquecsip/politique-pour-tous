"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Info } from "lucide-react";
import { api } from "@/lib/api";
import CourbeMulti, { type Serie } from "./CourbeMulti";
import { EnTete, ZonePro, Methode } from "./VerrouPro";
import { couleur, court, vignette } from "@/lib/dynamiques";

type Candidat = { slug: string; full_name: string; photo_url: string | null; party: string | null };
type Donnees = Awaited<ReturnType<typeof api.getVeillePresse>>;
const JOUR = 86400000;
const PANEL = 32;   // médias relus par la veille (backend : veille-presse-candidats.ts)

export default function PressePanel({ candidats }: { candidats: Candidat[] }) {
  const [jours, setJours] = useState<7 | 30>(7);
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => { setD(null); api.getVeillePresse(jours).then(setD).catch(() => setErreur(true)); }, [jours]);

  const parSlug = useMemo(() => new Map(candidats.map(c => [c.slug, c])), [candidats]);
  const nom = (s: string) => parSlug.get(s)?.full_name ?? s;
  const totalMentions = d ? d.totaux.reduce((a, x) => a + x.n, 0) : 0;
  const depuis = d?.depuis ? new Date(d.depuis).getTime() : Date.now();
  const comparable = Date.now() - depuis > 2 * jours * JOUR;   // période précédente entièrement mesurée
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

  const reglage = (
    <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
      {([[7, "7 jours"], [30, "30 jours"]] as const).map(([v, l]) => (
        <button key={v} onClick={() => setJours(v)}
          className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${jours === v ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
      ))}
    </div>
  );

  const premier = d?.totaux[0];

  return (
    <section id="presse" className="scroll-mt-36">
      <EnTete numero="02" rubrique="Presse" pro titre="Exposition" accent="médiatique" degrade="from-amber-500 to-orange-600"
        chapeau={<>Combien d&apos;articles citent chaque candidat, dans un panel fixe de {PANEL}{" "}médias : presse nationale et régionale, radios et chaînes d&apos;information, relus toutes les deux heures.</>}
        actions={reglage} />

      {erreur ? <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">La veille n&apos;a pas pu être chargée.</p>
        : !d ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-500" /></div>
        : !d.totaux.length || !premier ? <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucun article relevé sur la période pour l&apos;instant.</p>
        : (
        <ZonePro titre="La veille presse" points={["Part de voix de chaque candidat", "Évolution jour par jour", "Qui parle de qui, média par média"]}>
          {!comparable && (
            <p className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-500/10 px-4 py-3 text-[12px] text-amber-900 dark:text-amber-200">
              <Info size={14} className="mt-0.5 shrink-0" />
              Mesure démarrée le {new Date(depuis).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} : la période couvre pour l&apos;instant {joursMesures} jour{joursMesures > 1 ? "s" : ""}.
              Les évolutions apparaîtront quand la période précédente sera entièrement mesurée.
            </p>
          )}

          {/* Chiffres clés */}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Articles</p>
              <p className="mt-2 font-staatliches text-5xl leading-none tabular-nums text-foreground">{d.articles.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-muted-foreground">citent au moins un candidat</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Médias</p>
              <p className="mt-2 font-staatliches text-5xl leading-none tabular-nums text-foreground">{d.medias}<span className="text-2xl text-muted-foreground">/{PANEL}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">ont parlé des candidats</p>
            </div>
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5">
              <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: couleur(premier.slug) }} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Le plus cité</p>
              <div className="mt-2 flex items-center gap-3">
                {parSlug.get(premier.slug)?.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vignette(parSlug.get(premier.slug)!.photo_url, 120)!} alt="" className="h-11 w-11 rounded-full object-cover object-top" style={{ boxShadow: `0 0 0 2px ${couleur(premier.slug)}` }} />
                )}
                <p className="font-staatliches text-3xl uppercase leading-none text-foreground">{court(nom(premier.slug))}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{Math.round((premier.n / totalMentions) * 100)} % des citations</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {/* Part de voix */}
            <div className="rounded-[2rem] border border-border bg-card p-5 md:p-6 lg:col-span-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Part de voix</h3>
              <p className="mb-5 text-xs text-muted-foreground">Part des citations de candidats qui revient à chacun.</p>
              <div className="space-y-3.5">
                {d.totaux.slice(0, 12).map(x => {
                  const part = (x.n / totalMentions) * 100; const evol = comparable && x.n_prec ? ((x.n - x.n_prec) / x.n_prec) * 100 : null;
                  return (
                    <div key={x.slug} onMouseEnter={() => setFocus(x.slug)} onMouseLeave={() => setFocus(null)}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold text-foreground">{nom(x.slug)}</span>
                        <span className="shrink-0 font-staatliches text-xl leading-none tabular-nums text-foreground">{Math.round(part)} %</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full" style={{ width: `${(x.n / d.totaux[0].n) * 100}%`, background: couleur(x.slug) }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>{x.n} article{x.n > 1 ? "s" : ""} · {x.nb_medias} média{x.nb_medias > 1 ? "s" : ""}</span>
                        {evol != null && <span className={`inline-flex items-center gap-0.5 font-black ${evol >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{evol >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{evol >= 0 ? "+" : ""}{Math.round(evol)} %</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jour par jour */}
            <div className="flex flex-col rounded-[2rem] border border-border bg-card p-5 md:p-6 lg:col-span-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Jour par jour</h3>
              <p className="mb-3 text-xs text-muted-foreground">Articles par jour pour les six candidats les plus cités.</p>
              {joursMesures < 3
                ? <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="font-staatliches text-2xl uppercase text-foreground">La courbe se dessine</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">Elle apparaît après trois jours de mesure : il faut quelques points pour qu&apos;une tendance ait un sens.</p>
                  </div>
                : <CourbeMulti series={series} debut={Math.max(Date.now() - jours * JOUR, depuis)} fin={Date.now()} hauteur={300} unite="" decimales={0} pasJour focus={focus} onFocus={setFocus} />}
            </div>
          </div>

          {/* Médias × candidats */}
          {carte && carte.medias.length > 0 && (
            <div className="mt-5 rounded-[2rem] border border-border bg-card p-5 md:p-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Qui parle de qui</h3>
              <p className="mb-4 text-xs text-muted-foreground">Articles par média, pour les candidats les plus cités.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-[11px]">
                  <thead>
                    <tr><th />{carte.tete.map(s => <th key={s} className="px-1 pb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{court(nom(s))}</th>)}</tr>
                  </thead>
                  <tbody>
                    {carte.medias.map(m => (
                      <tr key={m}>
                        <td className="whitespace-nowrap pr-2 text-left text-xs font-bold text-foreground">{m}</td>
                        {carte.tete.map(s => {
                          const v = carte.val(s, m); const fort = v / carte.max > 0.55;
                          return (
                            <td key={s} className="h-8 rounded-lg font-black tabular-nums"
                              style={{ background: v ? `color-mix(in srgb, ${couleur(s)} ${15 + (v / carte.max) * 70}%, transparent)` : undefined }}>
                              <span className={fort ? "text-white" : "text-foreground"}>{v || ""}</span>
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

          <Methode>
            Un article compte pour un candidat s&apos;il le nomme dans son titre ou son chapeau (nom complet, ou nom de famille quand il est
            sans ambiguïté). Le panel ne change pas, ce qui rend les chiffres comparables d&apos;un jour à l&apos;autre. On mesure une visibilité
            dans la presse, pas l&apos;opinion des médias sur les candidats.
          </Methode>
        </ZonePro>
      )}
    </section>
  );
}
