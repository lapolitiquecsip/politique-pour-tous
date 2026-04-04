"use client";
import { useState, useEffect } from "react";
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

export default function InstitutionsGrid() {
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);

  // Prevent scroll when modal is open
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {INSTITUTIONS.map((inst, index) => (
          <motion.button
            key={inst.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedInst(inst)}
            className="group relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer text-left"
          >
            {/* Image de fond avec zoom au survol */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${inst.image})` }}
            />
            {/* Overlay dégradé */}
            <div className={`absolute inset-0 bg-gradient-to-t ${inst.color}/80 via-slate-900/40 to-transparent group-hover:via-slate-900/20 transition-colors duration-500`} />

            {/* Contenu */}
            <div className="relative z-10 flex flex-col justify-end h-full p-8">
              <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/30 group-hover:scale-110 transition-transform">
                <Landmark className="text-white w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">
                {inst.name}
              </h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6 line-clamp-2">
                {inst.summary}
              </p>
              <div className="flex items-center gap-2 text-white font-bold text-sm bg-white/20 backdrop-blur-md self-start px-5 py-2 rounded-full border border-white/30 group-hover:bg-white group-hover:text-slate-900 transition-all">
                Voir le détail <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* ── MODALE DE DÉTAIL ── */}
      <AnimatePresence>
        {selectedInst && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-8 overflow-y-auto scrollbar-hide">
            {/* Backdrop flouté */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInst(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl"
            />

            {/* Contenu Modale */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-[#0F172A] rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col overflow-visible my-8"
            >
              {/* Bouton Fermer Principal (Standard et ultra-visible) */}
              <button
                onClick={() => setSelectedInst(null)}
                className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 text-white hover:bg-red-500 transition-all backdrop-blur-md border border-white/20 group"
              >
                <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Fermer</span>
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>

              {/* Partie Haute (Bannière Immersive) */}
              <div className="w-full h-64 md:h-[400px] shrink-0 relative">
                <div 
                  className="w-full h-full bg-cover bg-center shadow-inner"
                  style={{ backgroundImage: `url(${selectedInst.image})` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent`} />
                  <div className={`absolute inset-0 bg-gradient-to-r from-[#0F172A]/40 to-transparent`} />
                </div>
                
                {/* Overlay Text on Image */}
                <div className="absolute bottom-8 left-8 md:left-12">
                   <div className={`w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md mb-4`}>
                    <Landmark className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter">
                    {selectedInst.name}
                  </h3>
                </div>
              </div>

              {/* Partie Basse (Contenu avec Scroll Naturel) */}
              <div className="w-full p-8 md:p-12 md:pt-8 flex flex-col overflow-visible">
                <div className="flex items-center gap-3 mb-8">
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 text-white border border-white/10">
                    Institution Officielle
                  </span>
                </div>

                <div className="mb-12">
                  <p className="text-blue-200/80 text-lg md:text-xl leading-relaxed italic border-l-2 border-blue-500/50 pl-6">
                    &ldquo;{selectedInst.summary}&rdquo;
                  </p>
                </div>

                {/* Section "En Direct" - Plus de scrollbar interne, tout est fluide */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="h-px flex-1 bg-white/10" />
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">✨ En direct du site :</p>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedInst.details.map((detail, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-3xl p-6 text-white/90 font-medium hover:bg-white/10 transition-all group"
                      >
                        <div className={`mt-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] group-hover:scale-125 transition-transform`} />
                        <span className="leading-relaxed">{detail}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
