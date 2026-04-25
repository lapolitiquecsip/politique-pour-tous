"use client";
import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Landmark } from "lucide-react";

import Link from "next/link";
import { api } from "@/lib/api";

interface Institution {
  id: string;
  name: string;
  shortName: string;
  image: string;
  summary: string;
  details: string[];
  color: string;
  dbInstitution: string; // Mapping for Supabase events table
  memberCount?: number;
  directoryUrl?: string;
}

const INSTITUTIONS: Institution[] = [
  {
    id: "assemblee",
    name: "Assemblée nationale",
    shortName: "Assemblée",
    dbInstitution: "AN",
    memberCount: 577,
    directoryUrl: "/deputes",
    image: "https://savoirs.unistra.fr/fileadmin/upload/Savoirs/Societe/Assemblee_nationale.JPG",
    summary: "L'hémicycle examine les textes de loi et contrôle le gouvernement.",
    color: "from-blue-600",
    details: [
      "577 députés siègent au Palais Bourbon",
      "Examen des projets et propositions de loi",
      "Questions au gouvernement chaque mardi et mercredi",
    ],
  },
  {
    id: "senat",
    name: "Sénat",
    shortName: "Sénat",
    dbInstitution: "Sénat",
    memberCount: 348,
    directoryUrl: "/senateurs",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/S%C3%A9nat_fran%C3%A7ais_Luxembourg.jpg",
    summary: "Le Palais du Luxembourg représente les collectivités territoriales.",
    color: "from-indigo-600",
    details: [
      "348 sénateurs composent la chambre haute",
      "Navette parlementaire sur le projet de loi finances",
    ],
  },
  {
    id: "gouvernement",
    name: "Gouvernement",
    shortName: "Élysée",
    dbInstitution: "Élysée",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/db/Palais_de_l%27%C3%89lys%C3%A9e_2019.jpg",
    summary: "L'exécutif dirige la politique de la nation depuis l'Élysée.",
    color: "from-red-600",
    details: [
      "Le Premier ministre coordonne l'action gouvernementale",
      "Conseil des ministres chaque mercredi à 10h",
    ],
  },
];

// Composant mémorisé pour éviter les re-renders inutiles
const InstitutionCard = memo(({ inst, index, onClick }: { inst: Institution, index: number, onClick: () => void }) => {
  return (
    <motion.button
      key={inst.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
      className="group relative h-[450px] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer text-left w-full border border-border/50"
    >
      {/* Image de fond avec zoom au survol */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
        style={{ backgroundImage: `url(${inst.image})`, opacity: 0.9 }}
      />
      
      {/* Overlay dégradé - PRÉSERVÉ & AMÉLIORÉ */}
      <div className={`absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent group-hover:from-slate-900 group-hover:via-slate-900/20 transition-colors duration-500`} />

      {/* Contenu */}
      <div className="relative z-10 flex flex-col justify-end h-full p-10">
        <div className="bg-blue-500/20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-blue-400/30 group-hover:scale-110 transition-transform">
          <Landmark className="text-blue-400 w-6 h-6" />
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-[10px] opacity-80">Institution</p>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
            <p className="text-white font-black text-[9px] uppercase tracking-widest">En Direct</p>
          </div>
        </div>
        
        <h3 className="text-4xl font-staatliches uppercase tracking-tighter text-white mb-4 group-hover:text-blue-400 transition-colors">
          {inst.name}
        </h3>
        
        <p className="text-white/70 text-sm leading-relaxed mb-8 line-clamp-2 font-medium">
          {inst.summary}
        </p>
        
        <div className="flex items-center gap-3 text-white font-bold text-[10px] uppercase tracking-widest self-start transition-all group-hover:translate-x-2">
          Que se passe-t-il aujourd'hui ? <ChevronRight className="w-4 h-4 text-blue-500" />
        </div>
      </div>
      
      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
    </motion.button>
  );
});

InstitutionCard.displayName = "InstitutionCard";

export default function InstitutionsGrid() {
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedInst) {
      document.body.style.overflow = "hidden";
      fetchTodayEvents(selectedInst);
    } else {
      document.body.style.overflow = "auto";
      setEvents([]);
    }

    // Cleanup function to restore scroll when navigating away
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedInst]);

  const handleNext = () => {
    if (!selectedInst) return;
    const currentIndex = INSTITUTIONS.findIndex(i => i.id === selectedInst.id);
    const nextIndex = (currentIndex + 1) % INSTITUTIONS.length;
    setSelectedInst(INSTITUTIONS[nextIndex]);
  };

  const handlePrev = () => {
    if (!selectedInst) return;
    const currentIndex = INSTITUTIONS.findIndex(i => i.id === selectedInst.id);
    const prevIndex = (currentIndex - 1 + INSTITUTIONS.length) % INSTITUTIONS.length;
    setSelectedInst(INSTITUTIONS[prevIndex]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedInst) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setSelectedInst(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInst]);

  const fetchTodayEvents = async (inst: Institution) => {
    setLoading(true);
    try {
      const allEvents = await api.getCalendarEvents();
      // Use local date in YYYY-MM-DD format (en-CA is standardized for this)
      const today = new Date().toLocaleDateString('en-CA');
      
      console.log(`[InstitutionsGrid] Fetching for ${inst.dbInstitution} on ${today}. Total events available: ${allEvents.length}`);
      const filtered = allEvents.filter(e => 
        e.institution === inst.dbInstitution && 
        e.date === today
      );
      
      setEvents(filtered);
    } catch (err) {
      console.error("Erreur chargement événements institution:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* ── GRILLE PRINCIPALE ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {INSTITUTIONS.map((inst, index) => (
          <InstitutionCard 
            key={inst.id} 
            inst={inst} 
            index={index} 
            onClick={() => setSelectedInst(inst)} 
          />
        ))}
      </div>

      {/* ── MODALE DE DÉTAIL (REDESIGN PREMIUM) ── */}
      <AnimatePresence mode="wait">
        {selectedInst && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto bg-slate-950/40 backdrop-blur-sm">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInst(null)}
              className="fixed inset-0"
            />

            {/* Contenu Modale */}
            <motion.div
              key={selectedInst.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-5xl bg-background rounded-[2.5rem] shadow-2xl border border-border overflow-hidden flex flex-col md:flex-row min-h-[600px]"
            >
              {/* Boutons de Navigation (Flèches) */}
              <div className="absolute inset-y-0 left-4 md:left-8 flex items-center z-50 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  className="pointer-events-auto p-3 rounded-full bg-white/20 text-white hover:bg-amber-500 transition-all backdrop-blur-md border border-white/10 group shadow-xl"
                  title="Précédent"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="absolute inset-y-0 right-4 md:right-8 flex items-center z-50 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="pointer-events-auto p-3 rounded-full bg-white/20 text-white hover:bg-amber-500 transition-all backdrop-blur-md border border-white/10 group shadow-xl"
                  title="Suivant"
                >
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Bouton Fermer */}
              <button
                onClick={() => setSelectedInst(null)}
                className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/20 text-white md:text-slate-900 md:bg-slate-100 hover:bg-amber-500 hover:text-white transition-all backdrop-blur-md border border-black/5 md:border-slate-200 group"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>

              {/* Partie Gauche (Image & Titre Immersif) */}
              <div className="w-full md:w-2/5 relative min-h-[300px] md:min-h-full overflow-hidden">
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${selectedInst.image})` }}
                />
                {/* Image Fade - PRÉSERVÉ */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/10" />
                <div className="absolute inset-0 bg-slate-900/20" />

                <div className="absolute bottom-8 left-8 right-8">
                   <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-xl">
                    <Landmark className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-staatliches uppercase tracking-tighter text-white leading-none">
                    {selectedInst.name}
                  </h3>
                  <div className="h-1 w-20 bg-amber-500 mt-4 rounded-full" />
                </div>
              </div>

              {/* Partie Droite (Contenu Editorial) */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-center bg-background">
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-blue-100 text-blue-700 border border-blue-200 inline-block">
                      Institution Officielle
                    </span>
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-500 font-bold text-[10px] uppercase tracking-widest">En Direct</span>
                  </div>
                  
                  <p className="text-slate-600 text-lg md:text-2xl leading-relaxed font-serif italic text-pretty">
                    &ldquo;{selectedInst.summary}&rdquo;
                  </p>
                </div>

                {/* Section "En Direct" - Style Dashboard Premium */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <CalendarDays size={18} />
                      </div>
                      <p className="text-slate-900 text-sm font-black uppercase tracking-widest">En Direct aujourd'hui</p>
                    </div>
                    <Link 
                      href="/calendrier" 
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2 group/cal"
                    >
                      Voir le calendrier
                      <ChevronRight size={12} className="group-hover/cal:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
                      ))
                    ) : events.length > 0 ? (
                      events.map((event, i) => {
                        const timeMatch = event.title.match(/^\[(\d{2}:\d{2})\]/);
                        const displayTime = timeMatch ? timeMatch[1] : (event.time || 'JOUR');
                        const displayTitle = event.title.replace(/^\[\d{2}:\d{2}\]\s*/, '');

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="flex items-center gap-5 p-4 rounded-2xl bg-card border border-border/50 hover:border-blue-200 hover:shadow-md transition-all group"
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex flex-col items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                               <span className="text-[10px] font-black leading-none mb-1">{displayTime}</span>
                               <Landmark size={14} />
                            </div>
                            <div className="flex-1">
                              <span className="text-slate-900 font-bold text-sm leading-tight block mb-1">
                                {displayTitle}
                              </span>
                              {event.description && (
                                <span className="text-slate-500 text-[11px] line-clamp-1">
                                  {event.description}
                                </span>
                              )}
                            </div>
                            <ChevronRight size={18} className="text-slate-300" />
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="space-y-6">
                        {/* Message "Pas de séance" spécifique */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-5 p-6 rounded-2xl bg-slate-50 border border-slate-200"
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                             <Landmark size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-900 font-bold text-sm">Aucune séance prévue aujourd'hui</p>
                            <p className="text-slate-500 text-xs mt-0.5">Le calendrier de l'institution ne prévoit pas d'activité publique ce jour.</p>
                          </div>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Gros bouton vers le guide de l'institution */}
                          <Link href={`/institutions/${selectedInst.id}`}>
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 group cursor-pointer relative overflow-hidden h-full"
                            >
                              <Landmark className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                              <div className="relative z-10 space-y-4">
                                 <p className="text-blue-200 font-bold uppercase tracking-[0.3em] text-[10px]">Guide Pédagogique</p>
                                 <h4 className="text-2xl font-bold leading-tight">
                                   Comprendre {selectedInst.shortName}
                                 </h4>
                                 <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest pt-2">
                                   Découvrir <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform" />
                                 </div>
                              </div>
                            </motion.div>
                          </Link>

                          {/* Bouton vers le calendrier (alternative quand vide) */}
                          <Link href="/calendrier">
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl shadow-slate-900/20 group cursor-pointer relative overflow-hidden h-full"
                            >
                              <CalendarDays className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                              <div className="relative z-10 space-y-4">
                                 <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Agenda Complet</p>
                                 <h4 className="text-2xl font-bold leading-tight">
                                   Prochaines <br /> Séances
                                 </h4>
                                 <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest pt-2">
                                   Calendrier <ChevronRight size={16} className="group-hover:translate-x-2 transition-transform" />
                                 </div>
                              </div>
                            </motion.div>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer CTA - Conditionally rendered */}
                {selectedInst.directoryUrl && (
                  <div className="mt-10 pt-8 border-t border-border flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-slate-200" />
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-background bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                          +{selectedInst.memberCount}
                        </div>
                    </div>
                    <Link 
                      href={selectedInst.directoryUrl}
                      className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2"
                    >
                        Explorer l'annuaire <ChevronRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
