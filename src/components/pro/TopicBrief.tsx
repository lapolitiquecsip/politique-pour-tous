"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Sparkles, Scale, HandCoins, Hourglass, Info, ExternalLink, AlertTriangle, RotateCw,
  Crown, Landmark, Calculator, ChevronDown, Lightbulb,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * « Tout sur un sujet » — le récap thématique de l'offre Pro.
 *
 * On tape « apprentissage » et on obtient ce qui s'applique : les chiffres en
 * vigueur, les textes de loi précis (avec leur lien Légifrance), le détail des
 * aides — montant par cas, conditions, démarche — et ce qui est en discussion.
 *
 * La synthèse n'est PAS produite ici. Le site est un export statique : il n'a
 * pas de serveur, et un navigateur ne doit ni détenir la clé d'un modèle de
 * langage ni décider seul qui est abonné. Les deux vivent dans la fonction Edge
 * `topic-brief`, qui vérifie le niveau Pro côté base avant de répondre.
 *
 * Les numéros entre crochets renvoient aux documents listés en bas. Les textes
 * de loi affichés viennent des documents eux-mêmes (titre, lien) : le modèle ne
 * fait que désigner ceux qui comptent, il n'en écrit aucun.
 */

type Point = { titre: string; detail?: string; points?: string[]; sources?: number[] };
type Aide = {
  titre: string; pour_qui?: string; detail?: string;
  montants?: { cas?: string; montant?: string }[];
  conditions?: string[]; demarche?: string; sources?: number[];
};
type Chiffre = { valeur: string; libelle?: string; source?: number | null };
type TexteCle = { source: number; role?: string };
type Outil = { titre: string; url: string | null; type: string };
type Brief = {
  format?: number;
  sujet?: string;
  en_bref?: string;
  chiffres_cles?: Chiffre[];
  textes_cles?: TexteCle[];
  regles?: Point[];
  aides?: Aide[];
  en_cours?: Point[];
  a_savoir?: string[];
  limites?: string;
  outils?: Outil[];
};
type Source = {
  kind: string; groupe?: string; title: string; date: string | null; url: string | null; note?: string | null;
};
type Reponse = {
  slug?: string; keyword?: string; brief?: Brief; sources?: Source[];
  counts?: Record<string, number | string | null>; generated_at?: string; cached?: boolean;
  empty?: boolean; message?: string; error?: string;
};

const EXEMPLES = ["apprentissage", "panneau solaire", "prêt à taux zéro", "zone à faibles émissions", "rupture conventionnelle"];

/** Noms lisibles des corpus interrogés — les clés viennent de la fonction Edge. */
const CORPUS: Record<string, string> = {
  fiches: "Fiches service-public",
  textes: "Textes de référence",
  jorf: "Journal officiel",
  lois: "Lois",
  lois_anciennes: "Lois antérieures",
  decrets: "Décrets & arrêtés",
  analyses: "Analyses de textes",
  dossiers: "Textes en discussion",
  scrutins: "Votes Assemblée",
  scrutins_senat: "Votes Sénat",
  explications: "Enjeux de votes",
  commissions: "Commissions",
  amendements: "Amendements",
  petitions: "Pétitions",
  europe: "Europe",
  actus: "Actualité",
};

/** Teinte de la pastille selon la nature du texte : on reconnaît un code d'un décret d'un coup d'œil. */
const TEINTE_TEXTE: Record<string, string> = {
  Code: "bg-sky-400/15 text-sky-200",
  Loi: "bg-violet-400/20 text-violet-200",
  Ordonnance: "bg-violet-400/15 text-violet-200",
  "Décret": "bg-emerald-400/15 text-emerald-200",
  "Arrêté": "bg-teal-400/15 text-teal-200",
  "Décret / arrêté": "bg-emerald-400/15 text-emerald-200",
  "Journal officiel": "bg-emerald-400/15 text-emerald-200",
  "Droit européen": "bg-blue-400/15 text-blue-200",
};

const dateCourte = (iso?: string | null) => {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${+m[3]} ${mois[+m[2] - 1]} ${m[1]}`;
};

/** Le nom du site d'un lien, pour que le lecteur sache où il va avant de cliquer. */
const hote = (url?: string | null) => {
  try { return new URL(String(url)).hostname.replace(/^www\./, ""); } catch { return null; }
};

/** Le badge de l'offre : l'habillage violet de l'espace Pro, avec son éclat. */
export function BadgePro() {
  return (
    <span className="sword-shine inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d8b4fe] via-[#a855f7] to-[#c026d3] py-1 pl-1 pr-3 shadow-[0_6px_24px_rgba(168,85,247,0.45)] ring-1 ring-white/30">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950/30">
        <Crown size={13} className="text-white" />
      </span>
      <span className="font-staatliches text-lg leading-none tracking-[0.18em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">Pro</span>
    </span>
  );
}

/** Les renvois [3] d'un point, qui ouvrent la liste des documents et y descendent. */
function Renvois({ indices, ouvrir }: { indices?: (number | null | undefined)[]; ouvrir: (i: number) => void }) {
  const liste = (indices ?? []).filter((i): i is number => typeof i === "number");
  if (!liste.length) return null;
  return (
    <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
      {liste.map(i => (
        <button
          key={i}
          type="button"
          onClick={() => ouvrir(i)}
          aria-label={`Voir le document ${i}`}
          className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white/60 transition hover:bg-white/20 hover:text-white"
        >
          {i}
        </button>
      ))}
    </span>
  );
}

function Titre({ icone: Icone, teinte, children }: { icone: typeof Scale; teinte: string; children: React.ReactNode }) {
  return (
    <p className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] ${teinte}`}>
      <Icone size={14} /> {children}
    </p>
  );
}

function Puces({ items, teinte }: { items?: string[]; teinte: string }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {items.map((x, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-white/75">
          <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${teinte}`} /> {x}
        </li>
      ))}
    </ul>
  );
}

function Rubrique({
  titre, icone, teinte, puce, points, ouvrir,
}: {
  titre: string; icone: typeof Scale; teinte: string; puce: string; points?: Point[]; ouvrir: (i: number) => void;
}) {
  if (!points?.length) return null;
  return (
    <div>
      <Titre icone={icone} teinte={teinte}>{titre}</Titre>
      <ul className="mt-2.5 space-y-2.5">
        {points.map((p, i) => (
          <li key={i} className="rounded-2xl bg-white/[0.04] p-4">
            <p className="text-sm font-bold text-white">{p.titre}</p>
            {p.detail && (
              <p className="mt-1 text-[13px] leading-relaxed text-white/70">
                {p.detail}{!p.points?.length && <Renvois indices={p.sources} ouvrir={ouvrir} />}
              </p>
            )}
            <Puces items={p.points} teinte={puce} />
            {!!p.points?.length && <p className="mt-1.5"><Renvois indices={p.sources} ouvrir={ouvrir} /></p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Une aide : pour qui, combien selon le cas, à quelles conditions, comment la demander. */
function CarteAide({ a, ouvrir }: { a: Aide; ouvrir: (i: number) => void }) {
  const montants = (a.montants ?? []).filter(m => m.montant);
  return (
    <li className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
      <p className="text-sm font-bold text-white">{a.titre}</p>
      {(a.pour_qui || a.detail) && (
        <p className="mt-1 text-[13px] leading-relaxed text-white/70">{a.pour_qui || a.detail}</p>
      )}
      {montants.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-[13px]">
            <tbody>
              {montants.map((m, i) => (
                <tr key={i} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3 py-2 leading-snug text-white/70">{m.cas || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-black tabular-nums text-emerald-300">{m.montant}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!!a.conditions?.length && (
        <>
          <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/35">Conditions</p>
          <Puces items={a.conditions} teinte="bg-emerald-400/70" />
        </>
      )}
      {a.demarche && (
        <p className="mt-3 text-[12px] leading-relaxed text-white/60">
          <span className="font-black uppercase tracking-widest text-white/35">Démarche · </span>{a.demarche}
        </p>
      )}
      <p className="mt-2"><Renvois indices={a.sources} ouvrir={ouvrir} /></p>
    </li>
  );
}

export default function TopicBrief() {
  const [mot, setMot] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [res, setRes] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [docsOuverts, setDocsOuverts] = useState(false);
  const [tousLesTextes, setTousLesTextes] = useState(false);

  async function chercher(sujet?: string, refaire = false) {
    const q = (sujet ?? mot).trim();
    if (q.length < 3 || enCours) return;
    setMot(q);
    setEnCours(true);
    setErreur(null);
    setRes(null);
    setDocsOuverts(false);
    setTousLesTextes(false);
    try {
      const { data, error } = await supabase.functions.invoke<Reponse>("topic-brief", {
        body: { keyword: q, refresh: refaire },
      });
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

  // Un renvoi ouvre la liste des documents, PUIS descend jusqu'à la ligne : tant
  // que la liste est repliée, l'ancre n'existe pas encore dans la page.
  const ouvrir = (i: number) => {
    setDocsOuverts(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.getElementById(`src-${i}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-violet-500/20");
      setTimeout(() => el.classList.remove("bg-violet-500/20"), 1600);
    }));
  };

  const brief = res?.brief;
  const sources = res?.sources ?? [];
  // `counts` mélange trois choses : le compte par corpus, la profondeur du
  // Journal officiel (une date) et le total trouvé. Sommer naïvement comptait
  // donc les documents deux fois.
  const HORS_COMPTE = new Set(["jorf_depuis", "total_trouves"]);
  const total = Number(res?.counts?.total_trouves)
    || Object.entries(res?.counts ?? {})
      .filter(([k, v]) => !HORS_COMPTE.has(k) && typeof v === "number")
      .reduce((a, [, v]) => a + (v as number), 0);
  const parCorpus = Object.entries(res?.counts ?? {})
    .filter(([k, v]) => !HORS_COMPTE.has(k) && typeof v === "number" && (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  const jorfDepuis = dateCourte(res?.counts?.jorf_depuis as unknown as string);

  // Les textes qui s'appliquent : ceux que la synthèse désigne, dans son ordre ;
  // à défaut, les textes de référence des fiches les plus pertinentes.
  const textesDesignes = (brief?.textes_cles ?? [])
    .map(t => ({ n: t.source, role: t.role, s: sources[t.source - 1] }))
    .filter(t => t.s);
  const textesDeReference = sources
    .map((s, i) => ({ n: i + 1, role: undefined as string | undefined, s }))
    .filter(t => t.s.groupe === "texte");
  const textesAffiches = textesDesignes.length ? textesDesignes : textesDeReference.slice(0, 8);
  const dejaAffiches = new Set(textesAffiches.map(t => t.n));
  const autresTextes = textesDeReference.filter(t => !dejaAffiches.has(t.n));

  const chiffres = (brief?.chiffres_cles ?? []).filter(c => c?.valeur);
  const outils = (brief?.outils ?? []).filter(o => o.url);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/60 text-white shadow-2xl shadow-violet-950/30">
        <div className="p-5 sm:p-7">
          <BadgePro />

          <h2 className="mt-3 font-staatliches text-3xl uppercase leading-none tracking-tight sm:text-4xl">
            Tout sur un sujet
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Tapez un mot — <em>apprentissage</em>, <em>panneau solaire</em>, <em>prêt à taux zéro</em> — et
            obtenez ce qui s&apos;applique : les montants en vigueur, les textes de loi précis et ce qui
            change. Chaque point renvoie au texte officiel.
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
              <Loader2 size={14} className="shrink-0 animate-spin" />
              On réunit les fiches officielles, les textes de loi et les débats, puis on les met en clair.
              Comptez jusqu&apos;à une minute la première fois qu&apos;un sujet est demandé.
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
                    <h3 className="font-staatliches text-2xl uppercase tracking-tight sm:text-3xl">
                      {brief?.sujet || res.keyword}
                    </h3>
                    {res.generated_at && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/35">
                        Synthèse du {dateCourte(res.generated_at)}
                      </p>
                    )}
                  </div>

                  {brief?.en_bref && (
                    <p className="mt-3 rounded-2xl bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 p-4 text-[15px] font-medium leading-relaxed text-white/90">
                      {brief.en_bref}
                    </p>
                  )}

                  {/* Les chiffres d'abord : c'est ce qu'un professionnel vient chercher. */}
                  {chiffres.length > 0 && (
                    <div className="mt-5 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 lg:grid-cols-3">
                      {chiffres.map((c, i) => (
                        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="bg-gradient-to-r from-violet-200 to-fuchsia-300 bg-clip-text font-staatliches text-3xl leading-none tracking-tight text-transparent">
                            {c.valeur}
                          </p>
                          <p className="mt-2 text-[12px] leading-snug text-white/65">
                            {c.libelle}<Renvois indices={[c.source]} ouvrir={ouvrir} />
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Les lois précises. Titre et lien viennent des documents : la
                      synthèse ne fait que désigner les textes et dire leur rôle. */}
                  {textesAffiches.length > 0 && (
                    <div className="mt-6">
                      <Titre icone={Landmark} teinte="text-sky-300">Les textes qui s&apos;appliquent</Titre>
                      <ul className="mt-2.5 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                        {[...textesAffiches, ...(tousLesTextes ? autresTextes : [])].map(({ n, role, s }) => (
                          <li key={n} className="flex items-start gap-3 px-4 py-3">
                            <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${TEINTE_TEXTE[s.kind] ?? "bg-white/10 text-white/60"}`}>
                              {s.kind}
                            </span>
                            <span className="min-w-0 flex-1">
                              {s.url ? (
                                <a href={s.url} target="_blank" rel="noopener noreferrer"
                                  className="text-[13px] font-semibold leading-snug text-white underline decoration-white/20 underline-offset-2 transition hover:decoration-white/70">
                                  {s.title}
                                </a>
                              ) : (
                                <span className="text-[13px] font-semibold leading-snug text-white">{s.title}</span>
                              )}
                              {(role || s.note) && (
                                <span className="mt-0.5 block text-[12px] leading-snug text-white/55">{role || s.note}</span>
                              )}
                            </span>
                            {s.url && (
                              <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir sur ${hote(s.url) ?? "le site officiel"}`}
                                className="mt-0.5 hidden shrink-0 items-center gap-1 text-[10px] font-bold text-white/35 transition hover:text-white sm:inline-flex">
                                {hote(s.url)} <ExternalLink size={10} />
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                      {autresTextes.length > 0 && (
                        <button
                          onClick={() => setTousLesTextes(v => !v)}
                          className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 transition hover:text-white"
                        >
                          <ChevronDown size={12} className={`transition ${tousLesTextes ? "rotate-180" : ""}`} />
                          {tousLesTextes ? "Masquer les autres textes" : `Voir les ${autresTextes.length} autres textes cités`}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-6 space-y-6">
                    <Rubrique titre="Ce que dit la règle" icone={Scale} teinte="text-violet-300" puce="bg-violet-400"
                      points={brief?.regles} ouvrir={ouvrir} />

                    {!!brief?.aides?.length && (
                      <div>
                        <Titre icone={HandCoins} teinte="text-emerald-300">Les aides en vigueur</Titre>
                        <ul className="mt-2.5 space-y-2.5">
                          {brief.aides.map((a, i) => <CarteAide key={i} a={a} ouvrir={ouvrir} />)}
                        </ul>
                      </div>
                    )}

                    {/* Les outils officiels des fiches : simulateurs, téléservices,
                        formulaires. Ils ne passent pas par le modèle. */}
                    {outils.length > 0 && (
                      <div>
                        <Titre icone={Calculator} teinte="text-amber-300">Outils officiels</Titre>
                        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                          {outils.map((o, i) => (
                            <a key={i} href={o.url!} target="_blank" rel="noopener noreferrer"
                              className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition hover:border-amber-300/40">
                              <span className="mt-0.5 shrink-0 rounded-md bg-amber-300/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200">
                                {o.type}
                              </span>
                              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-white/85 group-hover:text-white">
                                {o.titre}
                                <span className="mt-0.5 block text-[10px] font-bold text-white/35">{hote(o.url)}</span>
                              </span>
                              <ExternalLink size={12} className="mt-1 shrink-0 text-white/30 group-hover:text-white" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <Rubrique titre="Ce qui est en discussion" icone={Hourglass} teinte="text-amber-300" puce="bg-amber-400"
                      points={brief?.en_cours} ouvrir={ouvrir} />
                  </div>

                  {!!brief?.a_savoir?.length && (
                    <div className="mt-6">
                      <Titre icone={Lightbulb} teinte="text-white/50">À savoir</Titre>
                      <Puces items={brief.a_savoir} teinte="bg-violet-400" />
                    </div>
                  )}

                  {/* Ce que la synthèse NE couvre pas : dit par elle-même, parce
                      qu'un récap qui se tait sur ses angles morts se fait passer
                      pour complet. */}
                  {brief?.limites && (
                    <p className="mt-5 flex items-start gap-2 rounded-2xl bg-white/[0.04] p-3.5 text-[12px] leading-relaxed text-white/50">
                      <Info size={14} className="mt-0.5 shrink-0" /> {brief.limites}
                    </p>
                  )}

                  {/* Les documents, repliés : on les consulte par les renvois, pas
                      en lisant une liste de cent lignes. */}
                  {sources.length > 0 && (
                    <div className="mt-6">
                      <button
                        onClick={() => setDocsOuverts(v => !v)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/45 transition hover:text-white"
                      >
                        <ChevronDown size={13} className={`transition ${docsOuverts ? "rotate-180" : ""}`} />
                        Les {sources.length} documents utilisés
                        {total > sources.length && <span className="font-bold text-white/25">· {total} trouvés</span>}
                      </button>
                      {docsOuverts && (
                        <>
                          {parCorpus.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {parCorpus.map(([cle, n]) => (
                                <span key={cle} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/50">
                                  {CORPUS[cle] ?? cle} <span className="tabular-nums text-white/75">{n as number}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <ol className="mt-3 space-y-1">
                            {sources.map((s, i) => (
                              <li key={i} id={`src-${i + 1}`} className="flex gap-2.5 rounded-lg px-1 py-0.5 text-[12px] leading-snug transition-colors duration-700 scroll-mt-24">
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
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                    <button
                      onClick={() => chercher(res.keyword, true)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 transition hover:text-white"
                    >
                      <RotateCw size={12} /> Refaire la synthèse
                    </button>
                    {/* Le périmètre réel, dit sans détour. */}
                    <p className="text-[11px] leading-snug text-white/35">
                      Synthèse produite à partir des seuls documents listés : fiches de service-public.gouv.fr
                      (droit en vigueur), textes de Légifrance, débats parlementaires
                      {jorfDepuis && <> et Journal officiel conservé depuis le {jorfDepuis}</>}.
                      Elle n&apos;a pas valeur de conseil : pour une situation précise, les textes eux-mêmes font foi.
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
