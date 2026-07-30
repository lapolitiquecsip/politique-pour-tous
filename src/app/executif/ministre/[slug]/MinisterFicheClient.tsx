"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ExternalLink, Loader2, Briefcase, GraduationCap, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cleanMinistryName } from "@/lib/executif-utils";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import PersonTabs from "@/components/shared/PersonTabs";

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
    ? <span key={i} className="font-bold text-slate-900 underline decoration-red-500 decoration-[3px] underline-offset-2">{p}</span>
    : <span key={i}>{p}</span>)}</>;
}

function toPoints(v: any): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).filter(Boolean);
}

export default function MinisterFicheClient({ params, embedded }: { params: Promise<{ slug: string }>; embedded?: boolean }) {
  const { slug } = use(params);
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLegal, setShowLegal] = useState(false);

  useEffect(() => {
    api.getMinisterBySlug(slug).then(setM).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-slate-300" /></div>;
  if (!m) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <p className="text-slate-600">Fiche ministre introuvable.</p>
      <Link href="/executif" className="text-blue-600 font-bold hover:underline">← Retour à l'Exécutif</Link>
    </div>
  );

  const bio = m.bio || {};
  const issues = (m.legal_issues || "").trim();
  const legalClean = !issues || issues.toLowerCase().includes("aucune");
  const legalPerson = { first_name: m.full_name, last_name: "", legal_issues: m.legal_issues, an_id: null, hatvp_url: null };

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* En-tête */}
      <section className="relative bg-slate-900 px-4 pt-28 pb-16 text-white">
        <div className="mx-auto max-w-4xl">
          {!embedded && (
          <Link href="/executif" className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white">
            <ArrowLeft size={14} /> Retour au gouvernement
          </Link>
          )}
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
            <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full border-4 border-white/20 bg-slate-800">
              {m.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={m.photo_url} alt={m.full_name} className="h-full w-full object-cover object-top" />
                : <div className="flex h-full w-full items-center justify-center text-3xl font-black">{m.full_name.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}</div>}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">{cleanMinistryName(m.title) || "Membre du gouvernement"}</p>
              <h1 className="mt-2 text-4xl font-staatliches uppercase leading-none md:text-6xl">{m.full_name}</h1>
              {m.ministry_name && <p className="mt-2 text-sm text-white/70">{cleanMinistryName(m.ministry_name)}</p>}
            </div>
          </div>
          {m.summary && <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-relaxed text-white/85 md:text-left">{m.summary}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4">
        {/* Faits clés */}
        <div className="-mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
          {bio.profession && <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"><Briefcase size={15} className="text-slate-400" />{bio.profession}</span>}
          {bio.formation && <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"><GraduationCap size={16} className="text-slate-400" />{bio.formation}</span>}
          {bio.enfants && <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"><Users size={15} className="text-slate-400" />{bio.enfants}</span>}
        </div>

        {/* Fiche unifiée : onglets des fonctions de la personne. */}
        {!embedded && (
        <div className="mt-8">
          <PersonTabs fullName={m.full_name} currentHref={`/executif/ministre/${slug}`} />
        </div>
        )}

        {/* Situation judiciaire */}
        <div className="mt-8 flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Intégrité &amp; Transparence</p>
            <h3 className="text-lg font-bold text-slate-900">Situation judiciaire</h3>
            <span className={`text-[10px] font-black uppercase tracking-widest ${legalClean ? "text-emerald-600" : "text-amber-600"}`}>{legalClean ? "Dossier vierge" : "Affaires à consulter"}</span>
          </div>
          <button onClick={() => setShowLegal(true)} className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest ${legalClean ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-amber-500/20 bg-amber-500/10 text-amber-600"}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> Consulter
          </button>
        </div>

        {/* Rubriques bio */}
        <div className="mt-6 grid items-start gap-4 sm:grid-cols-2">
          {BIO_FIELDS.map(([key, label, color]) => {
            const points = toPoints(bio[key]);
            if (points.length === 0) return null;
            const wide = key === "parcours" || key === "chronologie" || key === "realisations" ? "sm:col-span-2" : "";
            return (
              <div key={key} className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${wide}`}>
                <h3 className={`font-staatliches text-2xl uppercase leading-none ${color}`}>{label}</h3>
                <div className={`mb-3 mt-1.5 h-1 w-12 rounded-full ${color.replace("text-", "bg-")}`} />
                <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-700 marker:text-slate-300">
                  {points.map((p, i) => <li key={i}><NumHighlight text={p} /></li>)}
                </ul>
              </div>
            );
          })}
        </div>

        {m.source_url && (
          <a href={m.source_url} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">
            <ExternalLink size={14} /> Source : Wikipédia
          </a>
        )}
        <p className="mt-2 text-[11px] italic text-slate-400">Fiche générée automatiquement à partir de Wikipédia — susceptible d'être incomplète.</p>
      </div>

      <LegalStatusModal isOpen={showLegal} onClose={() => setShowLegal(false)} deputy={legalPerson} />
    </main>
  );
}
