import { useState } from 'react';
import { ArrowRight, ChevronDown, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PromiseStatusBadge from './PromiseStatusBadge';

interface PromiseData {
  id: string;
  citation: string;
  source_url: string;
  date_made: string;
  status: 'kept' | 'in-progress' | 'broken' | 'pending';
  category?: string;
  actions?: string[];
  justification?: string;
}

export default function PromiseItem({ promise }: { promise: PromiseData }) {
  const [isOpen, setIsOpen] = useState(false);

  const dateStr = new Date(promise.date_made).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="bg-card border border-slate-200 shadow-sm rounded-[2.5rem] hover:shadow-xl transition-all duration-300 group bg-white relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110 pointer-events-none" />
      
      {/* Upper Content */}
      <div className="p-8 pb-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">
                {promise.category || "Engagement"}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Déclaration du {dateStr}
              </span>
            </div>
            <blockquote className="text-3xl md:text-4xl font-staatliches text-slate-900 italic mb-4 leading-tight border-l-4 border-blue-600/30 pl-6 py-2">
              « {promise.citation} »
            </blockquote>
          </div>
          <div className="flex-shrink-0">
            <PromiseStatusBadge status={promise.status} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-8 pb-8 flex flex-wrap items-center justify-between gap-4 relative z-10 mt-auto">
        <div className="flex items-center gap-4">
          {promise.source_url && (
            <a
              href={promise.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-500/20"
            >
              Vérifier la source
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
            </a>
          )}
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all border ${
              isOpen 
                ? "bg-blue-50 text-blue-600 border-blue-200" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {isOpen ? "Fermer l'analyse" : "Consulter le détail"}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 opacity-20">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        </div>
      </div>

      {/* Expandable Section */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 pt-4 border-t border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Bilan Concret */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <History className="w-5 h-5" />
                    <h4 className="text-sm font-black uppercase tracking-widest">Bilan Concret</h4>
                  </div>
                  <ul className="space-y-3">
                    {promise.actions?.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 group/item">
                        <CheckCircle2 className="w-4 h-4 text-slate-300 mt-0.5 group-hover/item:text-blue-500 transition-colors" />
                        <span>{action}</span>
                      </li>
                    ))}
                    {(!promise.actions || promise.actions.length === 0) && (
                      <li className="text-sm text-slate-400 italic">Aucune action répertoriée pour le moment.</li>
                    )}
                  </ul>
                </div>

                {/* 2. Analyse de la Rédaction */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                    <h4 className="text-sm font-black uppercase tracking-widest">Justification du Score</h4>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      « {promise.justification || "L'analyse détaillée de cet engagement est en cours de rédaction par nos équipes."} »
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
