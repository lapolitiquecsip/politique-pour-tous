import { AlertTriangle } from "lucide-react";

// Bannière affichée sur la fiche d'un élu qui n'est plus en fonction (détecté automatiquement :
// absent du roster officiel — décès, démission, remplacement par le suppléant…).
export default function MandateEndedBanner({ role, name }: { role: string; name?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Mandat terminé</p>
        <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-100/80">
          {name ? `${name} n'exerce plus` : "Cette personne n'exerce plus"} de mandat de {role} (fin de mandat détectée automatiquement à partir des données officielles). Fiche conservée à titre d'archive.
        </p>
      </div>
    </div>
  );
}
