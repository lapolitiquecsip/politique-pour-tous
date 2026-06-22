import React from 'react';
import Link from 'next/link';
import ProgressBar from './ProgressBar';
import { getFullPartyName } from '@/lib/party-utils';

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
      <div className="bg-card border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 relative overflow-hidden flex flex-col h-full bg-gradient-to-br from-white to-slate-50">
        {/* Tricolor band for style consistency */}
        <div className="absolute top-0 left-0 w-full h-1.5 flex">
          <div className="flex-1 bg-blue-600" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-red-600" />
        </div>
        
        <div className="flex items-start gap-6 mb-8 relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
          <div 
            className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl transition-all duration-500 group-hover:rotate-3 group-hover:rounded-[2rem]"
            style={{ 
              backgroundColor: politician.party_color || '#95A5A6',
              backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)'
            }}
          >
            {initials}
          </div>
          <div>
            <p className="text-amber-500 text-[10px] uppercase tracking-[0.2em] font-black mb-1">{politician.role}</p>
            <h3 className="text-3xl md:text-4xl font-staatliches uppercase tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors leading-none mb-3">
              {politician.first_name} <br/>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">{politician.last_name}</span>
            </h3>
            <span 
              className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg text-white inline-block shadow-sm"
              style={{ backgroundColor: politician.party_color || '#95A5A6' }}
            >
              {getFullPartyName(politician.party)}
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
