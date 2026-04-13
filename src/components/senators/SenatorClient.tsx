"use client";

import { useState, useEffect, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Search, Map as MapIcon, Users, Lock, Sparkles } from "lucide-react";
import FranceMap from "@/components/deputies/FranceMap";
import SenatorCard, { Senator } from "@/components/senators/SenatorCard";
import { usePremium } from "@/lib/hooks/usePremium"; 

export default function SenatorClient() {
  const [senators, setSenators] = useState<Senator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  
  // Mocking premium for now or using a hook
  const { isPremium } = usePremium() || { isPremium: false };

  useEffect(() => {
    async function fetchSenators() {
      setLoading(true);
      const { data, error } = await supabase
        .from("senators")
        .select("*")
        .order("last_name", { ascending: true });

      if (data) setSenators(data);
      setLoading(false);
    }
    fetchSenators();
  }, [supabase]);

  const filteredSenators = useMemo(() => {
    return senators.filter(s => {
      const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !selectedDept || s.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [senators, search, selectedDept]);

  return (
    <div className="space-y-8 relative">
      {/* Header & Search */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full space-y-4">
          <label className="text-sm font-semibold text-slate-500 flex items-center gap-2">
            <Search className="w-4 h-4" /> RECHERCHER UN SÉNATEUR
          </label>
          <input
            type="text"
            placeholder="Nom, département..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-lg focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
          />
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => setSelectedDept(null)}
             className={`px-6 py-4 rounded-2xl font-semibold transition-all ${!selectedDept ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             Tous
           </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full min-h-[500px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <MapIcon className="w-6 h-6 text-amber-600" />
              Répartition par département
            </h2>
            {selectedDept && (
              <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
                {selectedDept}
              </span>
            )}
          </div>
          
          <div className={`${!isPremium ? "blur-sm grayscale opacity-50 pointer-events-none" : ""}`}>
            <FranceMap 
              onSelectDept={(deptName) => setSelectedDept(deptName)} 
              activeDept={selectedDept}
            />
          </div>

          {!isPremium && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-white/40 backdrop-blur-md">
                <div className="bg-amber-600 p-4 rounded-full shadow-2xl mb-4 animate-pulse">
                    <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Carte des Sénateurs</h3>
                <p className="text-slate-600 max-w-xs mb-6">
                    Connectez-vous à votre compte <strong>Premium</strong> pour accéder à la carte interactive du Sénat.
                </p>
                <button className="bg-black text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Passer au Premium
                </button>
            </div>
          )}
        </div>

        {/* Listing Section */}
        <div className="space-y-6 relative min-h-[600px]">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Users className="w-6 h-6 text-amber-600" />
              {filteredSenators.length} Sénateurs trouvés
            </h2>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!isPremium ? "max-h-[600px] overflow-hidden" : ""}`}>
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
              ))
            ) : (
              filteredSenators.map(s => (
                <SenatorCard key={s.id} senator={s} isBlurred={!isPremium} />
              ))
            )}
          </div>

          {!isPremium && filteredSenators.length > 4 && (
             <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-8 p-4 text-center">
                <div className="space-y-4">
                    <p className="text-slate-500 text-sm font-medium">Découvrez les 348 sénateurs avec un abonnement Premium</p>
                    <button className="bg-amber-600 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:bg-amber-700 transition-colors">
                        Débloquer le Sénat
                    </button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
