// Rôles institutionnels (Président·e / Vice-président·e d'une chambre, président·e de commission…)
// et ce qu'ils confèrent comme pouvoirs. QUI occupe quoi vient de la table elus_fonctions, relevée
// chaque semaine dans les données officielles : ni liste écrite ici, ni lecture de la biographie,
// qui ont toutes deux affiché des fonctions perdues après le renouvellement d'octobre 2026.

export type InstRole = { role: string; institution: string; since?: string; powers: string[] };

const plat = (s: string | null | undefined) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Bibliothèque des pouvoirs par TYPE de rôle (réutilisée par le détecteur bio).
const POWERS = {
  presidentAN: [
    "Quatrième personnage de l'État dans l'ordre protocolaire.",
    "Dirige les débats et exerce la police de l'Assemblée : ouverture et clôture des séances, distribution de la parole, maintien de l'ordre.",
    "Nomme trois des neuf membres du Conseil constitutionnel.",
    "Peut saisir le Conseil constitutionnel d'une loi avant sa promulgation.",
    "Est consulté par le président de la République avant une dissolution de l'Assemblée ou le recours à l'article 16.",
    "Préside le Congrès lorsqu'il est réuni à Versailles.",
  ],
  presidentSenat: [
    "Deuxième personnage de l'État dans l'ordre protocolaire.",
    "Assure l'intérim de la présidence de la République en cas de vacance ou d'empêchement.",
    "Nomme trois des neuf membres du Conseil constitutionnel.",
    "Peut saisir le Conseil constitutionnel d'une loi avant sa promulgation.",
    "Est consulté par le président de la République avant une dissolution ou le recours à l'article 16.",
  ],
  vicePresidentAN: [
    "Membre du Bureau, organe qui dirige l'Assemblée nationale.",
    "Préside les séances publiques en l'absence du·de la président·e, à tour de rôle.",
    "Participe à l'organisation des travaux et à la police de l'Assemblée.",
  ],
  vicePresidentSenat: [
    "Membre du Bureau, organe qui dirige le Sénat.",
    "Préside les séances publiques en l'absence du·de la président·e, à tour de rôle.",
    "Participe à l'organisation des travaux du Sénat.",
  ],
  presidentCommission: [
    "Dirige les travaux d'une commission permanente : examen des textes, auditions, rapports.",
    "Organise l'ordre du jour de la commission et rythme l'examen des projets et propositions de loi.",
    "Rôle central dans la fabrique de la loi, en amont des débats en séance.",
  ],
  questeur: [
    "Membre du Bureau, chargé·e avec les autres questeurs des finances et de l'administration de l'assemblée.",
    "Prépare et exécute son budget, veille au bon fonctionnement de ses services.",
  ],
  secretaire: [
    "Membre du Bureau, organe qui dirige l'assemblée.",
    "Veille à la régularité des votes et contrôle le procès-verbal des séances.",
  ],
  presidentGroupe: [
    "Dirige un groupe politique et parle en son nom, notamment à la conférence des présidents.",
    "Participe à la fixation de l'ordre du jour de l'assemblée.",
  ],
  bureauPE: [
    "Membre du Bureau du Parlement européen, qui en règle l'organisation et le budget.",
    "Peut présider les séances plénières en remplacement du·de la président·e.",
  ],
};

export type FonctionElu = { categorie: string; libelle: string; qualite: string | null; organe: string | null; depuis: string | null; important: boolean };

/** Les fonctions à mettre en avant, la plus haute d'abord, avec ce qu'elles confèrent. */
export function rolesInstitutionnels(fonctions: FonctionElu[]): InstRole[] {
  const roles: (InstRole & { rang: number })[] = [];
  for (const f of fonctions) {
    const q = plat(f.qualite), lib = plat(f.libelle);
    const since = f.depuis ? f.depuis.slice(0, 4) : undefined;
    const de = (rang: number, powers: string[], institution: string) => roles.push({ rang, role: f.libelle, institution, since, powers });
    if (f.categorie === "bureau") {
      if (lib.includes("parlement europeen")) de(q.startsWith("president") ? 0 : 1, q.startsWith("president") ? POWERS.bureauPE : POWERS.bureauPE, "Parlement européen");
      else if (q.startsWith("president") && lib.includes("assemblee")) de(0, POWERS.presidentAN, "Assemblée nationale");
      else if (q.startsWith("president")) de(0, POWERS.presidentSenat, "Sénat");
      else if (q.includes("vice") && lib.includes("assemblee")) de(1, POWERS.vicePresidentAN, "Assemblée nationale");
      else if (q.includes("vice")) de(1, POWERS.vicePresidentSenat, "Sénat");
      else if (q.includes("questeur")) de(2, POWERS.questeur, f.organe || "");
      else if (q.includes("secretaire")) de(4, POWERS.secretaire, f.organe || "");
    } else if (f.categorie === "groupe" && /^(co)?president/.test(q)) de(3, POWERS.presidentGroupe, f.organe || "");
    else if (f.categorie === "commission" && /^president/.test(q)) de(3, POWERS.presidentCommission, f.organe || "");
  }
  return roles.sort((a, b) => a.rang - b.rang).map(({ rang: _rang, ...x }) => x);
}
