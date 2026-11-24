/**
 * Le lecteur vidéo du site (24/11/2026) : les réunions de commission se regardent ICI, sans
 * renvoi vers le portail vidéo de l'Assemblée ou du Sénat.
 *
 * Les deux assemblées diffusent leurs enregistrements en MP4, ouverts à l'intégration (l'Assemblée
 * fournit elle-même le code d'intégration de chaque vidéo). Un seul lecteur pour tout le site,
 * monté dans la mise en page (LecteurVideo) : n'importe quel bouton l'ouvre avec `ouvrirVideo`,
 * et un clic sur un horodatage du compte rendu fait sauter la vidéo déjà ouverte au bon instant.
 */

export type VideoReunion = {
  mp4: string;
  /** Instant (s) où démarrer : début de la réunion, ou passage demandé. */
  t: number;
  titre: string;
  /** « Assemblée nationale · Commission des finances · 18 nov. 2026 » */
  legende?: string;
  /** Page officielle de la vidéo : citée comme source sous le lecteur. */
  source?: string | null;
  chambre?: "AN" | "SENAT";
};

import { cleanTitle, fmtMeetingDate, shortCommission } from "@/lib/commissions";

export const EVENEMENT_VIDEO = "lpcs:video";

export function ouvrirVideo(v: VideoReunion) {
  window.dispatchEvent(new CustomEvent<VideoReunion>(EVENEMENT_VIDEO, { detail: v }));
}

type AvecVideo = {
  video_mp4?: string | null; video_debut?: number | null; video_url?: string | null;
  title?: string | null; chamber?: "AN" | "SENAT" | string | null; analysis?: any;
  commission?: string | null; meeting_date?: string | null;
};

/**
 * La vidéo d'une réunion si elle se lit sur le site, sinon null (on garde alors le lien officiel).
 * `t` : instant voulu dans le fichier (horodatage du compte rendu) ; à défaut, début de la réunion.
 */
export function videoDe(m: AvecVideo, t?: number): VideoReunion | null {
  if (!m.video_mp4) return null;
  const legende = [m.chamber === "SENAT" ? "Sénat" : "Assemblée nationale", m.commission ? shortCommission(m.commission) : null,
    m.meeting_date ? fmtMeetingDate(m.meeting_date) : null].filter(Boolean).join(" · ");
  return {
    mp4: m.video_mp4,
    t: Math.max(0, t ?? m.video_debut ?? 0),
    titre: cleanTitle(m.title || "") || "Réunion de commission",
    legende,
    source: m.analysis?.video || m.video_url || null,
    chambre: m.chamber === "SENAT" ? "SENAT" : "AN",
  };
}
