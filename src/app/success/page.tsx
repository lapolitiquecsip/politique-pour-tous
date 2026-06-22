import Link from 'next/link';
import { CheckCircle, ArrowRight, Star } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-[2rem] p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-400/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30">
            <CheckCircle className="w-12 h-12" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
            Paiement Réussi !
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg leading-relaxed">
            Merci pour votre confiance. Votre compte est désormais <strong className="text-amber-500">Premium</strong>, vous avez accès à toutes les analyses approfondies.
          </p>

          <div className="inline-flex items-center justify-center gap-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-4 py-2 rounded-xl mb-10 text-sm font-bold">
            <Star className="w-4 h-4 fill-current" />
            Statut Premium Actif
          </div>
          
          <Link 
            href="/" 
            className="group flex items-center justify-center gap-3 w-full py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-2xl hover:opacity-90 transition-all text-lg shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            Retour à l'accueil
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
