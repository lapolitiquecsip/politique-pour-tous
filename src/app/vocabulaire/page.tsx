import { api } from "@/lib/api";
import VocabularyClient from "./VocabularyClient";

// React Server Component
export default async function VocabularyPage() {
  const terms = await api.getVocabulary();
  return <VocabularyClient initialTerms={terms} />;
}
