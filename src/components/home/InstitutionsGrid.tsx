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
    image: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Palais_du_Luxembourg_Paris.jpg",
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            {/* Backdrop flouté */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInst(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
            />

            {/* Contenu Modale */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10"
            >
              {/* Bouton Fermer */}
              <button
                onClick={() => setSelectedInst(null)}
                className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/40 text-white hover:bg-red-500 transition-colors backdrop-blur-md border border-white/20"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col lg:flex-row h-full">
                {/* Image Gauche */}
                <div 
                  className="w-full lg:w-1/2 h-64 lg:h-auto bg-cover bg-center"
                  style={{ backgroundImage: `url(${selectedInst.image})` }}
                >
                  <div className={`w-full h-full bg-gradient-to-t lg:bg-gradient-to-r ${selectedInst.color}/40 to-transparent`} />
                </div>

                {/* Détails Droite */}
                <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                  <span className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-white/10 text-white mb-6 border border-white/10`}>
                    Institution
                  </span>
                  <h3 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                    {selectedInst.name}
                  </h3>
                  <p className="text-white/70 text-lg md:text-xl mb-10 leading-relaxed italic">
                    &ldquo;{selectedInst.summary}&rdquo;
                  </p>

                  <div className="space-y-4">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Aujourd&apos;hui en direct :</p>
                    {selectedInst.details.map((detail, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 text-white/90 font-medium hover:bg-white/10 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${selectedInst.color} to-white shadow-[0_0_8px_rgba(255,255,255,0.5)]`} />
                        {detail}
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
