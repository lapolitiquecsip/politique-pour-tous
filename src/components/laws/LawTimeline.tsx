import React from 'react';
import { Check, X, Clock, HelpCircle } from 'lucide-react';

interface TimelineEvent {
  date: string;
  title: string;
  status: 'success' | 'failed' | 'pending';
}

export default function LawTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="text-muted-foreground italic">Aucune donnée historique trouvée pour cette loi.</p>;
  }

  return (
    <div className="relative border-l-2 border-border ml-4 mt-6">
      {events.map((event, index) => {
        let StatusIcon = HelpCircle;
        let ringColor = 'ring-gray-100 bg-gray-400';
        let iconColor = 'text-white';

        if (event.status === 'success') {
          StatusIcon = Check;
          ringColor = 'ring-green-100 bg-green-500';
        } else if (event.status === 'failed') {
          StatusIcon = X;
          ringColor = 'ring-red-100 bg-red-500';
        } else if (event.status === 'pending') {
          StatusIcon = Clock;
          ringColor = 'ring-yellow-100 bg-yellow-500';
        }

        const dateStr = new Date(event.date).toLocaleDateString("fr-FR", { 
          year: 'numeric', month: 'short', day: 'numeric' 
        });

        return (
          <div key={index} className="mb-10 ml-8 relative">
            <span className={`absolute -left-[41px] flex items-center justify-center w-8 h-8 rounded-full ring-4 ${ringColor}`}>
              <StatusIcon className={`w-4 h-4 ${iconColor}`} />
            </span>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow -mt-1">
              <h4 className="flex items-center gap-2 mb-1 text-lg font-bold text-foreground font-heading">
                {event.title}
              </h4>
              <time className="block text-sm font-medium text-muted-foreground leading-none">
                {dateStr}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
