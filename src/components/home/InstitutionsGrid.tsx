"use client";
import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Landmark } from "lucide-react";

interface Institution {
  id: string;
  name: string;
  shortName: string;
  image: string;
  summary: string;
  details: string[];
  color: string;
}

const INSTITUTIONS: Institution[] = [
  {
    id: "assemblee",
    name: "Assemblée nationale",
    shortName: "Assemblée",
    image: "https://savoirs.unistra.fr/fileadmin/upload/Savoirs/Societe/Assemblee_nationale.JPG",
    summary: "L'hémicycle examine les textes de loi et contrôle le gouvernement.",
    color: "from-blue-600",
    details: [
      "577 députés siègent au Palais Bourbon",
      "Examen des projets et propositions de loi",
      "Questions au gouvernement chaque mardi et mercredi",
      "Commission des finances en séance aujourd'hui",
    ],
  },
  {
    id: "senat",
    name: "Sénat",
    shortName: "Sénat",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/S%C3%A9nat_fran%C3%A7ais_Luxembourg.jpg",
    summary: "Le Palais du Luxembourg représente les collectivités territoriales.",
    color: "from-indigo-600",
    details: [
      "348 sénateurs composent la chambre haute",
      "Navette parlementaire sur le projet de loi finances",
      "Commission des affaires étrangères en audition",
      "Débat sur la décentralisation prévu cette semaine",
    ],
  },
  {
    id: "gouvernement",
    name: "Gouvernement",
    shortName: "Élysée",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/db/Palais_de_l%27%C3%89lys%C3%A9e_2019.jpg",
    summary: "L'exécutif dirige la politique de la nation depuis l'Élysée.",
    color: "from-red-600",
    details: [
      "Le Premier ministre coordonne l'action gouvernementale",
      "Conseil des ministres chaque mercredi à 10h",
      "Arbitrages budgétaires en cours pour le PLF 2027",
      "Déplacement présidentiel prévu en région cette semaine",
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
        <div className="bg-amber-500/20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-amber-400/30 group-hover:scale-110 transition-transform">
          <Landmark className="text-amber-400 w-6 h-6" />
        </div>
        
        <p className="text-amber-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-2 opacity-80">Institution</p>
        
        <h3 className="text-4xl font-staatliches uppercase tracking-tighter text-white mb-4 group-hover:text-amber-400 transition-colors">
          {inst.name}
        </h3>
        
        <p className="text-white/70 text-sm leading-relaxed mb-8 line-clamp-2 font-medium">
          {inst.summary}
        </p>
        
        <div className="flex items-center gap-3 text-white font-bold text-xs self-start transition-all group-hover:translate-x-2">
          DÉCOUVRIR L'INSTITUTION <ChevronRight className="w-4 h-4 text-amber-500" />
        </div>
      </div>
      
      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
    </motion.button>
  );
});

InstitutionCard.displayName = "InstitutionCard";

export default function InstitutionsGrid() {
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);

  useEffect(() => {
    if (selectedInst) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [selectedInst]);

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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-5xl bg-background rounded-[2.5rem] shadow-2xl border border-border overflow-hidden flex flex-col md:flex-row min-h-[600px]"
            >
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
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-amber-100 text-amber-700 border border-amber-200 mb-6 inline-block">
                    Institution Officielle
                  </span>
                  <p className="text-slate-600 text-lg md:text-2xl leading-relaxed font-serif italic text-pretty">
                    &ldquo;{selectedInst.summary}&rdquo;
                  </p>
                </div>

                {/* Section "En Direct" - Style Dashboard Premium */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Missions & Actualités</p>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {selectedInst.details.map((detail, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex items-center gap-5 p-4 rounded-2xl bg-card border border-border/50 hover:border-amber-200 hover:shadow-md transition-all group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                           <ChevronRight size={18} />
                        </div>
                        <span className="text-slate-700 font-semibold text-sm leading-tight group-hover:text-slate-900 transition-colors">
                          {detail}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="mt-10 pt-8 border-t border-border flex items-center justify-between">
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-slate-200" />
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-background bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">
                        +577
                      </div>
                   </div>
                   <button className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-2">
                      Explorer l'annuaire <ChevronRight size={14} />
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
