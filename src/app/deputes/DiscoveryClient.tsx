"use client";

import { useState } from "react";
import DeputyClient from "./DeputyClient";
import SenatorClient from "@/components/senators/SenatorClient";
import { Users, GraduationCap } from "lucide-react";

export default function DiscoveryClient({ initialDeputies }: { initialDeputies: any[] }) {
  const [activeMode, setActiveMode] = useState<"deputies" | "senators">("deputies");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Title & Description */}
      <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
           Découvrez vos <span className="text-blue-600">représentants</span>
        </h1>
        <p className="text-lg text-slate-600">
          Explorez l'Assemblée Nationale et le Sénat en un clic. Suivez l'activité de vos élus de manière simplifiée.
        </p>
      </div>

      {/* Visual Switcher / Interrupteur Visuel */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex p-1.5 bg-slate-100 rounded-3xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveMode("deputies")}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
              activeMode === "deputies"
                ? "bg-white text-blue-600 shadow-lg ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${activeMode === "deputies" ? "bg-blue-600 animate-pulse" : "bg-slate-300"}`} />
            Députés
          </button>
          <button
            onClick={() => setActiveMode("senators")}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
              activeMode === "senators"
                ? "bg-white text-amber-600 shadow-lg ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${activeMode === "senators" ? "bg-amber-600 animate-pulse" : "bg-slate-300"}`} />
            Sénateurs
          </button>
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
