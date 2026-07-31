// Rôles institutionnels (Président·e / Vice-président·e d'une chambre, président·e de commission…)
// et ce qu'ils confèrent comme pouvoirs. Deux sources :
//  1) une liste CURÉE et vérifiée des titulaires stables (source officielle AN/Sénat),
//  2) un détecteur de secours à partir de la bio structurée (Wikipédia) quand elle existe.

export type InstRole = { role: string; institution: string; since?: string; powers: string[] };

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

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
};

// 1) Titulaires curés (stables sur la législature). Clé = nom normalisé.
const commissionAN = (nom: string): InstRole => ({ role: `Président·e de la ${nom}`, institution: "Assemblée nationale", powers: POWERS.presidentCommission });
const commissionSenat = (nom: string): InstRole => ({ role: `Président·e de la ${nom}`, institution: "Sénat", powers: POWERS.presidentCommission });
const CURATED: Record<string, InstRole> = {
  "yael braun pivet": { role: "Présidente de l'Assemblée nationale", institution: "Assemblée nationale", since: "2022", powers: POWERS.presidentAN },
  "gerard larcher": { role: "Président du Sénat", institution: "Sénat", since: "2014", powers: POWERS.presidentSenat },
  // Président·e·s des huit commissions permanentes de l'Assemblée nationale (source : vie-publique.fr).
  "alexandre portier": commissionAN("Commission des Affaires culturelles et de l'Éducation"),
  "stephane travert": commissionAN("Commission des Affaires économiques"),
  "bruno fuchs": commissionAN("Commission des Affaires étrangères"),
  "frederic valletoux": commissionAN("Commission des Affaires sociales"),
  "jean michel jacques": commissionAN("Commission de la Défense nationale et des Forces armées"),
  "sandrine le feur": commissionAN("Commission du Développement durable et de l'Aménagement du territoire"),
  "eric coquerel": commissionAN("Commission des Finances, de l'Économie générale et du Contrôle budgétaire"),
  "florent boudie": commissionAN("Commission des Lois constitutionnelles, de la Législation et de l'Administration générale"),
  // Président·e·s des sept commissions permanentes du Sénat (source : senat.fr).
  "claude raynal": commissionSenat("Commission des Finances"),
  "muriel jourda": commissionSenat("Commission des Lois"),
  "cedric perrin": commissionSenat("Commission des Affaires étrangères, de la Défense et des Forces armées"),
  "philippe mouiller": commissionSenat("Commission des Affaires sociales"),
  "dominique estrosi sassone": commissionSenat("Commission des Affaires économiques"),
  "laurent lafon": commissionSenat("Commission de la Culture, de l'Éducation, de la Communication et du Sport"),
  "jean francois longeot": commissionSenat("Commission de l'Aménagement du territoire et du Développement durable"),
};

// 2) Détecteur de secours depuis la bio structurée (parcours + summary), pour les rôles que la
// bio mentionne explicitement comme ACTUELS (« depuis … » ou fonction en cours).
function detectFromBio(bio: any): InstRole | null {
  if (!bio) return null;
  const lines: string[] = [bio.summary || "", ...(Array.isArray(bio.parcours) ? bio.parcours : [])].filter(Boolean);
  const current = (l: string) => /depuis|en cours|actuel/i.test(l) || !/\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/.test(l);
  for (const l of lines) {
    const nl = norm(l);
    if (/ancien|ancienne/.test(nl)) continue;
    if (/president.* assemblee nationale/.test(nl) && current(l)) return { role: "Président·e de l'Assemblée nationale", institution: "Assemblée nationale", powers: /vice/.test(nl) ? POWERS.vicePresidentAN : POWERS.presidentAN };
    if (/president.* senat/.test(nl) && current(l)) return { role: "Président·e du Sénat", institution: "Sénat", powers: /vice/.test(nl) ? POWERS.vicePresidentSenat : POWERS.presidentSenat };
    if (/vice president.* assemblee/.test(nl) && current(l)) return { role: "Vice-président·e de l'Assemblée nationale", institution: "Assemblée nationale", powers: POWERS.vicePresidentAN };
    if (/vice president.* senat/.test(nl) && current(l)) return { role: "Vice-président·e du Sénat", institution: "Sénat", powers: POWERS.vicePresidentSenat };
    const com = l.match(/pr[ée]sident[·e]*\s+de\s+la\s+(commission[^,.;(]+)/i);
    if (com && current(l)) return { role: `Président·e de la ${com[1].trim()}`, institution: "Commission permanente", powers: POWERS.presidentCommission };
  }
  return null;
}

export function resolveInstitutionalRole(fullName: string, bio?: any): InstRole | null {
  return CURATED[norm(fullName)] || detectFromBio(bio);
}
