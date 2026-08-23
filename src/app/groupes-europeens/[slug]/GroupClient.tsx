"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, ExternalLink, Landmark, Calendar, Flag, Star } from "lucide-react";
import { api } from "@/lib/api";
import { groupBySlug } from "@/lib/data/epGroups";

export default function GroupClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const group = groupBySlug(slug);

  const [meps, setMeps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!group) { setLoading(false); return; }
    api.getMeps().then((all: any[]) => {
      if (!active) return;
      setMeps((all || []).filter(m => m.ep_group_code === group.code));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [group]);

  if (!group) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Groupe introuvable.</p>
          <Link href="/deputes?mode=meps" className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-amber-600">
            <ArrowLeft size={14} /> Voir les eurodéputés
          </Link>
        </div>
      </main>
    );
  }

  // Partis nationaux français présents dans le groupe (dérivés en direct des élus).
  const parties = Array.from(
    meps.reduce((m: Map<string, number>, x) => {
      const p = (x.national_party || "").trim();
      if (p) m.set(p, (m.get(p) || 0) + 1);
      return m;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Bandeau retour */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/deputes?mode=meps" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-amber-600">
            <ArrowLeft size={14} /> Tous les eurodéputés
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 pt-10 space-y-8">
        {/* En-tête du groupe */}
        <div className="rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <div className={`relative bg-gradient-to-br ${group.gradient} p-8 md:p-10 text-white`}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Groupe au Parlement européen</p>
            <div className="mt-2 flex items-center gap-4">
              <span className="rounded-2xl bg-white/20 px-4 py-2 text-2xl font-staatliches tracking-wide backdrop-blur">{group.short}</span>
              <h1 className="text-3xl md:text-4xl font-staatliches uppercase tracking-wide leading-none">{group.name}</h1>
            </div>
            <p className="mt-4 text-sm font-bold text-white/90">{group.orientation}</p>
          </div>

          {/* Stats clés */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800">
            <Stat icon={<Landmark size={16} />} label="Sièges (Parlement)" value={`${group.seats2024}`} sub="constitution 2024" />
            <Stat icon={<Flag size={16} />} label="Élus français" value={loading ? "…" : `${meps.length}`} sub="en direct" />
            <Stat icon={<Calendar size={16} />} label="Créé en" value={group.founded} sub="" />
            <Stat icon={<Users size={16} />} label="Parti européen" value={group.short} sub={group.europarty} small />
          </div>
        </div>

        {/* Positionnement gauche-droite */}
        <section className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Positionnement politique</p>
          <div className="relative h-3 rounded-full bg-gradient-to-r from-rose-500 via-amber-300 to-blue-600">
            <div
              className="absolute -top-1.5 h-6 w-6 -translate-x-1/2 rounded-full border-4 border-white dark:border-slate-900 shadow-lg"
              style={{ left: `${group.spectrum}%`, backgroundColor: group.color }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Gauche</span><span>Centre</span><span>Droite</span>
          </div>
        </section>

        {/* Ce qu'est le groupe */}
        <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-3">
            Le groupe <span style={{ color: group.color }}>expliqué</span>
          </h2>
          <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{group.summary}</p>

          <h3 className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ce qu'il défend</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.ideology.map((pt, i) => (
              <li key={i} className="flex gap-2 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                <span>{pt}</span>
              </li>
            ))}
          </ul>

          {group.website && (
            <a href={group.website} target="_blank" rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-700">
              Site officiel du groupe <ExternalLink size={12} />
            </a>
          )}
        </section>

        {/* Partis français membres */}
        {parties.length > 0 && (
          <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <h2 className="text-2xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-4">Partis français dans ce groupe</h2>
            <div className="flex flex-wrap gap-2">
              {parties.map(([p, n]) => (
                <span key={p} className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {p} <span className="text-[11px] font-black text-slate-400">· {n}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Eurodéputés français du groupe */}
        <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Star className="text-amber-600 fill-current" size={20} />
            <h2 className="text-2xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">
              Les {loading ? "" : meps.length} eurodéputé·es français
            </h2>
          </div>
          {loading ? (
            <p className="text-sm italic text-slate-400">Chargement…</p>
          ) : meps.length === 0 ? (
            <p className="text-sm italic text-slate-400">Aucun eurodéputé français dans ce groupe.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {meps.map((m) => (
                <Link key={m.id} href={`/eurodeputes/${m.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 transition hover:border-amber-300 hover:bg-amber-50/40 dark:hover:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photo_url} alt={m.full_name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover object-top bg-slate-200 dark:bg-slate-700"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{m.full_name}</p>
                    <p className="truncate text-[11px] font-bold text-slate-400">{m.national_party || "—"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <p className="text-[11px] italic text-slate-400 px-2">
          Sièges au Parlement européen relevés à sa constitution (juillet 2024) ; effectifs français et partis nationaux calculés en direct. Groupe défini par la 10e législature (2024-2029).
        </p>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, sub, small }: { icon: React.ReactNode; label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="p-5">
      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">{icon}{label}</p>
      <p className={`mt-1 font-staatliches uppercase tracking-wide text-slate-900 dark:text-white ${small ? "text-lg" : "text-3xl"}`}>{value}</p>
      {sub && <p className="text-[10px] font-bold text-slate-400 leading-tight">{sub}</p>}
    </div>
  );
}
