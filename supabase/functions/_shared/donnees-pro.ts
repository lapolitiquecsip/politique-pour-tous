/**
 * Accès en lecture aux données Pro, partagé par l'Explorer IA (fonction « explorer ») et le
 * connecteur MCP (fonction « mcp ») : chaque outil renvoie des éléments courts, datés et reliés
 * à leur source officielle. Appelé avec le client service : le contrôle « membre Pro » est fait
 * en amont par chaque fonction.
 */
// deno-lint-ignore-file no-explicit-any
type Client = any;

export type Element = { type: string; titre: string; date: string | null; texte: string; url: string | null };

const plat = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const propre = (t: unknown, n = 700) => String(t ?? "").replace(/<[^>]+>/g, " ").replace(/\[\[|\]\]/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const SITE = "https://lapolitiquecestsimple.fr";

export async function debats(c: Client, requete: string, depuis?: string | null, n = 8): Promise<Element[]> {
  const { data } = await c.rpc("chercher_debats", { p_q: requete, p_depuis: depuis ?? null, p_limite: n });
  return (data || []).map((d: any) => ({ type: "Débat en séance (Assemblée)", titre: `${d.orateur ?? ""}${d.qualite ? `, ${d.qualite}` : ""} — ${d.point ?? ""}`, date: d.date_seance, texte: propre(d.extrait), url: d.url }));
}

export async function questions(c: Client, requete: string, depuis?: string | null, statut?: string | null, n = 6): Promise<Element[]> {
  const { data } = await c.rpc("chercher_questions", { p_q: requete, p_depuis: depuis ?? null, p_statut: statut ?? null, p_limite: n });
  return (data || []).map((q: any) => ({ type: q.type === "QG" ? "Question au Gouvernement" : "Question écrite", titre: `${q.objet ?? ""} (${q.groupe ?? "?"}) → ${q.ministere ?? ""} · ${q.statut}`, date: q.date_question, texte: propre(q.extrait), url: q.url }));
}

export async function amendements(c: Client, requete: string, depuis?: string | null, n = 6): Promise<Element[]> {
  const q = requete.split(/\s+or\s+/i).map(m => `"${plat(m).replace(/"/g, " ").trim()}"`).join(" or ");
  const lire = (table: string, chambre: string) => {
    let r = c.from(table).select("numero, auteur, groupe, texte_titre, division, sort, dispositif, expose, url, vu_le").textSearch("recherche", q, { type: "websearch", config: "french" }).order("vu_le", { ascending: false }).limit(n);
    if (depuis) r = r.gte("vu_le", depuis);
    return r.then(({ data }: any) => (data || []).map((a: any) => ({ type: `Amendement (${chambre})`, titre: `N° ${a.numero} de ${a.auteur ?? "?"} (${a.groupe ?? "?"}) sur « ${propre(a.texte_titre, 120)} », ${a.division ?? ""} — ${a.sort ?? "pas encore examiné"}`, date: a.vu_le, texte: propre(`${a.dispositif ?? ""} — Exposé : ${a.expose ?? ""}`), url: a.url ?? `${SITE}/premium/#amendements` })));
  };
  const [an, sen] = await Promise.all([lire("amendements_an", "Assemblée"), lire("amendements_senat", "Sénat")]);
  return [...an, ...sen];
}

export async function quiPese(c: Client, sujet: string, depuis?: string | null, n = 10): Promise<Element[]> {
  const { data } = await c.rpc("cartographie_sujet", { p_q: sujet, p_depuis: depuis ?? null, p_limite: n });
  return (data || []).map((a: any) => ({ type: "Parlementaire actif sur le sujet", titre: `${a.nom} (${a.groupe ?? "?"}${a.chambre === "SENAT" ? ", Sénat" : ""})`, date: null,
    texte: `${a.interventions} intervention(s) en séance, ${a.questions ?? 0} question(s), ${a.amendements} amendement(s) dont ${a.adoptes} adopté(s) ; score ${a.score} (1 par intervention ou question, 2 par amendement, 5 par adopté).`,
    url: `${SITE}/${a.chambre === "SENAT" ? "senateurs" : "deputes"}/${a.slug}` }));
}

export async function lobbying(c: Client, sujet: string, n = 6): Promise<Element[]> {
  const { data } = await c.rpc("lobbying_sujet", { p_q: sujet, p_depuis: new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10), p_limite: n });
  return (data || []).map((o: any) => ({ type: "Représentant d'intérêts (HATVP)", titre: `${o.organisation} — ${o.activites} activité(s) déclarée(s)`, date: o.derniere,
    texte: `Objets récents : ${(o.objets || []).map((x: string) => `« ${propre(x, 200)} »`).join(" ; ")}. Décideurs ciblés : ${(o.cibles || []).join(" ; ")}.`, url: o.url }));
}

export async function lois(c: Client, requete: string, n = 5): Promise<Element[]> {
  const { data } = await c.rpc("public_legislative_dossiers", { p_status: null, p_chamber: null, p_category: null, p_search: requete, p_cursor_date: null, p_cursor_id: null, p_limit: n });
  return (data || []).map((d: any) => ({ type: "Texte législatif", titre: `${d.title} — ${d.status_label ?? ""}`, date: d.latest_step_at, texte: propre(d.summary, 600), url: `${SITE}/lois/?dossier=${d.id}` }));
}

/** Présentation numérotée pour un modèle : « [3] Type — titre (date) : texte ». */
export const enSources = (l: Element[]) => l.map((e, i) => `[${i + 1}] ${e.type} — ${e.titre}${e.date ? ` (${String(e.date).slice(0, 10)})` : ""} : ${e.texte}`).join("\n");
