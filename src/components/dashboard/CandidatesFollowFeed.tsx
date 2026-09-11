"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { getFollowedCandidates, toggleFollowCandidate, CANDIDATE_FOLLOWS_EVENT, type FollowedCandidate } from "@/lib/candidateFollows";

// Fil des candidats à la présidentielle SUIVIS par le membre premium (cloche dorée sur la
// fiche candidat). Le choix est mémorisé dans le navigateur ; ici on affiche, pour chaque
// candidat suivi, ses dernières actualités (fil mis à jour chaque jour côté backend).
const fmt = (d: string | null) => (!d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));

export default function CandidatesFollowFeed() {
  const [cands, setCands] = useState<FollowedCandidate[]>([]);
  const [ready, setReady] = useState(false);
  const [news, setNews] = useState<Record<string, any[]>>({});

  // Charge la liste + se resynchronise quand on suit/désuit ailleurs.
  useEffect(() => {
    const load = () => setCands(getFollowedCandidates());
    load(); setReady(true);
    window.addEventListener(CANDIDATE_FOLLOWS_EVENT, load);
    return () => window.removeEventListener(CANDIDATE_FOLLOWS_EVENT, load);
  }, []);

  const ids = cands.map(c => c.id).join(",");
  useEffect(() => {
    let active = true;
    (async () => {
      const map: Record<string, any[]> = {};
      for (const c of cands) { try { map[c.id] = await api.getCandidateNews(c.id); } catch { map[c.id] = []; } }
      if (active) setNews(map);
    })();
    return () => { active = false; };
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  if (cands.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-[2rem] border border-slate-200 bg-white p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500"><Bell size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900">Suivez vos candidats à la présidentielle</p>
          <p className="text-xs text-slate-500">Cliquez sur la <strong>cloche dorée</strong> d'un candidat pour recevoir son fil (actus + vidéos) directement ici.</p>
        </div>
        <Link href="/presidentielles-2027" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800">
          Découvrir <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500"><Bell size={20} className="fill-amber-400" /></span>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Mes candidats suivis</h3>
          <p className="text-[11px] text-slate-500">{cands.length} candidat{cands.length > 1 ? "s" : ""} · fil mis à jour chaque jour</p>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {cands.map(c => (
          <div key={c.id} className="p-4">
            <div className="flex items-center gap-3">
              {c.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.photo_url} alt={c.name} className="h-9 w-9 shrink-0 rounded-full object-cover object-top" />
                : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-600">{c.name.slice(0, 2).toUpperCase()}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{c.name}</p>
                {c.party && <p className="truncate text-[11px] text-slate-400">{c.party}</p>}
              </div>
              <button onClick={() => toggleFollowCandidate(c)} title="Ne plus suivre"
                className="shrink-0 rounded-full border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-300 hover:text-rose-500"><X size={13} /></button>
            </div>
            {(news[c.id] || []).length > 0 ? (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {(news[c.id] || []).slice(0, 8).map((n: any) => (
                  <a key={n.id} href={n.source_url || "#"} target="_blank" rel="noopener noreferrer"
                    className="flex w-[220px] shrink-0 flex-col rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{fmt(n.date)}</span>
                    <p className="mt-1 line-clamp-2 text-[13px] font-bold text-slate-900">{n.title}</p>
                    {n.source_name && <span className="mt-auto pt-1.5 text-[10px] font-bold text-slate-400">{n.source_name}</span>}
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs italic text-slate-400">Pas encore d'actualité — le fil se met à jour chaque jour.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
