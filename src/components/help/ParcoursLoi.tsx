/**
 * Le parcours complet d'une loi, du dépôt à l'entrée en vigueur.
 *
 * Écrit en HTML plutôt qu'en SVG comme les autres schémas de la bulle d'aide : le
 * panneau ne fait que cinq cents pixels de large, un SVG y tasserait onze étapes en
 * caractères illisibles. Ici, le texte se replie, se traduit, se lit à la voix haute et
 * grossit avec les préférences du lecteur.
 *
 * Chaque étape porte la couleur de qui décide — bleu pour l'Assemblée, rouge pour le
 * Sénat, violet pour la commission mixte, vert pour la fin du chemin — pour qu'on suive
 * le va-et-vient d'un coup d'œil. La couleur ne porte jamais seule l'information : le
 * nom de l'institution est toujours écrit.
 */

type Etape = {
  n: number;
  titre: string;
  qui: string;
  detail: string;
  /** Teinte de l'institution qui a la main à cette étape. */
  ton: "gris" | "bleu" | "rouge" | "violet" | "ardoise" | "vert";
  /** Étape qui n'a pas toujours lieu (navette, commission mixte, saisine…). */
  conditionnel?: boolean;
};

const TONS: Record<Etape["ton"], { pastille: string; puce: string; barre: string }> = {
  gris:    { pastille: "bg-slate-200 text-slate-700",  puce: "bg-slate-100 text-slate-600",   barre: "bg-slate-300" },
  bleu:    { pastille: "bg-blue-600 text-white",       puce: "bg-blue-50 text-blue-700",      barre: "bg-blue-300" },
  rouge:   { pastille: "bg-rose-600 text-white",       puce: "bg-rose-50 text-rose-700",      barre: "bg-rose-300" },
  violet:  { pastille: "bg-violet-600 text-white",     puce: "bg-violet-50 text-violet-700",  barre: "bg-violet-300" },
  ardoise: { pastille: "bg-slate-700 text-white",      puce: "bg-slate-100 text-slate-700",   barre: "bg-slate-400" },
  vert:    { pastille: "bg-emerald-600 text-white",    puce: "bg-emerald-50 text-emerald-700", barre: "bg-emerald-300" },
};

const ETAPES: Etape[] = [
  {
    n: 1, ton: "gris", titre: "L'initiative", qui: "Gouvernement ou Parlement",
    detail: "Un texte venu du Gouvernement s'appelle un projet de loi ; venu d'un député ou d'un sénateur, une proposition de loi.",
  },
  {
    n: 2, ton: "gris", titre: "Le dépôt", qui: "Assemblée ou Sénat",
    detail: "Le texte est déposé sur le bureau d'une des deux chambres. Certains textes ont un passage obligé : le budget commence toujours par l'Assemblée.",
  },
  {
    n: 3, ton: "bleu", titre: "L'examen en commission", qui: "Première chambre saisie",
    detail: "Une commission permanente (Finances, Lois, Affaires sociales…) auditionne, amende et réécrit le texte. C'est là que l'essentiel se joue, loin des caméras.",
  },
  {
    n: 4, ton: "bleu", titre: "La première lecture en séance", qui: "Première chambre saisie",
    detail: "Le texte est débattu puis amendé en séance publique, et voté « sur l'ensemble ». C'est ce vote-là qui compte.",
  },
  {
    n: 5, ton: "rouge", titre: "La navette", qui: "Seconde chambre", conditionnel: true,
    detail: "L'autre chambre reprend tout depuis la commission. Tant que les deux ne votent pas un texte identique, il fait l'aller-retour.",
  },
  {
    n: 6, ton: "violet", titre: "La commission mixte paritaire", qui: "7 députés + 7 sénateurs", conditionnel: true,
    detail: "En cas de désaccord persistant, le Gouvernement peut convoquer une CMP chargée d'écrire un compromis. Si elle échoue, la navette reprend.",
  },
  {
    n: 7, ton: "bleu", titre: "La lecture définitive", qui: "Assemblée nationale", conditionnel: true,
    detail: "Si le désaccord demeure, le Gouvernement peut donner le dernier mot à l'Assemblée — elle seule tranche alors. Le Sénat ne peut pas bloquer indéfiniment.",
  },
  {
    n: 8, ton: "ardoise", titre: "Le Conseil constitutionnel", qui: "Saisine facultative", conditionnel: true,
    detail: "Avant promulgation, 60 députés ou 60 sénateurs (ou le Président, le Premier ministre, les présidents des chambres) peuvent le saisir. Il censure ce qui heurte la Constitution.",
  },
  {
    n: 9, ton: "vert", titre: "La promulgation", qui: "Président de la République",
    detail: "Il signe le texte dans les quinze jours. Il peut, une seule fois, demander une nouvelle délibération au Parlement.",
  },
  {
    n: 10, ton: "vert", titre: "La publication au Journal officiel", qui: "État",
    detail: "C'est la publication qui rend la loi applicable — et non le vote. Sans elle, le texte n'existe pas pour les citoyens.",
  },
  {
    n: 11, ton: "gris", titre: "Les décrets d'application", qui: "Gouvernement",
    detail: "Beaucoup d'articles n'entrent vraiment en vigueur qu'une fois leurs décrets publiés. Certains n'arrivent jamais, et la loi reste lettre morte.",
  },
];

export default function ParcoursLoi() {
  return (
    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
        Le chemin complet d&apos;une loi
      </p>

      <ol className="space-y-0">
        {ETAPES.map((e, i) => {
          const t = TONS[e.ton];
          const dernier = i === ETAPES.length - 1;
          return (
            <li key={e.n} className="flex gap-3">
              {/* Colonne de gauche : la pastille numérotée et le fil qui relie les étapes. */}
              <div className="flex shrink-0 flex-col items-center">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black tabular-nums ${t.pastille}`}>
                  {e.n}
                </span>
                {!dernier && <span className={`w-0.5 flex-1 ${t.barre}`} aria-hidden />}
              </div>

              <div className={`min-w-0 flex-1 ${dernier ? "pb-0" : "pb-4"}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h5 className="text-[13px] font-black leading-tight text-slate-900 dark:text-white">{e.titre}</h5>
                  {e.conditionnel && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      Seulement si besoin
                    </span>
                  )}
                </div>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider dark:bg-white/10 dark:text-slate-200 ${t.puce}`}>
                  {e.qui}
                </span>
                <p className="mt-1.5 text-[11.5px] leading-snug text-slate-600 dark:text-slate-300">{e.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 border-t border-slate-200 pt-2.5 text-[10.5px] leading-snug text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Les étapes marquées « seulement si besoin » n&apos;ont pas toujours lieu : un texte voté
        dans les mêmes termes par les deux chambres va directement à la promulgation.
      </p>
    </div>
  );
}
