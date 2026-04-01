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
    }
  };

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-500" />
          <span className="text-sm font-semibold text-foreground">
            Cliquez sur un département pour filtrer
          </span>
        </div>

        {selectedDepartment && (
          <button
            onClick={() => onDepartmentSelect(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Map container */}
      <div 
        className="relative bg-card border border-border rounded-2xl p-4 md:p-6 overflow-hidden transition-all duration-300"
        onMouseLeave={() => setHoveredDept(null)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] via-transparent to-blue-500/[0.03] pointer-events-none rounded-2xl" />

        {/* Tooltip */}
        {displayDept && (
          <div
            className="absolute top-4 right-4 z-20 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl text-sm font-bold animate-in fade-in zoom-in duration-200"
          >
            <span className="text-red-400 mr-1.5 font-mono">{displayDept}</span>
            {getDepartmentName(displayDept)}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="ml-3 text-muted-foreground text-sm">Chargement de la carte...</span>
          </div>
        )}

        {/* SVG Map Container with optimized CSS selectors */}
        <div
          ref={svgContainerRef}
          dangerouslySetInnerHTML={svgContent ? { __html: svgContent } : undefined}
          className={`
            [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[520px] [&_svg]:mx-auto
            [&_path]:cursor-pointer [&_path]:transition-all [&_path]:duration-200 [&_path]:outline-none
            [&_path]:fill-secondary [&_path]:stroke-border [&_path]:stroke-[0.7]
            
            /* Hover effect (Délégation via CSS) */
            hover:[&_path:hover]:fill-red-500 hover:[&_path:hover]:stroke-red-700 hover:[&_path:hover]:stroke-[1.5] hover:[&_path:hover]:scale-[1.03] hover:[&_path:hover]:translate-z-10
            
            /* Logic for selection states via data attributes or dynamic classes */
            ${selectedDepartment ? "[&_path]:opacity-40" : ""}
          `}
          style={{
            // Use inline style for the specific selected path to avoid full re-renders
            // This is much faster than iterating over all paths
          } as any}
        />

        {/* High-performance styling for selected department */}
        {selectedDepartment && (
          <style dangerouslySetInnerHTML={{ __html: `
            path[id="${selectedDepartment}"] {
              fill: #dc2626 !important;
              stroke: #991b1b !important;
              stroke-width: 1.5px !important;
              opacity: 1 !important;
              transform: scale(1.02);
              filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
            }
          `}} />
        )}
      </div>
    </div>
  );
}
