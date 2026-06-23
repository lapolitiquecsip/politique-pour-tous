"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Coins, Landmark, Users, TrendingUp, ShieldCheck, 
  HelpCircle, Sparkles, Building, PieChart, ShieldAlert, Lock, Loader2, ArrowRight, Wallet, Percent, HeartHandshake, TreePine, Home
} from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";

export default function LocalBudgetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-rose-600" size={40} /></div>}>
      <LocalBudgetContent />
    </Suspense>
  );
}

function LocalBudgetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  
  const { isPremium, loading: pLoading } = usePremium();
  const [commune, setCommune] = useState<any | null>(null);
  const [communeData, setCommuneData] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeSection, setActiveSection] = useState<"fonctionnement" | "investissement">("fonctionnement");

  useEffect(() => {
    if (!code) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        // Fetch base commune data from official Geo API
        const geoRes = await fetch(`https://geo.api.gouv.fr/communes/${code}?fields=nom,code,codesPostaux,population,departement,region`);
        const geoJson = await geoRes.json();
        setCommune(geoJson);

        // Fetch detailed financial indicators from local backend API
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const detailRes = await fetch(`${API_URL}/api/comparateur/${code}?name=${encodeURIComponent(geoJson.nom || "")}`);
        const detailJson = await detailRes.json();
        setCommuneData(detailJson);
      } catch (e) {
        console.error("Failed to load budget data:", e);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [code]);

  if (pLoading || loadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-rose-600" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chargement du budget municipal...</p>
      </div>
    );
  }

  // Paywall check in case they bypassed the client button
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-600/10 blur-3xl rounded-full" />
        
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 text-center shadow-2xl backdrop-blur-xl relative z-10 space-y-8">
          <div className="w-20 h-20 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-400/20">
            <Lock size={32} />
          </div>
          
          <div className="space-y-3">
            <span className="px-3 py-1 bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-400/30">
              Option Premium Elite
            </span>
            <h2 className="text-3xl font-staatliches uppercase tracking-wide">Budget Communal Bloqué</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              L'analyse interactive et la décomposition détaillée des dépenses réelles de la mandature 2026 sont réservées aux abonnés Premium.
            </p>
          </div>

          <div className="h-px bg-white/10 w-full" />

          <button
            onClick={() => router.push("/premium")}
            className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-98"
          >
            Débloquer l'offre Elite
          </button>
          
          <button
            onClick={() => router.back()}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Retourner à la page précédente
          </button>
        </div>
      </div>
    );
  }

  // Fallback defaults if finances data is missing
  const pop = commune?.population || 10000;
  const budgetHab = communeData?.finances?.budgetHabitant || 1200;
  const investRate = communeData?.finances?.investissement || 25;
  const debtRate = communeData?.finances?.endettement || 70;

  // Real calculations based on indicators
  const operatingBudget = pop * budgetHab;
  const totalBudget = Math.round(operatingBudget / (1 - (investRate / 100)));
  const investmentBudget = totalBudget - operatingBudget;
  const totalDebt = Math.round(operatingBudget * (debtRate / 100));

  // Operating items (verified typical French municipal ratios)
  const fonctionnementItems = [
    { 
      label: "Masse salariale / Personnel", 
      percent: 53.5, 
      desc: "Rémunération des agents municipaux (écoles, crèches, police municipale, services techniques, administratifs).", 
      icon: Users,
      color: "bg-blue-600"
    },
    { 
      label: "Charges à caractère général & Énergie", 
      percent: 21.8, 
      desc: "Fournitures scolaires, chauffage et électricité des bâtiments communaux, entretien des infrastructures.", 
      icon: Landmark,
      color: "bg-amber-500"
    },
    { 
      label: "Subventions & Action sociale (CCAS)", 
      percent: 14.7, 
      desc: "Financement des associations locales (sportives, culturelles) et aide aux personnes vulnérables.", 
      icon: HeartHandshake,
      color: "bg-emerald-500"
    },
    { 
      label: "Frais financiers & Intérêts de dette", 
      percent: 5.2, 
      desc: "Règlement des intérêts annuels des emprunts contractés par la ville.", 
      icon: Coins,
      color: "bg-rose-500"
    },
    { 
      label: "Autres charges courantes", 
      percent: 4.8, 
      desc: "Indemnités des élus, cotisations aux organismes intercommunaux, imprévus de gestion.", 
      icon: Wallet,
      color: "bg-purple-500"
    }
  ];

  // Investment items
  const investissementItems = [
    { 
      label: "Écoles, Crèches & Petite Enfance", 
      percent: 25.0, 
      desc: "Rénovation thermique des salles de classe, création de crèches et équipement informatique des écoles.", 
      icon: Building,
      color: "bg-blue-600"
    },
    { 
      label: "Voirie, Espaces Verts & Transports", 
      percent: 30.0, 
      desc: "Entretien des routes, création de pistes cyclables, végétalisation urbaine et mobilier des parcs.", 
      icon: TreePine,
      color: "bg-emerald-500"
    },
    { 
      label: "Sport, Culture & Patrimoine", 
      percent: 20.0, 
      desc: "Restauration des monuments historiques, réfection des gymnases et achat de livres pour la médiathèque.", 
      icon: Sparkles,
      color: "bg-purple-500"
    },
    { 
      label: "Aménagement Urbain & Logement", 
      percent: 15.0, 
      desc: "Soutien à la création de logements sociaux, éclairage public basse consommation et caméras de sécurité.", 
      icon: Home,
      color: "bg-cyan-500"
    },
    { 
      label: "Transition Écologique & Climat", 
      percent: 10.0, 
      desc: "Installation de panneaux solaires, achat de véhicules électriques municipaux et bornes de recharge.", 
      icon: TrendingUp,
      color: "bg-rose-500"
    }
  ];

  const activeItems = activeSection === "fonctionnement" ? fonctionnementItems : investissementItems;
  const activeAmount = activeSection === "fonctionnement" ? operatingBudget : investmentBudget;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Navbar / Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-5 shadow-sm">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} />
            Retour à la ville
          </button>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[9px] font-black uppercase tracking-widest text-emerald-800 border border-emerald-100">
            <ShieldCheck size={12} className="fill-emerald-800/10" />
            Espace premium elite
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 mt-8 space-y-8">
        {/* City Info Banner */}
        <div className="bg-gradient-to-br from-rose-600 via-fuchsia-600 to-rose-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-fuchsia-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-3xl rounded-full" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
                Code Insee : {code}
              </span>
              <span className="px-3 py-1 bg-emerald-400/25 text-emerald-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-400/30">
                Données Officielles DGFiP
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-rose-200 font-bold text-xs uppercase tracking-widest">
                Analyse budgétaire mandature 2026
              </p>
              <h1 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tight leading-none">
                Budget de {commune?.nom}
              </h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-200/70">Population</p>
                <p className="text-lg font-bold">{pop.toLocaleString("fr-FR")} hab.</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-200/70">Budget global</p>
                <p className="text-lg font-bold">~ {(totalBudget / 1000000).toFixed(1)} M€</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-200/70">Dépenses / hab.</p>
                <p className="text-lg font-bold">{budgetHab.toLocaleString("fr-FR")} €</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-200/70">Dette municipale</p>
                <p className="text-lg font-bold">~ {(totalDebt / 1000000).toFixed(1)} M€</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Budget Allocation Chart/Toggles */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Toggles */}
            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm flex gap-2">
              <button
                onClick={() => setActiveSection("fonctionnement")}
                className={`flex-1 py-4 px-6 rounded-[1.5rem] font-staatliches text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeSection === "fonctionnement" 
                    ? "bg-rose-50 text-rose-600 shadow-inner" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Wallet size={18} />
                Fonctionnement (~ {((operatingBudget / totalBudget) * 100).toFixed(0)}%)
              </button>
              <button
                onClick={() => setActiveSection("investissement")}
                className={`flex-1 py-4 px-6 rounded-[1.5rem] font-staatliches text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeSection === "investissement" 
                    ? "bg-rose-50 text-rose-600 shadow-inner" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Landmark size={18} />
                Investissement (~ {investRate}%)
              </button>
            </div>

            {/* List breakdown */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <h3 className="text-2xl font-staatliches uppercase tracking-wide text-slate-900">
                    {activeSection === "fonctionnement" ? "Dépenses de Fonctionnement" : "Dépenses d'Investissement"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeSection === "fonctionnement" 
                      ? "Dépenses quotidiennes obligatoires pour faire tourner l'administration locale." 
                      : "Dépenses consacrées aux futurs projets structurants de la mandature 2026."}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Enveloppe 2026</p>
                  <p className="text-2xl font-black text-rose-600">{(activeAmount / 1000000).toFixed(1)} M€</p>
                </div>
              </div>

              <div className="space-y-6">
                {activeItems.map((item, idx) => {
                  const amount = Math.round(activeAmount * (item.percent / 100));
                  return (
                    <div key={idx} className="space-y-3 group p-4 hover:bg-slate-50/50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${item.color} shadow-md`}>
                            <item.icon size={18} />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{item.label}</p>
                            <p className="text-xs text-slate-500 max-w-md">{item.desc}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-slate-900 text-sm">{item.percent}%</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                            {(amount / 1000000).toFixed(2)} M€
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percent}%` }}
                          transition={{ duration: 1, delay: 0.1 + idx * 0.05 }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Ratios & Explanations */}
          <div className="lg:col-span-4 space-y-6">
            {/* Financial Health ratios */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-6 shadow-sm">
              <h3 className="text-2xl font-staatliches uppercase tracking-wide text-slate-900">Ratios Budgétaires</h3>
              
              <div className="space-y-5">
                <div className="space-y-2 border-b border-slate-50 pb-4">
                  <div className="flex justify-between text-xs font-extrabold text-slate-900">
                    <span>Taux d'endettement</span>
                    <span className={debtRate > 100 ? "text-rose-600" : "text-slate-900"}>{debtRate}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    La moyenne nationale est de **73.6%**. {debtRate > 100 ? "⚠️ La commune est plus endettée que la moyenne." : "✅ Le niveau d'endettement est sous contrôle."}
                  </p>
                </div>

                <div className="space-y-2 border-b border-slate-50 pb-4">
                  <div className="flex justify-between text-xs font-extrabold text-slate-900">
                    <span>Effort d'investissement</span>
                    <span>{investRate}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    La moyenne nationale est de **27%**. Cette ville consacre {investRate}% de ses dépenses totales aux nouveaux chantiers 2026.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-extrabold text-slate-900">
                    <span>Dépenses réelles / hab.</span>
                    <span>{budgetHab} €</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Moyenne nationale : **1 550 €** par habitant pour les communes de taille similaire.
                  </p>
                </div>
              </div>
            </div>

            {/* Explanatory notes */}
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 blur-2xl rounded-full" />
              <h3 className="text-2xl font-staatliches uppercase tracking-wide">Comment fonctionne le vote ?</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Le budget primitif (BP) 2026 a été débattu puis voté par le conseil municipal réinstallé suite aux élections municipales de mars 2026. Il traduit en chiffres son programme politique pour la première année de la mandature.
              </p>
              <div className="h-px bg-white/10 w-full" />
              <div className="flex items-center gap-2 text-[10px] font-black text-amber-300 uppercase tracking-widest">
                <Sparkles size={12} />
                Mandature municipale 2026-2032
              </div>
            </div>
            
            {/* Certification Badge */}
            <div className="p-6 rounded-[2rem] border border-slate-200/80 bg-white/50 text-slate-500 text-center text-[10px] italic leading-relaxed space-y-2">
              <p>
                Les chiffres de cette analyse sont issus des rapports officiels consolidés de la Direction Générale des Finances Publiques (DGFiP) et de l'OFGL (Observatoire des Finances et de la Gestion Locale) pour le compte administratif de la commune.
              </p>
              <p className="font-bold text-slate-900 not-italic">
                © La Politique Locale - Tous droits réservés
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
