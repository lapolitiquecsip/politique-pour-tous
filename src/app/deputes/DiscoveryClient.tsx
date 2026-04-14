"use client";

import { useState } from "react";
import DeputyClient from "./DeputyClient";
import SenatorClient from "@/components/senators/SenatorClient";
import { Users, GraduationCap } from "lucide-react";

export default function DiscoveryClient({ initialDeputies }: { initialDeputies: any[] }) {
  const [activeMode, setActiveMode] = useState<"deputies" | "senators">("deputies");

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

        {/* 2. INTEGRATED VISUAL SWITCHER */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveMode("deputies")}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all duration-300 ${
                activeMode === "deputies"
                  ? "bg-white dark:bg-slate-800 text-blue-600 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeMode === "deputies" ? "bg-blue-600 animate-pulse" : "bg-slate-300"}`} />
              Députés
            </button>
            <button
              onClick={() => setActiveMode("senators")}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all duration-300 ${
                activeMode === "senators"
                  ? "bg-white dark:bg-slate-800 text-amber-600 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeMode === "senators" ? "bg-amber-600 animate-pulse" : "bg-slate-300"}`} />
              Sénateurs
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
