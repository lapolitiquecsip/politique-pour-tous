"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MousePointerClick } from "lucide-react";
import { api } from "@/lib/api";

// Hémicycles de l'Assemblée nationale et du Sénat (façon Datan, plus moderne).
// Couleurs = couleurs politiques (identité) ; structure = guide dataviz (légende + labels
// directs, badges contrastés, écart 2px entre secteurs, thème clair/sombre).

type Group = { label: string; seats: number; color: string; order: number; slug?: string | null };

// Ordre gauche → droite dans l'hémicycle (rang par sigle) pour l'Assemblée.
const AN_ORDER: Record<string, number> = {
  LFI: 0, PCF: 1, GDR: 1, EELV: 2, ECO: 2, PS: 3, SOC: 3, LIOT: 4, DEM: 5, MoDem: 5,
  RE: 6, EPR: 6, HOR: 7, LR: 8, DR: 8, UDR: 9, RN: 10, NI: 11,
};
// Groupes du Parlement européen (côté français) → couleur + ordre gauche→droite.
const EU_GROUPS: Record<string, { label: string; color: string; order: number }> = {
  GUE: { label: "The Left (GUE)", color: "#B71C3B", order: 0 },
  VERTS: { label: "Verts/ALE", color: "#4CA85F", order: 1 },
  "S&D": { label: "S&D", color: "#E24E8B", order: 2 },
  SD: { label: "S&D", color: "#E24E8B", order: 2 },
  RE: { label: "Renew (RE)", color: "#F2960F", order: 3 },
  PPE: { label: "PPE", color: "#2E5AAC", order: 4 },
  ECR: { label: "ECR", color: "#3A7CA5", order: 5 },
  ESN: { label: "ESN", color: "#1B3A6B", order: 6 },
  PFE: { label: "Patriotes (PFE)", color: "#313567", order: 7 },
  NI: { label: "Non inscrits", color: "#8D949A", order: 9 },
};

// Groupes du Sénat → couleur moderne (par famille) + ordre gauche→droite.
const SENATE: Record<string, { label: string; color: string; order: number }> = {
  "CRCE-K": { label: "CRCE-K", color: "#B01A2E", order: 0 },
  GEST: { label: "Écologiste", color: "#4CA85F", order: 1 },
  SER: { label: "Socialiste (SER)", color: "#E24E8B", order: 2 },
  RDSE: { label: "RDSE", color: "#E0A02E", order: 3 },
  RDPI: { label: "RDPI", color: "#8B5CF6", order: 4 },
  UC: { label: "Union Centriste", color: "#F2960F", order: 5 },
  "Les Indépendants": { label: "Les Indépendants", color: "#5B9BD5", order: 6 },
  "Les Républicains": { label: "Les Républicains", color: "#2E5AAC", order: 7 },
  NI: { label: "Non inscrits", color: "#8D949A", order: 9 },
};

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
}
// Secteur annulaire du haut, tracé par échantillonnage de points (robuste, pas de doute
// sur l'orientation des arcs SVG). deg décroît de gauche 180° vers droite 0°.
function sectorPath(cx: number, cy: number, r0: number, r1: number, degStart: number, degEnd: number) {
  const steps = Math.max(2, Math.ceil(Math.abs(degStart - degEnd)));
  const outer: string[] = [], inner: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const d = degStart + ((degEnd - degStart) * i) / steps;
    const [ox, oy] = polar(cx, cy, r1, d);
    const [ix, iy] = polar(cx, cy, r0, d);
    outer.push(`${ox} ${oy}`);
    inner.push(`${ix} ${iy}`);
  }
  inner.reverse();
  return `M ${outer.join(" L ")} L ${inner.join(" L ")} Z`;
}

function Hemicycle({ title, total, groups }: { title: string; total: number; groups: Group[] }) {
  const W = 640, H = 340, cx = W / 2, cy = 300, r0 = 92, r1 = 250, rBadge = r1 + 22;
  const sorted = [...groups].sort((a, b) => a.order - b.order);
  const sum = sorted.reduce((s, g) => s + g.seats, 0) || 1;
  const PAD = 0.6; // écart angulaire (°) entre secteurs, façon 2px de séparation

  let cursor = 180;
  const arcs = sorted.map((g) => {
    const span = (g.seats / sum) * 180;
    const degStart = cursor, degEnd = cursor - span;
    cursor = degEnd;
    const mid = (degStart + degEnd) / 2;
    const [bx, by] = polar(cx, cy, rBadge, mid);
    return { g, degStart: degStart - PAD / 2, degEnd: degEnd + PAD / 2, bx, by, big: span > 7 };
  });

  const router = useRouter();
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[560px]" role="img" aria-label={`${title} : ${total} sièges`}>
        {arcs.map(({ g, degStart, degEnd }, i) => (
          <path key={i} d={sectorPath(cx, cy, r0, r1, degStart, degEnd)} fill={g.color}
            onClick={() => g.slug && router.push(`/partis/${g.slug}`)}
            className={`transition-opacity hover:opacity-80 ${g.slug ? "cursor-pointer" : ""}`}>
            <title>{g.label} — {g.seats} sièges{g.slug ? " · voir la fiche du parti" : ""}</title>
          </path>
        ))}
        {/* Badges de sièges (seulement pour les secteurs assez larges pour rester lisibles). */}
        {arcs.filter(a => a.big).map(({ g, bx, by }, i) => (
          <g key={`b-${i}`}>
            <circle cx={bx} cy={by} r={17} fill={g.color} stroke="white" strokeWidth={2} className="dark:stroke-slate-900" />
            <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" className="fill-white font-black" fontSize={13}>{g.seats}</text>
          </g>
        ))}
        <text x={cx} y={cy - 34} textAnchor="middle" className="fill-slate-900 dark:fill-white font-staatliches" fontSize={40}>{total}</text>
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-400 font-black uppercase" fontSize={13} letterSpacing={2}>{title}</text>
      </svg>
      {/* Légende (identité jamais portée par la seule couleur) — cliquable vers la fiche du parti. */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {sorted.map((g, i) => {
          const inner = (
            <>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
              {g.label} <span className="text-slate-400">· {g.seats}</span>
            </>
          );
          return g.slug ? (
            <Link key={i} href={`/partis/${g.slug}`} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 transition hover:text-red-600 dark:text-slate-300">{inner}</Link>
          ) : (
            <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">{inner}</span>
          );
        })}
      </div>
      {sorted.some(g => g.slug) && (
        <figcaption className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-yellow-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm dark:bg-yellow-300 dark:text-slate-900">
          <MousePointerClick className="h-3 w-3" />
          Cliquez sur un parti pour voir sa fiche
        </figcaption>
      )}
    </figure>
  );
}

// chamber = "both" (page Lois) | "an" | "senat" | "eu" (pages par organe).
export default function HemicycleChart({ chamber = "both", title, subtitle }: { chamber?: "both" | "an" | "senat" | "eu"; title?: string; subtitle?: string }) {
  const [an, setAn] = useState<Group[] | null>(null);
  const [senat, setSenat] = useState<Group[] | null>(null);
  const [eu, setEu] = useState<Group[] | null>(null);

  useEffect(() => {
    let active = true;
    if (chamber === "both" || chamber === "an") {
      api.getParties().then((rows: any[]) => {
        if (!active) return;
        setAn((rows || []).filter(r => r.effectif > 0).map(r => ({
          label: r.abbrev || r.name, seats: r.effectif, color: r.color || "#8D949A", order: AN_ORDER[r.abbrev] ?? AN_ORDER[r.name] ?? 8, slug: r.slug || null,
        })));
      }).catch(() => setAn([]));
    }
    if (chamber === "both" || chamber === "senat") {
      api.getSenateComposition().then((rows: any[]) => {
        if (!active) return;
        setSenat((rows || []).map(r => {
          const m = SENATE[r.group] || { label: r.group, color: "#8D949A", order: 8 };
          return { label: m.label, seats: r.seats, color: m.color, order: m.order };
        }));
      }).catch(() => setSenat([]));
    }
    if (chamber === "eu") {
      api.getMeps().then((rows: any[]) => {
        if (!active) return;
        const counts = new Map<string, number>();
        for (const m of rows || []) { const g = (m.ep_group_code || "NI"); counts.set(g, (counts.get(g) || 0) + 1); }
        setEu([...counts.entries()].map(([code, seats]) => {
          const m = EU_GROUPS[code] || { label: code, color: "#8D949A", order: 8 };
          return { label: m.label, seats, color: m.color, order: m.order };
        }));
      }).catch(() => setEu([]));
    }
    return () => { active = false; };
  }, [chamber]);

  const anTotal = useMemo(() => (an || []).reduce((s, g) => s + g.seats, 0), [an]);
  const senTotal = useMemo(() => (senat || []).reduce((s, g) => s + g.seats, 0), [senat]);
  const euTotal = useMemo(() => (eu || []).reduce((s, g) => s + g.seats, 0), [eu]);

  const ready = chamber === "both" ? (an && senat) : chamber === "an" ? an : chamber === "senat" ? senat : eu;
  if (!ready) return null;

  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-10 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-red-600">{subtitle || "Composition du Parlement"}</p>
          <h2 className="mt-1 text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white md:text-4xl">
            {title || "Qui siège à l'Assemblée et au Sénat"}
          </h2>
        </div>
        {chamber === "both" ? (
          <div className="grid gap-10 md:grid-cols-2">
            <Hemicycle title="Députés" total={anTotal} groups={an!} />
            <Hemicycle title="Sénateurs" total={senTotal} groups={senat!} />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            {chamber === "an" && <Hemicycle title="Députés" total={anTotal} groups={an!} />}
            {chamber === "senat" && <Hemicycle title="Sénateurs" total={senTotal} groups={senat!} />}
            {chamber === "eu" && <Hemicycle title="Eurodéputés FR" total={euTotal} groups={eu!} />}
          </div>
        )}
      </div>
    </section>
  );
}
