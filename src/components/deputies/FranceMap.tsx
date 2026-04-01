"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { getDepartmentName } from "@/lib/department-mapping";

/**
 * Simplified SVG paths for French departments.
 * Each path uses approximate coordinates for a 600x560 viewBox.
 * The paths are simplified polygons for performance and aesthetics.
 */
const DEPARTMENT_PATHS: Record<string, string> = {
  // Nord - Pas-de-Calais region
  "59": "M330,20 L355,15 L380,20 L390,40 L385,60 L365,65 L345,70 L330,55 L320,40 Z",
  "62": "M290,25 L330,20 L320,40 L330,55 L310,60 L285,55 L275,40 Z",
  // Picardie
  "80": "M285,55 L310,60 L330,55 L345,70 L340,90 L310,95 L285,85 L275,70 Z",
  "02": "M340,90 L345,70 L365,65 L385,75 L380,95 L360,100 L345,95 Z",
  "60": "M285,85 L310,95 L340,90 L345,95 L330,110 L305,115 L280,105 Z",
  // Haute-France / Champagne
  "08": "M380,95 L385,75 L400,70 L420,80 L415,100 L395,105 Z",
  // Normandie
  "76": "M230,65 L260,55 L275,70 L285,85 L280,105 L255,100 L235,90 L225,75 Z",
  "27": "M235,90 L255,100 L280,105 L275,120 L250,125 L230,115 Z",
  "14": "M175,80 L205,70 L230,75 L235,90 L230,115 L200,110 L180,100 Z",
  "61": "M180,100 L200,110 L230,115 L225,135 L200,140 L180,130 Z",
  "50": "M140,70 L165,65 L175,80 L180,100 L170,115 L150,110 L135,95 Z",
  // Île-de-France
  "95": "M280,105 L305,115 L310,125 L295,130 L280,125 Z",
  "78": "M255,115 L275,120 L280,125 L295,130 L290,140 L265,140 L250,130 Z",
  "91": "M265,140 L290,140 L295,150 L285,160 L260,155 Z",
  "77": "M295,130 L310,125 L330,110 L345,115 L345,140 L330,155 L305,155 L295,150 L290,140 Z",
  "75": "M282,128 L292,126 L295,132 L290,136 L282,134 Z",
  "92": "M275,125 L282,128 L282,134 L275,135 Z",
  "93": "M292,126 L300,125 L300,132 L295,132 Z",
  "94": "M282,134 L295,132 L300,140 L290,140 L285,138 Z",
  // Bretagne
  "22": "M95,100 L125,95 L140,105 L135,120 L110,125 L90,115 Z",
  "29": "M45,100 L75,90 L95,100 L90,115 L70,125 L45,120 L35,110 Z",
  "35": "M125,95 L150,100 L170,115 L165,135 L140,140 L120,130 L110,125 L135,120 L140,105 Z",
  "56": "M70,125 L90,115 L110,125 L120,130 L115,145 L90,150 L70,140 Z",
  // Pays de la Loire
  "53": "M140,140 L165,135 L180,130 L185,145 L170,155 L150,155 Z",
  "44": "M115,145 L140,140 L150,155 L145,170 L120,175 L105,165 Z",
  "49": "M150,155 L170,155 L185,165 L180,180 L160,185 L145,178 L145,170 Z",
  "72": "M185,145 L200,140 L225,135 L230,150 L220,165 L200,170 L185,165 L170,155 Z",
  "85": "M105,165 L120,175 L130,190 L120,210 L100,205 L90,185 Z",
  // Centre-Val de Loire
  "28": "M250,125 L255,115 L230,115 L225,135 L230,150 L255,145 L260,135 Z",
  "45": "M255,145 L230,150 L235,170 L260,175 L280,165 L285,160 L260,155 L265,140 Z",
  "41": "M220,165 L235,170 L260,175 L255,195 L230,195 L215,185 Z",
  "37": "M200,170 L220,165 L215,185 L230,195 L220,210 L200,205 L190,190 Z",
  "36": "M230,195 L255,195 L260,215 L245,225 L225,220 L220,210 Z",
  "18": "M260,175 L280,165 L295,175 L300,195 L285,210 L260,215 L255,195 Z",
  // Champagne-Ardenne
  "51": "M330,110 L345,95 L360,100 L380,95 L395,105 L385,125 L365,130 L345,125 L345,115 Z",
  "10": "M305,155 L330,155 L345,140 L345,125 L365,130 L360,155 L340,170 L315,165 Z",
  "52": "M360,155 L365,130 L385,125 L400,135 L395,165 L375,175 L365,170 Z",
  // Lorraine
  "54": "M400,135 L385,125 L395,105 L415,100 L435,110 L440,135 L420,140 Z",
  "55": "M395,105 L415,100 L420,80 L440,90 L445,105 L435,110 Z",
  "57": "M440,90 L420,80 L435,60 L465,55 L475,75 L465,95 L445,105 Z",
  "88": "M420,140 L440,135 L460,140 L455,165 L435,170 L415,165 Z",
  // Alsace
  "67": "M465,95 L475,75 L490,80 L495,105 L480,120 L465,115 Z",
  "68": "M465,115 L480,120 L490,135 L480,155 L460,150 L460,140 Z",
  // Franche-Comté
  "70": "M395,165 L415,165 L435,170 L430,190 L410,195 L395,185 Z",
  "25": "M410,195 L430,190 L450,195 L445,215 L425,220 L410,210 Z",
  "39": "M375,175 L395,165 L395,185 L410,195 L410,210 L395,215 L380,200 Z",
  "90": "M455,165 L460,150 L475,155 L470,170 L460,175 Z",
  // Bourgogne
  "89": "M305,155 L315,165 L340,170 L335,190 L310,195 L295,185 L295,175 L280,165 L285,160 Z",
  "58": "M295,185 L310,195 L315,215 L300,230 L280,225 L275,210 Z",
  "21": "M340,170 L360,155 L365,170 L375,175 L380,200 L365,210 L345,205 L335,190 Z",
  "71": "M345,205 L365,210 L380,200 L395,215 L390,235 L370,240 L350,230 L340,215 Z",
  // Auvergne
  "03": "M275,210 L300,230 L315,215 L310,195 L295,185 L280,225 L295,240 L310,240 L315,225 L325,235 L310,255 L290,255 L275,245 Z",
  "63": "M275,245 L290,255 L310,255 L305,275 L285,285 L270,275 L265,260 Z",
  "43": "M305,275 L310,255 L325,260 L340,270 L335,290 L315,295 L305,285 Z",
  "15": "M265,260 L285,285 L280,305 L260,305 L250,290 L255,275 Z",
  // Rhône-Alpes
  "69": "M350,230 L370,240 L375,255 L360,260 L345,250 L340,235 Z",
  "42": "M325,235 L340,235 L345,250 L360,260 L340,270 L325,260 L310,255 Z",
  "01": "M375,255 L390,235 L395,215 L410,210 L425,220 L420,240 L400,250 L385,260 Z",
  "38": "M385,260 L400,250 L420,255 L425,280 L410,295 L390,290 L380,275 Z",
  "73": "M420,255 L440,250 L455,265 L445,285 L425,280 Z",
  "74": "M420,240 L440,235 L460,240 L455,265 L440,250 L420,255 Z",
  "26": "M360,260 L375,255 L385,260 L380,275 L390,290 L375,305 L355,300 L345,285 L340,270 Z",
  "07": "M335,290 L345,285 L355,300 L345,320 L330,325 L320,310 Z",
  // Limousin
  "87": "M215,185 L230,195 L245,225 L240,240 L220,240 L210,225 L205,205 Z",
  "23": "M240,240 L245,225 L260,215 L275,210 L275,245 L265,260 L250,255 Z",
  "19": "M220,240 L240,240 L250,255 L245,275 L225,280 L210,265 Z",
  // Poitou-Charentes
  "86": "M185,165 L200,170 L200,205 L215,185 L210,225 L195,230 L180,215 L175,195 Z",
  "79": "M145,178 L160,185 L180,180 L185,165 L175,195 L160,200 L140,195 Z",
  "17": "M120,210 L130,190 L140,195 L160,200 L155,220 L140,235 L120,230 Z",
  "16": "M155,220 L175,195 L180,215 L195,230 L190,250 L170,255 L155,245 Z",
  // Aquitaine
  "33": "M120,230 L140,235 L155,245 L150,270 L135,290 L115,280 L110,255 Z",
  "24": "M170,255 L190,250 L210,265 L205,285 L185,295 L170,285 Z",
  "47": "M150,270 L170,285 L185,295 L175,315 L155,310 L140,300 L135,290 Z",
  "40": "M110,255 L115,280 L135,290 L140,300 L130,325 L110,335 L95,315 L90,290 Z",
  "64": "M95,315 L110,335 L130,325 L140,340 L125,355 L105,350 L90,340 Z",
  // Midi-Pyrénées
  "82": "M175,315 L185,295 L205,285 L210,300 L200,320 Z",
  "32": "M140,300 L155,310 L175,315 L200,320 L190,340 L165,345 L145,340 L140,325 Z",
  "65": "M125,355 L140,340 L145,340 L165,345 L160,365 L140,370 L125,365 Z",
  "31": "M165,345 L190,340 L210,350 L225,345 L225,365 L200,375 L185,375 L160,365 Z",
  "09": "M185,375 L200,375 L225,365 L230,380 L215,395 L195,395 L180,385 Z",
  "81": "M225,345 L245,330 L265,340 L260,360 L240,365 L225,365 Z",
  "12": "M245,275 L265,260 L285,285 L280,305 L265,315 L250,310 L240,295 Z",
  "46": "M225,280 L245,275 L240,295 L250,310 L235,320 L215,310 L210,300 L205,285 Z",
  // Languedoc-Roussillon
  "48": "M305,285 L305,275 L285,285 L280,305 L290,315 L310,310 Z",
  "30": "M310,310 L330,325 L345,320 L355,335 L335,345 L315,340 L305,330 Z",
  "34": "M280,340 L305,330 L315,340 L335,345 L325,360 L300,365 L280,355 Z",
  "11": "M240,365 L260,360 L280,355 L280,375 L260,385 L240,380 Z",
  "66": "M230,380 L240,380 L260,385 L250,400 L230,400 L220,395 Z",
  // Provence-Alpes-Côte d'Azur
  "84": "M355,300 L375,305 L385,320 L375,335 L355,335 L345,320 Z",
  "13": "M335,345 L355,335 L375,335 L380,350 L365,365 L345,360 L325,360 Z",
  "83": "M380,350 L400,340 L425,345 L430,365 L410,375 L390,370 L365,365 Z",
  "04": "M390,290 L410,295 L420,310 L410,325 L390,320 L385,320 L375,305 Z",
  "05": "M410,295 L425,280 L445,285 L445,310 L430,315 L420,310 Z",
  "06": "M425,345 L445,335 L465,330 L470,350 L455,365 L430,365 Z",
  // Corse
  "2A": "M505,385 L515,370 L520,385 L515,405 L505,410 L500,400 Z",
  "2B": "M510,345 L525,340 L530,360 L520,385 L515,370 L505,365 L505,355 Z",
};

interface FranceMapProps {
  selectedDepartment: string | null;
  onDepartmentSelect: (dept: string | null) => void;
}

export default function FranceMap({
  selectedDepartment,
  onDepartmentSelect,
}: FranceMapProps) {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  const displayDept = hoveredDept || selectedDepartment;

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Cliquez sur un département pour filtrer
          </span>
        </div>

        {selectedDepartment && (
          <button
            onClick={() => onDepartmentSelect(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Map container */}
      <div className="relative bg-card border border-border rounded-2xl p-4 md:p-6 overflow-hidden group">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        {/* Tooltip */}
        {displayDept && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 z-10 bg-foreground text-background px-4 py-2 rounded-xl shadow-lg text-sm font-semibold"
          >
            <span className="text-muted-foreground/70 mr-1">{displayDept}</span>
            {getDepartmentName(displayDept)}
          </motion.div>
        )}

        {/* SVG Map */}
        <svg
          viewBox="20 0 520 420"
          className="w-full h-auto max-h-[500px] mx-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Object.entries(DEPARTMENT_PATHS).map(([code, path]) => {
            const isSelected = selectedDepartment === code;
            const isHovered = hoveredDept === code;
            const isActive = isSelected || isHovered;
            const isOther = selectedDepartment && !isSelected;

            return (
              <motion.path
                key={code}
                d={path}
                onClick={() =>
                  onDepartmentSelect(selectedDepartment === code ? null : code)
                }
                onMouseEnter={() => setHoveredDept(code)}
                onMouseLeave={() => setHoveredDept(null)}
                className="cursor-pointer outline-none"
                fill={
                  isSelected
                    ? "hsl(var(--accent))"
                    : isHovered
                    ? "hsl(var(--primary))"
                    : isOther
                    ? "hsl(var(--muted))"
                    : "hsl(var(--secondary))"
                }
                stroke="hsl(var(--border))"
                strokeWidth={isActive ? 2 : 1}
                initial={false}
                animate={{
                  scale: isActive ? 1.06 : 1,
                  opacity: isOther ? 0.4 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
                whileHover={{ scale: 1.08 }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
