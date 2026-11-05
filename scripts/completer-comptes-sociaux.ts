/**
 * OUTIL : complète les comptes suivis par la veille réseaux sociaux (onglet Dynamiques).
 *
 *   • comptes PERSONNELS des candidats sur X, Instagram, TikTok et Facebook, lus dans Wikidata
 *     (propriétés P2002, P2003, P7085, P2013 de la fiche liée à l'article Wikipédia du candidat) ;
 *   • comptes des PARTIS (political_parties : twitter, facebook, instagram, tiktok), rattachés
 *     comme comptes « de soutien » aux candidats du parti, avec le nom du parti en libellé.
 *
 * Même règle de sûreté que verify-candidate-socials.ts : un compte n'est retenu que si la
 * plateforme elle-même confirme l'identité — nom affiché conforme ET plus de 5 000 abonnés.
 * La lecture passe par Agentik (0,00188 $ le compte). Ne touche jamais un compte déjà suivi.
 *
 * Usage :
 *   npx tsx --env-file=<.env avec AGENTIK_API_KEY et Supabase> scripts/completer-comptes-sociaux.ts           # affiche
 *   ... --ecrire                                                                                           # enregistre
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ECRIRE = process.argv.includes("--ecrire");
const MIN_ABONNES = 5000;
const UA = { "User-Agent": "lapolitiquecestsimple-veille/1.0 (https://lapolitiquecestsimple.fr)" };

type Plateforme = "x" | "instagram" | "tiktok" | "facebook";

/** Parti de chaque candidat déclaré (slug political_parties). Sans parti suivable : absent. */
const PARTI_DU_CANDIDAT: Record<string, string> = {
  "jean-luc-melenchon": "la-france-insoumise", "marine-le-pen": "rassemblement-national", "bruno-retailleau": "les-republicains",
  "gabriel-attal": "renaissance", "edouard-philippe": "horizons", "marine-tondelier": "les-ecologistes",
  "fabien-roussel": "parti-communiste-francais", "karim-bouamrane": "parti-socialiste", "david-lisnard": "nouvelle-energie",
  "florian-philippot": "les-patriotes", "nathalie-arthaud": "lutte-ouvriere", "nicolas-dupont-aignan": "debout-la-france",
  "francois-ruffin": "debout-ruffin", "francois-asselineau": "union-populaire-republicaine", "lydie-massard": "union-democratique-bretonne",
  "bernard-cazeneuve": "la-convention",
};
/**
 * Comptes trouvés à la main (absents de Wikidata ou de political_parties), soumis à la même
 * vérification : `attendu` doit figurer dans le nom affiché. « Avec Édouard » : les comptes de
 * campagne d'Édouard Philippe (Horizons) ; @renaissance : le X du parti (ex-@enmarchefr).
 */
const MANUELS: { slug: string; p: Plateforme; h: string; kind: "official" | "support"; label: string | null; attendu: string }[] = [
  { slug: "edouard-philippe", p: "instagram", h: "avecedouard", kind: "support", label: "Horizons", attendu: "avec edouard" },
  { slug: "edouard-philippe", p: "facebook", h: "AvecEdouard", kind: "support", label: "Horizons", attendu: "avec edouard" },
  { slug: "gabriel-attal", p: "x", h: "renaissance", kind: "support", label: "Renaissance", attendu: "renaissance" },
];
/** Candidats qui ne portent plus les couleurs d'un parti (comptes de soutien à retirer). */
const SANS_PARTI = ["xavier-bertrand"];

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const handleDe = (p: Plateforme, v: string) => {
  const t = v.trim().replace(/\/+$/, "");
  if (p === "facebook") return t.replace(/^https?:\/\/(www\.)?facebook\.com\//i, "");
  return t.replace(/^https?:\/\/(www\.)?(x|twitter|instagram|tiktok)\.com\//i, "").replace(/^@/, "");
};
const urlDe = (p: Plateforme, h: string) => ({ x: `https://x.com/${h}`, instagram: `https://www.instagram.com/${h}/`, tiktok: `https://www.tiktok.com/@${h}`, facebook: `https://www.facebook.com/${h}` })[p];

let depense = 0, appels = 0;
async function agentik(outil: string, input: Record<string, string>): Promise<any | null> {
  appels++;
  const r = await fetch("https://api.agentik.cc/v1/run", {
    method: "POST", signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${process.env.AGENTIK_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
    body: JSON.stringify({ tool_id: outil, input }),
  }).catch(() => null);
  const j: any = await r?.json().catch(() => null);
  depense += Number(j?.price_billed_usd || 0);
  return r?.ok && j?.status === "COMPLETED" ? j.output : null;
}

/** Nom affiché et abonnés, tels que la plateforme les donne. */
async function profil(p: Plateforme, h: string): Promise<{ nom: string; abonnes: number } | null> {
  if (p === "x") { const u = (await agentik("scrapecreators/get-v1-twitter-profile", { handle: h }))?.legacy; return u ? { nom: u.name, abonnes: Number(u.followers_count) } : null; }
  if (p === "instagram") { const u = (await agentik("scrapecreators/get-v1-instagram-profile", { handle: h }))?.data?.user; return u ? { nom: u.full_name, abonnes: Number(u.edge_followed_by?.count) } : null; }
  if (p === "tiktok") { const o = await agentik("scrapecreators/get-v1-tiktok-profile", { handle: h }); const st = o?.statsV2 ?? o?.stats; return st ? { nom: o?.user?.nickname ?? "", abonnes: Number(st.followerCount) } : null; }
  const o = await agentik("scrapecreators/get-v1-facebook-profile", { url: urlDe("facebook", h) });
  return o ? { nom: o.name, abonnes: Number(o.followerCount) } : null;
}

/** Comptes déclarés dans Wikidata pour l'article Wikipédia (fr) qui porte ce titre. */
async function wikidata(titre: string): Promise<Partial<Record<Plateforme, string>>> {
  const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&sites=frwiki&titles=${encodeURIComponent(titre)}&props=claims&format=json`, { headers: UA });
  const e: any = Object.values((await r.json())?.entities || {})[0];
  if (!e?.claims) return {};
  const valeur = (pid: string) => {
    // La valeur « préférée » d'abord, sinon la première non dépréciée.
    const c = (e.claims[pid] || []).filter((x: any) => x.rank !== "deprecated");
    const v = (c.find((x: any) => x.rank === "preferred") || c[0])?.mainsnak?.datavalue?.value;
    return typeof v === "string" ? v : undefined;
  };
  return { x: valeur("P2002"), instagram: valeur("P2003"), tiktok: valeur("P7085"), facebook: valeur("P2013") };
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  if (!process.env.AGENTIK_API_KEY) throw new Error("AGENTIK_API_KEY requise pour vérifier les comptes.");
  const { data: cands } = await sb.from("presidential_candidates").select("id, slug, full_name").eq("status", "declared");
  const { data: comptes } = await sb.from("candidate_social_accounts").select("id, candidate_id, platform, handle, kind, active");
  const { data: partis } = await sb.from("political_parties").select("slug, name, abbrev, twitter, facebook, instagram, tiktok");
  const parti = new Map((partis || []).map((p: any) => [p.slug, p]));
  const suivi = (cid: string, p: string, kind: string) => (comptes || []).some((a: any) => a.candidate_id === cid && a.platform === p && a.kind === kind && a.active);
  const dejaLu = new Map<string, Promise<{ nom: string; abonnes: number } | null>>();
  const lire = (p: Plateforme, h: string) => { const k = `${p}|${h.toLowerCase()}`; if (!dejaLu.has(k)) dejaLu.set(k, profil(p, h)); return dejaLu.get(k)!; };

  const ajouts: any[] = []; const rejets: string[] = [];
  for (const c of cands || []) {
    // 1. Comptes personnels (Wikidata), sur les plateformes où le candidat n'en a pas encore.
    const wd = await wikidata(c.full_name);
    const famille = norm(c.full_name).split(" ").slice(-1)[0];
    for (const p of ["x", "instagram", "tiktok", "facebook"] as Plateforme[]) {
      if (!wd[p] || suivi(c.id, p, "official")) continue;
      const h = handleDe(p, wd[p]!);
      const lu = await lire(p, h);
      const ok = lu && norm(lu.nom).includes(famille) && lu.abonnes >= MIN_ABONNES;
      if (!ok) { rejets.push(`${c.slug} ${p} @${h} : ${lu ? `« ${lu.nom} », ${lu.abonnes} abonnés` : "illisible"}`); continue; }
      ajouts.push({ candidate_id: c.id, platform: p, handle: p === "facebook" ? h : `@${h}`, url: urlDe(p, h), kind: "official", label: null, active: true, _info: `${c.slug} ${p} « ${lu!.nom} » ${lu!.abonnes}` });
    }
    // 2. Comptes du parti, comme comptes de soutien.
    const ps = parti.get(PARTI_DU_CANDIDAT[c.slug]);
    if (!ps) continue;
    const motsParti = [norm(ps.abbrev || ""), ...norm(ps.name).split(" ").filter((m: string) => m.length >= 4)].filter(Boolean);
    for (const [p, col] of [["x", "twitter"], ["instagram", "instagram"], ["tiktok", "tiktok"], ["facebook", "facebook"]] as [Plateforme, string][]) {
      if (!ps[col] || suivi(c.id, p, "support")) continue;
      const h = handleDe(p, ps[col]);
      const lu = await lire(p, h);
      const nomLu = ` ${norm(lu?.nom || "")} `;
      const ok = lu && motsParti.some(m => nomLu.includes(` ${m} `)) && lu.abonnes >= MIN_ABONNES;
      if (!ok) { rejets.push(`${c.slug} parti ${ps.abbrev} ${p} ${h} : ${lu ? `« ${lu.nom} », ${lu.abonnes} abonnés` : "illisible"}`); continue; }
      ajouts.push({ candidate_id: c.id, platform: p, handle: p === "facebook" ? h : `@${h}`, url: urlDe(p, h), kind: "support", label: ps.name, active: true, _info: `${c.slug} parti ${ps.abbrev} ${p} « ${lu!.nom} » ${lu!.abonnes}` });
    }
  }

  for (const m of MANUELS) {
    const c = (cands || []).find((x: any) => x.slug === m.slug);
    if (!c || (comptes || []).some((a: any) => a.candidate_id === c.id && a.platform === m.p && a.active && a.handle.replace(/^@/, "").toLowerCase() === m.h.toLowerCase())) continue;
    const lu = await lire(m.p, m.h);
    if (!lu || !norm(lu.nom).includes(m.attendu) || lu.abonnes < MIN_ABONNES) { rejets.push(`${m.slug} ${m.p} ${m.h} (manuel) : ${lu ? `« ${lu.nom} », ${lu.abonnes}` : "illisible"}`); continue; }
    ajouts.push({ candidate_id: c.id, platform: m.p, handle: m.p === "facebook" ? m.h : `@${m.h}`, url: urlDe(m.p, m.h), kind: m.kind, label: m.label, active: true, _info: `${m.slug} (manuel) ${m.p} « ${lu.nom} » ${lu.abonnes}` });
  }

  console.log(`\n✓ ${ajouts.length} compte(s) vérifié(s) :`); for (const a of ajouts) console.log(`  + ${a._info}`);
  console.log(`\n✗ ${rejets.length} écarté(s) :`); for (const r of rejets) console.log(`  - ${r}`);
  const aRetirer = (comptes || []).filter((a: any) => a.active && a.kind === "support" && SANS_PARTI.includes((cands || []).find((c: any) => c.id === a.candidate_id)?.slug));
  console.log(`\n${aRetirer.length} compte(s) de parti à retirer (candidats sans parti : ${SANS_PARTI.join(", ")}).`);
  console.log(`Agentik : ${appels} appel(s), ${depense.toFixed(4)} $.`);
  if (!ECRIRE) { console.log("\n(lecture seule : --ecrire pour enregistrer)"); return; }
  const lignes = ajouts.map(({ _info, ...a }) => a);
  const { error } = await sb.from("candidate_social_accounts").upsert(lignes, { onConflict: "candidate_id,platform,handle" });
  if (error) throw error;
  if (aRetirer.length) await sb.from("candidate_social_accounts").update({ active: false }).in("id", aRetirer.map((a: any) => a.id));
  // Même nom de parti partout (vue « Partis ») : les comptes de soutien déjà suivis prennent celui du parti.
  for (const c of cands || []) {
    const ps = parti.get(PARTI_DU_CANDIDAT[c.slug]); if (!ps) continue;
    await sb.from("candidate_social_accounts").update({ label: ps.name }).eq("candidate_id", c.id).eq("kind", "support").is("label", null);
  }
  console.log(`Enregistré : ${lignes.length} ajout(s), ${aRetirer.length} retrait(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
