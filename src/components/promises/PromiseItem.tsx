import React from 'react';
import PromiseStatusBadge from './PromiseStatusBadge';

interface PromiseData {
  id: string;
  citation: string;
  source_url: string;
  date_made: string;
  status: 'kept' | 'in-progress' | 'broken' | 'pending';
}

export default function PromiseItem({ promise }: { promise: PromiseData }) {
  // Simple relative date approach
  const dateStr = new Date(promise.date_made).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="bg-card border border-border shadow-sm rounded-2xl p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1">
          <blockquote className="text-xl font-heading font-medium text-foreground italic mb-4 leading-relaxed border-l-4 border-primary/30 pl-4 py-1">
            « {promise.citation} »
          </blockquote>
        </div>
        <div className="flex-shrink-0">
          <PromiseStatusBadge status={promise.status} />
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 border-t border-border/50 pt-4">
        <span>Fait le {dateStr}</span>
        <span>•</span>
        {promise.source_url ? (
          <a
            href={promise.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline inline-flex items-center"
          >
            Voir la source
          </a>
        ) : (
          <span>Source non disponible</span>
        )}
      </div>
    </div>
  );
}
