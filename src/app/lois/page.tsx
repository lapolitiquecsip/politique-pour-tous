import LawsClient from "./LawsClient";
import { Sparkles } from "lucide-react";

export default function LawsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section (Compact 50vh style) */}
      <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-slate-950 overflow-hidden group">
        {/* Institutional Decorative Background */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-20" />
        
        {/* Hémicycle Filigree (Visual Element) */}
        <div className="absolute inset-0 z-0 opacity-[0.06] select-none pointer-events-none flex items-center justify-center overflow-hidden">
          <img 
            src="/hemicycle_line_art_dark_blue_v17751610606060_1775161082349.png" 
            alt="" 
            className="w-full h-full object-cover md:object-contain scale-110 blur-[0.5px]" 
          />
          {/* Radial mask to focus text */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#020617_80%)]" />
        </div>

        {/* Subtle Grain Texture Overlay */}
        <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] z-10" />
        <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] z-10" />
        
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
