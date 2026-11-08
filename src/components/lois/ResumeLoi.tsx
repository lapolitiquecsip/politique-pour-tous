/**
 * Résumé d'un texte de loi pour tous (legislative_analyses, audience « public »).
 *
 * Depuis la v3 du 08/11/2026, le résumé explique la loi en sections (« **En bref** »,
 * « **Ce que prévoit le texte** » en puces, « **Pourquoi ce texte** », « **Qui est
 * concerné** ») ; les anciens résumés sont un simple paragraphe. Les deux s'affichent ici.
 * Pas de hook : utilisable dans une page rendue côté serveur comme dans la fiche.
 */
type Bloc = { titre: string | null; lignes: string[] };

function blocs(texte: string): Bloc[] {
  const out: Bloc[] = [];
  let cur: Bloc = { titre: null, lignes: [] };
  for (const brut of texte.replace(/\r/g, "").split("\n")) {
    const l = brut.trim();
    if (!l) continue;
    const t = l.match(/^\*\*(.+?)\*\*\s*:?\s*$/);
    if (t) {
      if (cur.titre || cur.lignes.length) out.push(cur);
      cur = { titre: t[1].trim(), lignes: [] };
    } else cur.lignes.push(l);
  }
  if (cur.titre || cur.lignes.length) out.push(cur);
  return out;
}

/** Gras en ligne (« **mot** ») rendu, le reste tel quel. */
function enLigne(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((m, i) =>
    /^\*\*[^*]+\*\*$/.test(m) ? <strong key={i} className="font-bold text-foreground">{m.slice(2, -2)}</strong> : m);
}

/** Le résumé en texte brut (description de page, partage). */
export function resumeEnTexte(texte: string): string {
  return texte.replace(/\*\*(.+?)\*\*\s*:?\s*\n/g, "").replace(/\*\*/g, "").replace(/^\s*[-•]\s+/gm, "").replace(/\s+/g, " ").trim();
}

export default function ResumeLoi({ texte, className = "" }: { texte: string; className?: string }) {
  const parties = blocs(texte);
  return (
    <div className={`space-y-4 text-[16px] leading-7 text-slate-700 dark:text-slate-200 ${className}`}>
      {parties.map((b, i) => {
        const puces = b.lignes.filter(l => /^[-•]\s+/.test(l));
        const phrases = b.lignes.filter(l => !/^[-•]\s+/.test(l));
        return (
          <div key={i}>
            {b.titre && <h4 className="text-[13px] font-black uppercase tracking-widest text-foreground">{b.titre}</h4>}
            {phrases.map((p, j) => <p key={j} className={b.titre ? "mt-1" : j ? "mt-2" : ""}>{enLigne(p)}</p>)}
            {puces.length > 0 && (
              <ul className="mt-1.5 space-y-1.5">
                {puces.map((p, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-600 dark:bg-red-400" />
                    <span>{enLigne(p.replace(/^[-•]\s+/, ""))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
