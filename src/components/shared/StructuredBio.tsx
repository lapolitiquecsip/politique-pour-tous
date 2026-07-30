// Affichage d'une biographie STRUCTURÉE (mêmes rubriques que les fiches candidats/ministres/
// eurodéputés) : parcours, études, famille, parents, réalisations, positions, controverses…
// Repli sur le texte simple si la bio structurée n'existe pas encore.

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

export function hasStructuredBio(bio: any): boolean {
  if (!bio) return false;
  return BIO_FIELDS.some(([k]) => toPoints(bio[k]).length > 0);
}

export default function StructuredBio({ bio, fallbackText }: { bio: any; fallbackText?: string | null }) {
  if (hasStructuredBio(bio)) {
    return (
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {BIO_FIELDS.map(([key, label, color]) => {
          const points = toPoints(bio[key]);
          if (points.length === 0) return null;
          const wide = key === "parcours" || key === "chronologie" || key === "realisations" ? "sm:col-span-2" : "";
          return (
            <div key={key} className={`rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 ${wide}`}>
              <h3 className={`font-staatliches text-2xl uppercase leading-none ${color}`}>{label}</h3>
              <div className={`mb-3 mt-1.5 h-1 w-12 rounded-full ${color.replace(/text-/g, "bg-").split(" ")[0]}`} />
              <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-700 dark:text-slate-300 marker:text-slate-300">
                {points.map((p, i) => <li key={i}><NumHighlight text={p} /></li>)}
              </ul>
            </div>
          );
        })}
      </div>
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
