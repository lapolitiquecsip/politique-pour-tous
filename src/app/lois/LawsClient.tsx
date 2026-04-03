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
import { useRouter } from "next/navigation";
import { STRIPE_CHECKOUT_URL } from "@/lib/constants";
import DetailedLawDossier from "@/components/laws/DetailedLawDossier";
import { FREE_LAWS } from "@/data/free-laws-dossiers";

const CATEGORIES = [
  { id: "edu", label: "Éducation", icon: GraduationCap, color: "border-indigo-400", bgColor: "bg-indigo-50/80", iconBg: "bg-indigo-100", iconColor: "text-indigo-600", isFree: true },
  { id: "env", label: "Environnement", icon: Leaf, color: "border-emerald-400", bgColor: "bg-emerald-50/80", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { id: "eco", label: "Économie", icon: TrendingUp, color: "border-blue-400", bgColor: "bg-blue-50/80", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  { id: "sec", label: "Sécurité", icon: Shield, color: "border-slate-400", bgColor: "bg-slate-100/80", iconBg: "bg-slate-200", iconColor: "text-slate-600" },
  { id: "health", label: "Santé", icon: HeartPulse, color: "border-rose-400", bgColor: "bg-rose-50/80", iconBg: "bg-rose-100", iconColor: "text-rose-600" },
  { id: "social", label: "Social", icon: Users, color: "border-orange-400", bgColor: "bg-orange-50/80", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
];

export default function LawsClient() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const scrollToPremium = () => {
    const element = document.getElementById("premium-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-24">
      {/* 1. FILTRES THÉMATIQUES (ULTRA COMPACT BENTO STYLE) */}
      <div className="mb-24">
        <div className="relative mb-10 text-center md:text-left">
          <h3 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none">
            <span className="text-slate-900 opacity-5 absolute -top-8 left-0 select-none hidden md:block">COLLECTIONS</span>
            Explorez par <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">thématique</span>
          </h3>
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-red-600 mt-4 rounded-full mx-auto md:mx-0" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCat === cat.id;
            
            const handleCategoryClick = () => {
              if (cat.isFree) {
                if (cat.id === "edu") {
                  router.push("/lois/education");
                } else {
                  setSelectedCat(cat.id);
                }
              } else {
                scrollToPremium();
              }
            };

            return (
              <button
                key={cat.id}
                onClick={handleCategoryClick}
                className={`group relative flex flex-col items-start gap-3 p-4 md:p-5 rounded-[1rem] border transition-all duration-500 shadow-sm overflow-hidden ${
                  isActive 
                    ? "ring-4 ring-blue-500/10 border-blue-500 bg-slate-950 text-white shadow-2xl scale-[1.02] border-t-4" 
                    : `hover:shadow-lg hover:-translate-y-1 border-slate-200 ${cat.bgColor} border-t-4`
                } ${cat.color}`}
              >
                {/* Background Pattern for Active state */}
                {isActive && (
                  <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
                )}

                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-2 md:p-2.5 rounded-lg ${isActive ? 'bg-white/10' : cat.iconBg} transition-all duration-500 group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? 'text-white' : cat.iconColor}`} />
                  </div>
                  
                  <div>
                    {!cat.isFree ? (
                      <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white/40' : 'text-slate-400'}`} />
                    ) : (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black border ${isActive ? 'bg-white/20 border-white/30 text-white' : 'bg-white/50 border-indigo-100 text-indigo-600'}`}>
                        Libre
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-left">
                  <span className={`text-xl md:text-2xl font-staatliches uppercase tracking-wide block leading-none ${isActive ? 'text-white' : 'text-slate-900 group-hover:text-blue-600 transition-colors'}`}>
                    {cat.label}
                  </span>
                  <p className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-1 transition-opacity duration-300 ${isActive ? 'text-white/40' : 'text-slate-400'}`}>
                    Dossiers
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DOSSIERS GRATUITS (POSTER STYLE REBORN) */}
      <div className="space-y-4 mb-20">
        <div className="relative mb-16 text-center md:text-left">
          <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none">
            <span className="text-slate-900 opacity-10 absolute -top-8 left-0 select-none hidden md:block">INITIATIVE</span>
            L&apos;essentiel en <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">libre accès</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-red-600 mt-4 rounded-full mx-auto md:mx-0" />
          <p className="text-lg md:text-xl font-bold italic tracking-tight text-slate-500 mt-6 max-w-2xl font-staatliches">
            Une démonstration de notre expertise Premium sur 4 dossiers majeurs.
          </p>
        </div>

        <div className="space-y-12">
          {FREE_LAWS.map((law) => (
            <DetailedLawDossier key={law.id} law={law} />
          ))}
        </div>
      </div>

      {/* 3. LE RIDEAU DORÉ (SECTION PREMIUM VERROUILLÉE) */}
      <div id="premium-section" className="relative mt-32">
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
                href={STRIPE_CHECKOUT_URL}
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
