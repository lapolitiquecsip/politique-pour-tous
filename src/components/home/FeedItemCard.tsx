import Link from "next/link";

interface ContentItem {
  id: string;
  institution: string;
  titre_simplifie: string;
  resume_flash: string;
  date_publication: string;
  source_url?: string;
}

const institutionConfig: Record<string, { color: string; label: string }> = {
  assemblée: { color: "bg-blue-600", label: "Assemblée" },
  sénat: { color: "bg-purple-800", label: "Sénat" },
  gouvernement: { color: "bg-red-600", label: "Gouvernement" },
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
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${config.color}`}
        >
          {config.label}
        </span>
        <span className="text-sm text-muted-foreground">{relativeDate}</span>
      </div>

      <h3 className="text-xl font-heading font-bold text-foreground mb-3 leading-snug">
        {item.titre_simplifie}
      </h3>

      <p className="text-foreground/80 flex-grow mb-4 leading-relaxed">
        {item.resume_flash}
      </p>

      {item.source_url ? (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors mt-auto inline-flex items-center"
        >
          Lire la source originale
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ) : (
        <span className="text-sm text-muted-foreground/50 mt-auto">Source interne</span>
      )}
    </div>
  );
}
