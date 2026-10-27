"use client";

import { ArrowRight, ChevronRight, LayoutGrid, Layers, Map as MapIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { departmentPaths } from "@/lib/data/departmentPaths";

// En-tête « poster » de la page Local, dans l'esprit de celui de la page Exécutif mais
// sans photo : la carte des départements en filigrane, des repères sur quelques villes et
// une mairie au trait. Le cœur de l'en-tête est pratique : trois cartes pour choisir son
// échelon, qui ouvrent le bon onglet de la page et y conduisent.

type Echelon = "commune" | "departement" | "region";

// Métropole seulement : les outre-mer sont dessinés hors cadre dans les tracés.
const METROPOLE = Object.entries(departmentPaths).filter(([code]) => code.length === 2);
const CADRE = (() => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, p] of METROPOLE) {
    const [x, y, w, h] = p.viewBox.split(/\s+/).map(Number);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h);
  }
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
})();
// Un repère au centre de quelques départements de grandes villes.
const REPERES = ["75", "13", "69", "31", "33", "59", "35", "67", "44", "06", "34", "63"].map(code => {
  const [x, y, w, h] = departmentPaths[code].viewBox.split(/\s+/).map(Number);
  return { code, x: x + w / 2, y: y + h / 2 };
});

const ECHELONS: { id: Echelon; titre: string; nombre: string; exemples: string; Icone: LucideIcon; ton: string; anneau: string }[] = [
  { id: "commune", titre: "Ma commune", nombre: "≈ 35 000 communes", exemples: "Maire, écoles, état civil, urbanisme", Icone: LayoutGrid,
    ton: "from-emerald-500 to-teal-600", anneau: "hover:border-emerald-400/70 focus-visible:outline-emerald-400" },
  { id: "departement", titre: "Mon département", nombre: "101 départements", exemples: "Collèges, RSA, protection de l'enfance, routes", Icone: Layers,
    ton: "from-rose-500 to-fuchsia-600", anneau: "hover:border-rose-400/70 focus-visible:outline-rose-400" },
  { id: "region", titre: "Ma région", nombre: "18 régions", exemples: "Lycées, TER, formation, économie", Icone: MapIcon,
    ton: "from-sky-500 to-indigo-600", anneau: "hover:border-sky-400/70 focus-visible:outline-sky-400" },
];

/** Mairie au trait : fronton, horloge, drapeau, colonnes, marches. */
function Mairie({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <line x1="160" y1="8" x2="160" y2="52" />
      <path d="M160 10h26v8h-26z" fill="#2563eb" stroke="none" opacity=".75" />
      <path d="M160 18h26v8h-26z" fill="#ffffff" stroke="none" opacity=".75" />
      <path d="M160 26h26v8h-26z" fill="#e11d48" stroke="none" opacity=".75" />
      <path d="M128 70 160 52 192 70" />
      <rect x="128" y="70" width="64" height="38" />
      <circle cx="160" cy="88" r="11" /><path d="M160 81v7l5 4" />
      <path d="M40 108h240M30 118h260" />
      <rect x="40" y="118" width="240" height="78" />
      {[64, 104, 144, 176, 216, 256].map(x => <path key={x} d={`M${x} 124v66`} />)}
      <path d="M150 196v-34a10 10 0 0 1 20 0v34" />
      <path d="M22 196h276M12 206h296M2 216h316" />
      <text x="160" y="114" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" letterSpacing="2">MAIRIE</text>
    </svg>
  );
}

export default function LocalHero({ onEchelon, liens }: {
  onEchelon: (e: Echelon) => void;
  liens: { label: string; href: string; Icone: LucideIcon }[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#13040d] text-white">
      {/* Halo rose et fuchsia, comme les couleurs de la page. */}
      <div className="absolute -left-24 top-10 -z-10 h-[28rem] w-[28rem] rounded-full bg-rose-600/30 blur-[120px]" />{" "}
      <div className="absolute -right-20 bottom-0 -z-10 h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/25 blur-[120px]" />{" "}

      {/* La carte des départements, en filigrane, avec des repères qui palpitent. */}
      <svg
        viewBox={`${CADRE.x0} ${CADRE.y0} ${CADRE.w} ${CADRE.h}`}
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[78%] w-auto max-w-none -translate-x-1/2 -translate-y-[46%] opacity-30 md:h-[96%] md:opacity-45"
        aria-hidden="true"
      >
        {METROPOLE.map(([code, p]) => (
          <path key={code} d={p.d} fill={code === "75" ? "rgba(244,63,94,0.5)" : "rgba(255,255,255,0.03)"} stroke="rgba(251,207,232,0.55)" strokeWidth={0.8} />
        ))}
        {REPERES.map(r => (
          <g key={r.code}>
            <circle cx={r.x} cy={r.y} r={9} fill="rgba(244,63,94,0.25)" className="origin-center animate-ping [animation-duration:3s] [transform-box:fill-box]" />
            <circle cx={r.x} cy={r.y} r={3.6} fill="#fb7185" />
          </g>
        ))}
      </svg>{" "}
      {/* Voile : le texte reste lisible au-dessus de la carte. */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(19,4,13,0.4)_0%,rgba(19,4,13,0.15)_45%,rgba(19,4,13,0.88)_100%)]" />{" "}

      {/* Mairie au trait, posée en bas à droite (ordinateur et tablette). */}
      <Mairie className="pointer-events-none absolute -bottom-2 right-[-40px] -z-10 hidden w-[280px] text-rose-200/30 md:block lg:right-[2%] lg:w-[330px]" />{" "}


      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-[5.5rem] sm:pt-28 md:pb-14 md:pt-32">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/50 bg-black/30 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-rose-200 backdrop-blur-sm sm:px-5 sm:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />{" "}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>{" "}
            Action locale
          </span>{" "}
          <h1 className="mt-5 font-staatliches text-[clamp(3rem,12.5vw,8.5rem)] uppercase leading-[0.9] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            La politique{" "}
            <span className="inline-block bg-gradient-to-r from-rose-400 via-fuchsia-400 to-rose-300 bg-clip-text pr-[0.12em] italic text-transparent">locale</span>
          </h1>{" "}
          <div className="mx-auto mt-5 h-1.5 w-32 rounded-full bg-gradient-to-r from-rose-600 via-fuchsia-500 to-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.55)] sm:w-44" />{" "}
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-base md:text-lg">
            Qui décide quoi près de chez vous ? Retrouvez votre maire, votre département et votre région, leurs élus,
            leurs budgets et ce qu&apos;ils financent avec vos impôts locaux.
          </p>
        </div>{" "}

        {/* Par où commencer : choisir son échelon ouvre le bon onglet, plus bas. */}
        <p className="mt-7 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/55 md:mt-9">Par où commencer ?</p>{" "}
        <div className="mx-auto mt-3 grid max-w-4xl gap-3 md:grid-cols-3">
          {ECHELONS.map(({ id, titre, nombre, exemples, Icone, ton, anneau }) => (
            <button
              key={id}
              type="button"
              onClick={() => onEchelon(id)}
              className={`group flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-left backdrop-blur-md transition hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 active:scale-[0.98] md:flex-col md:items-start md:gap-3 md:p-5 ${anneau}`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ton} shadow-lg md:h-12 md:w-12`}>
                <Icone size={22} />
              </span>{" "}
              <span className="min-w-0 flex-1">
                <span className="block font-staatliches text-2xl uppercase leading-none tracking-wide">{titre}</span>{" "}
                <span className="mt-1 block text-[11px] font-black uppercase tracking-widest text-white/50">{nombre}</span>{" "}
                <span className="mt-1.5 block text-[13px] leading-snug text-white/75">{exemples}</span>
              </span>{" "}
              <ChevronRight size={20} className="shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white md:hidden" />
              <span className="hidden items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/60 transition group-hover:text-white md:inline-flex">
                Explorer <ArrowRight size={13} className="transition group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>{" "}

        {/* Les autres rubriques, en boutons arrondis comme sur les autres pages. */}
        <nav aria-label="Rubriques de la page" className="relative mx-auto mt-6 max-w-4xl">
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {liens.map(({ label, href, Icone }) => {
              const classes = "inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-black/25 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm transition hover:border-rose-400 hover:bg-rose-500/15 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400 active:scale-[0.97]";
              return href.startsWith("#")
                ? <a key={href} href={href} className={classes}><Icone size={14} />{" "}{label}</a>
                : <Link key={href} href={href} className={classes}><Icone size={14} />{" "}{label}</Link>;
            })}
          </div>
        </nav>
      </div>
    </section>
  );
}

