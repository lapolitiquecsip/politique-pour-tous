"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, ExternalLink, ChevronDown, Info, Swords } from "lucide-react";
import { api } from "@/lib/api";
import CourbeMulti, { type Serie } from "./CourbeMulti";
import { EnTete, Methode } from "./VerrouPro";
import {
  parSondage, serie, moyenne, couleur, idDe, marge, pct, periode, dateCourte, t, vignette, court,
  type Sondage, type SondageAgrege,
} from "@/lib/dynamiques";

type Candidat = { slug: string; full_name: string; photo_url: string | null; party: string | null };
const JOUR = 86400000;

function Evolution({ v }: { v: number | null }) {
  if (v == null || Math.abs(v) < 0.25) return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-muted-foreground"><Minus size={12} /> stable</span>;
  return v > 0
    ? <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-400"><TrendingUp size={12} /> +{v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>
    : <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-rose-700 dark:text-rose-400"><TrendingDown size={12} /> {v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>;
}

function Portrait({ photo, nom, couleur: col, taille = 36 }: { photo?: string | null; nom: string; couleur: string; taille?: number }) {
  return photo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={vignette(photo, taille * 2)!} alt="" loading="lazy" style={{ width: taille, height: taille, boxShadow: `0 0 0 2px ${col}` }} className="shrink-0 rounded-full object-cover object-top" />
    : <span style={{ width: taille, height: taille, background: col }} className="flex shrink-0 items-center justify-center rounded-full text-xs font-black text-white">{nom.split(" ").pop()?.charAt(0)}</span>;
}

export default function SondagesPanel({ candidats }: { candidats: Candidat[] }) {
  const [brut, setBrut] = useState<Sondage[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [fenetre, setFenetre] = useState<6 | 12 | 24>(6);
  const [focus, setFocus] = useState<string | null>(null);
  const [masques, setMasques] = useState<Set<string>>(new Set());
  const [hyp, setHyp] = useState(0);
  const [tousOuverts, setTousOuverts] = useState(false);

  useEffect(() => { api.getSondages().then(setBrut).catch(() => setErreur(true)); }, []);

  const tour1 = useMemo(() => parSondage((brut || []).filter(s => s.tour === 1)), [brut]);
  const tour2 = useMemo(() => (brut || []).filter(s => s.tour === 2), [brut]);
  const dernier = tour1[0];
  const fin = Date.now();
  const debut = fin - fenetre * 30.4 * JOUR;

  /** Classement : moyenne d'aujourd'hui, évolution sur 30 jours, fourchette récente. */
  const classement = useMemo(() => {
    if (!tour1.length) return [];
    const ids = new Map<string, { nom: string; slug: string | null }>();
    for (const p of tour1.filter(p => p.t > fin - 60 * JOUR)) for (const [id, v] of p.scores) if (!ids.has(id)) ids.set(id, { nom: v.nom, slug: v.slug });
    return [...ids].map(([id, v]) => {
      const auj = moyenne(tour1, id, fin);
      const avant = moyenne(tour1, id, fin - 30 * JOUR);
      const recents = tour1.filter(p => p.t > fin - 30 * JOUR).map(p => p.scores.get(id)).filter(Boolean) as { min: number; max: number }[];
      return {
        id, nom: v.nom, slug: v.slug, auj, evol: auj != null && avant != null ? auj - avant : null,
        min: recents.length ? Math.min(...recents.map(r => r.min)) : null, max: recents.length ? Math.max(...recents.map(r => r.max)) : null,
        nbSondages: recents.length,
      };
    }).filter(r => r.auj != null && r.nbSondages > 0).sort((a, b) => b.auj! - a.auj!);
  }, [tour1, fin]);

  const fiches = useMemo(() => {
    const m = new Map<string, { complet: string; photo: string | null }>();
    for (const s of brut || []) for (const r of s.resultats) {
      const id = idDe(r);
      if (!m.has(id) && (r.complet || r.photo)) m.set(id, { complet: r.complet || r.nom, photo: r.photo ?? null });
    }
    for (const c of candidats) m.set(c.slug, { complet: c.full_name, photo: c.photo_url ?? m.get(c.slug)?.photo ?? null });
    return m;
  }, [brut, candidats]);
  const nomCourt = (id: string, nom: string) => fiches.get(id)?.complet ?? nom;

  const series: Serie[] = useMemo(() => classement.slice(0, 9).filter(r => !masques.has(r.id)).map(r => ({
    id: r.id, label: court(nomCourt(r.id, r.nom)),
    couleur: couleur(r.id), points: serie(tour1, r.id, debut, fin),
    bruts: tour1.filter(p => p.t >= debut).map(p => { const v = p.scores.get(r.id); return v ? { x: p.t, y: v.pct } : null; }).filter(Boolean) as { x: number; y: number }[],
  })), [classement, tour1, debut, fin, masques]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Duels de second tour : moyenne des trois derniers sondages de chaque duel. */
  const duels = useMemo(() => {
    const g = new Map<string, Sondage[]>();
    for (const s of tour2) {
      if (t(s.date_fin) < fin - 150 * JOUR) continue;
      const k = s.resultats.map(idDe).sort().join("|");
      g.set(k, [...(g.get(k) || []), s]);
    }
    return [...g.values()].map(liste => {
      liste.sort((a, b) => b.date_fin.localeCompare(a.date_fin));
      const trois = liste.slice(0, 3);
      const ids = trois[0].resultats.map(idDe);
      const moy = ids.map(id => {
        const vals = trois.map(s => s.resultats.find(r => idDe(r) === id)?.pct).filter((v): v is number => v != null);
        const r = trois[0].resultats.find(x => idDe(x) === id)!;
        return { id, nom: r.nom, pct: vals.reduce((a, b) => a + b, 0) / vals.length };
      }).sort((a, b) => b.pct - a.pct);
      return { moy, nb: liste.length, dernier: liste[0] };
    }).sort((a, b) => b.dernier.date_fin.localeCompare(a.dernier.date_fin) || b.nb - a.nb);
  }, [tour2, fin]);

  if (erreur) return <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Les sondages n&apos;ont pas pu être chargés. Réessayez dans un instant.</p>;
  if (!brut) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-fuchsia-500" /></div>;
  if (!dernier) return null;

  const h = dernier.hypotheses[Math.min(hyp, dernier.hypotheses.length - 1)];
  // Un scénario se lit par ses candidats variables : ceux qui ne sont pas testés partout.
  const communs = dernier.hypotheses.map(x => new Set(x.resultats.map(idDe))).reduce((a, b) => new Set([...a].filter(i => b.has(i))));
  const scenarios = dernier.hypotheses.map(x => {
    const variables = x.resultats.filter(r => !communs.has(idDe(r))).map(r => court(nomCourt(idDe(r), r.nom)));
    return variables.length
      ? { court: `Avec ${variables.slice(0, 3).join(", ")}${variables.length > 3 ? "…" : ""}`, titre: `Avec ${variables.join(", ")}` }
      : { court: "Sans candidat variable", titre: "Scénario sans les candidats testés ailleurs" };
  });
  const nbInstituts = new Set(tour1.filter(p => p.t > fin - 90 * JOUR).map(p => p.institut)).size;

  return (
    <section id="sondages" className="scroll-mt-36">
      <EnTete numero="01" rubrique="Sondages" titre="Les" accent="sondages" degrade="from-indigo-500 to-blue-500"
        chapeau={<>Tous les sondages publiés, relevés automatiquement dès leur parution, et leur moyenne. Dernier en date :{" "}
          <strong className="font-black text-foreground">{dernier.institut}</strong>, {periode(dernier.date_debut, dernier.date_fin)}.</>}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            Mise à jour continue
          </span>
        } />

      {/* Chiffres clés */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["En tête", classement[0] ? `${nomCourt(classement[0].id, classement[0].nom)}` : "—", classement[0]?.auj != null ? pct(classement[0].auj) + " en moyenne" : ""],
          ["Écart 1er – 2e", classement[1] ? `${(classement[0].auj! - classement[1].auj!).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pts` : "—", classement[1] ? `sur ${nomCourt(classement[1].id, classement[1].nom)}` : ""],
          ["Sondages (90 j)", String(tour1.filter(p => p.t > fin - 90 * JOUR).length), `${nbInstituts} instituts`],
          ["Hypothèses testées", String((brut || []).filter(s => s.tour === 1 && t(s.date_fin) > fin - 90 * JOUR).length), "au 1er tour, sur 90 jours"],
        ].map(([titre, valeur, sous]) => (
          <div key={titre} className="rounded-3xl border border-border bg-card p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{titre}</p>
            <p className="mt-1 truncate font-staatliches text-2xl uppercase leading-none text-foreground">{valeur}</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{sous}</p>
          </div>
        ))}
      </div>

      {/* Courbe de la moyenne */}
      <div className="rounded-[2rem] border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Moyenne des sondages — 1er tour</h3>
            <p className="text-[11px] text-muted-foreground">Courbes lissées ; chaque point pâle est un sondage. Survolez pour lire les valeurs.</p>
          </div>
          <div className="inline-flex rounded-full border border-border bg-background p-1">
            {([[6, "6 mois"], [12, "1 an"], [24, "2 ans"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFenetre(v)}
                className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${fenetre === v ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
        <CourbeMulti series={series} debut={debut} fin={fin} focus={focus} onFocus={setFocus} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {classement.slice(0, 9).map(r => {
            const off = masques.has(r.id);
            return (
              <button key={r.id} onClick={() => setMasques(m => { const n = new Set(m); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}
                onMouseEnter={() => setFocus(r.id)} onMouseLeave={() => setFocus(null)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${off ? "border-border text-muted-foreground line-through opacity-60" : "border-border bg-background text-foreground hover:border-slate-400"}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: couleur(r.id) }} />
                {nomCourt(r.id, r.nom)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        {/* Classement */}
        <div className="rounded-[2rem] border border-border bg-card p-4 md:p-6 lg:col-span-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Où en est chacun</h3>
          <p className="mb-4 text-[11px] text-muted-foreground">Moyenne actuelle, évolution sur 30 jours et fourchette des scores relevés sur cette période.</p>
          <div className="space-y-2.5">
            {classement.slice(0, 12).map((r, i) => {
              const col = couleur(r.id); const max = classement[0].auj! * 1.08;
              return (
                <div key={r.id} className="flex items-center gap-3" onMouseEnter={() => setFocus(r.id)} onMouseLeave={() => setFocus(null)}>
                  <span className="w-5 shrink-0 text-center font-staatliches text-lg text-muted-foreground">{i + 1}</span>
                  <Portrait photo={fiches.get(r.id)?.photo} nom={r.nom} couleur={col} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-black text-foreground">{nomCourt(r.id, r.nom)}</span>
                      <span className="shrink-0 font-staatliches text-xl leading-none tabular-nums text-foreground">{pct(r.auj!)}</span>
                    </div>
                    <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      {r.min != null && r.max != null && (
                        <div className="absolute inset-y-0 rounded-full opacity-25" style={{ left: `${(r.min / max) * 100}%`, width: `${Math.max(1, ((r.max - r.min) / max) * 100)}%`, background: col }} />
                      )}
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.auj! / max) * 100}%`, background: col }} />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">{r.min != null && r.max != null && r.max - r.min >= 0.5 ? `entre ${pct(r.min)} et ${pct(r.max)} selon les hypothèses` : `${r.nbSondages} sondage${r.nbSondages > 1 ? "s" : ""} sur 30 jours`}</span>
                      <Evolution v={r.evol} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dernier sondage */}
        <div className="rounded-[2rem] border border-border bg-card p-4 md:p-6 lg:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Dernier sondage</p>
          <h3 className="font-staatliches text-2xl uppercase leading-tight text-foreground">{dernier.institut}</h3>
          <p className="text-[11px] text-muted-foreground">
            {periode(dernier.date_debut, dernier.date_fin)}{dernier.echantillon ? ` · ${dernier.echantillon.toLocaleString("fr-FR")} personnes` : ""}
          </p>
          {dernier.hypotheses.length > 1 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1">
                {dernier.hypotheses.map((x, i) => (
                  <button key={x.id} onClick={() => setHyp(i)} title={scenarios[i].titre}
                    className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider transition ${i === hyp ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>H{i + 1}</button>
                ))}
              </div>
              {/* Chaque hypothèse = une liste de candidats différente : on dit laquelle. */}
              <p className="mt-2 truncate text-[11px] text-muted-foreground" title={scenarios[Math.min(hyp, scenarios.length - 1)].titre}>
                <strong className="font-black text-foreground">Hypothèse {Math.min(hyp, scenarios.length - 1) + 1}</strong> · {scenarios[Math.min(hyp, scenarios.length - 1)].titre}
              </p>
            </div>
          )}
          <div className="mt-4 space-y-1.5">
            {h.resultats.map(r => {
              const id = idDe(r); const col = couleur(id);
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-xs font-bold text-foreground">{nomCourt(id, r.nom).split(" ").slice(-2).join(" ")}</span>
                  <div className="h-4 min-w-0 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded" style={{ width: `${Math.min(100, (r.pct / Math.max(40, h.resultats[0].pct)) * 100)}%`, background: col }} />
                  </div>
                  <span className="w-11 shrink-0 text-right text-xs font-black tabular-nums text-foreground">{pct(r.pct)}</span>
                </div>
              );
            })}
          </div>
          {dernier.echantillon && (
            <p className="mt-4 flex items-start gap-1.5 rounded-xl bg-muted p-2.5 text-[11px] leading-snug text-muted-foreground">
              <Info size={13} className="mt-0.5 shrink-0" />
              Marge d&apos;erreur : ±{marge(h.resultats[0].pct, dernier.echantillon)!.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pts sur le score du premier,
              ±{marge(10, dernier.echantillon)!.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pt autour de 10 %.
            </p>
          )}
        </div>
      </div>

      {/* Second tour */}
      {duels.length > 0 && (
        <div className="mt-5 rounded-[2rem] border border-border bg-card p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Swords size={16} className="text-indigo-700 dark:text-indigo-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Second tour : les duels testés</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {duels.slice(0, 8).map(d => {
              const [a, b] = d.moy;
              return (
                <div key={a.id + b.id} className="rounded-2xl border border-border bg-background p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm font-black">
                    <span className="flex min-w-0 items-center gap-2 truncate text-foreground"><Portrait photo={fiches.get(a.id)?.photo} nom={a.nom} couleur={couleur(a.id)} taille={26} />{nomCourt(a.id, a.nom).split(" ").slice(-2).join(" ")}</span>
                    <span className="flex min-w-0 items-center gap-2 truncate text-right text-foreground">{nomCourt(b.id, b.nom).split(" ").slice(-2).join(" ")}<Portrait photo={fiches.get(b.id)?.photo} nom={b.nom} couleur={couleur(b.id)} taille={26} /></span>
                  </div>
                  <div className="flex h-7 overflow-hidden rounded-lg text-[11px] font-black text-white">
                    <div className="flex items-center pl-2" style={{ width: `${a.pct}%`, background: couleur(a.id) }}>{pct(a.pct, 0)}</div>
                    <div className="flex items-center justify-end pr-2" style={{ width: `${b.pct}%`, background: couleur(b.id) }}>{pct(b.pct, 0)}</div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {d.nb} sondage{d.nb > 1 ? "s" : ""} · dernier : {d.dernier.institut}, {dateCourte(d.dernier.date_fin)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste complète */}
      <div className="mt-5 rounded-[2rem] border border-border bg-card p-4 md:p-6">
        <button onClick={() => setTousOuverts(o => !o)} aria-expanded={tousOuverts} className="flex w-full items-center justify-between gap-3 text-left">
          <span>
            <span className="block text-sm font-black uppercase tracking-widest text-foreground">Tous les sondages du 1er tour</span>
            <span className="block text-[11px] text-muted-foreground">{tour1.length} sondages depuis {new Date(tour1[tour1.length - 1].t).getFullYear()} — hypothèse principale affichée (la première testée)</span>
          </span>
          <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${tousOuverts ? "rotate-180" : ""}`} />
        </button>
        {tousOuverts && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-3 font-black">Institut</th><th className="py-2 pr-3 font-black">Terrain</th>
                  <th className="py-2 pr-3 text-right font-black">Échantillon</th><th className="py-2 pr-3 text-center font-black">Hyp.</th><th className="py-2 font-black">Hypothèse 1 — trois premiers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tour1.slice(0, 80).map((p: SondageAgrege) => (
                  <tr key={p.institut + p.date_fin}>
                    <td className="py-2 pr-3 font-black text-foreground">{p.institut}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{periode(p.date_debut, p.date_fin)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{p.echantillon?.toLocaleString("fr-FR") ?? "—"}</td>
                    <td className="py-2 pr-3 text-center tabular-nums text-muted-foreground">{p.hypotheses.length}</td>
                    <td className="py-2">
                      <span className="flex flex-wrap gap-x-3 gap-y-1">
                        {p.hypotheses[0].resultats.slice(0, 3).map(r => (
                          <span key={idDe(r)} className="inline-flex items-center gap-1 font-bold text-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ background: couleur(idDe(r)) }} />{r.nom} <span className="tabular-nums text-muted-foreground">{pct(r.pct)}</span>
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Methode>
        Pour chaque sondage, le score d&apos;un candidat est la moyenne de ses scores dans les
        hypothèses où il est testé ; la courbe lisse ces scores sur environ trois semaines, en pondérant chaque sondage par la taille
        de son échantillon. Un sondage mesure des intentions à un instant donné : ce n&apos;est pas une prédiction. Résultats relevés
        auprès des instituts via la{" "}
        <a href={brut[0]?.source_url || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold underline">
          liste publique des sondages <ExternalLink size={10} />
        </a>, actualisée toutes les deux heures. Notices complètes : Commission des sondages.
      </Methode>
    </section>
  );
}
