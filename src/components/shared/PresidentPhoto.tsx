"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";

// Photo d'un·e président·e de chambre pour la carte d'en-tête, avec repli sur une icône
// si l'image ne charge pas. Utilisé sur les pages Assemblée (Braun-Pivet) et Sénat (Larcher).
export default function PresidentPhoto({
  src, alt, ring = "ring-amber-300", gradient = "from-amber-500 to-orange-500",
}: { src: string; alt: string; ring?: string; gradient?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
        <Landmark size={26} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={src} alt={alt} onError={() => setFailed(true)}
      className={`h-16 w-16 shrink-0 rounded-2xl object-cover object-top shadow-md ring-2 ${ring}`} />
  );
}
