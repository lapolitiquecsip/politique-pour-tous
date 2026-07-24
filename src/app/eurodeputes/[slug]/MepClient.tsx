"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ExternalLink, Star, Activity, ChevronDown, ShieldCheck, Briefcase, GraduationCap, Users } from "lucide-react";
import { BallotBox } from "@/components/dashboard/BallotVote";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
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

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function MepClient({ mep, initialVotes }: { mep: any; initialVotes: any[] }) {
  const grad = GROUP_CLR[mep.ep_group_code] || GROUP_CLR.NI;
  const initials = `${(mep.first_name?.[0] || "")}${(mep.last_name?.[0] || "")}`.toUpperCase();

  // Votes : bascule « principaux / tous » + pagination « voir plus ».
  const [onlyMain, setOnlyMain] = useState(true);
  const [votes, setVotes] = useState<any[]>(initialVotes);
  const [loading, setLoading] = useState(false);
  const [end, setEnd] = useState(initialVotes.length < 20);

  const reload = async (main: boolean) => {
    setOnlyMain(main); setLoading(true); setEnd(false);
    const rows = await api.getMepVotes(String(mep.id), { limit: 20, offset: 0, onlyMain: main });
    setVotes(rows as any[]); setEnd((rows as any[]).length < 20); setLoading(false);
  };
  const loadMore = async () => {
    setLoading(true);
    const rows = await api.getMepVotes(String(mep.id), { limit: 20, offset: votes.length, onlyMain });
    setVotes(v => [...v, ...(rows as any[])]); setEnd((rows as any[]).length < 20); setLoading(false);
  };

  // Assiduité (participation aux votes nominaux).
  const rate = mep.attendance_rate != null ? Number(mep.attendance_rate) : null;
  const rateClr = rate == null ? "text-slate-400" : rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-rose-600";

  // Bio structurée + situation judiciaire.
  const bio = mep.bio || {};
  const hasStructured = BIO_FIELDS.some(([k]) => toPoints(bio[k]).length > 0);
  const [showLegal, setShowLegal] = useState(false);
  const issues = (mep.legal_issues || "").trim();
  const legalClean = !issues || issues.toLowerCase().includes("aucune");
  const legalPerson = { first_name: mep.full_name, last_name: "", legal_issues: mep.legal_issues, an_id: null, hatvp_url: null };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/deputes?mode=meps" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-amber-600">
            <ArrowLeft size={14} /> Tous les eurodéputés
          </Link>
        </div>
      </div>

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
            </section>

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

            {/* ASSIDUITÉ — participation aux votes nominaux (métrique factuelle, pas la présence physique). */}
            {rate != null && (
              <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="text-sky-600" size={22} />
                  <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">
                    Assiduité aux <span className="text-sky-600">votes</span>
                  </h2>
                </div>
                <div className="flex items-center gap-6">
                  <p className={`text-5xl font-black ${rateClr}`}>{rate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%</p>
                  <div className="flex-1">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full ${rate >= 90 ? "bg-emerald-500" : rate >= 70 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${rate}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      A participé à <strong>{mep.votes_participated?.toLocaleString("fr-FR")}</strong> des{" "}
                      <strong>{mep.votes_total?.toLocaleString("fr-FR")}</strong> scrutins nominaux de la mandature.
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[11px] leading-snug italic text-slate-400">
                  Mesure la <strong>participation aux votes nominaux</strong> (position exprimée), et non la présence
                  physique en séance ou en commission — un vote peut être exprimé au nom du groupe. Source : Parlement
                  européen via HowTheyVote.eu.
                </p>
              </section>
            )}

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
              {votes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm italic text-slate-400">
                  Aucun vote synchronisé pour l'instant.
                </p>
              ) : (
                <div className="space-y-3">
                  {votes.map((v) => (
                    <a
                      key={v.vote_id}
                      href={v.url}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 transition hover:border-amber-300"
                    >
                      <BallotBox vote={POS[v.position] || "ABSTENTION"} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {fmtDate(v.voted_at)}{v.reference ? ` · ${v.reference}` : ""}
                        </p>
                        <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">{v.title}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {posLabel[v.position] || v.position}
                      </span>
                    </a>
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
    </main>
  );
}
