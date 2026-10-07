"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import ProgrammeCandidat, { type Proposition, type SourceProgramme } from "@/components/presidentielles/ProgrammeCandidat";

/**
 * Fiche d'un parti : le programme de son ou ses candidats à la présidentielle, dès qu'il
 * est publié (même source et même présentation que sur la fiche du candidat).
 */
export default function ProgrammesDuParti({ nomParti, sigle }: { nomParti: string; sigle?: string | null }) {
  const [blocs, setBlocs] = useState<{ c: any; props: Proposition[]; sources: SourceProgramme[] }[]>([]);
  useEffect(() => {
    let actif = true;
    (async () => {
      const cands = await api.getCandidatsDuParti(nomParti, sigle).catch(() => []);
      const out = [];
      for (const c of cands) {
        const [props, sources] = await Promise.all([api.getCandidateProposals(c.id), api.getSourcesProgramme(c.id)]);
        if ((props as any[]).length) out.push({ c, props: props as Proposition[], sources });
      }
      if (actif) setBlocs(out);
    })();
    return () => { actif = false; };
  }, [nomParti, sigle]);

  if (!blocs.length) return null;
  return (
    <div className="mt-8 rounded-[2rem] border border-border bg-card p-5 md:p-7">
      {blocs.map(({ c, props, sources }) => (
        <div key={c.id}>
          <ProgrammeCandidat proposals={props} sources={sources} titre={`Le programme de ${c.full_name}`} nomCandidat={c.full_name} />
          <Link href={c.slug ? `/presidentielles-2027/?candidat=${c.slug}` : "/presidentielles-2027/"} className="mt-2 inline-block text-xs font-bold underline">
            Voir la fiche de candidat·e de {c.full_name}
          </Link>
        </div>
      ))}
    </div>
  );
}
