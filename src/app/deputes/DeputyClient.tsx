"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DeputySearch from "@/components/deputies/DeputySearch";
import DeputyGrid from "@/components/deputies/DeputyGrid";
import FranceMap from "@/components/deputies/FranceMap";
import { Deputy, generateSlug } from "@/components/deputies/DeputyCard";
import DeputyCard from "@/components/deputies/DeputyCard";
import { getDepartmentName } from "@/lib/department-mapping";
import { motion, AnimatePresence } from "framer-motion";
import { Map, List, Users, Landmark, ChevronRight } from "lucide-react";

export default function DeputyClient({ initialDeputies }: { initialDeputies: Deputy[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const filteredDeputies = initialDeputies.filter((deputy) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${deputy.firstName} ${deputy.lastName}`.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      fullName.includes(q) ||
      (deputy.department && deputy.department.toLowerCase().includes(q)) ||
      (deputy.party && deputy.party.toLowerCase().includes(q));

    const matchesDepartment =
      !selectedDepartment ||
      (deputy.department &&
        deputy.department.toLowerCase() ===
          getDepartmentName(selectedDepartment).toLowerCase());

    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl animate-in fade-in duration-700">
      {/* 1. SECTION HEADER (POSTER STYLE REBORN) */}
      <div className="mb-16">
        <div className="relative mb-10 text-center">
          <h1 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none relative z-10">
            <span className="text-slate-900 opacity-[0.08] absolute -top-8 left-1/2 -translate-x-1/2 select-none hidden md:block whitespace-nowrap">
              RÉPUBLIQUE • ÉLUS
            </span>
            Que vote <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">votre député ?</span>
          </h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-blue-600 to-red-600 mt-6 rounded-full mx-auto" />
          <p className="text-xl md:text-2xl font-staatliches italic tracking-tight text-slate-500 mt-8 max-w-2xl mx-auto">
            Recherchez par nom, par parti politique ou par département.
          </p>
        </div>
      </div>

      {/* Toggle View & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <div className="inline-flex items-center gap-1 bg-secondary/50 border border-border rounded-xl p-1 shrink-0">
          <button
            onClick={() => setShowMap(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showMap
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Map className="w-4 h-4" />
            Vue Carte
          </button>
          <button
            onClick={() => setShowMap(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !showMap
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
            Vue Liste
          </button>
        </div>

        <div className="w-full max-w-md">
          <DeputySearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {showMap ? (
          <motion.div
            key="map-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row gap-6 items-start"
          >
            <motion.div 
              layout 
              className={`bg-card/30 backdrop-blur-sm border border-border rounded-3xl p-2 transition-all duration-500 w-full ${
                selectedDepartment ? "lg:w-[60%]" : "lg:w-full"
              }`}
            >
              <FranceMap
                selectedDepartment={selectedDepartment}
                onDepartmentSelect={setSelectedDepartment}
              />
            </motion.div>

            {/* Panel de Circonscriptions (Side Panel en Desktop, sous la carte en Mobile) */}
            <AnimatePresence>
              {selectedDepartment && (
                <motion.div
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: "100%" }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                  className="w-full lg:max-w-md shrink-0"
                >
                  <div className="bg-white dark:bg-slate-900 border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[600px]">
                    
                    {/* Panel Header */}
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Landmark className="w-6 h-6 text-red-500" />
                            {getDepartmentName(selectedDepartment)}
                          </h3>
                          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-widest">
                            {filteredDeputies.length} circonscription{filteredDeputies.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Découpage par circonscription */}
                    <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1 bg-slate-50/50 dark:bg-slate-950">
                      {[...filteredDeputies]
                        .sort((a, b) => a.constituencyNumber - b.constituencyNumber)
                        .map((deputy) => {
                          const slug = deputy.slug || generateSlug(deputy.firstName, deputy.lastName);
                          return (
                            <div 
                              key={deputy.id}
                              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 shrink-0">
                                {deputy.constituencyNumber}
                                <span className="text-[10px] absolute -mt-4 ml-3 opacity-50">ère</span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                                  Circonscription n°{deputy.constituencyNumber}
                                </p>
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {deputy.firstName} {deputy.lastName}
                                </p>
                                <p className="text-xs font-semibold text-slate-500 truncate">
                                  {deputy.party}
                                </p>
                              </div>

                              <button 
                                onClick={() => router.push(`/deputes/${slug}`)}
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                      })}

                      {filteredDeputies.length === 0 && (
                        <div className="text-center py-12 px-4">
                          <p className="text-slate-500 font-medium">Aucun député trouvé pour ce département.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <DeputyGrid deputies={filteredDeputies} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
