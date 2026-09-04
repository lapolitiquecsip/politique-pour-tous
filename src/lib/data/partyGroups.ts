// Correspondance parti (political_parties.slug) ↔ groupe à l'Assemblée nationale (XVIIe législature).
// Les scrutins référencent les groupes par leur identifiant d'organe AN (« PO… », cf. group_results).
// Sert au « scorecard » (comment vote le groupe du parti, par enjeu) et à la vue Enjeux.
export type AnGroup = { po: string; slug: string; short: string; name: string; color: string };

export const AN_GROUPS: AnGroup[] = [
  { po: "PO845401", slug: "rassemblement-national",    short: "RN",   name: "Rassemblement National",                          color: "#1f2d5a" },
  { po: "PO845413", slug: "la-france-insoumise",       short: "LFI",  name: "La France Insoumise (LFI-NFP)",                   color: "#cc2443" },
  { po: "PO845419", slug: "parti-socialiste",          short: "SOC",  name: "Socialistes et apparentés",                       color: "#e34b6e" },
  { po: "PO845407", slug: "renaissance",               short: "EPR",  name: "Ensemble pour la République",                     color: "#f5a623" },
  { po: "PO845425", slug: "les-republicains",          short: "DR",   name: "Droite Républicaine",                             color: "#2563eb" },
  { po: "PO845454", slug: "les-democrates",            short: "Dem",  name: "Les Démocrates (MoDem)",                          color: "#f97316" },
  { po: "PO845470", slug: "horizons",                  short: "HOR",  name: "Horizons & Indépendants",                         color: "#0ea5a4" },
  { po: "PO845514", slug: "parti-communiste-francais", short: "GDR",  name: "Gauche Démocrate et Républicaine",                color: "#dc2626" },
  { po: "PO845485", slug: "liot",                      short: "LIOT", name: "Libertés, Indépendants, Outre-mer et Territoires", color: "#eab308" },
  { po: "PO845439", slug: "les-ecologistes",           short: "EcoS", name: "Écologiste et Social",                            color: "#16a34a" },
  { po: "PO872880", slug: "union-des-droites",         short: "UDR",  name: "Union des Droites pour la République",            color: "#4338ca" },
];

// Ordre d'affichage gauche→droite (pour la matrice comparative de la vue Enjeux).
export const AN_GROUPS_ORDERED: AnGroup[] = [
  "la-france-insoumise", "parti-communiste-francais", "les-ecologistes", "parti-socialiste",
  "liot", "renaissance", "les-democrates", "horizons", "les-republicains",
  "union-des-droites", "rassemblement-national",
].map(s => AN_GROUPS.find(g => g.slug === s)!).filter(Boolean);

const BY_SLUG = new Map(AN_GROUPS.map(g => [g.slug, g]));
const BY_PO = new Map(AN_GROUPS.map(g => [g.po, g]));

export const anGroupBySlug = (slug?: string | null) => (slug ? BY_SLUG.get(slug) ?? null : null);
export const anGroupByPo = (po?: string | null) => (po ? BY_PO.get(po) ?? null : null);
