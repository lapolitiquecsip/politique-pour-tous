"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
        setSvgContent(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Apply styles and event handlers to each <path> in the SVG
  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return;

    const container = svgContainerRef.current;
    const svg = container.querySelector("svg");
    if (!svg) return;

    // Style the SVG itself
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.maxHeight = "520px";
    svg.style.display = "block";
    svg.style.margin = "0 auto";

    const paths = svg.querySelectorAll("path");
    paths.forEach((path) => {
      const id = path.getAttribute("id");
      if (!id) return;

      // Base styles
      path.style.cursor = "pointer";
      path.style.transition = "all 0.2s ease-out";
      path.style.transformOrigin = "center";
      path.style.transformBox = "fill-box";
      path.style.outline = "none";

      // Apply appearance based on state
      applyPathStyle(path, id, selectedDepartment, null);

      // Events
      path.onmouseenter = () => {
        setHoveredDept(id);
        path.style.transform = "scale(1.06)";
        path.style.fill = "#ef4444";
        path.style.stroke = "#b91c1c";
        path.style.strokeWidth = "1.5";
        path.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.15))";
        path.style.zIndex = "10";
      };

      path.onmouseleave = () => {
        setHoveredDept(null);
        path.style.transform = "scale(1)";
        path.style.filter = "none";
        path.style.zIndex = "1";
        applyPathStyle(path, id, selectedDepartment, null);
      };

      path.onclick = () => {
        onDepartmentSelect(selectedDepartment === id ? null : id);
      };
    });
  }, [svgContent, selectedDepartment, onDepartmentSelect]);

  // Re-apply styles when selected dept changes
  const applyAllStyles = useCallback(() => {
    if (!svgContainerRef.current) return;
    const paths = svgContainerRef.current.querySelectorAll("path");
    paths.forEach((path) => {
      const id = path.getAttribute("id");
      if (!id) return;
      applyPathStyle(path, id, selectedDepartment, hoveredDept);
    });
  }, [selectedDepartment, hoveredDept]);

  useEffect(() => {
    applyAllStyles();
  }, [applyAllStyles]);

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
      <div className="relative bg-card border border-border rounded-2xl p-4 md:p-6 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] via-transparent to-blue-500/[0.03] pointer-events-none rounded-2xl" />

        {/* Tooltip */}
        {displayDept && (
          <div
            className="absolute top-4 right-4 z-20 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl text-sm font-bold animate-in fade-in slide-in-from-top-1 duration-200"
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

        {/* SVG Map */}
        <div
          ref={svgContainerRef}
          dangerouslySetInnerHTML={svgContent ? { __html: svgContent } : undefined}
          className="[&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[520px] [&_svg]:mx-auto"
        />
      </div>
    </div>
  );
}

/**
 * Apply fill/stroke/opacity to a path based on selection state
 */
function applyPathStyle(
  path: SVGPathElement,
  id: string,
  selectedDept: string | null,
  hoveredDept: string | null
) {
  const isSelected = selectedDept === id;
  const isHovered = hoveredDept === id;
  const isOther = selectedDept && !isSelected;

  if (isSelected) {
    path.style.fill = "#dc2626";
    path.style.stroke = "#991b1b";
    path.style.strokeWidth = "1.5";
    path.style.opacity = "1";
  } else if (isHovered) {
    path.style.fill = "#ef4444";
    path.style.stroke = "#b91c1c";
    path.style.strokeWidth = "1.5";
    path.style.opacity = "1";
  } else if (isOther) {
    path.style.fill = "hsl(var(--muted))";
    path.style.stroke = "hsl(var(--border))";
    path.style.strokeWidth = "0.5";
    path.style.opacity = "0.35";
  } else {
    // Default: modern slate/red-ish palette
    path.style.fill = "hsl(var(--secondary))";
    path.style.stroke = "hsl(var(--border))";
    path.style.strokeWidth = "0.7";
    path.style.opacity = "1";
  }
}
