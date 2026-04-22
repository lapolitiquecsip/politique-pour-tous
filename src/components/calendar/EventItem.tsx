export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  institution: "Assemblée nationale" | "Sénat" | "Élysée" | "Gouvernement" | "Assemblée";
  category: string;
  source_url?: string;
}

export default function EventItem({ event }: { event: CalendarEvent }) {
  const isAssemblee = event.institution === "Assemblée nationale" || event.institution === "Assemblée";
  const isSenat = event.institution === "Sénat";

  const badgeColor = isAssemblee
    ? "bg-accent-blue text-white"
    : isSenat
    ? "bg-accent-red text-white"
    : "bg-gray-600 text-white";

  const timeFormatted = event.date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateFormatted = event.date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="relative pl-8 sm:pl-32 py-6 group">
      {/* Date & Time (Left column on md, top inline on sm) */}
      <div className="hidden sm:flex flex-col items-end absolute left-0 top-6 w-24 text-right pr-4">
        <span className="text-sm font-bold text-deep-blue capitalize">{dateFormatted}</span>
        <span className="text-xs text-muted-foreground">{timeFormatted}</span>
      </div>

      {/* Timeline Line & Bullet */}
      <div className="absolute left-0 sm:left-24 top-0 bottom-0 w-px bg-border group-last:bottom-auto group-last:h-full"></div>
      <div className="absolute left-[-4px] sm:left-[92px] top-7.5 w-2.5 h-2.5 rounded-full bg-deep-blue ring-4 ring-cream"></div>

      {/* Content */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="sm:hidden flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-deep-blue capitalize">{dateFormatted} à {timeFormatted}</span>
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${badgeColor}`}>
            {event.institution}
          </span>
        </div>
        
        <div className="hidden sm:flex justify-between items-start mb-2">
          <h3 className="text-lg font-heading font-bold text-deep-blue leading-tight">
            {event.title}
          </h3>
          <span className={`ml-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md whitespace-nowrap ${badgeColor}`}>
            {event.institution}
          </span>
        </div>

        {/* Mobile Title */}
        <h3 className="sm:hidden text-lg font-heading font-bold text-deep-blue leading-tight mb-2">
          {event.title}
        </h3>

        <p className="text-foreground/80 text-sm leading-relaxed">
          {event.description}
        </p>

        {event.category && (
          <div className="mt-3 inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            {event.category}
          </div>
        )}
      </div>
    </div>
  );
}
