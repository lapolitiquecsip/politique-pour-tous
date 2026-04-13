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
  unit?: string;
}

export default function IncomeChart({ data, totalLabel = "Revenu Mensuel", unit = "/ mois" }: IncomeChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  
  // Calculate SVG paths for pie slices
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6 w-full"
    >
      <div className="relative w-40 h-40 shrink-0">
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
              <path
                key={i}
                d={pathData}
                fill={item.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
          {/* Inner Circle (Donut effect) */}
          <circle cx="0" cy="0" r="0.65" fill="white" className="dark:fill-slate-900" />
        </svg>
        
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</span>
          {(() => {
            const formattedTotal = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(total);
            const fontSize = formattedTotal.length > 10 ? 'text-sm' : formattedTotal.length > 8 ? 'text-base' : 'text-lg';
            return (
              <span className={`${fontSize} font-bold text-slate-900 dark:text-white leading-none text-center`}>
                {formattedTotal}
              </span>
            );
          })()}
          <span className="text-[10px] font-bold text-slate-500 mt-1 italic">{unit}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 w-full">
        {data.map((item, i) => (
          <div 
            key={i}
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
          </div>
        ))}
      </div>
    </motion.div>
  );
}
