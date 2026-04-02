import LawsClient from "./LawsClient";
import { Sparkles } from "lucide-react";

export default function LawsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section (Compact 50vh style) */}
      <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-slate-950 overflow-hidden">
        {/* Institutional Decorative Background */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/5 rounded-full blur-[120px]" />
        <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        
        <div className="container mx-auto max-w-6xl text-center relative z-10 px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight text-white drop-shadow-md">
            On va plus loin
          </h1>
          
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed font-medium">
            Les dossiers législatifs décryptés en profondeur.
          </p>
        </div>
      </div>

      {/* 2. CONTENU INTERACTIF (CLIENT) - BOUGHT UP CLOSER */}
      <div className="mt-8">
        <LawsClient />
      </div>
    </div>
  );
}
