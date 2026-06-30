export type LegislativeCategory =
  | "economy_finance" | "social_labour" | "health" | "education_culture"
  | "environment_agriculture" | "justice_security" | "institutions"
  | "defence_international" | "territories_housing" | "other";

export const LEGISLATIVE_CATEGORIES: Array<{ value: LegislativeCategory; label: string }> = [
  { value: "economy_finance", label: "Économie & finances" },
  { value: "social_labour", label: "Social & travail" },
  { value: "health", label: "Santé" },
  { value: "education_culture", label: "Éducation & culture" },
  { value: "environment_agriculture", label: "Environnement & agriculture" },
  { value: "justice_security", label: "Justice & sécurité" },
  { value: "institutions", label: "Institutions" },
  { value: "defence_international", label: "Défense & international" },
  { value: "territories_housing", label: "Territoires & logement" },
  { value: "other", label: "Autres" },
];

export const categoryLabel = (value: string) => LEGISLATIVE_CATEGORIES.find(category => category.value === value)?.label ?? "Autres";

export interface LegislativeListItem {
  id: string;
  official_id: string;
  title: string;
  category: LegislativeCategory;
  status_code: string;
  status_label: string;
  author_name: string | null;
  current_chamber?: string | null;
  latest_step_at?: string | null;
  cursor_date?: string | null;
  promulgated_at?: string | null;
  jorf_id?: string | null;
  nor?: string | null;
  source_urls: string[];
  source_updated_at: string;
  data_freshness: string;
  summary: string | null;
}

export interface LegislativeDossierDetail {
  dossier: {
    id: string; title: string; category: LegislativeCategory; status_label: string;
    author_name: string | null; source_updated_at: string; source_urls: string[];
  };
  promulgation: { jorf_id: string; nor: string; promulgated_at: string; source_url: string } | null;
  summary: { summary: string } | null;
  premium_analysis: { summary: string } | null;
  steps: Array<{ official_id: string; step_label: string; chamber: string; occurred_at: string | null }>;
  amendments: Array<{ official_id: string; number: string; outcome_label: string | null; subject: string | null; body: string | null }>;
  scrutins: Array<{
    official_id: string; title: string; for_count: number; against_count: number; abstain_count: number;
    group_results: Array<{ group_code: string; group_name: string | null; for_count: number; against_count: number; abstain_count: number }>;
    votes: Array<{ voter_official_id: string; voter_name: string; group_code: string | null; position: string }>;
  }>;
}
