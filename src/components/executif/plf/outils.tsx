import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/* Formats partagés par les vues simple et détaillée du PLF. */
export const nf1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const nf0 = (n: number) => Math.round(n).toLocaleString("fr-FR");
export const mdM = (meur: number) => `${nf1(meur / 1e3)} Md€`;
export const pct = (n: number) => `${nf1(n)} %`;

/** signe explicite ; un écart qui s'arrondit à zéro s'affiche « 0,0 » (jamais « −0,0 ») */
export const signe = (n: number, f: (x: number) => string = nf1) => {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? f(0) : (r > 0 ? "+" : "−") + f(Math.abs(n));
};

/**
 * Écart coloré. `sens` dit ce que vaut une hausse :
 *  « bon » (recettes), « mauvais » (déficit, dette) ou « neutre » (une dépense n'est ni bonne ni mauvaise).
 */
export function Delta({ v, f = nf1, sens = "neutre", small = false }: { v: number | null; f?: (x: number) => string; sens?: "bon" | "mauvais" | "neutre"; small?: boolean }) {
  if (v === null || Number.isNaN(v)) return <span className="text-muted-foreground">—</span>;
  const nul = Math.round(v * 10) === 0;
  const hausse = v > 0;
  const cls = nul || sens === "neutre"
    ? "text-foreground"
    : (sens === "bon") === hausse ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
  const Ic = nul ? Minus : hausse ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 whitespace-nowrap font-black tabular-nums ${small ? "text-[11px]" : "text-xs"} ${cls}`}>
      <Ic size={small ? 11 : 13} className={nul ? "opacity-40" : ""} />{" "}
      {nul ? "stable" : signe(v, f)}
    </span>
  );
}
