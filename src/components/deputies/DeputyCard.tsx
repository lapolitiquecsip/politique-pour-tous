"use client";

import { useState, memo, useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { generateSlug } from "@/lib/slug-generator";

export interface Deputy {
  id: string;
  firstName: string;
  lastName: string;
  party: string;
  department: string;
  constituencyNumber: number;
  slug?: string;
  anId?: string;
}

const partyColors: Record<string, string> = {
  "LFI-NFP": "bg-[#E74C3C]",
  "EPR": "bg-[#E67E22]",
  "RN": "bg-[#2C3E50]",
  "PS": "bg-[#E91E8C]",
  "LR": "bg-[#3498DB]",
  "EELV": "bg-[#27AE60]",
};

// Removed local generateSlug in favor of @/lib/slug-generator

export const DeputyCard = memo(function DeputyCard({ deputy }: { deputy: Deputy }) {
  const colorClass = partyColors[deputy.party] || "bg-[#95A5A6]";
  const initials = `${deputy.firstName.charAt(0)}${deputy.lastName.charAt(0)}`;
  const slug = deputy.slug || generateSlug(deputy.firstName, deputy.lastName);
  
  // Official Assembly Image (Primary) -> Fallback to nosdeputes.fr -> Fallback archive
  const anImageId = deputy.anId ? deputy.anId.replace('PA', '') : null;

  const sources = useMemo(() => {
    if (!anImageId) return [`https://www.nosdeputes.fr/depute/photo/${slug}/250`];
    return [
      `https://www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/${anImageId}.jpg`,
      `https://www.nosdeputes.fr/depute/photo/${slug}/250`,
      `https://www.assemblee-nationale.fr/dyn/static/tribun/photos/carre/${anImageId}.jpg`,
    ];
  }, [anImageId, slug]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setImgError(true);
    }
  };

  return (
    <Link 
      href={`/deputes/${slug}`}
      className="bg-card border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col items-center hover:shadow-lg hover:border-slate-300 transition-all text-center relative overflow-hidden group cursor-pointer"
    >
      <div className="tricolor-band"><span></span><span></span><span></span></div>

      {/* Photo ou fallback initiales */}
      {!imgError ?            <div className="relative mb-4">
              <img
                src={sources[srcIndex]}
                alt={deputy.lastName}
                onError={handleImgError}
                className="w-24 h-24 rounded-full object-cover border-[3px] border-slate-200 shadow-md transform group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center text-xs font-black text-slate-500">
                {deputy.constituencyNumber}
              </div>
            </div>
      ) : (
        <div 
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mt-2 mb-4 shadow-sm group-hover:scale-105 transition-transform ${colorClass}`}
        >
          {initials}
        </div>
      )}
      
      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
        {deputy.firstName} {deputy.lastName}
      </h3>
      
      <span className={`px-3 py-1 text-xs font-semibold rounded-full text-white mb-3 ${colorClass}`}>
        {deputy.party}
      </span>
      
      <p className="text-muted-foreground text-sm">
        {deputy.department} • {deputy.constituencyNumber}ème circ.
      </p>
      
      <div className="absolute top-4 right-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all transform translate-x-2 group-hover:translate-x-0">
        <ChevronRight className="w-6 h-6" />
      </div>
    </Link>
  );
});

export default DeputyCard;
