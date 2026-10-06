import { Sparkles } from "lucide-react";

/**
 * Signale un texte rédigé par intelligence artificielle (règlement européen sur l'IA,
 * art. 50.4 : un texte publié pour informer le public sur des questions d'intérêt
 * général et généré par IA, sans relecture humaine, doit être signalé comme tel).
 */
export default function MentionIA({ texte = "Résumé rédigé par IA à partir des sources officielles — seul le texte officiel fait foi.", className = "" }: { texte?: string; className?: string }) {
  return (
    <p className={`mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground ${className}`}>
      <Sparkles size={12} className="mt-px shrink-0" aria-hidden /> {texte}
    </p>
  );
}
