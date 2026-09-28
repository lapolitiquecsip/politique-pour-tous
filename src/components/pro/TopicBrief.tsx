"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Sparkles, Scale, HandCoins, Hourglass, Info, ExternalLink, AlertTriangle, RotateCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * « Tout sur un sujet » — le récap thématique des abonnés.
 *
 * On tape « panneau solaire » et on obtient ce que disent les textes : la règle,
 * les aides, ce qui est en train de changer — en français courant, avec le lien
 * vers chaque document derrière chaque affirmation.
 *
 * La synthèse n'est PAS produite ici. Le site est un export statique : il n'a
 * pas de serveur, et un navigateur ne doit ni détenir la clé d'un modèle de
 * langage ni décider seul qui est abonné. Les deux vivent dans la fonction Edge
 * `topic-brief`, qui vérifie le droit d'accès côté base avant de répondre.
 *
 * Les numéros entre crochets renvoient aux sources listées dessous. C'est ce qui
 * sépare une synthèse d'une affirmation : le lecteur peut aller vérifier.
 */

type Point = { titre: string; detail: string; sources?: number[] };
type Brief = {
  sujet?: string;
  en_bref?: string;
  regles?: Point[];
  aides?: Point[];
  en_cours?: Point[];
  a_savoir?: string[];
  limites?: string;
};
type Source = { kind: string; title: string; date: string | null; url: string | null; note?: string | null };
type Reponse = {
  slug?: string; keyword?: string; brief?: Brief; sources?: Source[];
  counts?: Record<string, number | string | null>; generated_at?: string; cached?: boolean;
  empty?: boolean; message?: string; error?: string;
};

const EXEMPLES = ["panneau solaire", "logement étudiant", "zone à faibles émissions", "apprentissage", "eau potable"];

const dateCourte = (iso?: string | null) => {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${+m[3]} ${mois[+m[2] - 1]} ${m[1]}`;
};

/** Les renvois [3] d'un point, rendus cliquables vers la source correspondante. */
function Renvois({ indices }: { indices?: number[] }) {
  if (!indices?.length) return null;
  return (
    <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
      {indices.map(i => (
        <a
          key={i}
          href={`#src-${i}`}
          className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white/60 transition hover:bg-white/20 hover:text-white"
        >
          {i}
        </a>
      ))}
    </span>
  );
}

function Rubrique({
  titre, icone: Icone, teinte, points,
}: { titre: string; icone: typeof Scale; teinte: string; points?: Point[] }) {
  if (!points?.length) return null;
  return (
    <div>
      <p className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] ${teinte}`}>
        <Icone size={14} /> {titre}
      </p>
      <ul className="mt-2.5 space-y-2.5">
        {points.map((p, i) => (
          <li key={i} className="rounded-2xl bg-white/[0.04] p-3.5">
            <p className="text-sm font-bold text-white">{p.titre}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/70">
              {p.detail}<Renvois indices={p.sources} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TopicBrief() {
  const [mot, setMot] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [res, setRes] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function chercher(sujet?: string) {
    const q = (sujet ?? mot).trim();
    if (q.length < 3 || enCours) return;
    setMot(q);
    setEnCours(true);
    setErreur(null);
    setRes(null);
    try {
      const { data, error } = await supabase.functions.invoke<Reponse>("topic-brief", { body: { keyword: q } });
      if (error) throw error;
      if (data?.error) { setErreur(data.error); return; }
      setRes(data ?? null);
    } catch (e) {
      // La fonction peut ne pas être déployée : le dire clairement plutôt que
      // de laisser un panneau muet.
      const m = (e as Error).message || "";
      setErreur(/404|not found|Failed to send/i.test(m)
        ? "Le service de synthèse n'est pas encore en ligne. Réessayez dans quelques minutes."
        : `La synthèse n'a pas abouti : ${m}`);
    } finally {
      setEnCours(false);
    }
  }

  const brief = res?.brief;
  const sources = res?.sources ?? [];
  // `counts` porte aussi la profondeur du corpus, qui n'est pas un nombre de
  // documents : on somme les seules valeurs numériques des corpus.
  const total = Object.entries(res?.counts ?? {})
    .filter(([k, v]) => k !== "jorf_depuis" && typeof v === "number")
    .reduce((a, [, v]) => a + (v as number), 0);
  const jorfDepuis = dateCourte(res?.counts?.jorf_depuis as unknown as string);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/60 text-white shadow-2xl shadow-violet-950/30">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={11} /> Abonnés
            </span>
          </div>

          <h2 className="mt-3 font-staatliches text-3xl uppercase leading-none tracking-tight sm:text-4xl">
            Tout sur un sujet
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Tapez un mot — <em>panneau solaire</em>, <em>apprentissage</em>, <em>eau potable</em> — et
            obtenez ce que disent les textes : la règle, les aides, ce qui change. En français courant,
            avec le lien vers chaque document.
          </p>

          <div className="mt-5 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-3 focus-within:border-violet-400/60">
              <Search size={17} className="shrink-0 text-white/40" />
              <input
                value={mot}
                onChange={e => setMot(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") chercher(); }}
                placeholder="Un sujet, en deux ou trois mots"
                maxLength={80}
                className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
            <button
              onClick={() => chercher()}
              disabled={enCours || mot.trim().length < 3}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 text-[11px] font-black uppercase tracking-widest transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enCours ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              <span className="hidden sm:inline">Analyser</span>
            </button>
          </div>

          {!res && !enCours && !erreur && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EXEMPLES.map(x => (
                <button
                  key={x}
                  onClick={() => chercher(x)}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/65 transition hover:border-violet-400/50 hover:text-white"
                >
                  {x}
                </button>
              ))}
            </div>
          )}

          {enCours && (
            <p className="mt-4 flex items-center gap-2 text-[13px] text-white/55">
              <Loader2 size={14} className="animate-spin" />
              On rassemble les textes officiels, puis on les met en clair. Comptez une vingtaine de secondes
              la première fois qu&apos;un sujet est demandé.
            </p>
          )}

          {erreur && (
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3.5 text-[13px] leading-snug text-amber-200">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {erreur}
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {res && (
            <motion.div
              key={res.slug ?? "vide"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="border-t border-white/10 p-5 sm:p-7"
            >
              {res.empty ? (
                <p className="flex items-start gap-2 text-sm leading-relaxed text-white/70">
                  <Info size={16} className="mt-0.5 shrink-0 text-white/40" />
                  {res.message}
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-staatliches text-2xl uppercase tracking-tight">
                      {brief?.sujet || res.keyword}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35">
                      {total} document{total > 1 ? "s" : ""} retenu{total > 1 ? "s" : ""}
                      {res.cached && res.generated_at && ` · synthèse du ${dateCourte(res.generated_at)}`}
                    </p>
                  </div>

                  {brief?.en_bref && (
                    <p className="mt-3 rounded-2xl bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 p-4 text-[15px] font-medium leading-relaxed text-white/90">
                      {brief.en_bref}
                    </p>
                  )}

                  <div className="mt-5 space-y-5">
                    <Rubrique titre="Ce que dit la règle" icone={Scale} teinte="text-violet-300" points={brief?.regles} />
                    <Rubrique titre="Les aides" icone={HandCoins} teinte="text-emerald-300" points={brief?.aides} />
                    <Rubrique titre="Ce qui est en discussion" icone={Hourglass} teinte="text-amber-300" points={brief?.en_cours} />
                  </div>

                  {!!brief?.a_savoir?.length && (
                    <ul className="mt-5 space-y-1.5">
                      {brief.a_savoir.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-white/70">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" /> {s}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Ce que la synthèse NE couvre pas : dit par elle-même, parce
                      qu'un récap qui se tait sur ses angles morts se fait passer
                      pour complet. */}
                  {brief?.limites && (
                    <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white/[0.04] p-3.5 text-[12px] leading-relaxed text-white/50">
                      <Info size={14} className="mt-0.5 shrink-0" /> {brief.limites}
                    </p>
                  )}

                  {/* Les sources, numérotées comme les renvois. */}
                  {sources.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                        Les {sources.length} documents utilisés
                      </p>
                      <ol className="mt-2.5 space-y-1.5">
                        {sources.map((s, i) => (
                          <li key={i} id={`src-${i + 1}`} className="flex gap-2.5 text-[12px] leading-snug scroll-mt-24">
                            <span className="mt-0.5 w-5 shrink-0 text-right font-black tabular-nums text-white/30">{i + 1}</span>
                            <span className="min-w-0">
                              <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/50">
                                {s.kind}
                              </span>
                              {s.url ? (
                                <a href={s.url} target="_blank" rel="noopener noreferrer"
                                  className="text-white/75 underline decoration-white/20 underline-offset-2 transition hover:text-white hover:decoration-white/60">
                                  {s.title} <ExternalLink size={10} className="inline align-baseline" />
                                </a>
                              ) : (
                                <span className="text-white/75">{s.title}</span>
                              )}
                              {s.date && <span className="ml-1.5 text-white/35">{dateCourte(s.date)}</span>}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                    <button
                      onClick={() => chercher(res.keyword)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 transition hover:text-white"
                    >
                      <RotateCw size={12} /> Refaire la synthèse
                    </button>
                    {/* Le périmètre réel, dit sans détour : le Journal officiel
                        conservé ici ne remonte pas à l'origine du droit, et une
                        synthèse muette là-dessus se ferait passer pour un état
                        complet de la réglementation. */}
                    <p className="text-[11px] leading-snug text-white/35">
                      Synthèse produite à partir des seuls documents listés ci-dessus
                      {jorfDepuis && <> — le Journal officiel conservé sur le site commence le {jorfDepuis}</>}.
                      Elle n&apos;a pas valeur de conseil : pour une situation précise, les textes
                      eux-mêmes font foi.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
