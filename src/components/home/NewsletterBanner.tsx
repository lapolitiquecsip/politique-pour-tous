"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";

export default function NewsletterBanner() {
  const { isPremium, loading, userId } = usePremium();

  // On ne l'affiche pas si l'utilisateur est déjà premium
  if (isPremium || loading) return null;

  return (
    <section className="py-24 px-4 bg-muted/30 border-t border-border">
      <div className="container mx-auto max-w-3xl text-center bg-card shadow-sm border border-border rounded-3xl p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-white to-accent"></div>
        <h2 className="text-4xl md:text-5xl mb-4 text-primary font-staatliches tracking-wider uppercase">
          Chaque semaine, ton résumé 100% personnalisé sur la vie politique
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          Ne laissez plus les décisions politiques vous surprendre. Chaque dimanche, recevez le décryptage exclusif des <span className="text-foreground font-bold">lois et projets</span>&nbsp;qui impactent directement votre ville et votre budget. L&apos;essentiel du Parlement, résumé en 3 minutes.
        </p>
        
        <div className="flex flex-col items-center gap-6">
          <Link 
            href={getPremiumUrl(userId)} 
            className="px-10 py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all shadow-xl hover:shadow-primary/20 hover:-translate-y-1 text-xl flex items-center gap-3 group"
          >
            S&apos;abonner au service <span className="px-2 py-1 bg-white/20 rounded-lg text-sm">3€ / mois</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Personnalisé • Hebdomadaire • Sans jargon
          </p>
        </div>
      </div>
    </section>
  );
}
