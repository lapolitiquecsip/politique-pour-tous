"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, MapPin, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

// « Projets financés par l'UE en France » — base officielle Kohesio (DG REGIO). Passe du chiffre
// abstrait (« l'UE dépense X Md€ ») au concret et local : quels projets, où, pour combien.
const fmtEur = (n?: number | null) => {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Md€";
  if (n >= 1e6) return (n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M€";
  if (n >= 1e3) return Math.round(n / 1e3) + " k€";
  return n + " €";
};

export default function EuFranceProjects() {
  const [items, setItems] = useState<any[] | null>(null);
  const [region, setRegion] = useState("Toutes");
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    let active = true;
    api.getEuFranceProjects(400).then(d => { if (active) setItems(d as any[]); }).catch(() => setItems([]));
    return () => { active = false; };
  }, []);

  const regions = useMemo(() => {
    if (!items) return [];
    const c = new Map<string, number>();
    for (const it of items) c.set(it.region, (c.get(it.region) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = useMemo(() => {
    if (!items) return [];
    const f = region === "Toutes" ? items : items.filter(i => i.region === region);
    return f.slice(0, limit);
  }, [items, region, limit]);

  if (!items) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-yellow-400" /></div>;
  if (items.length === 0) return null;

  const totalFiltered = region === "Toutes" ? items.length : items.filter(i => i.region === region).length;

  return (
    <section className="mx-auto max-w-6xl px-4">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start justify-between gap-4 text-left">
        <div>
          <h2 className="text-3xl font-staatliches uppercase tracking-tight text-white md:text-4xl">
            Projets financés par <span className="text-yellow-400">l'UE en France</span>
          </h2>
          <p className="mt-1 text-blue-200/70">Des projets concrets cofinancés par l'Union européenne près de chez vous — infrastructures, formation, recherche, transition écologique. Source officielle Kohesio.</p>
        </div>
        <span className="mt-1 flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-yellow-300">
          {open ? "Fermer" : `Voir les projets`}
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <>
          <div className="mb-5 mt-6 flex flex-wrap gap-2">
            {[["Toutes", items.length] as [string, number], ...regions].map(([r, n]) => (
              <button key={r} onClick={() => { setRegion(r); setLimit(12); }}
                className={`rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${region === r ? "border-yellow-400 bg-yellow-400 text-blue-950" : "border-white/15 bg-white/5 text-blue-100 hover:border-yellow-400/40"}`}>
                {r} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(p => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition hover:border-yellow-400/40 hover:bg-white/[0.07]">
                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-blue-600/40 to-yellow-500/20">
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
                  )}
                  <span className="absolute bottom-2 left-3 rounded-full bg-blue-950/70 px-3 py-1 text-lg font-staatliches text-yellow-300">{fmtEur(p.eu_budget_eur)}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-300/70"><MapPin size={11} /> {p.region}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-yellow-300">{p.name}</h3>
                  {p.description && <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-blue-100/60">{p.description}</p>}
                  <span className="mt-auto pt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-300/70">Fiche Kohesio <ExternalLink size={10} /></span>
                </div>
              </a>
            ))}
          </div>

          {limit < totalFiltered && (
            <div className="mt-6 text-center">
              <button onClick={() => setLimit(l => l + 12)} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-blue-100 transition hover:border-yellow-400/50 hover:text-yellow-300">
                Voir plus ({totalFiltered - limit})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
