import { CheckCircle2 } from "lucide-react";
import { categoryLabel } from "@/lib/legislative";

// Carte de loi unifiée — reprend le design du fil « Derniers votes décryptés » :
// date en tête, badge de statut coloré, TITRE en bas-de-casse gras (pas de staatliches
// majuscule), pastille de catégorie en dégradé rouge → fuchsia. Purement présentationnel :
// l'élément cliquable (button/Link) est fourni par l'appelant.
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d?: string | null) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
}

export type LawCardStatus = { label: string; tone: "green" | "amber" | "blue" | "slate" };

const TONE: Record<LawCardStatus["tone"], string> = {
  green: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
  blue: "bg-blue-500 text-white",
  slate: "bg-slate-400 text-white",
};

export const CARD_CLASS =
  "group flex h-full w-full flex-col rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";

export function LawCardBody({
  title, date, status, category, typeLabel,
}: {
  title: string;
  date?: string | null;
  status?: LawCardStatus | null;
  category?: string | null;
  typeLabel?: string | null;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pr-9">
        <span className="text-xs font-bold text-slate-400">{frDate(date)}</span>
        {status && (
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${TONE[status.tone]}`}>
            {status.tone === "green" && <CheckCircle2 size={12} />}{status.label}
          </span>
        )}
      </div>
      <h3 className="mt-4 line-clamp-4 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-red-600 dark:text-white">
        {title}
      </h3>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        {category ? (
          <span className="inline-block rounded-full bg-gradient-to-r from-red-600 to-fuchsia-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            {categoryLabel(category)}
          </span>
        ) : <span />}
        {typeLabel && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{typeLabel}</span>}
      </div>
    </>
  );
}
