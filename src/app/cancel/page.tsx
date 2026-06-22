import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-[2rem] p-8 md:p-12 text-center shadow-xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-slate-400/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-400/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <XCircle className="w-12 h-12" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
            Paiement Annulé
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg leading-relaxed">
            Vous avez interrompu la procédure de paiement. Rassurez-vous, <strong>aucun montant n'a été débité</strong>.
          </p>
          
          <Link 
            href="/premium" 
            className="group flex items-center justify-center gap-3 w-full py-4 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-lg border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Vérifier les avantages Premium
          </Link>
        </div>
      </div>
    </div>
  );
}
