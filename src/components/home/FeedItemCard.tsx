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
    <div className={`bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col border-t-4 ${config.border}`}>
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${config.color}`}
        >
          {config.label}
        </span>
        <span className="text-sm text-muted-foreground">{relativeDate}</span>
      </div>

      <h3 className="text-xl font-heading font-bold text-foreground mb-3 leading-snug">
        <GlossaryText>{item.titre_simplifie}</GlossaryText>
      </h3>

      <p className="text-foreground/80 flex-grow mb-4 leading-relaxed">
        <GlossaryText>{item.resume_flash}</GlossaryText>
      </p>

      <div className="mt-auto pt-3 border-t border-border/50">
        {item.source_url || item.source_name ? (
          <div className="flex items-center justify-between">
            {item.source_url ? (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
              >
                <div className="flex items-center">
                  <AvatarGroup members={getAvatarMembers(item.source_name || "Source officielle")} size={22} limit={4} />
                </div>
                <span className="truncate flex-1 max-w-[120px] group-hover:underline">
                  {item.source_name ? item.source_name.split(',')[0] + (item.source_name.includes(',') ? '...' : '') : 'Source'}
                </span>
                <svg className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2 group">
                <div className="flex items-center">
                  <AvatarGroup members={getAvatarMembers(item.source_name || "Source officielle")} size={22} limit={4} />
                </div>
                <span className="truncate flex-1 max-w-[120px]">
                  {item.source_name ? item.source_name.split(',')[0] + (item.source_name.includes(',') ? '...' : '') : 'Source'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Source interne
          </span>
        )}
      </div>
    </div>
  );
}
