import { api } from "@/lib/api";
import EurodeputesClient from "./EurodeputesClient";

export const dynamic = "force-static";

export default async function EurodeputesPage() {
  const meps = await api.getMeps();
  return <EurodeputesClient meps={meps as any[]} />;
}
