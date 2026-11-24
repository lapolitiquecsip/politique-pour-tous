import { llmsComplet } from "@/lib/llms";

/** /llms-full.txt : toutes les fiches de référence du site, avec leur adresse (voir src/lib/llms.ts). */
export const dynamic = "force-static";

export async function GET() {
  return new Response(await llmsComplet(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
