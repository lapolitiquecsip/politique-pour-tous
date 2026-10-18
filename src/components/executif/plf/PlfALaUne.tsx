import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PLF } from "@/lib/data/plf";

const nf1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Bandeau « À la une » de l'onglet Exécutif : le PLF de l'année en cours d'examen. */
export default function PlfALaUne() {
  const p = PLF[2027];
  const chiffres = [
    { v: `${nf1(p.macro.deficit)} %`, l: "déficit public visé" },
    { v: `${nf1(p.macro.dette)} %`, l: "dette / PIB" },
    { v: `${nf1(p.etat.chargeDette)} Md€`, l: "charge de la dette" },
    { v: p.effort.texte.split(",")[0], l: "d'effort annoncé" },
  ];
  return (
    <Link href="/executif/plf" className="group block">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-6 text-white shadow-xl shadow-orange-900/20 transition hover:shadow-2xl md:p-8">
        <div className="pointer-events-none absolute -right-6 -top-10 select-none font-staatliches text-[9rem] leading-none text-white/[0.04] md:text-[12rem]">2027</div>{" "}
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
              <Sparkles size={12} /> À la une
            </span>{" "}
            <h2 className="mt-3 font-staatliches text-4xl uppercase leading-none tracking-tight md:text-5xl">
              Budget 2027 : <span className="text-amber-300">le PLF décrypté</span>
            </h2>{" "}
            <p className="mt-2 text-sm text-slate-300">
              Déposé le {p.depot}. Analyse simple ou détaillée, et comparaison avec les PLF 2026, 2025 et 2024 — chiffres tirés des textes officiels.
            </p>
          </div>{" "}
          <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-3">
            {chiffres.map((c) => (
              <div key={c.l}>
                <p className="font-staatliches text-3xl leading-none text-white">{c.v}</p>{" "}
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.l}</p>{" "}
              </div>
            ))}
          </div>
        </div>{" "}
        <span className="relative z-10 mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900 transition group-hover:bg-amber-300">
          Lire l’analyse <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
