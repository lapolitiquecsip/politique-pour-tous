"use client";

import { motion } from "framer-motion";

interface ChartItem {
  label: string;
  value: number;
  color: string;
}

interface IncomeChartProps {
  data: ChartItem[];
  totalLabel?: string;
}

export default function IncomeChart({ data, totalLabel = "Revenu Mensuel" }: IncomeChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  
  // Calculate SVG paths for pie slices
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-10">
      <div className="relative w-48 h-48 md:w-56 md:h-56 shrink-0">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full -rotate-90">
          {data.map((item, i) => {
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
            
            const slicePercent = item.value / total;
            cumulativePercent += slicePercent;
            
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
            
            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `L 0 0`,
            ].join(' ');

            return (
              <motion.path
                key={i}
                d={pathData}
                fill={item.color}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
          {/* Inner Circle (Donut effect) */}
          <circle cx="0" cy="0" r="0.6" fill="white" className="dark:fill-slate-900" />
        </svg>
        
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white leading-none">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(total)}
          </span>
          <span className="text-[10px] font-bold text-slate-500 mt-1 italic">/ mois</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 w-full">
        {data.map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + (i * 0.1) }}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(item.value)}
              </span>
              <span className="text-[10px] text-slate-400 block font-bold">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
