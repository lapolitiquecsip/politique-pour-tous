"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MessageSquareQuote, Search, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Qui a dit quoi en séance (Pro) : chaque prise de parole de l'Assemblée nationale, cherchable
 * en français (sans accents, avec les mots apparentés : « éolienne » trouve « éoliennes »).
 * « Qui en parle le plus » montre les orateurs les plus présents sur le sujet ; un clic
 * n'affiche que les siens. Chaque extrait renvoie au compte rendu officiel de la séance.
 * Source : comptes rendus intégraux de l'Assemblée (open data), relevés chaque nuit (sync-debats-an).
 */

type Resultat = { id: string; seance_uid: string; date_seance: string; point: string | null; acteur_ref: string | null; orateur: string | null; qualite: string | null; extrait: string; url: string | null };
type Orateur = { acteur_ref: string; orateur: string | null; qualite: string | null; interventions: number; derniere: string };
type Depute = { an_id: string; slug: string; party: string | null; first_name: string; last_name: string };
type Question = { uid: string; type: string; numero: string; analyse: string | null; acteur_ref: string | null; groupe: string | null; ministere: string | null; date_question: string | null; date_reponse: string | null; statut: string; extrait: string; url: string };
const STATUTS: [string, string][] = [["", "Toutes"], ["repondue", "Avec réponse"], ["attente", "Sans réponse"]];
const PERIODES: [string, string][] = [["30", "30 jours"], ["365", "12 mois"], ["", "Depuis 2024"]];
const PAR_PAGE = 30;

/** « …les [[éoliennes]] en mer… » (marques posées par la base) → les mots trouvés surlignés. */
function Extrait({ texte }: { texte: string }) {
  const morceaux = texte.split(/(\[\[[^\]]*\]\])/g);
  return <>{morceaux.map((m, i) => (m.startsWith("[[") && m.endsWith("]]") ? <mark key={i} className="rounded bg-amber-300/30 px-0.5 text-inherit">{m.slice(2, -2)}</mark> : <span key={i}>{m}</span>))}</>;
}

export default function DebatsSeance() {
  const [saisie, setSaisie] = useState("");
  const [q, setQ] = useState("");
  const [periode, setPeriode] = useState("365");
  const [acteur, setActeur] = useState<string | null>(null);
  const [resultats, setResultats] = useState<Resultat[] | null>(null);
  const [orateurs, setOrateurs] = useState<Orateur[]>([]);
  const [deputes, setDeputes] = useState<Map<string, Depute>>(new Map());
  const [page, setPage] = useState(0);
  const [fin, setFin] = useState(false);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState(false);
  // Séance publique, ou questions écrites et au Gouvernement (avec la réponse du ministre).
  const [mode, setMode] = useState<"seance" | "questions">("seance");
  const [statut, setStatut] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => { const t = setTimeout(() => setQ(saisie.trim()), 450); return () => clearTimeout(t); }, [saisie]);
  /** Début de la période choisie (calculé au moment de la requête). */
  const debut = (p: string) => (p ? new Date(Date.now() - Number(p) * 864e5).toISOString().slice(0, 10) : null);

  // Questions : même recherche, autre corpus.
  useEffect(() => {
    if (q.length < 3 || mode !== "questions") return;
    let actif = true;
    (async () => {
      setCharge(true); setErreur(false);
      const { data, error } = await supabase.rpc("chercher_questions", { p_q: q, p_depuis: debut(periode), p_statut: statut || null, p_limite: PAR_PAGE, p_decalage: page * PAR_PAGE });
      if (!actif) return;
      if (error) { setErreur(true); setCharge(false); return; }
      const l = (data as Question[]) || [];
      setQuestions(r => (page === 0 ? l : [...(r || []), ...l]));
      setFin(l.length < PAR_PAGE); setCharge(false);
    })();
    return () => { actif = false; };
  }, [q, periode, statut, page, mode]);

  // Résultats (et pages suivantes).
  useEffect(() => {
    if (q.length < 3 || mode !== "seance") return;
    let actif = true;
    (async () => {
      setCharge(true); setErreur(false);
      const { data, error } = await supabase.rpc("chercher_debats", { p_q: q, p_depuis: debut(periode), p_acteur: acteur, p_limite: PAR_PAGE, p_decalage: page * PAR_PAGE });
      if (!actif) return;
      if (error) { setErreur(true); setCharge(false); return; }
      const l = (data as Resultat[]) || [];
      setResultats(r => (page === 0 ? l : [...(r || []), ...l]));
      setFin(l.length < PAR_PAGE);
      setCharge(false);
    })();
    return () => { actif = false; };
  }, [q, periode, acteur, page, mode]);

  // Qui en parle le plus (sans le filtre d'orateur).
  useEffect(() => {
    if (q.length < 3) return;
    let actif = true;
    supabase.rpc("qui_parle_de", { p_q: q, p_depuis: debut(periode), p_limite: 12 }).then(({ data }) => { if (actif) setOrateurs((data as Orateur[]) || []); });
    return () => { actif = false; };
  }, [q, periode]);

  // Groupe et fiche des députés cités (les ministres n'en ont pas).
  useEffect(() => {
    const refs = [...new Set([...(resultats || []).map(r => r.acteur_ref), ...orateurs.map(o => o.acteur_ref), ...(questions || []).map(x => x.acteur_ref)].filter((x): x is string => !!x && !deputes.has(x)))];
    if (!refs.length) return;
    supabase.from("deputies").select("an_id, slug, party, first_name, last_name").in("an_id", refs).then(({ data }) => {
      setDeputes(m => { const n = new Map(m); for (const d of (data as Depute[]) || []) n.set(d.an_id, d); return n; });
    });
  }, [resultats, orateurs, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const changer = (f: () => void) => { f(); setPage(0); setResultats(null); };
  const nom = (ref: string | null, defaut: string | null) => { const d = ref ? deputes.get(ref) : null; return d ? `${d.first_name} ${d.last_name}` : (defaut || "").replace(/\s*\([^)]*\)\s*$/, ""); };
  const choisi = acteur ? orateurs.find(o => o.acteur_ref === acteur) : null;

  return (
    <section className="rounded-[2rem] border border-border bg-card p-5 md:p-7">
      <h2 className="flex items-center gap-2 font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground"><MessageSquareQuote size={22} className="text-amber-600" /> Qui a dit quoi en séance</h2>{" "}
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Chaque prise de parole à l&apos;Assemblée nationale depuis 2024, tirée des comptes rendus officiels et mise à jour chaque nuit. Cherchez un mot, une expression
        entre guillemets ou plusieurs mots ; « or » pour l&apos;un ou l&apos;autre, « - » pour exclure (ex. : <em>&quot;titre-restaurant&quot; or tickets -cantine</em>).
      </p>{" "}

      <div className="mt-5 inline-flex gap-1 rounded-xl border border-border bg-background p-1" role="group" aria-label="Corpus">
        {([["seance", "Débats en séance"], ["questions", "Questions au Gouvernement"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => changer(() => { setMode(v); setQuestions(null); })} aria-pressed={mode === v}
            className={`min-h-[36px] rounded-lg px-3 text-[12px] font-black transition ${mode === v ? "bg-amber-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>{" "}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={saisie} onChange={e => { setSaisie(e.target.value); setPage(0); }} placeholder="Ex. : éolien en mer, agrivoltaïsme, « zéro artificialisation nette »…"
            className="w-full min-h-[46px] rounded-xl border border-border bg-background pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none" />
          {saisie && <button type="button" onClick={() => { setSaisie(""); setResultats(null); setOrateurs([]); }} aria-label="Effacer" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground"><X size={16} /></button>}
        </div>{" "}
        <div className="inline-flex shrink-0 gap-1 rounded-xl border border-border bg-background p-1">
          {PERIODES.map(([v, l]) => (
            <button key={v} type="button" onClick={() => changer(() => setPeriode(v))} aria-pressed={periode === v}
              className={`min-h-[36px] rounded-lg px-3 text-[12px] font-bold transition ${periode === v ? "bg-amber-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>{" "}

      {q.length >= 3 && mode === "questions" ? (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap gap-1">
            {STATUTS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => changer(() => { setStatut(v); setQuestions(null); })} aria-pressed={statut === v}
                className={`min-h-[34px] rounded-full px-3 text-[12px] font-bold ${statut === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{l}</button>
            ))}
          </div>{" "}
          {erreur ? <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">La recherche n&apos;a pas abouti. Vérifiez la formulation et réessayez.</p>
            : questions && !questions.length && !charge ? <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Aucune question sur ce sujet pendant la période.</p>
            : (
            <ul className="space-y-2.5">
              {(questions || []).map(x => {
                const d = x.acteur_ref ? deputes.get(x.acteur_ref) : null;
                return (
                  <li key={x.uid} className="rounded-2xl border border-border bg-background p-4">
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
                      <span className="font-black text-foreground">{x.type === "QG" ? "Question au Gouvernement" : `Question écrite n° ${x.numero}`}</span>{" "}
                      <span className="text-muted-foreground">de {d ? <Link href={`/deputes/${d.slug}`} className="font-bold text-foreground hover:underline">{d.first_name} {d.last_name}</Link> : "un député"}{x.groupe ? ` (${x.groupe})` : ""}</span>{" "}
                      <span className="ml-auto text-[12px] text-muted-foreground">{x.date_question ? new Date(x.date_question).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                    </p>{" "}
                    <p className="mt-1 text-[12px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">{x.analyse} · {x.ministere}</p>{" "}
                    <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/85"><Extrait texte={x.extrait} /></p>{" "}
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
                      <span className={`rounded-full px-2 py-0.5 font-bold ${x.statut === "repondue" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                        {x.statut === "repondue" ? `Réponse publiée le ${x.date_reponse ? new Date(x.date_reponse).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : ""}` : x.statut === "en attente" ? "Sans réponse à ce jour" : x.statut}
                      </span>{" "}
                      <a href={x.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground">Question et réponse officielles <ExternalLink size={11} /></a>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}{" "}
          {charge ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-amber-600" /></div>
            : questions && questions.length > 0 && !fin && <button type="button" onClick={() => setPage(p => p + 1)} className="mt-3 w-full min-h-[44px] rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted">Voir plus</button>}
        </div>
      ) : q.length < 3 ? (
        <p className="mt-6 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Tapez au moins trois lettres pour chercher dans les débats.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            {acteur && (
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1.5 text-[12px] font-bold text-amber-900 dark:text-amber-200">
                Seulement {nom(acteur, choisi?.orateur ?? null)}{" "}
                <button type="button" onClick={() => changer(() => setActeur(null))} aria-label="Retirer le filtre"><X size={13} /></button>
              </p>
            )}{" "}
            {erreur ? <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">La recherche n&apos;a pas abouti. Vérifiez la formulation (guillemets fermés) et réessayez.</p>
              : resultats && !resultats.length && !charge ? <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Personne n&apos;en a parlé en séance sur cette période.</p>
              : (
              <ul className="space-y-2.5">
                {(resultats || []).map(r => {
                  const d = r.acteur_ref ? deputes.get(r.acteur_ref) : null;
                  return (
                    <li key={r.id} className="rounded-2xl border border-border bg-background p-4">
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
                        {d ? <Link href={`/deputes/${d.slug}`} className="font-black text-foreground hover:underline">{nom(r.acteur_ref, r.orateur)}</Link> : <span className="font-black text-foreground">{nom(r.acteur_ref, r.orateur)}</span>}{" "}
                        {d?.party && <span className="text-muted-foreground">{d.party}</span>}{" "}
                        {r.qualite && <span className="text-muted-foreground">{r.qualite}</span>}{" "}
                        <span className="ml-auto text-[12px] text-muted-foreground">{new Date(r.date_seance).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </p>{" "}
                      {r.point && <p className="mt-1 text-[12px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">{r.point}</p>}{" "}
                      <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/85"><Extrait texte={r.extrait} /></p>{" "}
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-muted-foreground hover:text-foreground">Compte rendu officiel de la séance <ExternalLink size={11} /></a>}
                    </li>
                  );
                })}
              </ul>
            )}{" "}
            {charge ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-amber-600" /></div>
              : resultats && resultats.length > 0 && !fin && (
              <button type="button" onClick={() => setPage(p => p + 1)} className="mt-3 w-full min-h-[44px] rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted">Voir plus</button>
            )}
          </div>{" "}

          <aside>
            <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground"><Users size={13} /> Qui en parle le plus</h3>{" "}
            <ul className="mt-2 space-y-1">
              {orateurs.map(o => {
                const d = deputes.get(o.acteur_ref);
                return (
                  <li key={o.acteur_ref}>
                    <button type="button" onClick={() => changer(() => setActeur(acteur === o.acteur_ref ? null : o.acteur_ref))} aria-pressed={acteur === o.acteur_ref}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition ${acteur === o.acteur_ref ? "bg-amber-500/15" : "hover:bg-muted"}`}>
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-foreground">{nom(o.acteur_ref, o.orateur)}</span>{" "}
                        <span className="block truncate text-[11px] text-muted-foreground">{d?.party || o.qualite || "—"}</span>
                      </span>{" "}
                      <span className="shrink-0 font-black tabular-nums text-foreground">{o.interventions}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}
