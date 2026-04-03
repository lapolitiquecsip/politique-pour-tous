"use client";

import { useState } from "react";

export interface Deputy {
  id: string;
  firstName: string;
  lastName: string;
  party: string;
  department: string;
  constituencyNumber: number;
  slug?: string;
}

const partyColors: Record<string, string> = {
  "LFI-NFP": "bg-[#E74C3C]",
  "EPR": "bg-[#E67E22]",
  "RN": "bg-[#2C3E50]",
  "PS": "bg-[#E91E8C]",
  "LR": "bg-[#3498DB]",
  "EELV": "bg-[#27AE60]",
};

export function generateSlug(firstName: string, lastName: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  return `${normalize(firstName)}-${normalize(lastName)}`;
}

export default function DeputyCard({ deputy }: { deputy: Deputy }) {
  const colorClass = partyColors[deputy.party] || "bg-[#95A5A6]";
  const initials = `${deputy.firstName.charAt(0)}${deputy.lastName.charAt(0)}`;
  const slug = deputy.slug || generateSlug(deputy.firstName, deputy.lastName);
  const photoUrl = `https://www.nosdeputes.fr/depute/photo/${slug}/120`;

  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col items-center hover:shadow-md transition-shadow text-center relative overflow-hidden">
      <div className="tricolor-band"><span></span><span></span><span></span></div>

      {/* Photo ou fallback initiales */}
      {!imgError ? (
        <img
          src={photoUrl}
          alt={`${deputy.firstName} ${deputy.lastName}`}
          onError={() => setImgError(true)}
          className="w-24 h-24 rounded-full object-cover mt-2 mb-4 shadow-sm border-2 border-slate-100"
        />
      ) : (
        <div 
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mt-2 mb-4 shadow-sm ${colorClass}`}
        >
          {initials}
        </div>
      )}
      
      <h3 className="text-xl font-bold text-foreground mb-2">
        {deputy.firstName} {deputy.lastName}
      </h3>
      
      <span className={`px-3 py-1 text-xs font-semibold rounded-full text-white mb-3 ${colorClass}`}>
        {deputy.party}
      </span>
      
      <p className="text-muted-foreground text-sm">
        {deputy.department} • {deputy.constituencyNumber}ème circ.
      </p>
    </div>
  );
}
