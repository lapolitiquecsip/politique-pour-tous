"use client";

import React, { useMemo } from 'react';

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

const GROUP_COLORS: any = {
  "PO845419": "#0D2149", // RN
  "PO845401": "#FFD600", // EPR
  "PO845407": "#CC2443", // LFI-NFP
  "PO845413": "#E1001A", // SOC
  "PO845425": "#0066CC", // DR
  "PO845439": "#FF9900", // DEM
  "PO845454": "#00A0E2", // HOR
  "PO845470": "#00B050", // ÉCO
  "PO845485": "#DD0000", // GDR
  "PO845514": "#F5B000", // LIOT
  "PO872880": "#004792", // UDR
};

export default function HemicycleVisual({ groups }: HemicycleVisualProps) {
  const seats = useMemo(() => {
    const totalSeats = 577;
    const rows = 12;
    const result: any[] = [];
    
    // 1. Generate seats coordinates (polar to cartesian)
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

    // Sort by angle to allow sequential mapping
    const sortedSeats = result.sort((a, b) => {
      const angleA = Math.atan2(a.y, a.x);
      const angleB = Math.atan2(b.y, b.x);
      return angleA - angleB;
    }).slice(0, totalSeats);

    // 2. Assign seats to groups based on order and total members
    let currentSeatIdx = 0;
    const finalSeats: any[] = [];

    // Filter and sort groups according to Hémicycle layout
    const activeGroups = GROUP_ORDER.map(id => {
      const g = groups.find(item => item.group_id === id);
      return g || { group_id: id, pour: 0, contre: 0, abstention: 0, total: 0 };
    }).filter(g => g.total > 0);

    activeGroups.forEach(group => {
      const groupSeatsCount = group.total;
      
      // Proportion of votes within the group
      let pourCount = group.pour;
      let contreCount = group.contre;
      let abstentionCount = group.abstention;

      for (let i = 0; i < groupSeatsCount && currentSeatIdx < sortedSeats.length; i++) {
        let voteColor = "#e2e8f0"; // Default: Non-votant / absent
        let opacity = 0.3;

        if (pourCount > 0) {
          voteColor = "#10b981"; // Emerald-500
          pourCount--;
          opacity = 1;
        } else if (contreCount > 0) {
          voteColor = "#ef4444"; // Red-500
          contreCount--;
          opacity = 1;
        } else if (abstentionCount > 0) {
          voteColor = "#94a3b8"; // Slate-400
          abstentionCount--;
          opacity = 1;
        }

        finalSeats.push({
          ...sortedSeats[currentSeatIdx],
          groupColor: GROUP_COLORS[group.group_id] || "#cbd5e1",
          voteColor,
          opacity,
          groupId: group.group_id
        });
        currentSeatIdx++;
      }
    });

    return finalSeats;
  }, [groups]);

  return (
    <div className="w-full relative flex flex-col items-center">
      <div className="w-full aspect-[2/1] relative flex items-center justify-center overflow-hidden">
        <svg viewBox="-260 -240 520 250" className="w-full h-full">
          {/* Background Hémicycle Path */}
          <path 
            d="M -230 0 A 230 230 0 0 1 230 0" 
            fill="none" 
            stroke="#f8fafc" 
            strokeWidth="50" 
            strokeLinecap="round"
          />
          
          {seats.map((seat, i) => (
            <g key={i} className="hover:scale-150 transition-transform origin-center cursor-help">
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
                  className="transition-all duration-700 ease-out"
               />
            </g>
          ))}
        </svg>
      </div>

      {/* Legend overlay (smaller and cleaner) */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
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
