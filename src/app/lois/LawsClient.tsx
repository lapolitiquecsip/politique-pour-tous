"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Leaf, 
  Shield, 
  TrendingUp, 
  HeartPulse, 
  Users, 
  GraduationCap,
  Lock,
  Sparkles,
  ArrowRight,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import DetailedLawDossier from "@/components/laws/DetailedLawDossier";
import { FREE_LAWS } from "@/data/free-laws-dossiers";

const CATEGORIES = [
  { id: "edu", label: "Éducation", icon: GraduationCap, color: "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 shadow-indigo-200", isFree: true },
  { id: "env", label: "Environnement", icon: Leaf, color: "bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 shadow-emerald-200" },
  { id: "eco", label: "Économie", icon: TrendingUp, color: "bg-blue-600 border-blue-500 text-white hover:bg-blue-700 shadow-blue-200" },
  { id: "sec", label: "Sécurité", icon: Shield, color: "bg-slate-700 border-slate-600 text-white hover:bg-slate-800 shadow-slate-200" },
  { id: "health", label: "Santé", icon: HeartPulse, color: "bg-rose-500 border-rose-400 text-white hover:bg-rose-600 shadow-rose-200" },
  { id: "social", label: "Social", icon: Users, color: "bg-orange-500 border-orange-400 text-white hover:bg-orange-600 shadow-orange-200" },
];

export default function LawsClient() {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-24">
      {/* 1. FILTRES THÉMATIQUES (3x2 GRID & INSTITUTIONAL TITLE) */}
      <div className="mb-20">
        <div className="relative mb-6">
          <h3 className="text-3xl md:text-5xl font-staatliches uppercase tracking-wider bg-gradient-to-r from-blue-900 via-red-600 to-blue-900 bg-clip-text text-transparent">
            Explorez par thématique
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`group relative flex items-center gap-4 px-8 py-6 rounded-[2rem] border-2 transition-all duration-300 font-bold shadow-xl ${cat.color} ${
                  isActive 
                    ? "scale-[1.03] ring-offset-4 ring-4 ring-amber-500/20 z-10 shadow-2xl border-white/20" 
                    : "hover:-translate-y-2 border-transparent"
                }`}
              >
                <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-sm transition-transform duration-500 ${isActive ? 'rotate-[360deg]' : 'group-hover:rotate-12'}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <span className="text-xl tracking-tight">{cat.label}</span>
                
                <div className="ml-auto">
                  {!cat.isFree ? (
                    <Lock className={`w-4 h-4 transition-all ${isActive ? "text-white" : "text-white/40 group-hover:text-white"}`} />
                  ) : (
                    !isActive && <span className="text-[10px] bg-white/20 text-white px-2 py-1 rounded-lg uppercase tracking-tighter border border-white/30 backdrop-blur-sm font-black">Gratuit</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DOSSIERS GRATUITS (L'ESSENTIEL) */}
      <div className="space-y-4 mb-20">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-extrabold text-foreground mb-2">L&apos;essentiel en libre accès</h2>
            <p className="text-muted-foreground">Une démonstration de notre expertise Premium sur 4 dossiers majeurs.</p>
          </div>
          <BookOpen className="w-12 h-12 text-primary opacity-10 hidden md:block" />
        </div>

        <div className="space-y-12">
          {FREE_LAWS.map((law) => (
            <DetailedLawDossier key={law.id} law={law} />
          ))}
        </div>
      </div>

      {/* 3. LE RIDEAU DORÉ (SECTION PREMIUM VERROUILLÉE) */}
      <div className="relative mt-32">
        {/* Fake Blurry Content */}
        <div className="opacity-40 grayscale pointer-events-none select-none blur-md space-y-12 mb-12">
           <div className="h-[400px] w-full bg-muted rounded-[3rem] border border-border" />
           <div className="h-[400px] w-full bg-muted rounded-[3rem] border border-border hidden md:block" />
        </div>

        {/* The Golden Paywall Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center -top-20">
          <div className="w-full max-w-2xl bg-card/80 backdrop-blur-2xl border border-amber-200/50 rounded-[3rem] p-10 md:p-16 text-center shadow-2xl relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-8 shadow-xl shadow-amber-500/20">
              <Lock className="w-10 h-10" />
            </div>

            <h3 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-tight">
              Accédez à <span className="text-amber-600 italic">tous</span> les dossiers
            </h3>
            
            <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
              Plus de <span className="text-foreground font-bold">150 dossiers législatifs</span> décryptés, mis à jour en temps réel et classés par domaines.
            </p>

            <div className="flex flex-col items-center gap-6">
              <Link
                href="/newsletter"
                className="group px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-3xl hover:shadow-2xl hover:shadow-amber-500/30 transition-all hover:-translate-y-1 text-xl flex items-center gap-4"
              >
                Devenir membre Premium
                <span className="px-3 py-1 bg-white/20 rounded-xl text-sm border border-white/30 tracking-tight">3€ / mois</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700/60 uppercase tracking-widest leading-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Mise à jour J+1
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700/60 uppercase tracking-widest leading-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Guide législatif complet
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700/60 uppercase tracking-widest leading-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Sans engagement
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
