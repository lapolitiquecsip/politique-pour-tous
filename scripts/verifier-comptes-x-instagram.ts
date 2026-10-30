/**
 * OUTIL : trouve et vérifie les comptes X et Instagram des candidats, via Agentik (30/10/2026).
 *
 * Même règle de sûreté que verify-candidate-socials.ts : un compte n'est retenu que si le nom
 * affiché correspond au candidat ET qu'il dépasse MIN_FOLLOWERS (les usurpateurs recopient le
 * nom ; le badge bleu de X s'achète et ne prouve rien). Les refusés sont listés, pour décision
 * humaine. Ajoute les comptes retenus à src/lib/data/candidate-socials.json — injection ensuite
 * par `update-social-stats.ts --seed`.
 *
 * Coût : 0,00188 $ par compte essayé. Usage : npx tsx scripts/verifier-comptes-x-instagram.ts [--ecrire]
 */
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const OUT = "src/lib/data/candidate-socials.json";
const MIN_FOLLOWERS = 5000;
const ECRIRE = process.argv.includes("--ecrire");

// [nom affiché attendu, identifiants X essayés dans l'ordre, identifiants Instagram]
const CANDIDATS: Record<string, [string, string[], string[]]> = {
  "xavier-bertrand": ["Xavier Bertrand", ["xavierbertrand"], ["xavierbertrand", "xavier.bertrand"]],
  "anasse-kazib": ["Anasse Kazib", ["AnasseKazib"], ["anassekazib"]],
  "bernard-cazeneuve": ["Bernard Cazeneuve", ["BCazeneuve"], ["bernardcazeneuve", "bernard_cazeneuve"]],
  "bruno-retailleau": ["Bruno Retailleau", ["BrunoRetailleau"], ["brunoretailleau", "bruno_retailleau"]],
  "david-lisnard": ["David Lisnard", ["davidlisnard"], ["davidlisnard", "david_lisnard"]],
  "delphine-batho": ["Delphine Batho", ["delphinebatho"], ["delphinebatho", "delphine_batho"]],
  "edouard-philippe": ["Édouard Philippe", ["EPhilippe_LH", "EPhilippePM"], ["edouardphilippe", "edouard_philippe", "edouardphilippe_lh"]],
  "eric-zemmour": ["Éric Zemmour", ["ZemmourEric"], ["ericzemmour_", "ericzemmour", "eric_zemmour"]],
  "fabien-roussel": ["Fabien Roussel", ["Fabien_Roussel"], ["fabien_roussel", "fabienroussel"]],
  "florian-philippot": ["Florian Philippot", ["f_philippot"], ["florianphilippot", "florian_philippot"]],
  "francois-asselineau": ["François Asselineau", ["UPR_Asselineau"], ["francoisasselineau", "asselineau_francois"]],
  "francois-ruffin": ["François Ruffin", ["Francois_Ruffin"], ["francois_ruffin", "francoisruffin"]],
  "gabriel-attal": ["Gabriel Attal", ["GabrielAttal"], ["gabriel_attal", "gabrielattal"]],
  "jean-luc-melenchon": ["Jean-Luc Mélenchon", ["JLMelenchon"], ["jlmelenchon"]],
  "juan-branco": ["Juan Branco", ["anatolium", "juanbranco"], ["juanbranco", "juan_branco"]],
  "lydie-massard": ["Lydie Massard", ["LydieMassard"], ["lydiemassard", "lydie_massard"]],
  "marine-le-pen": ["Marine Le Pen", ["MLP_officiel"], ["marine_lepen", "mlp.officiel", "marinelepen"]],
  "marine-tondelier": ["Marine Tondelier", ["marinetondelier"], ["marinetondelier", "marine_tondelier"]],
  "natacha-polony": ["Natacha Polony", ["NPolony"], ["natachapolony", "natacha_polony"]],
  "nathalie-arthaud": ["Nathalie Arthaud", ["n_arthaud"], ["nathaliearthaud", "nathalie_arthaud"]],
  "nicolas-dupont-aignan": ["Nicolas Dupont-Aignan", ["dupontaignan"], ["nicolasdupontaignan", "dupontaignan"]],
  "selma-labib": ["Selma Labib", ["SelmaLabib"], ["selmalabib", "selma_labib"]],
  "karim-bouamrane": ["Karim Bouamrane", ["KBouamrane", "KarimBouamrane"], ["karimbouamrane", "karim_bouamrane"]],
  "raphael-glucksmann": ["Raphaël Glucksmann", ["rglucks1"], ["rglucks", "raphaelglucksmann", "raphael.glucksmann"]],
};

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
const nomOk = (attendu: string, vu: string) => norm(attendu).split(" ").filter(m => m.length > 2).every(m => norm(vu).includes(m));

let depense = 0;
async function lire(outil: string, handle: string): Promise<any | null> {
  const r = await fetch("https://api.agentik.cc/v1/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.AGENTIK_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
    body: JSON.stringify({ tool_id: outil, input: { handle } }),
    signal: AbortSignal.timeout(60_000),
  });
  const j: any = await r.json().catch(() => null);
  depense += Number(j?.price_billed_usd || 0);
  return j?.status === "COMPLETED" ? j.output : null;
}
const profilX = (o: any) => o?.legacy ? { nom: o.legacy.name, abonnes: Number(o.legacy.followers_count), publications: Number(o.legacy.statuses_count) } : null;
const profilIG = (o: any) => { const u = o?.data?.user || o?.user || o; return u?.username || u?.full_name ? { nom: u.full_name || "", abonnes: Number(u.edge_followed_by?.count ?? u.follower_count), publications: Number(u.edge_owner_to_timeline_media?.count ?? u.media_count) } : null; };

async function main() {
  if (!process.env.AGENTIK_API_KEY) throw new Error("AGENTIK_API_KEY manquante");
  const retenus: Record<string, any[]> = {}; const refuses: string[] = []; const introuvables: string[] = [];
  for (const [slug, [nom, xs, igs]] of Object.entries(CANDIDATS)) {
    for (const [plateforme, outil, liste, lecture] of [
      ["x", "scrapecreators/get-v1-twitter-profile", xs, profilX],
      ["instagram", "scrapecreators/get-v1-instagram-profile", igs, profilIG],
    ] as const) {
      let trouve = false;
      for (const h of liste) {
        const p = lecture(await lire(outil, h));
        if (!p) continue;
        if (nomOk(nom, p.nom) && p.abonnes >= MIN_FOLLOWERS) {
          (retenus[slug] ||= []).push({ platform: plateforme, handle: `@${h}`, external_id: null,
            url: plateforme === "x" ? `https://x.com/${h}` : `https://www.instagram.com/${h}/`, kind: "official" });
          console.log(`✓ ${slug} ${plateforme} @${h} — ${p.nom} — ${p.abonnes} abonnés`);
          trouve = true; break;
        }
        refuses.push(`${slug} ${plateforme} @${h} — « ${p.nom} » — ${p.abonnes} abonnés`);
      }
      if (!trouve) introuvables.push(`${slug} ${plateforme}`);
    }
  }
  console.log("\nREFUSÉS (nom ou audience) :\n" + (refuses.join("\n") || "aucun"));
  console.log("\nSANS COMPTE RETENU :\n" + (introuvables.join("\n") || "aucun"));
  console.log(`\nDépense : ${depense.toFixed(4)} $`);
  if (!ECRIRE) { console.log("(sans --ecrire : fichier inchangé)"); return; }
  const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
  for (const [slug, comptes] of Object.entries(retenus)) {
    let e = data.find((x: any) => x.candidate_slug === slug);
    if (!e) { e = { candidate_slug: slug, accounts: [] }; data.push(e); }
    for (const c of comptes) if (!e.accounts.some((a: any) => a.platform === c.platform && a.handle.toLowerCase() === c.handle.toLowerCase())) e.accounts.push(c);
  }
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`Écrit : ${OUT}`);
}
main();
