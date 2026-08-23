// Domaines d'intérêt pour les notifications personnalisées des membres premium.
// Un membre choisit ses domaines ; le moteur de notifications (backend) associe chaque
// nouvelle information produite par les automatisations du site (lois, décisions, votes,
// actualités…) aux domaines qui la concernent, et ne notifie que les membres intéressés.
// Les `keywords` servent au matching côté serveur (titre/sujet d'un contenu → domaine).

export interface InterestDomain {
  code: string;      // identifiant stable (stocké dans user_preferences.interests)
  label: string;     // libellé affiché
  icon: string;      // nom d'icône lucide-react
  color: string;     // couleur hex (puce/accent)
  keywords: string[]; // mots-clés de rattachement (matching backend)
}

export const INTEREST_DOMAINS: InterestDomain[] = [
  { code: "economie", label: "Économie & finances", icon: "TrendingUp", color: "#2563eb",
    keywords: ["budget", "fiscal", "impôt", "impot", "taxe", "déficit", "deficit", "dette", "finances", "économie", "economie", "croissance", "inflation", "pouvoir d'achat"] },
  { code: "emploi", label: "Emploi & travail", icon: "Briefcase", color: "#0891b2",
    keywords: ["emploi", "travail", "chômage", "chomage", "salaire", "smic", "syndicat", "licenciement", "assurance chômage", "code du travail"] },
  { code: "retraites", label: "Retraites", icon: "Hourglass", color: "#7c3aed",
    keywords: ["retraite", "pension", "âge légal", "age legal", "cotisation"] },
  { code: "sante", label: "Santé", icon: "HeartPulse", color: "#e11d48",
    keywords: ["santé", "sante", "hôpital", "hopital", "sécurité sociale", "securite sociale", "médecin", "medecin", "soins", "médicament", "medicament", "psychiatrie"] },
  { code: "education", label: "Éducation", icon: "GraduationCap", color: "#0ea5e9",
    keywords: ["éducation", "education", "école", "ecole", "enseignant", "université", "universite", "élève", "eleve", "collège", "college", "lycée", "lycee", "baccalauréat", "baccalaureat"] },
  { code: "ecologie", label: "Écologie & énergie", icon: "Leaf", color: "#16a34a",
    keywords: ["écologie", "ecologie", "climat", "énergie", "energie", "environnement", "carbone", "renouvelable", "nucléaire", "nucleaire", "biodiversité", "biodiversite", "pollution"] },
  { code: "agriculture", label: "Agriculture & ruralité", icon: "Wheat", color: "#ca8a04",
    keywords: ["agriculture", "agricole", "agriculteur", "élevage", "elevage", "pêche", "peche", "rural", "alimentation", "ferme"] },
  { code: "securite", label: "Sécurité & justice", icon: "ShieldCheck", color: "#dc2626",
    keywords: ["sécurité", "securite", "police", "gendarmerie", "justice", "délinquance", "delinquance", "prison", "tribunal", "terrorisme", "violence"] },
  { code: "immigration", label: "Immigration", icon: "Globe2", color: "#f59e0b",
    keywords: ["immigration", "asile", "étranger", "etranger", "migrant", "frontière", "frontiere", "naturalisation", "séjour", "sejour", "ofpra"] },
  { code: "europe", label: "Europe & international", icon: "Flag", color: "#3b82f6",
    keywords: ["europe", "européen", "europeen", "union européenne", "commission européenne", "international", "otan", "diplomatie", "diplomatique"] },
  { code: "social", label: "Social & solidarités", icon: "HandHeart", color: "#db2777",
    keywords: ["social", "solidarité", "solidarite", "rsa", "allocation", "handicap", "pauvreté", "pauvrete", "famille", "aide sociale", "logement social"] },
  { code: "logement", label: "Logement & territoires", icon: "Home", color: "#ea580c",
    keywords: ["logement", "immobilier", "loyer", "urbanisme", "collectivité", "collectivite", "commune", "aménagement", "amenagement", "territoire", "dpe"] },
  { code: "institutions", label: "Institutions & démocratie", icon: "Landmark", color: "#64748b",
    keywords: ["constitution", "référendum", "referendum", "élection", "election", "démocratie", "democratie", "institution", "réforme", "reforme", "vote", "assemblée", "assemblee", "sénat", "senat"] },
  { code: "numerique", label: "Numérique & libertés", icon: "Cpu", color: "#8b5cf6",
    keywords: ["numérique", "numerique", "internet", "données", "donnees", "intelligence artificielle", "ia", "vie privée", "vie privee", "cnil", "réseaux sociaux", "reseaux sociaux", "cyber"] },
];

export const interestByCode = (code: string): InterestDomain | undefined =>
  INTEREST_DOMAINS.find(d => d.code === code);
