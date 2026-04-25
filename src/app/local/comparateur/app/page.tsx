"use client";

import { motion } from "framer-motion";
import { Map, ChevronLeft, Search, TrendingUp, ShieldCheck, HeartPulse, Zap } from "lucide-react";
import Link from "next/link";

export default function ComparateurApp() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Link href="/local" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest mb-8">
          <ChevronLeft size={16} /> Retour au portail
        </Link>

        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900">Le Comparateur <span className="text-amber-500">Premium</span></h1>
              <p className="text-slate-500 font-medium italic">Analysez et comparez les territoires de France en temps réel.</p>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 font-black text-xs uppercase tracking-widest">
              Accès Élite Activé
            </div>
          </div>

          <div className="p-8 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white border-2 border-amber-500 rounded-full flex items-center justify-center text-amber-500 font-black z-10 shadow-2xl hidden lg:flex">
              VS
            </div>

            {/* Entity A */}
            <div className="space-y-8">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Sélectionner une ville, un dépt..." 
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
              <div className="h-64 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 font-bold italic">
                En attente de sélection...
              </div>
            </div>

            {/* Entity B */}
            <div className="space-y-8">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Comparer avec..." 
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-bold text-slate-900"
                />
              </div>
              <div className="h-64 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 font-bold italic">
                En attente de sélection...
              </div>
            </div>
          </div>

          {/* Metrics Placeholder */}
          <div className="bg-slate-900 p-12 md:p-16 text-white">
            <h3 className="text-2xl font-staatliches uppercase tracking-wide mb-12 text-center">Indicateurs de Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Sécurité", icon: ShieldCheck, color: "text-blue-400" },
                { label: "Éducation", icon: TrendingUp, color: "text-amber-400" },
                { label: "Santé", icon: HeartPulse, color: "text-rose-400" },
                { label: "Emploi", icon: Zap, color: "text-emerald-400" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-4 text-center group">
                  <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
