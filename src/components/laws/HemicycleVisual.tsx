"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GroupResult {
  group_id: string;
  pour: number;
  contre: number;
  abstention: number;
  total: number;
}

interface HemicycleVisualProps {
  groups: GroupResult[];
}

const LEGISLATURE_TOTALS: any = {
  "PO845485": 17, // GDR (Gauche)
  "PO845407": 72, // LFI
  "PO845470": 38, // ÉCO
  "PO845413": 66, // SOC (PS)
  "PO845514": 21, // LIOT (Centre)
  "PO845401": 99, // EPR (Macronistes)
  "PO845439": 36, // DEM
  "PO845454": 31, // HOR
  "PO845425": 47, // DR (Droite)
  "PO872880": 16, // UDR (Alliés RN)
  "PO845419": 126, // RN (Extrême Droite)
  "NI": 8,        // Non Inscrits
};

const GROUP_ORDER = [
  "PO845485", "PO845407", "PO845470", "PO845413", "PO845514", 
  "PO845401", "PO845439", "PO845454", "PO845425", "PO872880", 
  "PO845419", "NI"
];

const GROUP_MAPPING: any = {
  "PO845419": { name: "Rassemblement National", short: "RN", color: "#0D2149" },
  "PO845401": { name: "Ensemble pour la République", short: "EPR", color: "#FFD600" },
  "PO845407": { name: "La France Insoumise - NFP", short: "LFI-NFP", color: "#CC2443" },
  "PO845413": { name: "Socialistes et apparentés (PS)", short: "SOC", color: "#E1001A" },
  "PO845425": { name: "Droite Républicaine", short: "DR", color: "#0066CC" },
  "PO845439": { name: "Les Démocrates", short: "DEM", color: "#FF9900" },
  "PO845454": { name: "Horizons et apparentés", short: "HOR", color: "#00A0E2" },
  "PO845470": { name: "Écologiste et Social", short: "ÉCO", color: "#00B050" },
  "PO845485": { name: "Gauche Démocrate et Républicaine", short: "GDR", color: "#DD0000" },
  "PO845514": { name: "Libertés, Indépendants, Outre-mer et Territoires", short: "LIOT", color: "#F5B000" },
  "PO872880": { name: "Union des Droites pour la République", short: "UDR", color: "#004792" },
  "NI": { name: "Non inscrits", short: "NI", color: "#94a3b8" },
};

export default function HemicycleVisual({ groups }: HemicycleVisualProps) {
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const seats = useMemo(() => {
    const totalPhysicalSeats = 650;
    const rows = 12;
    const result: any[] = [];
    
    for (let row = 0; row < rows; row++) {
      const radius = 100 + row * 12;
      const seatsInRow = Math.floor(radius * Math.PI / 11);
      const angleStep = Math.PI / (seatsInRow - 1);
      
      for (let i = 0; i < seatsInRow; i++) {
        const angle = Math.PI + i * angleStep;
        result.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          radius: 3.2,
        });
      }
    }

    // CRITICAL: Sort by Angle FIRST to create "sectors" (Vertical slices)
    // This keeps LFI on the left, PS in the middle-left, RN on the right.
    const sortedSeats = result.sort((a, b) => {
      const angleA = Math.atan2(a.y, a.x);
      const angleB = Math.atan2(b.y, b.x);
      
      if (Math.abs(angleA - angleB) > 0.01) return angleA - angleB;
      
      const distA = Math.sqrt(a.x * a.x + a.y * a.y);
      const distB = Math.sqrt(b.x * b.x + b.y * b.y);
      return distA - distB;
    });

    let currentSeatIdx = 0;
    const finalSeats: any[] = [];

    GROUP_ORDER.forEach((id, groupIdx) => {
      const g = groups.find(item => item.group_id === id) || { group_id: id, pour: 0, contre: 0, abstention: 0, total: 0 };
      const groupSeatsCount = LEGISLATURE_TOTALS[id] || 0;
      const groupColor = GROUP_MAPPING[id]?.color || "#cbd5e1";
      
      let pourCount = g.pour;
      let contreCount = g.contre;
      let abstentionCount = g.abstention;

      // Small gap between sectors
      if (groupIdx > 0) currentSeatIdx += 4;

      for (let i = 0; i < groupSeatsCount && currentSeatIdx < sortedSeats.length; i++) {
        let dotColor = groupColor;
        let opacity = 0.15;
        let voteType = 'non-votant';

        if (pourCount > 0) {
          dotColor = "#10b981";
          pourCount--;
          opacity = 1;
          voteType = 'pour';
        } else if (contreCount > 0) {
          dotColor = "#ef4444";
          contreCount--;
          opacity = 1;
          voteType = 'contre';
        } else if (abstentionCount > 0) {
          dotColor = "#64748b";
          abstentionCount--;
          opacity = 1;
          voteType = 'abstention';
        }

        finalSeats.push({
          ...sortedSeats[currentSeatIdx],
          groupColor,
          voteColor: dotColor,
          opacity,
          groupId: id,
          voteType,
          groupInfo: g,
          realTotal: groupSeatsCount
        });
        currentSeatIdx++;
      }
    });

    return finalSeats;
  }, [groups]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const hoveredGroupData = hoveredGroupId ? (groups.find(g => g.group_id === hoveredGroupId) || { pour: 0, contre: 0, abstention: 0, total: 0 }) : null;
  const hoveredGroupInfo = hoveredGroupId ? GROUP_MAPPING[hoveredGroupId] : null;
  const hoveredRealTotal = hoveredGroupId ? LEGISLATURE_TOTALS[hoveredGroupId] : 0;
  const nonVotants = hoveredGroupData && hoveredRealTotal ? (hoveredRealTotal - (hoveredGroupData.pour + hoveredGroupData.contre + hoveredGroupData.abstention)) : 0;

  return (
    <div className="w-full relative flex flex-col items-center" onMouseMove={handleMouseMove}>
      <div className="w-full aspect-[2/1] relative flex items-center justify-center overflow-hidden">
        <svg viewBox="-260 -240 520 250" className="w-full h-full">
          <path 
            d="M -235 0 A 235 235 0 0 1 235 0" 
            fill="none" 
            stroke="#f1f5f9" 
            strokeWidth="55" 
            strokeLinecap="round"
          />
          
          {seats.map((seat, i) => {
            const isHovered = hoveredGroupId === seat.groupId;
            const isDimmed = hoveredGroupId !== null && !isHovered;

            return (
              <motion.g 
                key={i} 
                initial={false}
                animate={{ 
                  scale: isHovered ? 1.5 : 1,
                  opacity: isDimmed ? 0.15 : 1
                }}
                onMouseEnter={() => setHoveredGroupId(seat.groupId)}
                onMouseLeave={() => setHoveredGroupId(null)}
                className="cursor-pointer"
              >
                 <circle
                    cx={seat.x}
                    cy={seat.y}
                    r={seat.radius + 1.2}
                    fill={seat.groupColor}
                    opacity={isHovered ? 0.4 : 0.1}
                    className="transition-opacity duration-300"
                 />
                 <circle
                    cx={seat.x}
                    cy={seat.y}
                    r={seat.radius}
                    fill={seat.voteColor}
                    opacity={seat.opacity}
                    className="transition-all duration-300"
                 />
              </motion.g>
            );
          })}
        </svg>

        <AnimatePresence>
          {hoveredGroupId && hoveredGroupInfo && hoveredGroupData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{ 
                position: 'fixed', 
                left: tooltipPos.x + 15, 
                top: tooltipPos.y + 15,
                zIndex: 100 
              }}
              className="bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 pointer-events-none min-w-[220px]"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3.5 h-3.5 rounded-full shadow-lg shadow-white/10" style={{ backgroundColor: hoveredGroupInfo.color }} />
                <span className="text-xs font-black uppercase tracking-widest">{hoveredGroupInfo.short}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mb-4 leading-tight uppercase tracking-tighter">
                {hoveredGroupInfo.name}
              </p>
              <div className="space-y-2 border-t border-white/10 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 font-black tracking-widest">POUR</span>
                  <span className="text-xs font-black font-mono">{hoveredGroupData.pour}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-red-400 font-black tracking-widest">CONTRE</span>
                  <span className="text-xs font-black font-mono">{hoveredGroupData.contre}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-black tracking-widest">ABSTENTION</span>
                  <span className="text-xs font-black font-mono">{hoveredGroupData.abstention}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                  <span className="text-[10px] text-slate-500 font-bold tracking-widest">NON-VOTANTS</span>
                  <span className="text-xs font-black font-mono text-slate-500">{nonVotants}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/10">
                  <span className="text-[10px] text-blue-400 font-black uppercase">TOTAL GROUPE</span>
                  <span className="text-sm font-black font-mono text-blue-400">{hoveredRealTotal}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 px-8 py-4 bg-white border border-slate-100 rounded-full shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Pour</span>
        </div>
        <div className="flex items-center gap-2 border-l border-slate-100 pl-6">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/20" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Contre</span>
        </div>
        <div className="flex items-center gap-2 border-l border-slate-100 pl-6">
          <div className="w-3 h-3 rounded-full bg-slate-500 shadow-lg shadow-slate-500/20" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Abs</span>
        </div>
        <div className="flex items-center gap-2 border-l border-slate-100 pl-6">
          <div className="w-3 h-3 rounded-full bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Absent</span>
        </div>
      </div>
    </div>
  );
}
