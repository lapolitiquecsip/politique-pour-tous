"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ExternalLink, Star, ChevronDown, ShieldCheck, Briefcase, GraduationCap, Users, X, Loader2, Sparkles, Info, TrendingDown } from "lucide-react";
import { BallotBox } from "@/components/dashboard/BallotVote";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import ActivityRank from "@/components/shared/ActivityRank";
import FollowButton from "@/components/shared/FollowButton";
import PersonTabs from "@/components/shared/PersonTabs";
import { api } from "@/lib/api";

// Rubriques de la bio structurée (mêmes que les fiches candidats/ministres).
const BIO_FIELDS: Array<[string, string, string]> = [
  ["parcours", "Parcours politique", "text-red-600"],
  ["realisations", "Réalisations concrètes", "text-teal-600"],
  ["jobs", "Métiers & jobs", "text-cyan-600"],
  ["etudes", "Études", "text-blue-600"],
  ["parents", "Parents", "text-amber-600"],
  ["famille", "Famille", "text-rose-600"],
  ["positions", "Positions", "text-emerald-600"],
  ["publications", "Publications & écrits", "text-fuchsia-600"],
  ["faits_marquants", "Faits marquants", "text-yellow-600"],
  ["controverses", "Controverses", "text-slate-700"],
  ["chronologie", "Chronologie", "text-indigo-600"],
];
const NUM_RE = /(\d+(?:[.,]\d+)?\s?%|\d[\d .]*\s?(?:€|milliards?|millions?|Md€|M€))/gi;
function NumHighlight({ text }: { text: string }) {
  const parts = text.split(NUM_RE);
  return <>{parts.map((p, i) => i % 2 === 1
    ? <span key={i} className="font-bold text-slate-900 dark:text-white underline decoration-sky-500 decoration-[3px] underline-offset-2">{p}</span>
    : <span key={i}>{p}</span>)}</>;
}
const toPoints = (v: any): string[] => (!v ? [] : (Array.isArray(v) ? v : [v]).filter(Boolean));

// Couleurs par groupe politique européen.
const GROUP_CLR: Record<string, string> = {
  RE: "from-amber-400 to-yellow-500",
  PPE: "from-blue-500 to-indigo-600",
  SD: "from-rose-500 to-red-600",
  VERTS: "from-emerald-500 to-green-600",
  PfE: "from-slate-600 to-slate-800",
  ECR: "from-sky-600 to-blue-800",
  GUE: "from-red-600 to-rose-700",
  ESN: "from-indigo-700 to-slate-900",
  NI: "from-slate-400 to-slate-600",
};

// Position HowTheyVote → valeur d'urne (réutilise le composant du dashboard).
const POS: Record<string, string> = { FOR: "POUR", AGAINST: "CONTRE", ABSTENTION: "ABSTENTION" };
const posLabel: Record<string, string> = { FOR: "Pour", AGAINST: "Contre", ABSTENTION: "Abstention", DID_NOT_VOTE: "N'a pas voté" };
// Couleur de la position : vert = POUR, rouge = CONTRE, ambre = abstention, gris = absent.
const posColor: Record<string, string> = { FOR: "text-emerald-600", AGAINST: "text-rose-600", ABSTENTION: "text-amber-600", DID_NOT_VOTE: "text-slate-400" };

// « À contre-courant » : l'eurodéputé a voté à l'inverse du résultat final du scrutin
// (a voté POUR un texte rejeté, ou CONTRE un texte adopté).
const againstCurrent = (v: any) =>
  (v.position === "FOR" && v.result === "REJECTED") || (v.position === "AGAINST" && v.result === "ADOPTED");

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function MepClient({ mep, initialVotes, embedded }: { mep: any; initialVotes: any[]; embedded?: boolean }) {
  const grad = GROUP_CLR[mep.ep_group_code] || GROUP_CLR.NI;
  const initials = `${(mep.first_name?.[0] || "")}${(mep.last_name?.[0] || "")}`.toUpperCase();

  // Votes : bascule « principaux / tous » + filtre par domaine + pagination « voir plus ».
  const [onlyMain, setOnlyMain] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [cats, setCats] = useState<{ category: string; count: number }[]>([]);
  const [votes, setVotes] = useState<any[]>(initialVotes);
  const [loading, setLoading] = useState(false);
  const [end, setEnd] = useState(initialVotes.length < 20);

  // Domaines disponibles (recalculés selon la vue principaux/tous).
  useEffect(() => {
    let active = true;
    api.getMepVoteCategories(String(mep.id), onlyMain).then(c => { if (active) setCats(c as any); }).catch(() => {});
    return () => { active = false; };
  }, [mep.id, onlyMain]);

  const fetchVotes = async (main: boolean, cat: string | null) => {
    setLoading(true); setEnd(false);
    const rows = await api.getMepVotes(String(mep.id), { limit: 20, offset: 0, onlyMain: main, category: cat || undefined });
    setVotes(rows as any[]); setEnd((rows as any[]).length < 20); setLoading(false);
  };
  const reload = async (main: boolean) => { setOnlyMain(main); setCategory(null); await fetchVotes(main, null); };
  const selectCat = async (cat: string | null) => { setCategory(cat); await fetchVotes(onlyMain, cat); };
  const loadMore = async () => {
    setLoading(true);
    const rows = await api.getMepVotes(String(mep.id), { limit: 20, offset: votes.length, onlyMain, category: category || undefined });
    setVotes(v => [...v, ...(rows as any[])]); setEnd((rows as any[]).length < 20); setLoading(false);
  };

  // Explication IA d'un vote : ouverte au clic, chargée depuis la base (pré-générée).
  const [openVote, setOpenVote] = useState<any | null>(null);
  const [exp, setExp] = useState<any | null | undefined>(undefined); // undefined = en cours
  const [groupsVote, setGroupsVote] = useState<any[] | null>(null);
  const openExplanation = async (v: any) => {
    setOpenVote(v); setExp(undefined); setGroupsVote(null);
    const [e, g] = await Promise.all([
      api.getVoteExplanation(String(v.vote_id)),
      api.getVoteGroupResults(String(v.vote_id)),
    ]);
    setExp(e ?? null); setGroupsVote(g);
  };

  // Bio structurée + situation judiciaire.
  const bio = mep.bio || {};
  const hasStructured = BIO_FIELDS.some(([k]) => toPoints(bio[k]).length > 0);
  const [showLegal, setShowLegal] = useState(false);
  const issues = (mep.legal_issues || "").trim();
  const legalClean = !issues || issues.toLowerCase().includes("aucune");
  const legalPerson = { first_name: mep.full_name, last_name: "", legal_issues: mep.legal_issues, an_id: null, hatvp_url: null };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {!embedded && (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/deputes?mode=meps" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-amber-600">
            <ArrowLeft size={14} /> Tous les eurodéputés
          </Link>
        </div>
      </div>
      )}

      {/* Fiche unifiée : onglets des fonctions de la personne. */}
      {!embedded && <PersonTabs fullName={mep.full_name || `${mep.first_name} ${mep.last_name}`} currentHref={`/eurodeputes/${mep.slug}`} />}

      <div className="container mx-auto max-w-5xl px-4 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Colonne identité */}
          <div className="md:col-span-1">
            <div className="rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className={`relative h-64 bg-gradient-to-b ${grad} flex items-end`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mep.photo_url}
                  alt={mep.full_name}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-800">
                  {mep.ep_group_code}
                </div>
                {!mep.photo_url && <div className="w-full text-center text-white text-5xl font-staatliches pb-8">{initials}</div>}
              </div>
              <div className="p-6">
                <p className="text-amber-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  <Star size={11} className="fill-current" /> Membre du Parlement européen
                </p>
                <h1 className="mt-1 text-2xl font-staatliches uppercase tracking-wide text-slate-900 dark:text-white leading-tight">
                  {mep.full_name}
                </h1>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Groupe au Parlement européen</p>
                    <p className="font-bold text-slate-900 dark:text-white">{mep.ep_group || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Parti national</p>
                    <p className="font-bold text-slate-900 dark:text-white">{mep.national_party || "—"}</p>
                  </div>
                </div>
                <a
                  href={`https://www.europarl.europa.eu/meps/fr/${mep.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-700"
                >
                  Fiche officielle <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* Colonne bio + votes */}
          <div className="md:col-span-2 space-y-8">
            {/* Faits clés + situation judiciaire (comme les fiches candidats/ministres). */}
            <section className="space-y-4">
              {(bio.profession || bio.formation || bio.enfants) && (
                <div className="flex flex-wrap gap-2">
                  {bio.profession && <span className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"><Briefcase size={15} className="text-slate-400" />{bio.profession}</span>}
                  {bio.formation && <span className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"><GraduationCap size={16} className="text-slate-400" />{bio.formation}</span>}
                  {bio.enfants && <span className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"><Users size={15} className="text-slate-400" />{bio.enfants}</span>}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Intégrité &amp; Transparence</p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Situation judiciaire</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${legalClean ? "text-emerald-600" : "text-amber-600"}`}>{legalClean ? "Dossier vierge" : "Affaires à consulter"}</span>
                </div>
                <button onClick={() => setShowLegal(true)} className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest ${legalClean ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-amber-500/20 bg-amber-500/10 text-amber-600"}`}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Consulter
                </button>
              </div>

              <FollowButton kind="mep" id={String(mep.id)} label="cet eurodéputé" />
            </section>

            {/* PRÉSENCE AUX VOTES — remontée en haut, avec comparaison entre eurodéputés. */}
            <ActivityRank
              kind="mep" rate={mep.attendance_rate} selfId={String(mep.id)}
              peerLabel="eurodéputés français"
              participated={mep.votes_participated} total={mep.votes_total}
              note="Participation aux votes nominaux (position exprimée à l'appel nominal) : l'indicateur de présence fiable et vérifiable au Parlement européen. Comparaison entre eurodéputés français. Source : Parlement européen via HowTheyVote.eu."
            />

            {/* Portrait — panneaux structurés (repli sur le texte simple si non structuré). */}
            <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-2">
                Portrait & <span className="text-sky-600">Engagement</span>
              </h2>
              {bio.summary && <p className="mb-6 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{bio.summary}</p>}

              {hasStructured ? (
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  {BIO_FIELDS.map(([key, label, color]) => {
                    const points = toPoints(bio[key]);
                    if (points.length === 0) return null;
                    const wide = key === "parcours" || key === "chronologie" || key === "realisations" ? "sm:col-span-2" : "";
                    return (
                      <div key={key} className={`rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 ${wide}`}>
                        <h3 className={`font-staatliches text-2xl uppercase leading-none ${color}`}>{label}</h3>
                        <div className={`mb-3 mt-1.5 h-1 w-12 rounded-full ${color.replace("text-", "bg-")}`} />
                        <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-700 dark:text-slate-300 marker:text-slate-300">
                          {points.map((p, i) => <li key={i}><NumHighlight text={p} /></li>)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : mep.biography ? (
                <div className="rounded-2xl bg-sky-50/50 dark:bg-slate-800/50 p-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {mep.biography}
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">Biographie en cours de rédaction.</p>
              )}
            </section>

            {/* VOTES — principaux par défaut, bascule « tous », pagination. */}
            <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <Building2 className="text-amber-600" size={22} />
                  <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">
                    Votes au <span className="text-amber-600">Parlement européen</span>
                  </h2>
                </div>
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                  <button onClick={() => reload(true)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${onlyMain ? "bg-slate-900 text-white" : "text-slate-500"}`}>Principaux</button>
                  <button onClick={() => reload(false)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${!onlyMain ? "bg-slate-900 text-white" : "text-slate-500"}`}>Tous</button>
                </div>
              </div>

              {/* Filtres par DOMAINE (catégories officielles) — éclaire les positions par thème. */}
              {cats.length > 1 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <button onClick={() => selectCat(null)}
                    className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${category === null ? "bg-amber-600 text-white shadow" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600"}`}>
                    Tous les domaines
                  </button>
                  {cats.map(c => (
                    <button key={c.category} onClick={() => selectCat(c.category)}
                      className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${category === c.category ? "bg-amber-600 text-white shadow" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600"}`}>
                      {c.category} <span className="opacity-60">· {c.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {votes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm italic text-slate-400">
                  Aucun vote synchronisé pour l'instant.
                </p>
              ) : (
                <div className="space-y-3">
                  {votes.map((v) => (
                    <button
                      key={v.vote_id}
                      onClick={() => openExplanation(v)}
                      className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/40 dark:hover:bg-slate-800"
                    >
                      <BallotBox vote={POS[v.position] || "ABSTENTION"} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {fmtDate(v.voted_at)}{v.reference ? ` · ${v.reference}` : ""}
                        </p>
                        <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">{v.title}</p>
                        {v.category && v.category !== "Autres" && (
                          <span className="mt-1 mr-2 inline-block rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">{v.category}</span>
                        )}
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
                          <Sparkles size={11} /> Comprendre ce vote
                        </span>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className={`text-[11px] font-black uppercase tracking-widest ${posColor[v.position] || "text-slate-500"}`}>
                          {posLabel[v.position] || v.position}
                        </span>
                        {v.result && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${v.result === "ADOPTED" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                            {v.result === "ADOPTED" ? "Adopté" : "Rejeté"}
                          </span>
                        )}
                        {againstCurrent(v) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400" title="A voté à l'inverse du résultat final">
                            <TrendingDown size={10} /> À contre-courant
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!end && votes.length > 0 && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-amber-300 hover:text-amber-600 disabled:opacity-50"
                >
                  {loading ? "Chargement…" : "Voir plus de votes"} <ChevronDown size={14} />
                </button>
              )}
              <p className="mt-4 text-[10px] italic text-slate-400">
                {onlyMain ? "Votes principaux (scrutins finaux sur les textes)." : "Tous les scrutins nominaux (y compris amendements)."} Source : Parlement européen via HowTheyVote.eu.
              </p>
            </section>
          </div>
        </div>
      </div>
      <LegalStatusModal isOpen={showLegal} onClose={() => setShowLegal(false)} deputy={legalPerson} />

      {/* Explication IA d'un vote */}
      {openVote && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpenVote(null)}>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl dark:bg-slate-900 sm:rounded-[2rem] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-6 pr-14 text-white shrink-0">
              <button onClick={() => setOpenVote(null)} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 transition hover:bg-white/30" aria-label="Fermer"><X size={18} /></button>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80">
                <Sparkles size={12} /> Le vote expliqué
              </p>
              <h3 className="mt-1 text-lg font-bold leading-snug">{openVote.title}</h3>
              <p className="mt-1 text-[11px] font-bold text-white/70">
                {fmtDate(openVote.voted_at)}{openVote.reference ? ` · ${openVote.reference}` : ""} · Position : {posLabel[openVote.position] || openVote.position}
                {openVote.result ? ` · Scrutin ${openVote.result === "ADOPTED" ? "adopté" : "rejeté"}` : ""}
                {againstCurrent(openVote) ? " · à contre-courant" : ""}
              </p>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              {exp === undefined ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400"><Loader2 className="animate-spin" size={18} /> Chargement de l'explication…</div>
              ) : exp === null ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  <Info className="mx-auto mb-2 text-slate-400" size={20} />
                  L'explication de ce vote est en cours de génération et sera disponible très prochainement.
                </div>
              ) : (
                <>
                  {exp.subject && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Le sujet</p>
                      <p className="mt-1 text-[15px] font-bold leading-relaxed text-slate-900 dark:text-white">{exp.subject}</p>
                    </div>
                  )}
                  {exp.explanation && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">L'enjeu, expliqué</p>
                      <p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{exp.explanation}</p>
                    </div>
                  )}
                  {exp.stakes && (
                    <div className="rounded-2xl bg-amber-50/60 dark:bg-slate-800/60 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Ce que ça change</p>
                      <p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{exp.stakes}</p>
                    </div>
                  )}
                  <p className="text-[10px] italic text-slate-400">Explication rédigée par IA à partir des métadonnées officielles du scrutin. Neutre et factuelle.</p>
                </>
              )}

              {/* Position PAR GROUPE au Parlement européen (données officielles). */}
              {groupsVote && groupsVote.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position des groupes</p>
                  <div className="mt-2 space-y-2">
                    {groupsVote.map((g: any, idx: number) => {
                      const total = (g.for || 0) + (g.against || 0) + (g.abstention || 0) + (g.dnv || 0);
                      const pct = (n: number) => total ? `${(n / total) * 100}%` : "0%";
                      const verdict = g.position === "FOR" ? { l: "Pour", c: "text-emerald-600" }
                        : g.position === "AGAINST" ? { l: "Contre", c: "text-rose-600" }
                        : g.position === "ABSTENTION" ? { l: "Abst.", c: "text-amber-600" }
                        : { l: "Absent", c: "text-slate-400" };
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="w-14 shrink-0 text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">{g.code}</span>
                          <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" title={`Pour ${g.for} · Contre ${g.against} · Abst. ${g.abstention} · N'a pas voté ${g.dnv}`}>
                            <span className="bg-emerald-500" style={{ width: pct(g.for) }} />
                            <span className="bg-rose-500" style={{ width: pct(g.against) }} />
                            <span className="bg-amber-400" style={{ width: pct(g.abstention) }} />
                            <span className="bg-slate-300 dark:bg-slate-600" style={{ width: pct(g.dnv) }} />
                          </div>
                          <span className={`w-14 shrink-0 text-right text-[11px] font-black uppercase tracking-wide ${verdict.c}`}>{verdict.l}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Pour</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Contre</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Abstention</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />N'a pas voté</span>
                  </div>
                  <p className="mt-2 text-[10px] italic text-slate-400">Source : Parlement européen via HowTheyVote.eu.</p>
                </div>
              )}

              {openVote.url && (
                <a href={openVote.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-500">
                  <ExternalLink size={13} /> Voir le détail officiel du scrutin
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
