"use client";

// Affichage d'une biographie STRUCTURÉE (mêmes rubriques que les fiches candidats/ministres/
// eurodéputés) : parcours, études, famille, parents, réalisations, positions, controverses…
// Sur MOBILE : accordéon — chaque rubrique s'ouvre séparément (l'utilisateur ouvre seulement ce
// qui l'intéresse). Sur DESKTOP : grille de cartes (inchangée). Repli sur le texte simple si la
// bio structurée n'existe pas encore.

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const BIO_FIELDS: Array<[string, string, string]> = [
  ["parcours", "Parcours politique", "text-red-600"],
  ["realisations", "Réalisations concrètes", "text-teal-600"],
  ["jobs", "Métiers & jobs", "text-cyan-600"],
  ["etudes", "Études", "text-blue-600"],
  ["parents", "Parents", "text-amber-600"],
  ["famille", "Famille", "text-rose-600"],
  ["positions", "Positions", "text-emerald-600"],
  ["publications", "Publications & écrits", "text-fuchsia-600"],
  ["passions", "Passions", "text-lime-600"],
  ["faits_marquants", "Faits marquants", "text-yellow-600"],
  ["controverses", "Controverses", "text-slate-700 dark:text-slate-300"],
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

// Détection de l'événement le PLUS RÉCENT (année la plus élevée) parmi les rubriques
// « événementielles », pour le mettre en valeur (surlignage jaune).
const EVENT_FIELDS = new Set(["parcours", "chronologie", "faits_marquants", "realisations"]);
const YEAR_RE = /\b(?:19|20)\d{2}\b/g;
const maxYearOf = (t: string): number => { const m = String(t).match(YEAR_RE); return m ? Math.max(...m.map(Number)) : 0; };

export function hasStructuredBio(bio: any): boolean {
  if (!bio) return false;
  return BIO_FIELDS.some(([k]) => toPoints(bio[k]).length > 0);
}

// Liste à puces d'une rubrique (partagée entre l'accordéon mobile et les cartes desktop).
function PointsList({ points, sectionKey, recentYear }: { points: string[]; sectionKey: string; recentYear: number }) {
  return (
    <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-700 dark:text-slate-300 marker:text-slate-300">
      {points.map((p, i) => {
        const recent = recentYear > 0 && EVENT_FIELDS.has(sectionKey) && maxYearOf(p) === recentYear;
        return (
          <li key={i} className={recent ? "marker:text-yellow-500" : ""}>
            {recent
              ? <mark className="rounded bg-yellow-200 px-1 py-0.5 font-medium text-slate-900 dark:bg-yellow-400/30 dark:text-yellow-50"><NumHighlight text={p} /></mark>
              : <NumHighlight text={p} />}
          </li>
        );
      })}
    </ul>
  );
}

export default function StructuredBio({ bio, fallbackText }: { bio: any; fallbackText?: string | null }) {
  const sections = BIO_FIELDS
    .map(([key, label, color]) => ({ key, label, color, points: toPoints(bio?.[key]) }))
    .filter(s => s.points.length > 0);
  // Toutes les rubriques sont FERMÉES par défaut : c'est à l'utilisateur d'ouvrir ce qu'il veut.
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (k: string) => setOpen(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  if (sections.length > 0) {
    const recentYear = Math.max(0, ...[...EVENT_FIELDS].flatMap(k => toPoints(bio[k]).map(maxYearOf)));
    return (
      <>
        {/* MOBILE : accordéon — chaque rubrique ouvrable indépendamment. */}
        <div className="space-y-2.5 md:hidden">
          {sections.map(({ key, label, color, points }) => {
            const isOpen = open.has(key);
            const bar = color.replace(/text-/g, "bg-").split(" ")[0];
            return (
              <div key={key} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                <button onClick={() => toggle(key)} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={isOpen}>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-5 w-1 shrink-0 rounded-full ${bar}`} />
                    <span className={`font-staatliches text-lg uppercase leading-none ${color}`}>{label}</span>
                    <span className="text-[11px] font-bold text-slate-400">({points.length})</span>
                  </span>
                  <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <div className="px-4 pb-4"><PointsList points={points} sectionKey={key} recentYear={recentYear} /></div>}
              </div>
            );
          })}
        </div>

        {/* DESKTOP : grille de cartes (inchangée). */}
        <div className="hidden items-start gap-4 sm:grid-cols-2 md:grid">
          {sections.map(({ key, label, color, points }) => {
            const wide = key === "parcours" || key === "chronologie" || key === "realisations" ? "sm:col-span-2" : "";
            return (
              <div key={key} className={`rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 ${wide}`}>
                <h3 className={`font-staatliches text-2xl uppercase leading-none ${color}`}>{label}</h3>
                <div className={`mb-3 mt-1.5 h-1 w-12 rounded-full ${color.replace(/text-/g, "bg-").split(" ")[0]}`} />
                <PointsList points={points} sectionKey={key} recentYear={recentYear} />
              </div>
            );
          })}
        </div>
      </>
    );
  }
  if (fallbackText) {
    return (
      <div className="rounded-2xl bg-slate-50/60 dark:bg-slate-800/50 p-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
        {fallbackText}
      </div>
    );
  }
  return <p className="text-sm italic text-slate-400">Biographie détaillée en cours de rédaction.</p>;
}
