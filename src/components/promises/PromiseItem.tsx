import { ArrowRight } from 'lucide-react';
import PromiseStatusBadge from './PromiseStatusBadge';

interface PromiseData {
  id: string;
  citation: string;
  source_url: string;
  date_made: string;
  status: 'kept' | 'in-progress' | 'broken' | 'pending';
  category?: string;
}

export default function PromiseItem({ promise }: { promise: PromiseData }) {
  const dateStr = new Date(promise.date_made).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return (
    <div className="bg-card border border-slate-200 shadow-sm rounded-[2rem] p-8 hover:shadow-xl transition-all duration-300 group bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110" />
      
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-6 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">
              {promise.category || "Engagement"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Fait le {dateStr}
            </span>
          </div>
          <blockquote className="text-2xl md:text-3xl font-staatliches text-slate-900 italic mb-6 leading-tight border-l-4 border-blue-600/30 pl-6 py-2">
            « {promise.citation} »
          </blockquote>
        </div>
        <div className="flex-shrink-0">
          <PromiseStatusBadge status={promise.status} />
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-2 mt-6 border-t border-slate-100 pt-6 relative z-10">
        {promise.source_url ? (
          <a
            href={promise.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-500/20"
          >
            Vérifier la source
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
          </a>
        ) : (
          <span className="text-xs font-bold text-slate-400 italic">Source non disponible</span>
        )}
        
        <div className="flex items-center gap-1.5 opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}
