"use client"

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, Building2, Coins, ArrowRight, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SQRT_5000 = Math.sqrt(5000);

interface Territory {
  id: string;
  name: string;
  type: 'region' | 'department';
  president?: string;
  party?: string;
  budget2026?: string;
  image?: string;
  tempId?: number;
}

interface TestimonialCardProps {
  position: number;
  item: Territory;
  handleMove: (steps: number) => void;
  cardSize: number;
  isPremium?: boolean;
  onSelect?: (item: Territory) => void;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  position, 
  item, 
  handleMove, 
  cardSize,
  isPremium,
  onSelect
}) => {
  const isCenter = position === 0;

  return (
    <div
      onClick={() => {
        if (isCenter && onSelect) {
          onSelect(item);
        } else {
          handleMove(position);
        }
      }}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-2 transition-all duration-500 ease-in-out overflow-hidden flex flex-col",
        isCenter 
          ? "z-10 bg-white border-rose-600 shadow-2xl" 
          : "z-0 bg-white border-slate-200 hover:border-rose-400 opacity-60 hover:opacity-100"
      )}
      style={{
        width: cardSize,
        height: cardSize + 40,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -30 : position % 2 ? 20 : -20}px)
          rotate(${isCenter ? 0 : position % 2 ? 3 : -3}deg)
          scale(${isCenter ? 1 : 0.9})
        `,
        boxShadow: isCenter ? "0px 12px 0px 4px rgba(225, 29, 72, 0.1)" : "0px 0px 0px 0px transparent"
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-slate-200 z-20"
        style={{
          right: -2,
          top: 48,
          width: SQRT_5000,
          height: 2
        }}
      />
      
      {/* Top Banner with Image */}
      <div className="relative h-40 shrink-0 w-full bg-slate-100">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-600 to-fuchsia-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        
        <div className="absolute bottom-4 left-6 pr-6">
          <p className="text-rose-400 font-black text-[10px] uppercase tracking-widest mb-1">
            {item.type === 'region' ? 'Région' : 'Département'}
          </p>
          <h4 className="text-white font-bold text-xl leading-tight line-clamp-2">{item.name}</h4>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col justify-between bg-white relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-rose-600 shrink-0">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Président</p>
              <p className="font-bold text-slate-900 text-sm truncate">{item.president}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-rose-600 shrink-0">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Parti Majoritaire</p>
              <p className="font-bold text-slate-900 text-sm truncate">{item.party}</p>
            </div>
          </div>
          {item.budget2026 && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-rose-600 shrink-0">
                <Coins size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Budget 2026</p>
                <p className="font-bold text-slate-900 text-sm truncate">{item.budget2026}</p>
              </div>
            </div>
          )}
        </div>

        {isCenter && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="w-full flex items-center justify-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest group-hover:text-rose-700">
              Analyser <ArrowRight size={14} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const StaggerTestimonials: React.FC<{ items: Territory[], onSelect: (t: Territory) => void, isPremium?: boolean }> = ({ items, onSelect, isPremium }) => {
  const [cardSize, setCardSize] = useState(320);
  const [territoriesList, setTerritoriesList] = useState<Territory[]>([]);

  useEffect(() => {
    if (items && items.length > 0) {
      setTerritoriesList(prev => {
        // Only reset if the list really changed (e.g., search filter or tab change)
        if (prev.length === 0 || prev.length !== items.length) {
          return items.map((it, i) => ({ ...it, tempId: i }));
        }
        // Also check if the content completely changed
        const currentIds = prev.map(p => p.id).sort().join(',');
        const newIds = items.map(i => i.id).sort().join(',');
        if (currentIds !== newIds) {
          return items.map((it, i) => ({ ...it, tempId: i }));
        }
        return prev; // Keep current order/animation state
      });
    }
  }, [items]);

  const handleMove = (steps: number) => {
    setTerritoriesList(prev => {
      const newList = [...prev];
      if (steps > 0) {
        for (let i = steps; i > 0; i--) {
          const item = newList.shift();
          if (item) newList.push(item);
        }
      } else {
        for (let i = steps; i < 0; i++) {
          const item = newList.pop();
          if (item) newList.unshift(item);
        }
      }
      return newList;
    });
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 320 : 280);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (territoriesList.length === 0) return <div className="h-[500px] flex items-center justify-center"><Loader2 className="animate-spin text-rose-600" /></div>;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-200/60"
      style={{ height: 600 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.03)_0%,transparent_70%)]" />
      
      {territoriesList.map((item, index) => {
        const position = territoriesList.length % 2
          ? index - (territoriesList.length - 1) / 2
          : index - territoriesList.length / 2;
        
        // Hide cards that are too far away to improve performance
        if (Math.abs(position) > 3) return null;

        return (
          <TestimonialCard
            key={item.tempId}
            item={item}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
            onSelect={onSelect}
            isPremium={isPremium}
          />
        );
      })}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-4 z-20">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-all rounded-full shadow-lg",
            "bg-white border-2 border-slate-200 text-slate-600 hover:border-rose-600 hover:text-rose-600 hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          )}
          aria-label="Région précédente"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-all rounded-full shadow-lg",
            "bg-white border-2 border-slate-200 text-slate-600 hover:border-rose-600 hover:text-rose-600 hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          )}
          aria-label="Région suivante"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
