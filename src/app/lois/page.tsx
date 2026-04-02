import LawsClient from "./LawsClient";
import { Sparkles } from "lucide-react";

export default function LawsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative pt-32 pb-24 md:pt-48 md:pb-32 bg-slate-950 overflow-hidden">
        {/* Institutional Decorative Background */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/5 rounded-full blur-[120px]" />
        <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-blue-950/40 backdrop-blur-xl rounded-full text-sm font-staatliches tracking-[0.15em] text-blue-300 mb-8 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] uppercase">
            <Sparkles className="w-4 h-4 text-red-500" />
            Accès Thématiques Premium
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight text-white drop-shadow-md">
            On va plus loin
          </h1>
          
          <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed font-medium">
            Les dossiers législatifs décryptés en profondeur. <br className="hidden md:block" />
            <span className="text-blue-400 font-black italic">La recherche détaillée par thématique est réservée aux abonnés Premium.</span>
          </p>
        </div>
      </div>

      {/* 2. CONTENU INTERACTIF (CLIENT) */}
      <div className="mt-20">
        <LawsClient />
      </div>
    </div>
  );
}
