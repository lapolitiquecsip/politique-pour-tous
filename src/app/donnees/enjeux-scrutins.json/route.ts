import { supabase } from "@/lib/supabase";

/**
 * Enjeux des scrutins (Assemblée : lois et articles ; Sénat : tous), écrits en fichier à la construction du site
 * (chaque nuit) : /donnees/enjeux-scrutins.json — ~10 Ko compressés, en cache d'une fiche à
 * l'autre (30/10/2026).
 *
 * La fiche d'un député attendait ses votes, PUIS demandait les enjeux de ces scrutins (une
 * seconde vague d'allers-retours, ~1 s sur mobile), et la liste changeait d'aspect à leur
 * arrivée. Ce fichier part en même temps que les votes. Ce qui a été étiqueté depuis la
 * construction est demandé à la base (voir DeputyClient : scrutins récents seulement).
 */
export const dynamic = "force-static";

async function tout<T>(lire: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    // Trois essais : pendant la construction, des centaines de requêtes partent ensemble.
    let r = await lire(de, de + 999);
    for (let essai = 1; essai < 3 && (r.error || !r.data); essai++) {
      await new Promise(ok => setTimeout(ok, 1500 * essai));
      r = await lire(de, de + 999);
    }
    const { data, error } = r;
    if (error || !data) throw error || new Error("lecture vide");
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

export async function GET() {
  try {
    const [enjeux, scrutins, senat, tags] = await Promise.all([
      supabase.from("issues").select("*").order("sort_order").then(r => r.data || []),
      tout<{ id: string }>((de, a) => supabase.from("scrutins").select("id").in("type", ["LOI", "ARTICLE"]).order("id").range(de, a)),
      // Sénat : tous ses scrutins (quelques centaines), amendements compris.
      tout<{ id: string | number }>((de, a) => supabase.from("legislative_scrutins").select("id").eq("chamber", "SENAT").order("id").range(de, a)),
      tout<{ scrutin_id: string; issue_slug: string }>((de, a) => supabase.from("scrutin_issues").select("scrutin_id, issue_slug").gte("confidence", 0.7).order("scrutin_id").order("issue_slug").range(de, a)),
    ]);
    const lois = new Set([...scrutins.map(s => s.id), ...senat.map(s => String(s.id))]);
    const parScrutin: Record<string, string[]> = {};
    for (const t of tags) if (lois.has(t.scrutin_id)) (parScrutin[t.scrutin_id] ||= []).push(t.issue_slug);
    return Response.json({ genere_le: new Date().toISOString(), enjeux, tags: parScrutin });
  } catch (e) {
    // Base injoignable à la construction : fichier vide, la fiche interroge la base comme avant.
    console.error("[enjeux-scrutins.json] lecture impossible :", e);
    return Response.json({ genere_le: null, enjeux: [], tags: {} });
  }
}
