"use client";

import { useEffect, useState } from "react";
import { Play, X, Video, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

type Vid = {
  video_id: string; title: string; published_at: string | null;
  url: string; thumbnail_url: string | null; description: string | null;
};

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Fil vidéo de la présidence — chaîne YouTube OFFICIELLE de l'Élysée.
 *
 * Périmètre assumé : uniquement la chaîne officielle. Les interviews sur les chaînes
 * privées sont sous droits et leurs lecteurs bloquent l'intégration — on ne les republie
 * pas. La lecture se fait chez YouTube via l'embed officiel : on ne stocke et ne rediffuse
 * aucune vidéo. Le lecteur n'est monté qu'au clic (pas d'iframe YouTube au chargement,
 * donc pas de traceur imposé à l'ouverture de la page).
 */
// source = "elysee" (présidence) | "an" (Assemblée via LCP) | "senat" (Public Sénat).
const CFG = {
  elysee: { fetch: (n: number) => api.getElyseeVideos(n), icon: "bg-rose-50 text-rose-600", grad: "from-amber-500 via-orange-500 to-yellow-500", pre: "En ", accent: "vidéo", sub: "Interventions et déclarations du président", external: false, note: "Source : chaîne YouTube officielle de la présidence de la République. Lecture via le lecteur YouTube ; aucune vidéo n'est copiée. Mise à jour quotidienne." },
  an: { fetch: (n: number) => api.getAnVideos(n), icon: "bg-emerald-50 text-emerald-600", grad: "from-emerald-500 to-teal-500", pre: "Séances & ", accent: "auditions", sub: "Débats, questions au Gouvernement et auditions — chaîne officielle LCP · Assemblée nationale", external: false, note: "Source : chaîne YouTube officielle LCP · Assemblée nationale. Mise à jour quotidienne." },
  senat: { fetch: (n: number) => api.getSenatVideos(n), icon: "bg-rose-50 text-rose-600", grad: "from-rose-500 to-red-500", pre: "Séances & ", accent: "auditions", sub: "Séances publiques, auditions et travaux de commission — portail officiel videos.senat.fr", external: true, note: "Source : portail officiel videos.senat.fr (séances publiques, auditions, travaux de commission). La vidéo s'ouvre sur le site du Sénat." },
  candidate: { fetch: (_n: number) => Promise.resolve([] as Vid[]), icon: "bg-amber-50 text-amber-600", grad: "from-amber-500 to-yellow-500", pre: "Discours & ", accent: "vidéos", sub: "Discours, débats et interviews — chaîne YouTube officielle du candidat", external: false, note: "Source : chaîne YouTube officielle du candidat. Lecture via le lecteur YouTube ; aucune vidéo n'est copiée." },
} as const;

export default function VideoFeed({ source = "elysee", candidateId }: { source?: "elysee" | "an" | "senat" | "candidate"; candidateId?: string }) {
  const [videos, setVideos] = useState<Vid[]>([]);
  const [open, setOpen] = useState<Vid | null>(null);
  const cfg = CFG[source];

  useEffect(() => {
    let active = true;
    const p = source === "candidate"
      ? (candidateId ? api.getCandidateVideos(candidateId, 12) : Promise.resolve([]))
      : cfg.fetch(12);
    Promise.resolve(p).then(d => { if (active) setVideos(d as Vid[]); }).catch(() => {});
    return () => { active = false; };
  }, [source, candidateId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (videos.length === 0) return null;

  return (
    <section className="p-8 md:p-10 rounded-[3rem] border space-y-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cfg.icon}`}>
          <Video size={20} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">
            {cfg.pre}<span className={`text-transparent bg-clip-text bg-gradient-to-r ${cfg.grad}`}>{cfg.accent}</span>
          </h2>
          <p className="text-xs text-slate-500">{cfg.sub}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(v => {
          const media = (
            <>
              <div className="relative aspect-video overflow-hidden bg-slate-200 dark:bg-slate-800">
                {v.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail_url} alt={v.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${cfg.grad} opacity-90`} />
                )}
                <div className="absolute inset-0 bg-slate-950/20 transition group-hover:bg-slate-950/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition group-hover:bg-slate-900 group-hover:text-white">
                    {cfg.external ? <ExternalLink size={17} /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{fmtDate(v.published_at)}{v.description && cfg.external ? ` · ${v.description}` : ""}</p>
                <p className="mt-0.5 text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2 transition-colors">{v.title}</p>
              </div>
            </>
          );
          const cls = "group text-left rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 transition hover:shadow-lg";
          return cfg.external ? (
            <a key={v.video_id} href={v.url} target="_blank" rel="noopener noreferrer" className={cls}>{media}</a>
          ) : (
            <button key={v.video_id} onClick={() => setOpen(v)} className={cls}>{media}</button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400/80 italic border-t border-slate-100 dark:border-slate-800 pt-4">{cfg.note}</p>

      {/* Lecteur monté seulement au clic. */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">{fmtDate(open.published_at)}</p>
                <h3 className="mt-0.5 text-base font-bold leading-snug text-white">{open.title}</h3>
              </div>
              <button onClick={() => setOpen(null)} className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
                <X size={18} />
              </button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${open.video_id}?autoplay=1&rel=0`}
                title={open.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <a
              href={open.url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70 transition hover:text-white"
            >
              Voir sur YouTube <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
