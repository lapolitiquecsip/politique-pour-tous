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

const institutionConfig: Record<string, { color: string; label: string; border: string }> = {
  assemblée: { color: "bg-blue-600", label: "Assemblée", border: "border-t-blue-600" },
  sénat: { color: "bg-purple-800", label: "Sénat", border: "border-t-purple-800" },
  gouvernement: { color: "bg-red-600", label: "Gouvernement", border: "border-t-red-600" },
  média: { color: "bg-amber-600", label: "Média", border: "border-t-amber-600" },
  cese: { color: "bg-emerald-700", label: "CESE", border: "border-t-emerald-700" },
  "vie-publique": { color: "bg-indigo-600", label: "Vie Publique", border: "border-t-indigo-600" },
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

export default function FeedItemCard({ item }: { item: ContentItem }) {
  const normalizeLang = item.institution?.toLowerCase() || "assemblée";
  const config = institutionConfig[normalizeLang] || institutionConfig.assemblée;
  
  // Format the relative date
  const relativeDate = getRelativeDate(item.date_publication);

  return (
    <div className={`bg-gradient-to-b from-white to-slate-50 border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col border-t-[5px] ${config.border} relative overflow-hidden group`}>
      {/* Dynamic luxury gradient highlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Glowing mesh background circle in the corner */}
      <div className={`absolute -right-12 -top-12 w-28 h-28 rounded-full blur-2xl opacity-[0.08] pointer-events-none ${config.color}`} />
      
      {/* Metallic linear shimmer light ray */}
      <div className="shimmer-effect" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <span
          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full text-white shadow-sm transition-all duration-300 group-hover:scale-105 ${config.color}`}
        >
          {config.label}
        </span>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider">{relativeDate}</span>
      </div>

      <h3 className="text-xl font-heading font-extrabold text-slate-800 mb-3 leading-snug group-hover:text-slate-900 transition-colors relative z-10">
        <GlossaryText>{item.titre_simplifie}</GlossaryText>
      </h3>

      <p className="text-slate-600 flex-grow mb-4 leading-relaxed text-[13.5px] font-medium relative z-10">
        <GlossaryText>{item.resume_flash}</GlossaryText>
      </p>

      <div className="mt-auto pt-3 border-t border-slate-100 relative z-10">
        {item.source_url || item.source_name ? (
          <div className="flex items-center justify-between">
            {item.source_url ? (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 group/link"
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
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 group w-full overflow-hidden">
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
  );
}
