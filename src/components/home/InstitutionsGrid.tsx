"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
/* Force Update - Institutional Photos v3 */
import { ArrowLeft, ChevronRight } from "lucide-react";

interface Institution {
  id: string;
  name: string;
  shortName: string;
  image: string;
  summary: string;
  details: string[];
}

const INSTITUTIONS: Institution[] = [
  {
    id: "assemblee",
    name: "Assemblée nationale",
    shortName: "Assemblée",
    image: "https://savoirs.unistra.fr/fileadmin/upload/Savoirs/Societe/Assemblee_nationale.JPG",
    summary: "L'hémicycle examine les textes de loi et contrôle le gouvernement.",
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
    details: [
      "Le Premier ministre coordonne l'action gouvernementale",
      "Conseil des ministres chaque mercredi à 10h",
      "Arbitrages budgétaires en cours pour le PLF 2027",
      "Déplacement présidentiel prévu en région cette semaine",
    ],
  },
];

export default function InstitutionsGrid() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {expanded ? (
          /* ── VUE DÉTAILLÉE (une institution agrandie) ── */
          <motion.div
            key={`expanded-${expanded}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {(() => {
              const inst = INSTITUTIONS.find((i) => i.id === expanded)!;
              return (
                <div
                  className="relative w-full min-h-[420px] rounded-3xl overflow-hidden shadow-xl"
                  style={{
                    backgroundImage: `url(${inst.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/40" />

                  {/* Contenu */}
                  <div className="relative z-10 flex flex-col justify-between h-full min-h-[420px] p-8 md:p-12">
                    <div>
                      <button
                        onClick={() => setExpanded(null)}
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-6 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux institutions
                      </button>
                      <h3 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                        {inst.name}
                      </h3>
                      <p className="text-white/80 text-lg max-w-xl mb-8">
                        {inst.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inst.details.map((detail, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.1 }}
                          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 text-white font-medium"
                        >
                          {detail}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Mini-vignettes des autres institutions */}
            <div className="flex gap-4 mt-4">
              {INSTITUTIONS.filter((i) => i.id !== expanded).map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setExpanded(inst.id)}
                  className="flex-1 relative h-20 rounded-2xl overflow-hidden group cursor-pointer"
                  style={{
                    backgroundImage: `url(${inst.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-slate-900/60 group-hover:bg-slate-900/40 transition-colors" />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-white font-bold text-sm">{inst.shortName}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── VUE 3 COLONNES (par défaut) ── */
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {INSTITUTIONS.map((inst, index) => (
              <motion.button
                key={inst.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => setExpanded(inst.id)}
                className="group relative h-72 md:h-80 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow cursor-pointer text-left"
                style={{
                  backgroundImage: `url(${inst.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/20 group-hover:from-slate-900/70 transition-colors duration-300" />

                {/* Contenu carte */}
                <div className="relative z-10 flex flex-col justify-end h-full p-6">
                  <h3 className="text-2xl font-extrabold text-white mb-2 group-hover:translate-x-1 transition-transform">
                    {inst.name}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed mb-4">
                    {inst.summary}
                  </p>
                  <span className="inline-flex items-center gap-1 text-white/90 text-sm font-semibold group-hover:gap-2 transition-all">
                    Voir le détail <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
