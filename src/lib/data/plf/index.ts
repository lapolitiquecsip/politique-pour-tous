// Projets de loi de finances (PLF) 2024 → 2027 — DONNÉES OFFICIELLES, VÉRIFIÉES À LA SOURCE.
//
// Règle de comparaison : on compare des PROJETS INITIAUX (texte déposé par le Gouvernement), jamais
// des lois votées, pour que les quatre années soient sur la même base. Montants en euros courants.
//
// Sources (texte intégral déposé à l'Assemblée nationale, lu et vérifié le 10/10/2026) :
//  - « Orientations générales et équilibre budgétaire » (hypothèses, solde de l'État, effort) ;
//  - article liminaire (déficit, dette, dépense publique, prélèvements obligatoires — ensemble des APU) ;
//  - « Évaluation des recettes du budget général » (recettes par impôt, en M€) ;
//  - état B (crédits par mission/programme) → missions.json, extrait par scripts/plf/extraire-etat-b.py,
//    contrôlé à l'euro près (somme = total du document ; 2024 et 2025 identiques aux données ouvertes de Bercy).
// Issue des textes : JORF (base promulgated_laws du site) pour les lois de finances 2025 et 2026.

export type PlfAnnee = 2024 | 2025 | 2026 | 2027;
export const ANNEES: PlfAnnee[] = [2027, 2026, 2025, 2024];
export const PLF_VERIFIE_LE = "10 octobre 2026";

export type Programme = { programme: string; ae: number; cp: number };
export type Mission = { cle: string; mission: string; ae: number; cp: number; programmes: Programme[] };
// Les crédits par mission (missions.json, ~60 Ko) sont dans ./missions.ts : seule la page PLF les charge.

type Mesure = { titre: string; detail: string; ref?: string };
type Recettes = {
  ir: number; is: number; tva: number; energie: number; brutes: number; remboursements: number;
  nettes: number; nonFiscales: number; psrCollectivites: number; psrUE: number; // en M€
};

export type Plf = {
  annee: PlfAnnee;
  numero: string;
  depot: string;
  legislature: string;
  premierMinistre: string;
  ministres: string[];
  statut: string;
  issue: string;
  texteUrl: string;
  /** hypothèses et objectifs du PLF pour son année (ensemble des administrations publiques) */
  macro: {
    croissance: number;        // % PIB en volume
    inflation: number;         // IPC, % en moyenne annuelle
    deficit: number;           // solde public effectif, % du PIB (texte initial)
    deficitNote?: string;
    deficitAnneePrecedente: { annee: number; valeur: number; note?: string };
    dette: number;             // % du PIB (Maastricht)
    depensePublique: number;   // % du PIB, hors crédits d'impôt
    depensePubliqueMd?: number;
    prelevementsObligatoires: number; // % du PIB
  };
  /** budget de l'État, en Md€ */
  etat: {
    solde: number;             // solde budgétaire de l'État (hors FMI)
    soldeNote?: string;
    depensesNettes: number;    // budget général, CP, hors remboursements & dégrèvements d'impôts d'État
    chargeDette: number;       // programmes « Charge de la dette » (y c. SNCF Réseau), CP
    pde: number;               // périmètre des dépenses de l'État (norme LPFP 2023-2027)
  };
  recettes: Recettes;
  energieLibelle: string;
  effort: { texte: string; source: "texte" | "annonce"; note?: string };
  mesures: Mesure[];
  contexte: string;
};

const AN = (leg: number, n: string) => `https://www.assemblee-nationale.fr/dyn/${leg}/textes/l${leg}b${n}_projet-loi.pdf`;

export const PLF: Record<PlfAnnee, Plf> = {
  2027: {
    annee: 2027,
    numero: "n° 3210",
    depot: "1er octobre 2026",
    legislature: "XVIIe législature",
    premierMinistre: "Sébastien Lecornu",
    ministres: ["Roland Lescure (Économie et Finances)", "David Amiel (Action et Comptes publics)"],
    statut: "Déposé le 1er octobre 2026 — en cours d'examen au Parlement",
    issue: "Texte en discussion : les chiffres peuvent évoluer au fil des amendements.",
    texteUrl: AN(17, "3210"),
    macro: {
      croissance: 1.0, inflation: 1.8, deficit: 5.0,
      deficitAnneePrecedente: { annee: 2026, valeur: 5.4, note: "prévision révisée (5,0 % visés en LFI 2026)" },
      dette: 121.7, depensePublique: 56.9, depensePubliqueMd: 1782, prelevementsObligatoires: 44.2,
    },
    etat: { solde: -156.4, depensesNettes: 474.9, chargeDette: 72.9, pde: 511 },
    recettes: { ir: 127616, is: 83890, tva: 187068, energie: 25249, brutes: 515882, remboursements: 140193, nettes: 375688, nonFiscales: 16678, psrCollectivites: 43096, psrUE: 30906 },
    energieLibelle: "TICPE (carburants)",
    effort: { texte: "54 Md€, dont 43 Md€ de mesures nouvelles (PLF + PLFSS)", source: "texte", note: "Le reste provient de la montée en charge de mesures prises en 2026 et avant. Sans mesures, le déficit se dégraderait d'environ 1 point de PIB selon le texte." },
    mesures: [
      { titre: "Crédits des ministères gelés", detail: "Gel en euros courants par rapport à 2026, hors défense et prélèvements sur recettes. Point d'indice gelé, mesures catégorielles « extrêmement limitées »." },
      { titre: "Défense : +6,4 Md€", detail: "« Effort en faveur de nos Armées » chiffré à +6,4 Md€ dans le texte, dans le cadre de la loi de programmation militaire." },
      { titre: "Régalien renforcé", detail: "Intérieur +1,0 Md€ (235 gendarmes, 970 policiers, sécurité civile +25 %) ; Justice +0,4 Md€ (près de 300 magistrats et 300 greffiers)." },
      { titre: "Charge de la dette : +9,6 Md€", detail: "72,9 Md€ en 2027 contre 63,4 Md€ prévus pour 2026 (révisé), sous l'effet de la hausse des taux et de l'inflation." },
      { titre: "Prestations non revalorisées", detail: "APL, prime d'activité et certaines pensions ne seraient pas revalorisées ; les minima sociaux (RSA, minimum vieillesse), les prestations liées au handicap et les petites retraites le seraient à l'inflation." },
      { titre: "Barème de l'impôt sur le revenu indexé (+2,1 %)", detail: "Évite ≈ 4 Md€ de hausse d'impôt à 20 millions de ménages selon le texte.", ref: "art. 2" },
      { titre: "Abattement retraités plafonné à 3 000 €", detail: "Sous-plafond de l'abattement de 10 % sur les pensions (plafond actuel : 4 439 €).", ref: "art. 3" },
      { titre: "Grandes entreprises", detail: "Contribution exceptionnelle sur les bénéfices reconduite un an à taux réduits (seuil de 1,5 Md€ de chiffre d'affaires).", ref: "art. 15" },
      { titre: "Collectivités mises à contribution", detail: "Hausse de la TVA qui leur est affectée minorée de l'inflation, et contribution progressive à l'effort budgétaire.", ref: "art. 36 et 37" },
    ],
    contexte: "Croissance 2026 révisée à +0,5 % (conflit au Proche et Moyen-Orient, sécheresse). Le texte vise un budget voté avant la fin 2026 et insiste sur les « marges de manœuvre du prochain Gouvernement ».",
  },
  2026: {
    annee: 2026,
    numero: "n° 1906",
    depot: "14 octobre 2025",
    legislature: "XVIIe législature",
    premierMinistre: "Sébastien Lecornu",
    ministres: ["Roland Lescure (Économie et Finances)", "Amélie de Montchalin (Action et Comptes publics)"],
    statut: "Adopté",
    issue: "Devenu la loi n° 2026-103 du 19 février 2026 de finances pour 2026.",
    texteUrl: AN(17, "1906"),
    macro: {
      croissance: 1.0, inflation: 1.3, deficit: 4.7,
      deficitAnneePrecedente: { annee: 2025, valeur: 5.4 },
      dette: 117.9, depensePublique: 56.4, depensePubliqueMd: 1725, prelevementsObligatoires: 43.9,
    },
    etat: { solde: -124.4, depensesNettes: 447.4, chargeDette: 59.3, pde: 500.9 },
    recettes: { ir: 130178, is: 84694, tva: 188392, energie: 24681, brutes: 513756, remboursements: 140845, nettes: 372911, nonFiscales: 28696, psrCollectivites: 49515, psrUE: 28781 },
    energieLibelle: "Accises sur les énergies",
    effort: { texte: "≈ 30 Md€ (présentation du Gouvernement)", source: "annonce", note: "Le texte du PLF ne totalise pas l'effort. Il chiffre notamment 6,5 Md€ demandés aux contribuables les plus aisés et aux plus grandes entreprises, et ≈ 5 Md€ de rationalisation des niches fiscales et sociales." },
    mesures: [
      { titre: "Défense : +6,7 Md€", detail: "Hausse par rapport à 2025 ; hors défense et dépenses contraintes (charge de la dette), les dépenses de l'État baissent selon le texte." },
      { titre: "Barème de l'IR et CSG stabilisés", detail: "Pas d'indexation sur l'inflation (rendement estimé : 2,2 Md€)." },
      { titre: "Hauts revenus", detail: "Prorogation d'un an de la contribution différentielle (taux minimal d'imposition de 20 %).", ref: "art. 2" },
      { titre: "Taxe sur les holdings patrimoniales", detail: "Nouvelle taxe sur les actifs non professionnels des holdings (actifs ≥ 5 M€).", ref: "art. 3" },
      { titre: "Grandes entreprises", detail: "Contribution exceptionnelle sur les bénéfices prorogée avec des taux divisés par deux (≈ 400 entreprises, CA ≥ 1 Md€).", ref: "art. 4" },
      { titre: "Abattement des retraités réformé", detail: "L'abattement de 10 % serait remplacé par un forfait de 2 000 € (4 000 € pour un couple).", ref: "art. 6" },
    ],
    contexte: "Déposé après la renomination de Sébastien Lecornu le 10 octobre 2025. Le texte retient un retour sous 3 % de déficit en 2029.",
  },
  2025: {
    annee: 2025,
    numero: "n° 324",
    depot: "10 octobre 2024",
    legislature: "XVIIe législature",
    premierMinistre: "Michel Barnier",
    ministres: ["Antoine Armand (Économie et Finances)", "Laurent Saint-Martin (Budget et Comptes publics)"],
    statut: "Non adopté en l'état",
    issue: "Le gouvernement Barnier a été renversé le 4 décembre 2024 ; le budget a été adopté en 2025 : loi n° 2025-127 du 14 février 2025 de finances pour 2025.",
    texteUrl: AN(17, "0324"),
    macro: {
      croissance: 1.1, inflation: 1.8, deficit: 5.2,
      deficitNote: "Texte initial ; le Gouvernement visait 5,0 % après ses propres amendements (5 Md€ d'économies supplémentaires).",
      deficitAnneePrecedente: { annee: 2024, valeur: 6.1 },
      dette: 114.7, depensePublique: 56.5, depensePubliqueMd: 1699, prelevementsObligatoires: 43.6,
    },
    etat: { solde: -142.1, soldeNote: "−135,6 Md€ visés après amendements du Gouvernement", depensesNettes: 451.3, chargeDette: 54.9, pde: 490 },
    recettes: { ir: 120191, is: 79769, tva: 189901, energie: 18058, brutes: 500349, remboursements: 142742, nettes: 357607, nonFiscales: 20549, psrCollectivites: 44189, psrUE: 23321 },
    energieLibelle: "TICPE (carburants)",
    effort: { texte: "60 Md€ (≈ 40 Md€ sur la dépense, ≈ 20 Md€ de recettes)", source: "texte", note: "Soit 2 points de PIB selon le texte." },
    mesures: [
      { titre: "Contribution sur les hauts revenus", detail: "Imposition minimale de 20 % pour les revenus > 250 000 € (500 000 € pour un couple) ; rendement estimé à 2 Md€.", ref: "art. 3" },
      { titre: "Grandes entreprises", detail: "Contribution exceptionnelle sur les bénéfices des entreprises de plus de 1 Md€ de CA, sur deux exercices.", ref: "art. 11" },
      { titre: "CVAE : suppression reportée", detail: "La fin de la CVAE est décalée de trois ans, à 2030.", ref: "art. 15" },
      { titre: "Barème de l'IR indexé (+2 %)", detail: "Indexation sur l'inflation hors tabac.", ref: "art. 2" },
      { titre: "Économies sur l'État", detail: "20 Md€ d'économies en dépense sur l'État par rapport au tendanciel (dont 5 Md€ par amendement du Gouvernement)." },
    ],
    contexte: "Premier budget de la XVIIe législature, présenté sans majorité absolue, alors que le déficit 2024 était revu à 6,1 % du PIB.",
  },
  2024: {
    annee: 2024,
    numero: "n° 1680",
    depot: "27 septembre 2023",
    legislature: "XVIe législature",
    premierMinistre: "Élisabeth Borne",
    ministres: ["Bruno Le Maire (Économie et Finances)", "Thomas Cazenave (Comptes publics)"],
    statut: "Adopté",
    issue: "Devenu la loi n° 2023-1322 du 29 décembre 2023 de finances pour 2024.",
    texteUrl: AN(16, "1680"),
    macro: {
      croissance: 1.4, inflation: 2.6, deficit: 4.4,
      deficitAnneePrecedente: { annee: 2023, valeur: 4.9 },
      dette: 109.7, depensePublique: 55.3, prelevementsObligatoires: 44.1,
    },
    etat: { solde: -144.5, depensesNettes: 445.1, chargeDette: 52.2, pde: 491 },
    recettes: { ir: 117616, is: 91415, tva: 183857, energie: 18423, brutes: 485384, remboursements: 135960, nettes: 349424, nonFiscales: 22633, psrCollectivites: 44842, psrUE: 21610 },
    energieLibelle: "TICPE (carburants)",
    effort: { texte: "16 Md€ d'économies (présentation des ministres)", source: "annonce", note: "Montant annoncé dans la lettre de présentation des ministres, essentiellement la fin du bouclier tarifaire sur l'électricité. Il n'est pas totalisé dans le texte du PLF." },
    mesures: [
      { titre: "Fin progressive du bouclier tarifaire", detail: "Baisse de 16,2 Md€ des crédits alloués au bouclier tarifaire par rapport à 2023." },
      { titre: "Barème de l'IR indexé (+4,8 %)", detail: "Sans indexation, l'IR aurait rapporté ≈ 6,1 Md€ de plus.", ref: "art. 2" },
      { titre: "Crédit d'impôt « industrie verte »", detail: "Pour les investissements dans les batteries, panneaux solaires, éoliennes et pompes à chaleur.", ref: "art. 5" },
      { titre: "Suppression de la CVAE étalée", detail: "Disparition étalée sur quatre ans, jusqu'en 2027.", ref: "art. 8" },
    ],
    contexte: "Dernier budget avant la dissolution de 2024 ; la trajectoire visait un déficit sous 3 % en 2027.",
  },
};

/* --------------------------------------------------------------------------------------------- */
/* Comparabilité des missions d'une année sur l'autre                                              */
/* --------------------------------------------------------------------------------------------- */
export const NOTES_PERIMETRE: Record<string, string> = {
  travail: "Intitulée « Travail et emploi » en 2024. À partir de 2025, elle intègre aussi le soutien des ministères sociaux (programme « Soutien des ministères sociaux »).",
  agriculture: "En 2027, la forêt passe dans la mission Écologie (programme « Forêt ») et le programme d'allègements du coût du travail en agriculture ne figure plus dans la mission.",
  "monde-combattant": "Intitulée « Anciens combattants, mémoire et liens avec la Nation » jusqu'en 2025.",
  "gestion-finances-publiques": "Renommée en 2027 « … et lutte contre les fraudes », mêmes programmes.",
  "audiovisuel-public": "Mission budgétaire seulement dans le PLF 2025 ; les autres années, l'audiovisuel public est financé hors budget général.",
  "plan-de-relance": "Mission en extinction (crédits résiduels du plan de relance 2020-2022).",
  "ecologie-developpement-et-mobilite-durables": "Intègre en 2025 la sûreté nucléaire et la radioprotection, puis en 2027 la forêt.",
  "remboursements-et-degrevements": "Restitutions d'impôts (crédits de TVA, dégrèvements…) : une dépense comptable, pas une politique publique.",
  "engagements-financiers-de-l-etat": "Essentiellement la charge de la dette. En 2024 et 2025, elle inclut aussi l'amortissement de la dette Covid (6,5 puis 5,2 Md€), absent ensuite : pour la seule charge de la dette, voir « Le budget de l'État ».",
};

export const LIBELLE_COURT: Record<string, string> = {
  "remboursements-et-degrevements": "Remboursements d'impôts",
  "enseignement-scolaire": "Éducation (scolaire)",
  "engagements-financiers-de-l-etat": "Charge de la dette & engagements",
  defense: "Défense",
  "solidarite-insertion-et-egalite-des-chances": "Solidarité & handicap",
  "recherche-et-enseignement-superieur": "Recherche & universités",
  securites: "Police, gendarmerie, sécurité civile",
  "ecologie-developpement-et-mobilite-durables": "Écologie & transports",
  "cohesion-des-territoires": "Logement & territoires",
  travail: "Travail & emploi",
  justice: "Justice",
  "gestion-finances-publiques": "Finances publiques (impôts, douanes)",
  "regimes-sociaux-et-de-retraite": "Régimes spéciaux de retraite",
  "administration-generale-et-territoriale-de-l-etat": "Préfectures & élections",
  agriculture: "Agriculture",
  "investir-pour-la-france-de-2030": "France 2030",
  "relations-avec-les-collectivites-territoriales": "Collectivités locales",
  "outre-mer": "Outre-mer",
  culture: "Culture",
  economie: "Économie",
  "action-exterieure-de-l-etat": "Diplomatie",
  "aide-publique-au-developpement": "Aide au développement",
  "immigration-asile-et-integration": "Immigration & asile",
  sante: "Santé",
};
