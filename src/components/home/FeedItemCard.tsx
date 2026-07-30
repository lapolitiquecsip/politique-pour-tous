import Link from "next/link";
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

type InstCfg = { label: string; dot: string; grad: string; tintBg: string; tintText: string; glow: string };

// Palette VIVE cyclique : la couleur d'accent change à chaque carte (par position dans le fil).
const VIVID: Omit<InstCfg, "label">[] = [
  { dot: "bg-fuchsia-500", grad: "from-fuchsia-500 to-pink-600",  tintBg: "bg-fuchsia-100 dark:bg-fuchsia-500/15", tintText: "text-fuchsia-700 dark:text-fuchsia-300", glow: "bg-fuchsia-500" },
  { dot: "bg-violet-500",  grad: "from-violet-500 to-purple-600", tintBg: "bg-violet-100 dark:bg-violet-500/15",   tintText: "text-violet-700 dark:text-violet-300",   glow: "bg-violet-500" },
  { dot: "bg-sky-500",     grad: "from-sky-500 to-blue-600",      tintBg: "bg-sky-100 dark:bg-sky-500/15",         tintText: "text-sky-700 dark:text-sky-300",         glow: "bg-sky-500" },
  { dot: "bg-cyan-500",    grad: "from-cyan-500 to-teal-600",     tintBg: "bg-cyan-100 dark:bg-cyan-500/15",       tintText: "text-cyan-700 dark:text-cyan-300",       glow: "bg-cyan-500" },
  { dot: "bg-emerald-500", grad: "from-emerald-500 to-green-600", tintBg: "bg-emerald-100 dark:bg-emerald-500/15", tintText: "text-emerald-700 dark:text-emerald-300", glow: "bg-emerald-500" },
  { dot: "bg-amber-500",   grad: "from-amber-500 to-orange-600",  tintBg: "bg-amber-100 dark:bg-amber-500/15",     tintText: "text-amber-700 dark:text-amber-300",     glow: "bg-amber-500" },
  { dot: "bg-rose-500",    grad: "from-rose-500 to-red-600",      tintBg: "bg-rose-100 dark:bg-rose-500/15",       tintText: "text-rose-700 dark:text-rose-300",       glow: "bg-rose-500" },
  { dot: "bg-indigo-500",  grad: "from-indigo-500 to-blue-700",   tintBg: "bg-indigo-100 dark:bg-indigo-500/15",   tintText: "text-indigo-700 dark:text-indigo-300",   glow: "bg-indigo-500" },
];

const institutionConfig: Record<string, InstCfg> = {
  assemblée:      { label: "Assemblée",    dot: "bg-blue-600",    grad: "from-blue-500 to-blue-700",      tintBg: "bg-blue-50 dark:bg-blue-500/10",      tintText: "text-blue-700 dark:text-blue-300",      glow: "bg-blue-500" },
  sénat:          { label: "Sénat",        dot: "bg-purple-700",  grad: "from-purple-500 to-purple-800",  tintBg: "bg-purple-50 dark:bg-purple-500/10",  tintText: "text-purple-700 dark:text-purple-300",  glow: "bg-purple-500" },
  gouvernement:   { label: "Gouvernement", dot: "bg-red-600",     grad: "from-rose-500 to-red-700",       tintBg: "bg-rose-50 dark:bg-rose-500/10",      tintText: "text-rose-700 dark:text-rose-300",      glow: "bg-rose-500" },
  média:          { label: "Média",        dot: "bg-orange-500",  grad: "from-amber-400 to-orange-600",   tintBg: "bg-amber-50 dark:bg-amber-500/10",    tintText: "text-amber-700 dark:text-amber-300",    glow: "bg-orange-500" },
  cese:           { label: "CESE",         dot: "bg-emerald-600", grad: "from-emerald-500 to-teal-700",   tintBg: "bg-emerald-50 dark:bg-emerald-500/10",tintText: "text-emerald-700 dark:text-emerald-300",glow: "bg-emerald-500" },
  "vie-publique": { label: "Vie Publique", dot: "bg-indigo-600",  grad: "from-indigo-500 to-indigo-700",  tintBg: "bg-indigo-50 dark:bg-indigo-500/10",  tintText: "text-indigo-700 dark:text-indigo-300",  glow: "bg-indigo-500" },
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
  } catch (e) {
    return "Récemment";
  }
}

export default function FeedItemCard({ item, colorIndex }: { item: ContentItem; colorIndex?: number }) {
  const normalizeLang = item.institution?.toLowerCase() || "assemblée";
  const inst = institutionConfig[normalizeLang] || institutionConfig.assemblée;
  // Couleur VIVE cyclique selon la position dans le fil (change à chaque scroll) ; à défaut,
  // la couleur de l'institution. Le libellé du badge reste celui de l'institution.
  const config = colorIndex != null ? { ...VIVID[((colorIndex % VIVID.length) + VIVID.length) % VIVID.length], label: inst.label } : inst;

  // Format the relative date
  const relativeDate = getRelativeDate(item.date_publication);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/40">
      {/* Barre d'accent en dégradé (identité de l'institution) */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${config.grad}`} />

      {/* Halo coloré discret dans le coin */}
      <div className={`pointer-events-none absolute -right-16 -top-10 h-40 w-40 rounded-full opacity-[0.1] blur-3xl ${config.glow}`} />

      <div className="relative z-10 flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${config.tintBg} ${config.tintText}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{relativeDate}</span>
        </div>

        <h3 className="mb-3 text-[1.35rem] font-black leading-[1.15] tracking-tight text-slate-900 line-clamp-3 transition-colors dark:text-white">
          <GlossaryText>{item.titre_simplifie}</GlossaryText>
        </h3>

        {/* Le résumé remplit l'espace restant et se coupe proprement (fondu) au lieu de déborder. */}
        <div className="relative mb-4 min-h-0 flex-1 overflow-hidden">
          <p className="text-[13.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            <GlossaryText>{item.resume_flash}</GlossaryText>
          </p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-white to-transparent dark:from-slate-900" />
        </div>

      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        {item.source_url || item.source_name ? (
          <div className="flex items-center justify-between">
            {item.source_url ? (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-2 group/link"
              >
                <div className="flex items-center">
                  <AvatarGroup members={getAvatarMembers(item.source_name || "Source officielle")} size={22} limit={4} />
                </div>
                <span className="truncate flex-1 max-w-[200px] group-hover/link:underline font-bold">
                  {item.source_name ? item.source_name.split(',').slice(0, 2).join(', ') + (item.source_name.split(',').length > 2 ? '...' : '') : 'Source'}
                </span>
                <svg className="w-3 h-3 flex-shrink-0 opacity-50 group-hover/link:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 group w-full overflow-hidden">
                <div className="flex items-center shrink-0">
                  <AvatarGroup members={getAvatarMembers(item.source_name || "Source officielle")} size={22} limit={4} />
                </div>
                <span className="truncate flex-1 max-w-[200px] font-bold">
                  {item.source_name ? item.source_name.split(',').slice(0, 2).join(', ') + (item.source_name.split(',').length > 2 ? '...' : '') : 'Source'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-400 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Source interne
          </span>
        )}
        </div>
      </div>
    </div>
  );
}
