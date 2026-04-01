"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { getDepartmentName } from "@/lib/department-mapping";

const SVG_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@svg-maps/france.departments@1.0.1/france.departments.svg";

interface FranceMapProps {
  selectedDepartment: string | null;
  onDepartmentSelect: (dept: string | null) => void;
}

export default function FranceMap({
  selectedDepartment,
  onDepartmentSelect,
}: FranceMapProps) {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const displayDept = hoveredDept || selectedDepartment;

  // Fetch the real SVG from CDN
  useEffect(() => {
    fetch(SVG_CDN_URL)
      .then((res) => res.text())
      .then((text) => {
        // We clean the SVG string to remove hardcoded fills and allow CSS control
        const cleanedText = text
          .replace(/fill="[^"]*"/g, "")
          .replace(/stroke="[^"]*"/g, "")
          .replace(/stroke-width="[^"]*"/g, "");
        setSvgContent(cleanedText);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Use event delegation instead of attaching 100+ listeners
  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target.tagName === "path") {
      const id = target.getAttribute("id");
      if (id && id !== hoveredDept) {
        setHoveredDept(id);
      }
    } else {
      setHoveredDept(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target.tagName === "path") {
      const id = target.getAttribute("id");
      if (id) {
        onDepartmentSelect(selectedDepartment === id ? null : id);
      }
    } else {
      // Clic dans le vide de l'SVG : on réinitialise
      onDepartmentSelect(null);
    }
  };

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-500" />
          <span className="text-sm font-semibold text-foreground">
            {selectedDepartment 
              ? "Cliquez sur un autre département ou réinitialisez" 
              : "Cliquez sur un département pour filtrer"}
          </span>
        </div>

        {selectedDepartment && (
          <button
            onClick={() => onDepartmentSelect(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            Voir toute la France
          </button>
        )}
      </div>

      {/* Map container */}
      <div 
        className="relative bg-card border border-border rounded-2xl p-4 md:p-8 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
        onMouseLeave={() => setHoveredDept(null)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.05] via-transparent to-red-500/[0.02] pointer-events-none rounded-2xl" />

        {/* Tooltip */}
        {displayDept && (
          <div
            className="absolute top-6 right-6 z-20 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-bold animate-in fade-in zoom-in duration-200 pointer-events-none flex flex-col"
          >
            <span className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">Département {displayDept}</span>
            <span className="text-base">{getDepartmentName(displayDept)}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="ml-3 text-muted-foreground text-sm">Géographie en cours...</span>
          </div>
        )}

        {/* SVG Map Container with optimized CSS selectors */}
        <div
          ref={svgContainerRef}
          dangerouslySetInnerHTML={svgContent ? { __html: svgContent } : undefined}
          className={`
            [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[500px] [&_svg]:mx-auto
            [&_path]:cursor-pointer [&_path]:transition-all [&_path]:duration-300 [&_path]:outline-none
            
            /* État de base (Légèrement bleuté pour plus de modernité) */
            [&_path]:fill-slate-100/80 dark:[&_path]:fill-slate-900 
            [&_path]:stroke-blue-200 dark:[&_path]:stroke-slate-700
            [&_path]:stroke-[1.3]
            [&_path]:[stroke-linejoin:round]
            
            /* Filtre pour créer le contour GLOBAL de la France */
            [&_svg]:[filter:drop-shadow(0px_0px_1px_#0f172a)_drop-shadow(0px_0px_1px_#0f172a)]
            dark:[&_svg]:[filter:drop-shadow(0px_0px_1px_#f8fafc)_drop-shadow(0px_0px_1px_#f8fafc)]
            
            [&_path]:origin-center [&_path]:[transform-box:fill-box]
            
            /* Hover effect */
            hover:[&_path:hover]:fill-red-500 hover:[&_path:hover]:stroke-red-700 hover:[&_path:hover]:stroke-[2] hover:[&_path:hover]:scale-[1.04] hover:[&_path:hover]:translate-z-10
            
            /* État quand un département est sélectionné (on passe en bleu clair) */
            ${selectedDepartment ? "[&_path]:fill-sky-100 dark:[&_path]:fill-sky-950/40 [&_path]:opacity-60 [&_path]:stroke-sky-200 dark:[&_path]:stroke-sky-900" : ""}
          `}
        />

        {/* High-performance styling for selected department */}
        {selectedDepartment && (
          <style dangerouslySetInnerHTML={{ __html: `
            path[id="${selectedDepartment}"] {
              fill: #ef4444 !important;
              stroke: #991b1b !important;
              stroke-width: 2.5px !important;
              opacity: 1 !important;
              transform: scale(1.06);
              transform-origin: center;
              transform-box: fill-box;
              filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.6)) !important;
              z-index: 50;
            }
          `}} />
        )}
      </div>
    </div>
  );
}
