"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

type P = { slug: string; name: string; abbrev: string | null; color: string | null; logo_url: string | null; effectif: number | null };

export default function AllPartiesNav({ currentSlug }: { currentSlug: string }) {
  const [parties, setParties] = useState<P[] | null>(null);
  useEffect(() => {
    let active = true;
    api.getParties().then((d: any[]) => { if (active) setParties(d as P[]); }).catch(() => setParties([]));
    return () => { active = false; };
  }, []);
  if (!parties || parties.length === 0) return null;

  return (
    <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
      <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Tous les partis</h2>
      <p className="mt-0.5 text-sm text-slate-500">Accédez à la fiche de chaque parti politique.</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {parties.map(p => {
          const me = p.slug === currentSlug;
          const color = p.color || "#64748b";
          return (
            <Link
              key={p.slug}
              href={`/partis/${p.slug}`}
              aria-current={me ? "page" : undefined}
              className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition ${me ? "cursor-default border-transparent text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-md"}`}
              style={me ? { background: color } : undefined}
            >
              {p.logo_url
                ? <img src={p.logo_url} alt="" className="h-5 w-5 shrink-0 rounded-full bg-white object-contain ring-1 ring-black/5" />
                : <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />}
              <span className="whitespace-nowrap">{p.abbrev || p.name}</span>
              {!me && <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-500" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
