import { llmsCourt } from "@/lib/llms";

/** /llms.txt : le sommaire du site pour les moteurs génératifs (voir src/lib/llms.ts). */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsCourt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
