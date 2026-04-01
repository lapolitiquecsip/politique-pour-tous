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
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTextRef = useRef<HTMLSpanElement>(null);
  const tooltipCodeRef = useRef<HTMLSpanElement>(null);

  // Fetch the real SVG from CDN
  useEffect(() => {
    fetch(SVG_CDN_URL)
      .then((res) => res.text())
      .then((text) => {
        const cleanedText = text
          .replace(/fill="[^"]*"/g, "")
          .replace(/stroke="[^"]*"/g, "")
          .replace(/stroke-width="[^"]*"/g, "");
        setSvgContent(cleanedText);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Update tooltip NATIVELY (Direct DOM) for 60fps performance
  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target.tagName === "path") {
      const id = target.getAttribute("id");
      if (id && tooltipRef.current && tooltipTextRef.current && tooltipCodeRef.current) {
        tooltipCodeRef.current.innerText = id;
        tooltipTextRef.current.innerText = getDepartmentName(id);
        tooltipRef.current.style.opacity = "1";
        tooltipRef.current.style.transform = "scale(1)";
      }
    }
  };

  const handleMouseOut = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = "0";
      tooltipRef.current.style.transform = "scale(0.95)";
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseOut}
        onClick={handleClick}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.05] via-transparent to-red-500/[0.02] pointer-events-none rounded-2xl" />

        {/* Tooltip - Géré en DOM direct pour la fluidité */}
        <div
          ref={tooltipRef}
          style={{ opacity: 0, transition: "all 0.1s ease-out", transform: "scale(0.95)" }}
          className="absolute top-6 right-6 z-20 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-bold pointer-events-none flex flex-col min-w-[140px]"
        >
          <span ref={tooltipCodeRef} className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">...</span>
          <span ref={tooltipTextRef} className="text-base text-nowrap">Survolez la carte</span>
        </div>

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
            [&_path]:cursor-pointer [&_path]:transition-all [&_path]:duration-150 [&_path]:outline-none
            
            /* État de base */
            [&_path]:fill-blue-50/50 dark:[&_path]:fill-slate-900 
            [&_path]:stroke-blue-200 dark:[&_path]:stroke-slate-700
            [&_path]:stroke-[1.3]
            [&_path]:[stroke-linejoin:round]
            
            /* Filtre Global */
            [&_svg]:[filter:drop-shadow(0px_0px_1px_#0f172a)_drop-shadow(0px_0px_1px_#0f172a)]
            dark:[&_svg]:[filter:drop-shadow(0px_0px_1px_#f8fafc)_drop-shadow(0px_0px_1px_#f8fafc)]
            
            [&_path]:origin-center [&_path]:[transform-box:fill-box]
            
            /* Hover effect (Géré 100% en CSS pour 0 latence) */
            hover:[&_path:hover]:fill-red-500 hover:[&_path:hover]:stroke-red-700 hover:[&_path:hover]:stroke-[2] hover:[&_path:hover]:scale-[1.04] hover:[&_path:hover]:translate-z-10
            
            /* État de sélection */
            ${selectedDepartment ? "[&_path]:fill-sky-50 dark:[&_path]:fill-sky-950/30 [&_path]:opacity-60 [&_path]:stroke-sky-100 dark:[&_path]:stroke-sky-900" : ""}
          `}
        />

        {/* High-performance selection style */}
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
