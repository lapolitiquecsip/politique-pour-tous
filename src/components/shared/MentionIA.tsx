import { Sparkles } from "lucide-react";

/**
 * Signale un texte rédigé par intelligence artificielle (règlement européen sur l'IA,
 * art. 50.4 : un texte publié pour informer le public sur des questions d'intérêt
 * général et généré par IA, sans relecture humaine, doit être signalé comme tel).
 *
 * Deux usages :
 *  — `texte` : une phrase libre, pour les blocs qui ont déjà leur propre formulation ;
 *  — `source` (+ `verification`) : la forme commune « Résumé généré par IA à partir
 *    de [source] », avec le lien vers la source.
 *
 * `verification` ne se remplit QUE si un contrôle automatique existe réellement pour
 * ce bloc (ex. citations retrouvées mot pour mot dans le compte rendu). Écrire
 * « vérifié » sur un texte que rien ne vérifie serait une information fausse.
 */
export default function MentionIA({
  texte,
  nature = "Résumé",
  source,
  verification,
  sombre = false,
  className = "",
}: {
  texte?: string;
  /** « Résumé », « Explication », « Analyse »… : ce que l'IA a rédigé. */
  nature?: string;
  source?: { libelle: string; url?: string | null };
  /** Ce qui a été vérifié automatiquement, ex. « citations vérifiées dans le compte rendu ». */
  verification?: string;
  /** Sur fond sombre fixe (carte du Journal officiel…). */
  sombre?: boolean;
  className?: string;
}) {
  const contenu = texte ?? (source ? (
    <>
      {nature} généré{/^(Analyse|Explication|Synthèse)/.test(nature) ? "e" : ""} par IA à partir de{" "}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className={`underline decoration-dotted underline-offset-2 ${sombre ? "hover:text-white" : "hover:text-foreground"}`}>
          {source.libelle}
        </a>
      ) : source.libelle}
      {verification ? `, ${verification}` : ""}. Seul le texte officiel fait foi.
    </>
  ) : "Résumé rédigé par IA à partir des sources officielles — seul le texte officiel fait foi.");

  return (
    <p className={`mt-2 flex items-start gap-1.5 text-[11px] leading-snug ${sombre ? "text-white/50" : "text-muted-foreground"} ${className}`}>
      <Sparkles size={12} className="mt-px shrink-0" aria-hidden /> <span>{contenu}</span>
    </p>
  );
}
