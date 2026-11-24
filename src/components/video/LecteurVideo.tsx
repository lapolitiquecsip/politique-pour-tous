"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Minimize2, Maximize2, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { EVENEMENT_VIDEO, type VideoReunion } from "@/lib/lecteur-video";

/**
 * Le lecteur vidéo du site, monté une fois dans la mise en page (voir src/lib/lecteur-video.ts).
 *
 * Deux tailles : en grand (fenêtre au centre) ou réduit, en vignette dans un coin, pour lire le
 * compte rendu en écoutant la réunion. Un nouvel appel sur la même vidéo saute seulement à l'instant
 * demandé : c'est ce qui rend cliquables les horodatages du compte rendu et du sommaire.
 */
export default function LecteurVideo() {
  const [v, setV] = useState<VideoReunion | null>(null);
  const [reduit, setReduit] = useState(false);
  const [etat, setEtat] = useState<"charge" | "pret" | "erreur">("charge");
  const video = useRef<HTMLVideoElement>(null);
  const viseT = useRef(0);

  const caler = useCallback(() => {
    const el = video.current;
    if (!el) return;
    if (Math.abs(el.currentTime - viseT.current) > 1) el.currentTime = viseT.current;
    void el.play().catch(() => {});
  }, []);

  useEffect(() => {
    const ouvrir = (e: Event) => {
      const d = (e as CustomEvent<VideoReunion>).detail;
      if (!d?.mp4) return;
      viseT.current = d.t;
      setV(prev => {
        if (prev?.mp4 === d.mp4) {
          // Même vidéo : on saute à l'instant, sans recharger.
          requestAnimationFrame(caler);
          return { ...prev, ...d };
        }
        setEtat("charge");
        return d;
      });
    };
    window.addEventListener(EVENEMENT_VIDEO, ouvrir);
    return () => window.removeEventListener(EVENEMENT_VIDEO, ouvrir);
  }, [caler]);

  const fermer = useCallback(() => { video.current?.pause(); setV(null); setReduit(false); }, []);
  // Passer de grand à réduit remonte la balise vidéo : on reprend là où on en était.
  const basculer = (r: boolean) => { if (video.current) viseT.current = video.current.currentTime; setEtat("charge"); setReduit(r); };

  // En grand : la page derrière ne défile plus, Échap ferme le lecteur (et seulement lui).
  useEffect(() => {
    if (!v || reduit) return;
    const avant = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      fermer();
    };
    window.addEventListener("keydown", touche, true);
    return () => { document.documentElement.style.overflow = avant; window.removeEventListener("keydown", touche, true); };
  }, [v, reduit, fermer]);

  if (!v || typeof document === "undefined") return null;
  const assemblee = v.chambre === "SENAT" ? "Sénat" : "Assemblée nationale";

  const lecteur = (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      <video
        ref={video}
        key={v.mp4}
        src={v.mp4}
        controls
        autoPlay
        playsInline
        preload="metadata"
        onLoadedMetadata={() => { setEtat("pret"); caler(); }}
        onError={() => setEtat("erreur")}
        className="absolute inset-0 h-full w-full"
        aria-label={`Vidéo : ${v.titre}`}
      />
      {etat === "charge" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin text-white/70" size={30} />
        </div>
      )}
      {etat === "erreur" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center">
          <AlertTriangle className="text-amber-400" size={26} />
          <p className="max-w-sm text-sm font-semibold text-white">La vidéo ne se charge pas pour le moment : le serveur de l&apos;{assemblee} ne répond pas.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => { setEtat("charge"); video.current?.load(); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-900">
              <RotateCcw size={12} /> Réessayer
            </button>
            {v.source && (
              <a href={v.source} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-white/25 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white/80 hover:text-white">
                Page officielle
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (reduit) {
    return createPortal(
      <div className="fixed bottom-4 right-4 z-[140] w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl sm:bottom-6 sm:right-6" role="region" aria-label="Lecteur vidéo réduit">
        {lecteur}
        <div className="flex items-center gap-2 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-white">{v.titre}</p>
          <button type="button" onClick={() => basculer(false)} aria-label="Agrandir la vidéo" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><Maximize2 size={15} /></button>
          <button type="button" onClick={fermer} aria-label="Fermer la vidéo" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><X size={16} /></button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/85 p-0 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`Vidéo : ${v.titre}`} onClick={fermer}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[min(64rem,calc((100dvh-9.5rem)*16/9))] overflow-hidden bg-slate-950 shadow-2xl sm:rounded-[1.75rem] sm:border sm:border-white/10">
        <div className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {v.legende && <p className="text-[10px] font-black uppercase tracking-widest text-red-400">{v.legende}</p>}
            <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-white sm:text-lg">{v.titre}</h3>
          </div>
          <button type="button" onClick={() => basculer(true)} aria-label="Réduire la vidéo pour continuer à lire" title="Réduire : continuer à lire en regardant"
            className="shrink-0 rounded-full bg-white/10 p-2 text-white/80 transition hover:text-white"><Minimize2 size={17} /></button>
          <button type="button" onClick={fermer} aria-label="Fermer la vidéo" className="shrink-0 rounded-full bg-white/10 p-2 text-white/80 transition hover:text-white"><X size={18} /></button>
        </div>
        {lecteur}
        <p className="px-4 py-2.5 text-[11px] text-white/45 sm:px-6">
          Enregistrement officiel de l&apos;{assemblee}, diffusé ici tel quel.
          {v.source && <> {" "}<a href={v.source} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-white/80 hover:underline">Source</a></>}
        </p>
      </div>
    </div>,
    document.body,
  );
}
