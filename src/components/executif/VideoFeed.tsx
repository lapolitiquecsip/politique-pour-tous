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
export default function VideoFeed() {
  const [videos, setVideos] = useState<Vid[]>([]);
  const [open, setOpen] = useState<Vid | null>(null);

  useEffect(() => {
    let active = true;
    api.getElyseeVideos(12)
      .then(d => { if (active) setVideos(d as Vid[]); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (videos.length === 0) return null;

  return (
    <section className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Video size={20} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-staatliches uppercase tracking-tight text-slate-900">
            En <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500">vidéo</span>
          </h2>
          <p className="text-xs text-slate-500">Interventions et déclarations du président</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(v => (
          <button
            key={v.video_id}
            onClick={() => setOpen(v)}
            className="group text-left rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/60 transition hover:border-amber-300 hover:shadow-lg"
          >
            <div className="relative aspect-video overflow-hidden bg-slate-200">
              {v.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnail_url}
                  alt={v.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-slate-950/20 transition group-hover:bg-slate-950/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition group-hover:bg-amber-500 group-hover:text-white">
                  <Play size={18} className="ml-0.5" fill="currentColor" />
                </span>
              </div>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{fmtDate(v.published_at)}</p>
              <p className="mt-0.5 text-sm font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                {v.title}
              </p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-slate-400/80 italic border-t border-slate-100 pt-4">
        Source : chaîne YouTube officielle de la présidence de la République. Les vidéos sont
        lues via le lecteur YouTube ; elles ne sont ni copiées ni rediffusées. Mise à jour quotidienne.
      </p>

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
