"use client";

import { useParams } from "next/navigation";
import { INSTITUTION_GUIDES } from "@/lib/institutions-data";
import { motion } from "framer-motion";
import { ChevronLeft, Landmark, History, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function InstitutionGuidePage() {
  const params = useParams();
  const slug = params.slug as string;
  const guide = INSTITUTION_GUIDES[slug];

  if (!guide) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Institution non trouvée</h1>
        <Link href="/" className="text-blue-600 hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${guide.heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-20 max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 group">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Retour à l'accueil
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
              <Landmark className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl md:text-8xl font-staatliches uppercase tracking-tighter text-white leading-none">
              {guide.name}
            </h1>
            <div className="pt-4">
              <span className="inline-block py-2 px-6 rounded-full bg-blue-600/20 backdrop-blur-md border border-blue-400/30 text-blue-100 text-sm md:text-xl font-serif italic tracking-wide">
                &ldquo; {guide.fullTitle} &rdquo;
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 gap-20">
          
          {/* Section: Le Rôle */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Landmark size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Son Rôle Principal</h2>
            </div>
            <p className="text-xl md:text-2xl leading-relaxed text-slate-800 font-medium">
              {guide.role}
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* Section: Histoire */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <History size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Un peu d'histoire</h2>
            </div>
            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full -mr-10 -mt-10" />
               <p className="text-lg leading-relaxed text-slate-600 relative z-10">
                 {guide.history}
               </p>
            </div>
          </section>

          {/* Section: Pouvoirs Clés */}
          <section className="space-y-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <Zap size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Ses Pouvoirs Clés</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {guide.keyPowers.map((power, i) => (
                <div key={i} className="bg-slate-900 text-white p-8 rounded-[2rem] space-y-4 hover:scale-[1.02] transition-transform cursor-default">
                  <h3 className="text-xl font-bold text-red-400">{power.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{power.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Importance */}
          <section className="bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden">
            <ShieldCheck className="absolute -bottom-10 -right-10 w-64 h-64 text-white/10" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl font-staatliches uppercase tracking-widest">Pourquoi c'est important ?</h2>
              <p className="text-xl leading-relaxed opacity-90">
                {guide.importance}
              </p>
            </div>
          </section>
        </div>

        <div className="mt-20 pt-10 border-t border-slate-200 text-center">
           <Link href="/" className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full font-bold hover:bg-blue-600 transition-colors shadow-xl">
             Retourner à la réalité politique <Landmark size={20} />
           </Link>
        </div>
      </div>
    </main>
  );
}
