import { Search, MapPin, Bell } from "lucide-react";

// Titre + sous-titre placés juste au-dessus de la carte/liste des élus : explique qu'on peut
// trouver son élu (recherche ou carte), ouvrir son profil et suivre son activité.
export default function MemberFinderIntro({ role, roleShort, accent = "text-red-600" }: { role: string; roleShort: string; accent?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 text-center">
      <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white md:text-5xl">
        Trouvez votre {roleShort} <span className={accent}>& ses votes</span>
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
        Tapez son nom ou repérez-le sur la <strong>carte interactive</strong>, puis cliquez sur son profil pour accéder à
        <strong> toute son activité</strong> : ses votes réels, sa présence, ses initiatives et sa fiche complète.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5"><Search size={14} className={accent} /> Recherche par nom / parti</span>
        <span className="inline-flex items-center gap-1.5"><MapPin size={14} className={accent} /> Carte interactive</span>
        <span className="inline-flex items-center gap-1.5"><Bell size={14} className="text-amber-500" /> Notifications de ses votes <em className="not-italic text-amber-600">(Premium)</em></span>
      </div>
    </div>
  );
}
