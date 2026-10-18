import { api } from "@/lib/api";
import VocabularyClient from "./VocabularyClient";

export const metadata = {
  title: "Le lexique de la politique",
  description: "Les mots de la politique et des institutions expliqués simplement : de « 49.3 » à « navette parlementaire ».",
};

// React Server Component
export default async function VocabularyPage() {
  const terms = await api.getVocabulary();
  return <VocabularyClient initialTerms={terms} />;
}
