"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, AlertCircle, Calendar, Sparkles, BookOpen, GraduationCap, XCircle } from "lucide-react";
import Link from "next/link";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";

export default function EducationLawPage() {
  const { isPremium, loading, userId } = usePremium();

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-staatliches">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-2xl shadow-red-500/20" />
        <span className="text-white tracking-[0.3em] uppercase animate-pulse">Chargement du dossier</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* HEADER SECTION */}
      <div className="relative pt-32 pb-20 px-4 bg-slate-950 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/159844/cellular-education-classroom-159844.jpeg')] bg-cover bg-center opacity-20 sepia-[.3]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-transparent" />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <Link href="/lois" className="inline-flex items-center text-slate-300 hover:text-white transition-colors mb-10 text-sm font-bold tracking-widest uppercase">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux lois
          </Link>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <GraduationCap className="w-4 h-4" /> Éducation • Accès Libre
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
              Les institutions <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">au quotidien</span>
            </h1>
            
            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl font-medium">
              Une réforme globale du système éducatif visant à revaloriser le métier d'enseignant, uniformiser les tenues scolaires au collège et restructurer le brevet des collèges.
            </p>
          </motion.div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="container mx-auto max-w-4xl px-4 mt-8 -translate-y-24 relative z-20">
        
        {/* Key Indicators */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Statut</p>
              <p className="text-lg font-black text-slate-900">En application</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Entrée en vigueur</p>
              <p className="text-lg font-black text-slate-900">Septembre 2026</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Concernés</p>
              <p className="text-lg font-black text-slate-900">12M d'élèves</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-12">
          
          {/* Main Context */}
          <div className="w-full space-y-12">
            
            <section className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-indigo-500" /> Ce que ça change pour vous
              </h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Expérimentation de la tenue unique</h3>
                    <p className="text-slate-600 leading-relaxed">Le port d'une tenue vestimentaire unique devient obligatoire dans 100 collèges pilotes dès la rentrée. L'objectif est de réduire les inégalités sociales et de renforcer la cohésion scolaire. L'État finance à 50% l'achat des trousseaux.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Un Brevet des collèges couperet</h3>
                    <p className="text-slate-600 leading-relaxed">Le DNB (Diplôme National du Brevet) devient obligatoire pour passer au lycée. Les élèves échouant à l'examen devront intégrer une classe de "prépa-lycée" sur une durée d'un an pour consolider leurs acquis de base.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Revalorisation salariale des enseignants</h3>
                    <p className="text-slate-600 leading-relaxed">Augmentation inconditionnelle de 10% de la rémunération nette pour l'ensemble du corps professoral, couplée à des primes complémentaires pour les remplacements de courte durée (Pacte Enseignant).</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 text-white p-8 md:p-10 rounded-3xl shadow-xl">
              <h2 className="text-2xl font-black mb-6">Le débat à l'Assemblée</h2>
              <div className="flex flex-col gap-20">
                <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-3">
                    <CheckCircle2 className="w-5 h-5" /> Arguments Pour
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>• Restauration de l'autorité à l'école</li>
                    <li>• Hausse d'attractivité du métier prof</li>
                    <li>• Moins de harcèlement via l'uniforme</li>
                  </ul>
                </div>
                <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-red-400 font-bold mb-3">
                    <XCircle className="w-5 h-5" /> Arguments Contre
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>• Coût élevé de la tenue unique</li>
                    <li>• Mise à l'écart avec la "prépa-lycée"</li>
                    <li>• Salaire conditionné à plus de travail</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Bottom Feed / Timeline */}
          <div className="w-full space-y-6">
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-200 shadow-xl">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" /> Calendrier
              </h3>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-indigo-500 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900 text-sm">Fév. 2026</div>
                    </div>
                    <div className="text-slate-600 text-xs">Adoption de loi au Parlement</div>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-emerald-500 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm ring-2 ring-emerald-500/20">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900 text-sm">Aujourd'hui</div>
                    </div>
                    <div className="text-slate-600 text-xs text-emerald-600 font-semibold">Décrets d'application</div>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-slate-300 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm opacity-60">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900 text-sm">Sept. 2026</div>
                    </div>
                    <div className="text-slate-600 text-xs">Entrée en vigueur dans les écoles</div>
                  </div>
                </div>

              </div>
            </div>
            
            {!isPremium && (
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl shadow-xl text-white">
                <h3 className="font-black text-xl mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Dossier Libre
                </h3>
                <p className="text-amber-50 text-sm leading-relaxed mb-6">
                  Cet exemple de dossier législatif vous est offert. Pour accéder aux autres lois décryptées, souscrivez au Premium.
                </p>
                <Link href={getPremiumUrl(userId)} className="block text-center bg-white text-orange-600 font-bold py-3 rounded-xl hover:shadow-lg transition-all w-full">
                  S&apos;abonner (3€/mois)
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
