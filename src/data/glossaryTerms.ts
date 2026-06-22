export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: "scrutin uninominal majoritaire",
    definition: "Mode de scrutin où l'on vote pour un seul candidat. Celui qui obtient le plus de voix (majorité) dans sa circonscription l'emporte."
  },
  {
    term: "suffrage universel direct",
    definition: "Système où tous les citoyens inscrits sur les listes électorales votent directement pour choisir leurs représentants."
  },
  {
    term: "suffrage universel indirect",
    definition: "Système où les citoyens élisent des 'grands électeurs' (maires, conseillers, etc.), qui élisent ensuite à leur tour les représentants (comme les sénateurs)."
  },
  {
    term: "circonscription",
    definition: "Division du territoire (souvent une partie d'un département) qui sert de cadre à une élection pour élire un député."
  },
  {
    term: "quinquennat",
    definition: "Mandat d'une durée de cinq ans, comme celui du Président de la République ou des députés."
  },
  {
    term: "grands électeurs",
    definition: "Élus locaux (maires, conseillers départementaux et régionaux) et parlementaires qui participent à l'élection des sénateurs."
  },
  {
    term: "scrutin proportionnel",
    definition: "Système où les sièges sont attribués à chaque liste en fonction du pourcentage de voix obtenues au niveau national."
  },
  {
    term: "mandat",
    definition: "Pouvoir donné par les électeurs à un élu pour agir en leur nom pendant une durée déterminée."
  }
];
