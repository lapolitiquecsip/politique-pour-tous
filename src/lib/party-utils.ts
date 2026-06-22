/**
 * Mapping of French political party acronyms (Assemblée Nationale & Sénat) to their full names.
 */
export const PARTY_NAMES: Record<string, string> = {
  // Assemblée Nationale Groups
  "RN": "Rassemblement National",
  "LFI-NFP": "La France Insoumise - Nouveau Front Populaire",
  "LFI": "La France Insoumise",
  "EPR": "Ensemble pour la République (Renaissance)",
  "RE": "Renaissance",
  "PS": "Parti Socialiste",
  "SOC": "Socialistes et apparentés",
  "LR": "Les Républicains",
  "DR": "Droite Républicaine",
  "EELV": "Europe Écologie Les Verts",
  "ECO": "Écologistes et apparentés",
  "MODEM": "Mouvement Démocrate (MoDem)",
  "LES DÉMOCRATES": "Les Démocrates",
  "HOR": "Horizons",
  "HORIZONS": "Horizons et apparentés",
  "LIOT": "Libertés, Indépendants, Outre-mer et Territoires",
  "GDR": "Gauche démocrate et républicaine",
  "UDR": "Union des Droites pour la République",
  "NI": "Non-inscrits",

  // Sénat Groups
  "CRCE-K": "Communiste Républicain Citoyen Écologiste - Kanaky",
  "UC": "Union Centriste",
  "RDSE": "Rassemblement Démocratique et Social Européen",
  "LIRT": "Les Indépendants - République et Territoires",
  "EST": "Écologiste - Solidarité et Territoires",
  "SER": "Socialiste, Écologiste et Républicain",
  "RDPI": "Rassemblement des démocrates, progressistes et indépendants"
};

/**
 * Returns the full name of a party based on its acronym.
 * If no mapping exists, returns the original string.
 */
export function getFullPartyName(acronym: string): string {
  if (!acronym) return "";
  
  // Clean input (remove spaces, normalize case for matching)
  const cleanAcronym = acronym.trim();
  
  // Try exact match
  if (PARTY_NAMES[cleanAcronym]) return PARTY_NAMES[cleanAcronym];
  
  // Try case-insensitive match
  const match = Object.entries(PARTY_NAMES).find(
    ([key]) => key.toLowerCase() === cleanAcronym.toLowerCase()
  );
  
  return match ? match[1] : cleanAcronym;
}
