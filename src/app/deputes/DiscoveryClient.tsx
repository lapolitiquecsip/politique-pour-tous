"use client";
// Force redeploy for premium links sync

import { useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import DeputyClient from "./DeputyClient";
import SenatorClient from "@/components/senators/SenatorClient";
import { Users, GraduationCap } from "lucide-react";

export default function DiscoveryClient({ initialDeputies }: { initialDeputies: any[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const modeParam = searchParams.get("mode");
  
  const [activeMode, setActiveMode] = useState<"deputies" | "senators">(
    modeParam === "senators" || pathname.includes("senateurs") ? "senators" : "deputies"
  );

  // Synchronize state if param or path changes
  useEffect(() => {
    if (modeParam === "senators" || pathname.includes("senateurs")) setActiveMode("senators");
    else if (modeParam === "deputies" || pathname.includes("deputes")) setActiveMode("deputies");
  }, [modeParam, pathname]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 1. GLOBAL POSTER HEADER */}
      <div className="mb-16">
        <div className="relative mb-8 text-center">
          <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none relative z-10">
            <span className="text-slate-900 opacity-[0.08] absolute -top-10 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap">
              RÉPUBLIQUE • ÉLUS
            </span>
            Que votent <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">vos élus ?</span>
          </h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-6 rounded-full mx-auto" />
          
          {/* Subtitle - Discret mais clair */}
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">
            Assemblée Nationale & Sénat
          </p>
        </div>

        {/* 2. INTEGRATED VISUAL SWITCHER (PREMIUM RE-DESIGN) */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <button
              onClick={() => setActiveMode("deputies")}
              className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] font-black tracking-tight transition-all duration-300 active:scale-95 ${
                activeMode === "deputies"
                  ? "bg-white dark:bg-slate-800 text-blue-600 shadow-2xl shadow-blue-500/10 ring-1 ring-slate-200 dark:ring-slate-700"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${activeMode === "deputies" ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] animate-pulse" : "bg-slate-300"}`} />
              DÉPUTÉS
            </button>
            <button
              onClick={() => setActiveMode("senators")}
              className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] font-black tracking-tight transition-all duration-300 active:scale-95 ${
                activeMode === "senators"
                  ? "bg-white dark:bg-slate-800 text-amber-600 shadow-2xl shadow-amber-500/10 ring-1 ring-slate-200 dark:ring-slate-700"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${activeMode === "senators" ? "bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.6)] animate-pulse" : "bg-slate-300"}`} />
              SÉNATEURS
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      <div className="transition-all duration-500">
        {activeMode === "deputies" ? (
          <DeputyClient initialDeputies={initialDeputies} />
        ) : (
          <SenatorClient />
        )}
      </div>
    </div>
  );
}
