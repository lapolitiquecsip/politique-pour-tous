"use client";

import { useState, memo, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";

export interface Senator {
  id: string;
  first_name: string;
  last_name: string;
  party: string;
  department: string;
  slug: string;
  photo_url: string;
}

const partyColors: Record<string, string> = {
  "Les Républicains": "bg-[#0055A4]",
  "Socialiste, Écologiste et Républicain": "bg-[#E1001A]",
  "Union Centriste": "bg-[#00BFFF]",
  "Rassemblement des démocrates, progressistes et indépendants": "bg-[#FFD700]",
  "Communiste républicain citoyen et écologiste": "bg-[#DD0000]",
  "Rassemblement National": "bg-[#0D2145]",
  "Écologiste - Solidarité et Territoires": "bg-[#008000]",
  "Les Indépendants - République et Territoires": "bg-[#ED8D05]",
};

export const SenatorCard = memo(function SenatorCard({ 
  senator, 
  isBlurred = false 
}: { 
  senator: Senator; 
  isBlurred?: boolean;
}) {
  const colorClass = partyColors[senator.party] || "bg-slate-500";
  const initials = `${senator.first_name.charAt(0)}${senator.last_name.charAt(0)}`;
  
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      className={`bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col items-center transition-all text-center relative group ${
        isBlurred ? "pointer-events-none" : "hover:shadow-lg hover:border-slate-300 cursor-pointer"
      }`}
    >
      {/* Decorative Senate Band */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-white to-blue-600 opacity-50"></div>
      
      {!isBlurred ? (
        <Link href={`/senateurs/${senator.slug}`} className="w-full flex flex-col items-center">
            <SenatorContent senator={senator} isBlurred={isBlurred} imgError={imgError} setImgError={setImgError} initials={initials} colorClass={colorClass} />
        </Link>
      ) : (
        <SenatorContent senator={senator} isBlurred={isBlurred} imgError={imgError} setImgError={setImgError} initials={initials} colorClass={colorClass} />
      )}

      {isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm">
          <div className="bg-white/90 p-2 rounded-full shadow-lg border border-amber-200">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      )}

      {!isBlurred && (
        <div className="absolute top-4 right-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-amber-600 transition-all transform translate-x-2 group-hover:translate-x-0">
          <ChevronRight className="w-6 h-6" />
        </div>
      )}
    </div>
  );
});

function SenatorContent({ senator, isBlurred, imgError, setImgError, initials, colorClass }: any) {
  return (
    <div className={`${isBlurred ? "blur-md select-none" : ""} w-full flex flex-col items-center`}>
      <div className="absolute -top-12 left-1/2 -translate-x-1/2">
        <div className="relative group/photo">
          {!imgError ? (
            <img
              src={senator.photo_url}
              alt={senator.last_name}
              className="w-24 h-24 rounded-full object-cover object-top border-[3px] border-slate-200 shadow-md transform group-hover/photo:scale-110 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 border-[3px] border-slate-200 shadow-md flex items-center justify-center text-white text-2xl font-black">
              {initials}
            </div>
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors mt-12">
        {senator.first_name} {senator.last_name}
      </h3>
      
      <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full text-white mb-3 ${colorClass} max-w-full truncate block`}>
        {senator.party}
      </span>
      
      <p className="text-slate-500 text-sm">
        Sénat • {senator.department}
      </p>
    </div>
  );
}

export default SenatorCard;
