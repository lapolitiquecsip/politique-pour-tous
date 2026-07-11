// Groupes politiques de la XVIIe législature (Assemblée nationale).
// Les scrutins référencent les groupes par leur identifiant d'organe AN (« PO… »).
// La correspondance code → parti a été dérivée des votes individuels (chaque votant
// étant rattaché à un parti dans la table deputies).
const GROUP_LABELS: Record<string, string> = {
  PO845401: "Rassemblement National (RN)",
  PO845413: "La France Insoumise (LFI-NFP)",
  PO845419: "Socialistes et apparentés (SOC)",
  PO845407: "Ensemble pour la République (EPR)",
  PO845425: "Droite Républicaine (DR)",
  PO845454: "Les Démocrates (Dem)",
  PO845470: "Horizons & Indépendants (HOR)",
  PO845514: "Gauche Démocrate et Républicaine (GDR)",
  PO845485: "Libertés, Indépendants, Outre-mer et Territoires (LIOT)",
  PO845439: "Écologiste et Social (EcoS)",
  PO872880: "Union des Droites pour la République (UDR)",
  PO847173: "Union des Droites pour la République (UDR)",
  PO840056: "Non-inscrits (NI)",
};

/** Renvoie le nom lisible d'un groupe : le nom fourni s'il existe, sinon la
 *  correspondance connue du code d'organe, sinon le code brut en dernier recours. */
export function groupLabel(code?: string | null, name?: string | null): string {
  if (name && name.trim()) return name.trim();
  if (code && GROUP_LABELS[code]) return GROUP_LABELS[code];
  return code || "Groupe";
}
