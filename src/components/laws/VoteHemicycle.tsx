"use client";

import { motion } from "framer-motion";

interface VoteHemicycleProps {
  pour: number;
  contre: number;
  abstention: number;
  total?: number;
  showLabels?: boolean;
}

export default function VoteHemicycle({ pour, contre, abstention, total, showLabels = true }: VoteHemicycleProps) {
  const realTotal = total || (pour + contre + abstention);
  if (realTotal === 0) return null;

  const pourPct = (pour / realTotal) * 100;
  const contrePct = (contre / realTotal) * 100;
  const abstentionPct = (abstention / realTotal) * 100;

  // SVG Semi-circle parameters
  const radius = 80;
  const strokeWidth = 18;
  const center = 100;
  const circumference = Math.PI * radius; // Full circle is 2*PI*R, semi is PI*R

  // Stroke Dashoffsets
  // We draw from left to right (clockwise)
  // Pour starts at the beginning
  const pourDash = (pourPct / 100) * circumference;
  const contreDash = (contrePct / 100) * circumference;
  const abstentionDash = (abstentionPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-48 h-28 overflow-hidden">
        <svg viewBox="0 0 200 120" className="w-full h-full transform -scale-x-100">
          {/* Background Track */}
          <path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Contre (Red) */}
          <motion.path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${contreDash} ${circumference}` }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.4 }}
            strokeDashoffset={0}
          />

          {/* Abstention (Gray) */}
          <motion.path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${abstentionDash} ${circumference}` }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
            strokeDashoffset={-contreDash}
          />

          {/* Pour (Green/Blue) */}
          <motion.path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth + 2} // Slightly thicker to pop
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${pourDash} ${circumference}` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            strokeDashoffset={-(contreDash + abstentionDash)}
          />
        </svg>

        {/* Center Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-3xl font-black text-slate-900 leading-none">{pour}</span>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Pour</span>
        </div>
      </div>

      {showLabels && (
        <div className="flex gap-4 mt-4 w-full justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black uppercase text-slate-500">{pour}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] font-black uppercase text-slate-500">{contre}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500">{abstention}</span>
          </div>
        </div>
      )}
    </div>
  );
}
