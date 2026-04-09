"use client";

import { useState, useEffect, useRef, memo, useMemo } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { getDepartmentName } from "@/lib/department-mapping";

const SVG_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@svg-maps/france.departments@1.0.1/france.departments.svg";

const DROM_COM_PATHS = [
  { id: "971", name: "Guadeloupe", d: "M35.87,487.13l0.7,7.2l-4.5-1.1l-2,1.7l-5.8-0.6l-1.7-1.2l4.9,0.5l3.2-4.4L35.87,487.13z M104.87,553.63 l-4.4-1.8l-1.9,0.8l0.2,2.1l-1.9,0.3l-2.2,4.9l0.7,2.4l1.7,2.9l3.4,1.2l3.4-0.5l5.3-5l-0.4-2.5L104.87,553.63z M110.27,525.53 l-6.7-2.2l-2.4-4.2l-11.1-2.5l-2.7-5.7l-0.7-7.7l-6.2-4.7l-5.9,5.5l-0.8,2.9l1.2,4.5l3.1,1.2l-1,3.4l-2.6,1.2l-2.5,5.1l-1.9-0.2 l-1,1.9l-4.3-0.7l1.8-0.7l-3.5-3.7l-10.4-4.1l-3.4,1.6l-2.4,4.8l-0.5,3.5l3.1,9.7l0.6,12l6.3,9l0.6,2.7c3-1.2,6-2.5,9.1-3.7l5.9-6.9 l-0.4-8.7l-2.8-5.3l0.2-5.5l3.6,0.2l0.9-1.7l1.4,3.1l6.8,2l13.8-4.9L110.27,525.53z" },
  { id: "972", name: "Martinique", d: "m44.23,433.5l1.4-4.1l-6.2-7.5l0.3-5.8l4.8-4 l4.9-0.9l17,9.9l7,8.8l9.4-5.2l1.8,2.2l-2.8,0.8l0.7,2.6l-2.9,1l-2.2-2.4l-1.9,1.7l0.6,2.5l5.1,1.6l-5.3,4.9l1.6,2.3l4.5-1.5 l-0.8,5.6l3.7,0.2l7.6,19l-1.8,5.5l-4.1,5.1h-2.6l-2-3l3.7-5.7l-4.3,1.7l-2.5-2.5l-2.4,1.2l-6-2.8l-5.5,0.1l-5.4,3.5l-2.4-2.1 l0.2-2.7l-2-2l2.5-4.9l3.4-2.5l4.9,3.4l3.2-1.9l-4.4-4.7l0.2-2.4l-1.8,1.2l-7.2-1.1l-7.6-7L44.23,433.5z" },
  { id: "973", name: "Guyane", d: "m95.2,348.97l-11.7,16.4l0.3,2.4l-7.3,14.9 l-4.4,3.9l-2.6,1.3l-2.3-1.7l-4.4,0.8l0.7-1.8l-10.6-0.3l-4.3,0.8l-4.1,4.1l-9.1-4.4l6.6-11.8l0.3-6l4.2-10.8l-8.3-9.6l-2.7-8 l-0.6-11.4l3.8-7.5l5.9-5.4l1-4l4.2,0.5l-2.3-2l24.7,8.6l9.2,8.8l3.1,0.3l-0.7,1.2l6.1,4l1.4,4.1l-2.4,3.1l2.6-1.6l0.1-5.5l4,3.5 l2.4,7L95.2,348.97z" },
  { id: "974", name: "La Réunion", d: "m41.33,265.3l-6.7-8.5l1.3-6l4.1-2.4l0.7-7.9 l3.3,0.4l7.6-6.1l5.7-0.8l21,4l5,5.3v4.1l7.3,10.1l6.7,4.5l1,3.6l-3.3,7.9l0.9,9.6l-3.4,3.5l-17.3,2.9l-19.6-6.5l-3.8-3.6l-4.7-1.2 l-0.9-2.5l-3.6-2.3L41.33,265.3z" },
  { id: "976", name: "Mayotte", d: "m57.79,157.13l11.32,5.82l-3.24,7.46l-5.66,7.52l5.66,8.37l-4.04,5.7l-5.66,8.01l5.66,4.37l-7.28,4.37l-8.09-2.73l-4.04-5.04v-4.85l-3.24-6.55l7.28,3.88l4.04,1.13v-7.14l-4.85-8.43v-14.8l-8.09-2.61l-3.24-2.67v-5.76l8.9-6.79l7.28,10.19L57.79,157.13z M78.07,164.38l-5.56,3.42l4.81,5.59l3.93-4.79L78.07,164.38z" },
];

interface FranceMapProps {
  selectedDepartment: string | null;
  onDepartmentSelect: (dept: string | null) => void;
}

// Sub-component to isolate SVG rendering and prevent re-parsing
const MemoizedSVG = memo(({ content, selectedDepartment }: { content: string, selectedDepartment: string | null }) => {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: content }}
      className={`
        [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[500px] [&_svg]:mx-auto
        [&_path]:cursor-pointer [&_path]:transition-all [&_path]:duration-150 [&_path]:outline-none
        
        /* Accélération matérielle */
        [&_path]:will-change-[transform,fill]
        
        /* État de base */
        [&_path]:fill-blue-50/50 dark:[&_path]:fill-slate-900 
        [&_path]:stroke-blue-200 dark:[&_path]:stroke-slate-700
        [&_path]:stroke-[1.3]
        [&_path]:[stroke-linejoin:round]
        
        /* Filtre Global (Optimisé) */
        [&_svg]:[filter:drop-shadow(0px_0px_2px_rgba(15,23,42,0.1))]
        dark:[&_svg]:[filter:drop-shadow(0px_0px_2px_rgba(248,250,252,0.1))]
        
        [&_path]:origin-center [&_path]:[transform-box:fill-box]
        
        /* Hover effect (Hardware accelerated) */
        hover:[&_path:hover]:fill-red-500 hover:[&_path:hover]:stroke-red-700 hover:[&_path:hover]:stroke-[2] hover:[&_path:hover]:scale-[1.04] hover:[&_path:hover]:[transform:translate3d(0,0,0)]
        
        /* État de sélection */
        ${selectedDepartment ? "[&_path]:fill-sky-50 dark:[&_path]:fill-sky-950/30 [&_path]:opacity-60 [&_path]:stroke-sky-100 dark:[&_path]:stroke-sky-900" : ""}
      `}
    />
  );
}, (prev, next) => {
  // Only re-render if content changes OR if we go from selection to no-selection (or vice versa)
  // We keep selecting department in dependencies because it affects the global opacity/style of paths
  return prev.content === next.content && prev.selectedDepartment === next.selectedDepartment;
});

export const FranceMap = memo(function FranceMap({
  selectedDepartment,
  onDepartmentSelect,
}: FranceMapProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTextRef = useRef<HTMLSpanElement>(null);
  const tooltipCodeRef = useRef<HTMLSpanElement>(null);

  // Fetch and manipulate SVG
  useEffect(() => {
    fetch(SVG_CDN_URL)
      .then((res) => res.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svgElement = doc.querySelector("svg");

        if (svgElement) {
          // 1. Expand ViewBox (adding space on the left for DROM-COM)
          // Original: 0 0 613 585 -> New: 0 0 740 585
          svgElement.setAttribute("viewBox", "0 0 740 585");

          // 2. Wrap mainland paths in a shifted group
          const mainlandGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
          mainlandGroup.setAttribute("transform", "translate(125, 0)");
          
          // Move all current children (paths) to the group
          while (svgElement.firstChild) {
            mainlandGroup.appendChild(svgElement.firstChild);
          }
          svgElement.appendChild(mainlandGroup);

          // 3. Add Separation Line
          const line = doc.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", "120");
          line.setAttribute("y1", "40");
          line.setAttribute("x2", "120");
          line.setAttribute("y2", "545");
          line.setAttribute("stroke", "currentColor");
          line.setAttribute("stroke-width", "1.5");
          line.setAttribute("opacity", "0.3");
          line.setAttribute("stroke-linecap", "round");
          line.setAttribute("style", "pointer-events: none;");
          svgElement.prepend(line);

          // 4. Add DROM-COM paths
          DROM_COM_PATHS.forEach((drom) => {
            const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("id", drom.id);
            path.setAttribute("name", drom.name);
            path.setAttribute("d", drom.d);
            svgElement.prepend(path);
          });

          // Serialize back to string
          let manipulatedSvg = new XMLSerializer().serializeToString(doc);
          
          // Clean attributes for CSS management
          manipulatedSvg = manipulatedSvg
            .replace(/fill="[^"]*"/g, "")
            .replace(/stroke="[^"]*"/g, "")
            .replace(/stroke-width="[^"]*"/g, "");

          setSvgContent(manipulatedSvg);
        }
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
              : "Cliquez sur un département (Hexagone ou DROM-COM)"}
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

        {/* SVG Map Container with optimized isolation */}
        {svgContent && (
          <MemoizedSVG content={svgContent} selectedDepartment={selectedDepartment} />
        )}

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
});

export default FranceMap;
