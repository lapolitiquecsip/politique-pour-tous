import LawsClient from "./LawsClient";
import { Sparkles } from "lucide-react";

export default function LawsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 1. HERO HEADER PREMIUM */}
      <div className="relative overflow-hidden bg-slate-900 text-white py-24 px-4 border-b border-border shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600 rounded-full blur-[100px] animate-pulse" />
        </div>
        
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest text-amber-400 mb-6 border border-white/10 shadow-lg">
            <Sparkles className="w-4 h-4" />
            Exclusivité Premium
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            On va plus loin
          </h1>
          
          <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Les grands dossiers législatifs décryptés, de A à Z. <br className="hidden md:block" />
            <span className="text-white font-bold italic">Ne vous laissez plus perdre par le jargon technique.</span>
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
