"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Users, Building2, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import MinisterImage from "@/components/executif/MinisterImage";
import { cleanMinistryName } from "@/lib/executif-utils";

const SQRT_5000 = Math.sqrt(5000);

const cardColors = [
  { text: "text-amber-500", bg: "bg-amber-500", lightBg: "bg-amber-50" },
  { text: "text-orange-500", bg: "bg-orange-500", lightBg: "bg-orange-50" },
  { text: "text-yellow-600", bg: "bg-yellow-500", lightBg: "bg-yellow-50" },
  { text: "text-rose-500", bg: "bg-rose-500", lightBg: "bg-rose-50" },
  { text: "text-emerald-500", bg: "bg-emerald-500", lightBg: "bg-emerald-50" },
  { text: "text-blue-500", bg: "bg-blue-500", lightBg: "bg-blue-50" },
  { text: "text-purple-500", bg: "bg-purple-500", lightBg: "bg-purple-50" },
  { text: "text-cyan-500", bg: "bg-cyan-500", lightBg: "bg-cyan-50" },
];

export interface MinisterItem {
  name: string;
  role: string;
  ministry: string;
  image: string;
  objectPosition?: string;
  tempId?: number;
}

const slugify = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface CardProps {
  position: number;
  item: MinisterItem;
  handleMove: (steps: number) => void;
  cardSize: number;
  onSelect: (item: MinisterItem) => void;
}

const MinisterCard: React.FC<CardProps> = ({ position, item, handleMove, cardSize, onSelect }) => {
  const isCenter = position === 0;
  const key = item.name || item.ministry || "x";
  const colorIndex = (key.charCodeAt(0) + (key.charCodeAt(key.length - 1) || 0)) % cardColors.length;
  const theme = cardColors[colorIndex];

  return (
    <div
      onClick={() => {
        if (isCenter) onSelect(item);
        else handleMove(position);
      }}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-2 transition-all duration-500 ease-in-out overflow-hidden flex flex-col",
        isCenter
          ? "z-10 bg-white border-amber-500 shadow-2xl"
          : "z-0 bg-white border-slate-200 hover:border-amber-400 opacity-60 hover:opacity-100"
      )}
      style={{
        width: cardSize,
        height: cardSize + 60,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -30 : position % 2 ? 20 : -20}px)
          rotate(${isCenter ? 0 : position % 2 ? 3 : -3}deg)
          scale(${isCenter ? 1 : 0.9})
        `,
        boxShadow: isCenter ? "0px 12px 0px 4px rgba(245, 158, 11, 0.12)" : "0px 0px 0px 0px transparent",
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-slate-200 z-20"
        style={{ right: -2, top: 48, width: SQRT_5000, height: 2 }}
      />

      {/* Top Banner : nom + portrait */}
      <div className={cn("relative h-40 shrink-0 w-full flex items-center justify-between overflow-hidden border-b border-slate-100 px-6", theme.lightBg)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4),transparent_70%)]" />

        {/* Texte à gauche */}
        <div className="relative z-10 max-w-[60%]">
          <p className={cn("font-black text-[9px] uppercase tracking-widest mb-1.5", theme.text)}>Ministère</p>
          <h4 className="text-slate-900 font-extrabold text-lg leading-tight line-clamp-3">{cleanMinistryName(item.ministry)}</h4>
        </div>

        {/* Portrait à droite */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center rounded-2xl bg-white/95 border border-slate-100/80 shadow-md overflow-hidden transition-transform hover:scale-105 z-10">
          <MinisterImage
            src={item.image}
            fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=f59e0b&color=fff&size=512`}
            alt={item.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: item.objectPosition || "center 20%" }}
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="p-6 flex-1 flex flex-col justify-between bg-white relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", theme.lightBg, theme.text)}>
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ministre</p>
              <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", theme.lightBg, theme.text)}>
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fonction</p>
              <p className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">{item.role}</p>
            </div>
          </div>
        </div>

        {isCenter && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className={cn("w-full flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors", theme.text)}>
              Voir le ministère <ArrowRight size={14} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const MinisterStagger: React.FC<{ items: MinisterItem[] }> = ({ items }) => {
  const router = useRouter();
  const [cardSize, setCardSize] = useState(320);
  const [list, setList] = useState<MinisterItem[]>([]);

  useEffect(() => {
    if (items && items.length > 0) {
      setList((prev) => {
        if (prev.length === 0 || prev.length !== items.length) {
          return items.map((it, i) => ({ ...it, tempId: i }));
        }
        const currentIds = prev.map((p) => p.name).sort().join(",");
        const newIds = items.map((i) => i.name).sort().join(",");
        if (currentIds !== newIds) return items.map((it, i) => ({ ...it, tempId: i }));
        return prev;
      });
    } else {
      setList([]);
    }
  }, [items]);

  const handleMove = (steps: number) => {
    setList((prev) => {
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

  const onSelect = (item: MinisterItem) => {
    router.push(`/executif/ministere/${slugify(item.ministry)}`);
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

  if (list.length === 0)
    return (
      <div className="h-[500px] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" />
      </div>
    );

  return (
    <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-200/60" style={{ height: 620 }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.04)_0%,transparent_70%)]" />

      {list.map((item, index) => {
        const position = list.length % 2 ? index - (list.length - 1) / 2 : index - list.length / 2;
        if (Math.abs(position) > 3) return null;
        return (
          <MinisterCard
            key={item.tempId}
            item={item}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
            onSelect={onSelect}
          />
        );
      })}

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-4 z-20">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-all rounded-full shadow-lg",
            "bg-white border-2 border-slate-200 text-slate-600 hover:border-amber-500 hover:text-amber-500 hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          )}
          aria-label="Ministre précédent"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-all rounded-full shadow-lg",
            "bg-white border-2 border-slate-200 text-slate-600 hover:border-amber-500 hover:text-amber-500 hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          )}
          aria-label="Ministre suivant"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default MinisterStagger;
