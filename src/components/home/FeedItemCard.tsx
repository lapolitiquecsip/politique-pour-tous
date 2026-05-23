import Link from "next/link";
import GlossaryText from "@/components/ui/GlossaryText";

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
        {item.source_url ? (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">Source : {item.source_name || 'Source officielle'}</span>
            <svg className="w-3 h-3 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
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
