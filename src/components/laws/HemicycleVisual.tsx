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

const GROUP_ORDER = [
  "PO845485", // GDR
  "PO845407", // LFI
  "PO845470", // ÉCO
  "PO845413", // SOC
  "PO845514", // LIOT
  "PO845401", // EPR
  "PO845439", // DEM
  "PO845454", // HOR
  "PO845425", // DR
  "PO872880", // UDR
  "PO845419", // RN
];

const GROUP_MAPPING: any = {
  "PO845419": { name: "Rassemblement National", short: "RN", color: "#0D2149" },
  "PO845401": { name: "Ensemble pour la République", short: "EPR", color: "#FFD600" },
  "PO845407": { name: "La France Insoumise - NFP", short: "LFI-NFP", color: "#CC2443" },
  "PO845413": { name: "Socialistes et apparentés", short: "SOC", color: "#E1001A" },
  "PO845425": { name: "Droite Républicaine", short: "DR", color: "#0066CC" },
  "PO845439": { name: "Les Démocrates", short: "DEM", color: "#FF9900" },
  "PO845454": { name: "Horizons et apparentés", short: "HOR", color: "#00A0E2" },
  "PO845470": { name: "Écologiste et Social", short: "ÉCO", color: "#00B050" },
  "PO845485": { name: "Gauche Démocrate et Républicaine", short: "GDR", color: "#DD0000" },
  "PO845514": { name: "Libertés, Indépendants, Outre-mer et Territoires", short: "LIOT", color: "#F5B000" },
  "PO872880": { name: "Union des Droites pour la République", short: "UDR", color: "#004792" },
};

export default function HemicycleVisual({ groups }: HemicycleVisualProps) {
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const seats = useMemo(() => {
    const totalSeats = 577;
    const rows = 12;
    const result: any[] = [];
    
    for (let row = 0; row < rows; row++) {
      const radius = 100 + row * 12;
      const seatsInRow = Math.floor(radius * Math.PI / 12);
      const angleStep = Math.PI / (seatsInRow - 1);
      
      for (let i = 0; i < seatsInRow; i++) {
        const angle = Math.PI + i * angleStep;
        result.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          radius: 3.5,
        });
      }
    }

    const sortedSeats = result.sort((a, b) => {
      const angleA = Math.atan2(a.y, a.x);
      const angleB = Math.atan2(b.y, b.x);
      return angleA - angleB;
    }).slice(0, totalSeats);

    let currentSeatIdx = 0;
    const finalSeats: any[] = [];

    const activeGroups = GROUP_ORDER.map(id => {
      const g = groups.find(item => item.group_id === id);
      return g || { group_id: id, pour: 0, contre: 0, abstention: 0, total: 0 };
    }).filter(g => g.total > 0);

    activeGroups.forEach(group => {
      const groupSeatsCount = group.total;
      let pourCount = group.pour;
      let contreCount = group.contre;
      let abstentionCount = group.abstention;

      for (let i = 0; i < groupSeatsCount && currentSeatIdx < sortedSeats.length; i++) {
        let voteColor = "#e2e8f0";
        let opacity = 0.3;
        let voteType = 'absent';

        if (pourCount > 0) {
          voteColor = "#10b981";
          pourCount--;
          opacity = 1;
          voteType = 'pour';
        } else if (contreCount > 0) {
          voteColor = "#ef4444";
          contreCount--;
          opacity = 1;
          voteType = 'contre';
        } else if (abstentionCount > 0) {
          voteColor = "#94a3b8";
          abstentionCount--;
          opacity = 1;
          voteType = 'abstention';
        }

        finalSeats.push({
          ...sortedSeats[currentSeatIdx],
          groupColor: GROUP_MAPPING[group.group_id]?.color || "#cbd5e1",
          voteColor,
          opacity,
          groupId: group.group_id,
          voteType,
          groupInfo: group
        });
        currentSeatIdx++;
      }
    });

    return finalSeats;
  }, [groups]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const hoveredGroupData = hoveredGroupId ? groups.find(g => g.group_id === hoveredGroupId) : null;
  const hoveredGroupInfo = hoveredGroupId ? GROUP_MAPPING[hoveredGroupId] : null;

  return (
    <div className="w-full relative flex flex-col items-center" onMouseMove={handleMouseMove}>
      <div className="w-full aspect-[2/1] relative flex items-center justify-center overflow-hidden">
        <svg viewBox="-260 -240 520 250" className="w-full h-full">
          <path 
            d="M -230 0 A 230 230 0 0 1 230 0" 
            fill="none" 
            stroke="#f8fafc" 
            strokeWidth="50" 
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
                  scale: isHovered ? 1.4 : 1,
                  opacity: isDimmed ? 0.2 : 1
                }}
                onMouseEnter={() => setHoveredGroupId(seat.groupId)}
                onMouseLeave={() => setHoveredGroupId(null)}
                className="cursor-pointer"
              >
                 <circle
                    cx={seat.x}
                    cy={seat.y}
                    r={seat.radius + 1}
                    fill={seat.groupColor}
                    className="opacity-20"
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

        {/* Floating Tooltip */}
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
              className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 pointer-events-none min-w-[200px]"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hoveredGroupInfo.color }} />
                <span className="text-xs font-black uppercase tracking-widest">{hoveredGroupInfo.short}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mb-3 leading-tight">
                {hoveredGroupInfo.name}
              </p>
              <div className="space-y-1.5 border-t border-white/10 pt-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-emerald-400 font-black">POUR</span>
                  <span className="font-mono font-bold">{hoveredGroupData.pour}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-red-400 font-black">CONTRE</span>
                  <span className="font-mono font-bold">{hoveredGroupData.contre}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-black">ABS</span>
                  <span className="font-mono font-bold">{hoveredGroupData.abstention}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] pt-1.5 mt-1.5 border-t border-white/5">
                  <span className="text-slate-500 font-bold">TOTAL SIÈGES</span>
                  <span className="font-mono font-bold">{hoveredGroupData.total}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-6 py-3 bg-white/50 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Pour</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Contre</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Abs</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Absent</span>
        </div>
      </div>
    </div>
  );
}
