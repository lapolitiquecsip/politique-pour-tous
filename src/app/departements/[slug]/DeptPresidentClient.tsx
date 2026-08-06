"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, ShieldCheck, Briefcase, GraduationCap, Users, MapPin } from "lucide-react";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import EntityNewsFeed from "@/components/shared/EntityNewsFeed";

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
    ? <span key={i} className="font-bold text-slate-900 dark:text-white underline decoration-rose-500 decoration-[3px] underline-offset-2">{p}</span>
    : <span key={i}>{p}</span>)}</>;
}
const toPoints = (v: any): string[] => (!v ? [] : (Array.isArray(v) ? v : [v]).filter(Boolean));
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const frDate = (d: string | null) => { const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]} ${MOIS[+m[2]-1]} ${m[1]}` : null; };

export default function DeptPresidentClient({ p }: { p: any }) {
  const bio = p.bio || {};
  const hasStructured = BIO_FIELDS.some(([k]) => toPoints(bio[k]).length > 0);
  const [showLegal, setShowLegal] = useState(false);
  const issues = (p.legal_issues || "").trim();
  const legalClean = !issues || issues.toLowerCase().includes("aucune");
  const legalPerson = { first_name: p.full_name, last_name: "", legal_issues: p.legal_issues, an_id: null, hatvp_url: null };
  const initials = `${(p.first_name?.[0] || "")}${(p.last_name?.[0] || "")}`.toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-rose-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/local" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-rose-600">
            <ArrowLeft size={14} /> Territoires
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="relative h-64 bg-gradient-to-b from-rose-400 to-pink-600 flex items-end">
                {p.photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.photo_url} alt={p.full_name} className="absolute inset-0 h-full w-full object-cover object-top" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <div className="w-full text-center text-white text-5xl font-staatliches pb-8">{initials}</div>}
              </div>
              <div className="p-6">
                <p className="text-rose-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  <Star size={11} className="fill-current" /> Président·e du conseil départemental
                </p>
                <h1 className="mt-1 text-2xl font-staatliches uppercase tracking-wide text-slate-900 dark:text-white leading-tight">{p.full_name}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300"><MapPin size={14} className="text-rose-500" />{p.dep_name}</p>

                <div className="mt-4 space-y-3 text-sm">
                  {p.mandate_since && <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Président depuis</p><p className="font-bold text-slate-900 dark:text-white">{frDate(p.mandate_since)}</p></div>}
                  {(bio.profession || p.csp) && <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Profession</p><p className="font-bold text-slate-900 dark:text-white capitalize">{bio.profession || p.csp}</p></div>}
                  {p.birth_date && <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Né·e le</p><p className="font-bold text-slate-900 dark:text-white">{frDate(p.birth_date)}</p></div>}
                </div>
                <p className="mt-4 text-[10px] italic text-slate-400">Source : RNE (Répertoire National des Élus).</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            {/* Faits clés + judiciaire */}
            <section className="space-y-4">
              {(bio.formation || bio.enfants) && (
                <div className="flex flex-wrap gap-2">
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

            <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-2">
                Portrait & <span className="text-rose-600">Engagement</span>
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
                          {points.map((pt, i) => <li key={i}><NumHighlight text={pt} /></li>)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : p.biography ? (
                <div className="rounded-2xl bg-rose-50/50 dark:bg-slate-800/50 p-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">{p.biography}</div>
              ) : (
                <p className="text-sm italic text-slate-400">Biographie en cours de rédaction.</p>
              )}
            </section>
          </div>
        </div>
      </div>

      {p.dep_code && (
        <div className="container mx-auto max-w-5xl px-4 pb-10">
          <EntityNewsFeed entityType="department" entityId={p.dep_code} />
        </div>
      )}

      <LegalStatusModal isOpen={showLegal} onClose={() => setShowLegal(false)} deputy={legalPerson} />
    </main>
  );
}
