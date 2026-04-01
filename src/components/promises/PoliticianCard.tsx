import React from 'react';
import Link from 'next/link';
import ProgressBar from './ProgressBar';

interface Politician {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  party: string;
  party_color: string;
  promises: {
    total: number;
    kept: number;
    inProgress: number;
    broken: number;
    pending: number;
  };
}

export default function PoliticianCard({ politician }: { politician: Politician }) {
  const initials = `${politician.first_name.charAt(0)}${politician.last_name.charAt(0)}`;
  
  return (
    <Link href={`/promesses/${politician.id}`} className="block group">
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group-hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
        {/* Tricolor band for style consistency */}
        <div className="tricolor-band"><span></span><span></span><span></span></div>
        
        <div className="flex items-start gap-4 mb-6 relative z-10">
          <div 
            className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold shadow-sm"
            style={{ backgroundColor: politician.party_color || '#95A5A6' }}
          >
            {initials}
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-foreground group-hover:text-primary transition-colors">
              {politician.first_name} {politician.last_name}
            </h3>
            <p className="text-muted-foreground text-sm mb-1">{politician.role}</p>
            <span 
              className="px-2 py-0.5 text-xs font-semibold rounded-full text-white inline-block"
              style={{ backgroundColor: politician.party_color || '#95A5A6' }}
            >
              {politician.party}
            </span>
          </div>
        </div>

        <div className="mt-auto relative z-10">
          <div className="flex justify-between text-sm mb-2 text-foreground font-medium">
            <span>Bilan des promesses</span>
            <span>{politician.promises.kept}/{politician.promises.total} tenues</span>
          </div>
          <ProgressBar 
            total={politician.promises.total}
            kept={politician.promises.kept}
            inProgress={politician.promises.inProgress}
            broken={politician.promises.broken}
            pending={politician.promises.pending}
          />
        </div>
      </div>
    </Link>
  );
}
