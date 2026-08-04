"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, ExternalLink, Landmark } from "lucide-react";
import { api } from "@/lib/api";
import StructuredBio from "@/components/shared/StructuredBio";

export default function PresidentFicheClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [p, setP] = useState<any | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api.getPresidentBySlug(slug).then(d => { if (active) setP(d); }).catch(() => setP(null));
    return () => { active = false; };
  }, [slug]);

  if (p === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (!p) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="font-staatliches text-3xl uppercase">Président introuvable</h1>
      <Link href="/executif" className="text-blue-600 hover:underline">← Retour à l'exécutif</Link>
    </div>
  );

  const initials = (p.full_name || "").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
      {/* Héro */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-4 pb-16 pt-24 text-white">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-3xl border-2 border-white/20 bg-white/10 shadow-2xl">
            {p.photo_url && !failed
              ? <img src={p.photo_url} alt={p.full_name} onError={() => setFailed(true)} className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center font-staatliches text-4xl text-white/70">{initials}</div>}
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-200 ring-1 ring-white/15">
              <Landmark size={12} /> Président de la République{p.term ? ` · ${p.term}` : ""}
            </span>
            <h1 className="mt-3 font-staatliches text-5xl uppercase leading-none tracking-tight md:text-6xl">{p.full_name}</h1>
            {p.party && <p className="mt-2 font-bold text-white/70">{p.party}</p>}
            {p.summary && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/85">{p.summary}</p>}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4">
        <Link href="/executif" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600"><ChevronLeft size={16} /> Exécutif</Link>

        {/* Bio détaillée — même composant et même degré de précision que les élus. */}
        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-10">
          <h2 className="mb-6 font-staatliches text-3xl uppercase tracking-tight text-slate-900 dark:text-white">Portrait & <span className="text-blue-600">parcours</span></h2>
          <StructuredBio bio={p.bio} fallbackText={p.summary} />
        </div>

        {p.source_url && (
          <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600">
            <ExternalLink size={12} /> Source : Wikipédia
          </a>
        )}
      </div>
    </main>
  );
}
