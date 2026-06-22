import React from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Law {
  id: string;
  title: string;
  summary: string;
  vote_result: string;
  category: string;
  date_adopted?: string;
  created_at: string;
}

export default function LawCard({ law }: { law: Law }) {
  // Determine status style and icon
  let statusColor = "bg-gray-100 text-gray-800 border-gray-200";
  let StatusIcon = Clock;
  
  if (law.vote_result?.toLowerCase() === "adoptée") {
    statusColor = "bg-green-100 text-green-800 border-green-200";
    StatusIcon = CheckCircle2;
  } else if (law.vote_result?.toLowerCase() === "rejetée") {
    statusColor = "bg-red-100 text-red-800 border-red-200";
    StatusIcon = XCircle;
  } else if (law.vote_result?.toLowerCase() === "en cours") {
    statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  const dateStr = law.date_adopted 
    ? new Date(law.date_adopted).toLocaleDateString("fr-FR", { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date(law.created_at).toLocaleDateString("fr-FR", { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-md">
          {law.category}
        </span>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${statusColor}`}>
          <StatusIcon className="w-3 h-3" />
          {law.vote_result || "En cours"}
        </span>
      </div>

      <h3 className="text-xl font-heading font-bold text-foreground mb-3 leading-snug group-hover:text-primary transition-colors">
        {law.title}
      </h3>
      
      <p className="text-muted-foreground leading-relaxed mb-6 flex-grow">
        {law.summary}
      </p>

      <div className="flex justify-between items-center mt-auto pt-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Mise à jour le {dateStr}
        </div>
        <Link 
          href={`/lois/${law.id}`} 
          className="text-primary font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all"
        >
          Décrypter <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
