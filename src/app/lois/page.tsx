import { api } from "@/lib/api";
import LoisPage from "./LoisPage";

/**
 * Page « Lois » : les dernières lois promulguées sont lues à la construction du site et
 * arrivent dans le HTML (moteurs de recherche, affichage immédiat même si la base tarde) ;
 * le reste de la page vit dans le navigateur (LoisPage, LawsClient).
 */
export default async function Page() {
  let initialLois: Awaited<ReturnType<typeof api.getPromulgatedLaws>> = [];
  try { initialLois = await api.getPromulgatedLaws({ limit: 40 }); } catch { /* la liste se chargera dans le navigateur */ }
  return <LoisPage initialLois={initialLois} />;
}
