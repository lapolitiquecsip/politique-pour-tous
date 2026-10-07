"use client";

import { useLayoutEffect, useRef, useState } from "react";
import GlossaryText from "@/components/ui/GlossaryText";
import { AvatarGroup } from "@/components/ui/avatar";

function getDomainFromName(name: string) {
  const cleanName = name.trim().toLowerCase();
  if (cleanName.includes('figaro')) return 'lefigaro.fr';
  if (cleanName.includes('monde')) return 'lemonde.fr';
  if (cleanName.includes('libération') || cleanName.includes('liberation')) return 'liberation.fr';
  if (cleanName.includes('echos')) return 'lesechos.fr';
  if (cleanName.includes('challenges')) return 'challenges.fr';
  if (cleanName.includes('france info') || cleanName.includes('france tv')) return 'francetvinfo.fr';
  if (cleanName.includes('france 24')) return 'france24.com';
  if (cleanName.includes('bfm')) return 'bfmtv.com';
  if (cleanName.includes('mediapart')) return 'mediapart.fr';
  if (cleanName.includes('parisien')) return 'leparisien.fr';
  if (cleanName.includes('20 minutes')) return '20minutes.fr';
  if (cleanName.includes('point')) return 'lepoint.fr';
  if (cleanName.includes('match')) return 'parismatch.com';
  if (cleanName.includes('yahoo')) return 'yahoo.com';
  if (cleanName.includes('sud ouest')) return 'sudouest.fr';
  if (cleanName.includes('tribune')) return 'latribune.fr';
  if (cleanName.includes('élysée') || cleanName.includes('elysee')) return 'elysee.fr';
  if (cleanName.includes('sénat') || cleanName.includes('senat')) return 'senat.fr';
  if (cleanName.includes('assemblée')) return 'assemblee-nationale.fr';

  // Fallback heuristic: lowercase, remove spaces, add .fr
  return cleanName.replace(/\s+/g, '') + '.fr';
}

function getAvatarMembers(sourceString: string) {
  const sources = sourceString.split(',').map(s => s.trim()).filter(Boolean);
  return sources.map(source => ({
    username: source,
    src: `https://www.google.com/s2/favicons?domain=${getDomainFromName(source)}&sz=64`
  }));
}

interface ContentItem {
  id: string;
  institution: string;
  titre_simplifie: string;
  resume_flash: string;
  date_publication: string;
  source_url?: string;
  source_name?: string;
}

type InstCfg = { label: string; dot: string; tintBg: string; tintText: string };

// Palette VIVE cyclique : la couleur d'accent change à chaque carte (par position dans le fil).
const VIVID: Omit<InstCfg, "label">[] = [
  { dot: "bg-fuchsia-500", tintBg: "bg-fuchsia-100 dark:bg-fuchsia-500/15", tintText: "text-fuchsia-700 dark:text-fuchsia-300" },
  { dot: "bg-violet-500",  tintBg: "bg-violet-100 dark:bg-violet-500/15",   tintText: "text-violet-700 dark:text-violet-300" },
  { dot: "bg-sky-500",     tintBg: "bg-sky-100 dark:bg-sky-500/15",         tintText: "text-sky-700 dark:text-sky-300" },
  { dot: "bg-cyan-500",    tintBg: "bg-cyan-100 dark:bg-cyan-500/15",       tintText: "text-cyan-700 dark:text-cyan-300" },
  { dot: "bg-emerald-500", tintBg: "bg-emerald-100 dark:bg-emerald-500/15", tintText: "text-emerald-700 dark:text-emerald-300" },
  { dot: "bg-amber-500",   tintBg: "bg-amber-100 dark:bg-amber-500/15",     tintText: "text-amber-700 dark:text-amber-300" },
  { dot: "bg-rose-500",    tintBg: "bg-rose-100 dark:bg-rose-500/15",       tintText: "text-rose-700 dark:text-rose-300" },
  { dot: "bg-indigo-500",  tintBg: "bg-indigo-100 dark:bg-indigo-500/15",   tintText: "text-indigo-700 dark:text-indigo-300" },
];

const institutionConfig: Record<string, InstCfg> = {
  assemblée:      { label: "Assemblée",    dot: "bg-blue-600",    tintBg: "bg-blue-50 dark:bg-blue-500/10",       tintText: "text-blue-700 dark:text-blue-300" },
  sénat:          { label: "Sénat",        dot: "bg-purple-700",  tintBg: "bg-purple-50 dark:bg-purple-500/10",   tintText: "text-purple-700 dark:text-purple-300" },
  gouvernement:   { label: "Gouvernement", dot: "bg-red-600",     tintBg: "bg-rose-50 dark:bg-rose-500/10",       tintText: "text-rose-700 dark:text-rose-300" },
  média:          { label: "Média",        dot: "bg-orange-500",  tintBg: "bg-amber-50 dark:bg-amber-500/10",     tintText: "text-amber-700 dark:text-amber-300" },
  cese:           { label: "CESE",         dot: "bg-emerald-600", tintBg: "bg-emerald-50 dark:bg-emerald-500/10", tintText: "text-emerald-700 dark:text-emerald-300" },
  "vie-publique": { label: "Vie Publique", dot: "bg-indigo-600",  tintBg: "bg-indigo-50 dark:bg-indigo-500/10",   tintText: "text-indigo-700 dark:text-indigo-300" },
};


function getRelativeDate(dateString: string) {
  try {
    const pubDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - pubDate.getTime();

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays} jours`;
  } catch {
    return "Récemment";
  }
}

/**
 * Une actualité du fil d'accueil.
 *
 * Épurée : une pastille et une date, le titre, le résumé EN ENTIER, la source.
 * La carte est dimensionnée pour que le résumé tienne (360 × 500, résumés de
 * 500 caractères au plus) ; si un texte exceptionnellement long déborde malgré
 * tout, il se fond et renvoie à l'article — il n'est plus coupé sans le dire.
 */
export default function FeedItemCard({ item, colorIndex }: { item: ContentItem; colorIndex?: number }) {
  const normalizeLang = item.institution?.toLowerCase() || "assemblée";
  const inst = institutionConfig[normalizeLang] || institutionConfig.assemblée;
  // Couleur VIVE cyclique selon la position dans le fil (change à chaque scroll) ; à défaut,
  // la couleur de l'institution. Le libellé du badge reste celui de l'institution.
  const config = colorIndex != null ? { ...VIVID[((colorIndex % VIVID.length) + VIVID.length) % VIVID.length], label: inst.label } : inst;
  const relativeDate = getRelativeDate(item.date_publication);

  // Le fondu n'apparaît que si le résumé déborde réellement.
  const resume = useRef<HTMLDivElement>(null);
  const [deborde, setDeborde] = useState(false);
  useLayoutEffect(() => {
    const el = resume.current;
    if (el) setDeborde(el.scrollHeight > el.clientHeight + 2);
  }, [item.resume_flash]);

  const sources = item.source_name ? item.source_name.split(',').map(s => s.trim()).filter(Boolean) : [];
  const libelleSource = sources.length ? sources.slice(0, 2).join(', ') + (sources.length > 2 ? '…' : '') : 'Source';

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-card ring-1 ring-slate-900/[0.06] dark:bg-slate-900 dark:ring-white/10">
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-5 pt-6">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${config.tintBg} ${config.tintText}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">{relativeDate}<span title="Titre et résumé rédigés par IA à partir de la source citée"> · résumé IA</span></span>
        </div>

        <h3 className="mb-3 shrink-0 text-[19px] font-black leading-[1.3] tracking-tight text-foreground dark:text-white">
          <GlossaryText>{item.titre_simplifie}</GlossaryText>
        </h3>

        {/* Jamais de texte coupé : un résumé plus long que la carte défile dans la carte. */}
        <div ref={resume} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <p className="text-[14.5px] leading-[1.6] text-slate-600 dark:text-slate-300">
            <GlossaryText>{item.resume_flash}</GlossaryText>
          </p>
        </div>

        <div className="mt-4 shrink-0 border-t border-border/60 pt-3.5 dark:border-slate-800">
          {item.source_url ? (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-white"
            >
              <AvatarGroup members={getAvatarMembers(item.source_name || "Source officielle")} size={20} limit={3} />
              <span className="min-w-0 flex-1 truncate font-semibold group-hover/link:underline">{libelleSource}</span>
              <span className="shrink-0 font-bold text-foreground/70 group-hover/link:text-foreground">
                {deborde ? "Lire la suite →" : "Lire →"}
              </span>
            </a>
          ) : sources.length ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-slate-400">
              <AvatarGroup members={getAvatarMembers(item.source_name || "Source officielle")} size={20} limit={3} />
              <span className="min-w-0 flex-1 truncate font-semibold">{libelleSource}</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">Source interne</span>
          )}
        </div>
      </div>
    </div>
  );
}
