import { supabase } from "@/lib/supabase";

/**
 * Note de synthèse prête à envoyer (Pro) : la synthèse « Tout sur un sujet » mise en page, plus
 * le volet parlementaire calculé au moment de l'export — qui pèse sur le sujet (interventions,
 * amendements déposés et adoptés) et les dernières prises de parole en séance. Chaque affirmation
 * renvoie à une source numérotée ; aucune IA de plus. Export en Word, ou en PDF par l'impression.
 */

type Point = { titre: string; detail?: string; points?: string[]; sources?: number[] };
type Aide = { titre: string; pour_qui?: string; detail?: string; montants?: { cas?: string; montant?: string }[]; conditions?: string[]; demarche?: string; sources?: number[] };
export type BriefNote = {
  sujet?: string; en_bref?: string; chiffres_cles?: { valeur: string; libelle?: string; source?: number | null }[];
  regles?: Point[]; aides?: Aide[]; en_cours?: Point[]; a_savoir?: string[]; limites?: string;
};
export type SourceNote = { title: string; url: string | null; date: string | null; groupe?: string };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const renvois = (l?: (number | null | undefined)[]) => (l || []).filter((n): n is number => typeof n === "number").map(n => `<sup>[${n}]</sup>`).join("");
const jour = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

async function voletParlementaire(sujet: string) {
  const depuis = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const [qui, debats] = await Promise.all([
    supabase.rpc("cartographie_sujet", { p_q: sujet, p_depuis: depuis, p_limite: 10 }),
    supabase.rpc("chercher_debats", { p_q: sujet, p_depuis: depuis, p_limite: 5 }),
  ]);
  return {
    qui: (qui.data as { nom: string; groupe: string | null; chambre: string; interventions: number; amendements: number; adoptes: number }[]) || [],
    debats: (debats.data as { orateur: string | null; qualite: string | null; date_seance: string; point: string | null; extrait: string; url: string | null }[]) || [],
  };
}

export async function construireNote(brief: BriefNote, sources: SourceNote[], motCle: string, verifieLe?: string | null): Promise<{ titre: string; html: string }> {
  const titre = brief.sujet || motCle;
  const p = await voletParlementaire(motCle).catch(() => ({ qui: [], debats: [] }));
  const points = (titreSection: string, l?: Point[]) => (l?.length ? `<h2>${esc(titreSection)}</h2>` + l.map(x =>
    `<h3>${esc(x.titre)}${renvois(x.sources)}</h3>${x.detail ? `<p>${esc(x.detail)}</p>` : ""}${x.points?.length ? `<ul>${x.points.map(y => `<li>${esc(y)}</li>`).join("")}</ul>` : ""}`).join("") : "");
  const corps = [
    `<h1>${esc(titre)}</h1>`,
    `<p class="meta">Note du ${jour(new Date().toISOString())}${verifieLe ? ` · droit en vigueur vérifié le ${jour(verifieLe)}` : ""} · La politique, c'est simple (lapolitiquecestsimple.fr)</p>`,
    brief.en_bref ? `<p class="bref">${esc(brief.en_bref)}</p>` : "",
    brief.chiffres_cles?.length ? `<h2>Chiffres clés</h2><table>${brief.chiffres_cles.map(c => `<tr><td class="v">${esc(c.valeur)}</td><td>${esc(c.libelle)}${renvois([c.source])}</td></tr>`).join("")}</table>` : "",
    points("Ce que dit le droit", brief.regles),
    brief.aides?.length ? `<h2>Aides et dispositifs</h2>` + brief.aides.map(a => `<h3>${esc(a.titre)}${renvois(a.sources)}</h3>${a.pour_qui ? `<p><i>Pour qui :</i> ${esc(a.pour_qui)}</p>` : ""}${a.detail ? `<p>${esc(a.detail)}</p>` : ""}${a.montants?.length ? `<ul>${a.montants.map(m => `<li>${esc(m.cas)} : <b>${esc(m.montant)}</b></li>`).join("")}</ul>` : ""}`).join("") : "",
    points("En discussion", brief.en_cours),
    p.qui.length ? `<h2>Qui pèse au Parlement (12 derniers mois)</h2><table><tr><th>Parlementaire</th><th>Groupe</th><th>Interventions</th><th>Amendements</th><th>Adoptés</th></tr>${p.qui.map(a => `<tr><td>${esc(a.nom)}</td><td>${esc(a.groupe)}${a.chambre === "SENAT" ? " (Sénat)" : ""}</td><td>${a.interventions}</td><td>${a.amendements}</td><td>${a.adoptes}</td></tr>`).join("")}</table>` : "",
    p.debats.length ? `<h2>Dernières prises de parole en séance</h2>` + p.debats.map(d => `<p><b>${esc(d.orateur)}</b>${d.qualite ? `, ${esc(d.qualite)}` : ""} — ${jour(d.date_seance)}${d.point ? `, « ${esc(d.point)} »` : ""} :<br>« ${esc(d.extrait.replace(/\[\[|\]\]/g, ""))} »${d.url ? ` <a href="${esc(d.url)}">compte rendu</a>` : ""}</p>`).join("") : "",
    brief.a_savoir?.length ? `<h2>À savoir</h2><ul>${brief.a_savoir.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "",
    brief.limites ? `<p class="meta"><i>Limites :</i> ${esc(brief.limites)}</p>` : "",
    sources.length ? `<h2>Sources</h2><ol>${sources.map(s => `<li>${esc(s.title)}${s.date ? ` (${jour(s.date)})` : ""}${s.url ? ` — <a href="${esc(s.url)}">${esc(s.url)}</a>` : ""}</li>`).join("")}</ol>` : "",
    `<p class="meta">Synthèse rédigée par intelligence artificielle à partir des sources officielles listées, volet parlementaire calculé sur les données de l'Assemblée et du Sénat. Seuls les textes officiels font foi.</p>`,
  ].join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titre)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;max-width:720px;margin:24px auto;color:#111}h1{font-size:20pt;margin-bottom:2pt}h2{font-size:13pt;margin-top:16pt;border-bottom:1px solid #bbb;padding-bottom:2pt}h3{font-size:11pt;margin:8pt 0 2pt}.meta{color:#555;font-size:9pt}.bref{background:#f3f0ff;padding:8pt;border-left:3px solid #7c3aed}table{border-collapse:collapse;width:100%;font-size:10pt}td,th{border:1px solid #ccc;padding:3pt 5pt;text-align:left}td.v{font-weight:bold;white-space:nowrap}sup{color:#7c3aed}@media print{body{margin:0}}</style></head><body>${corps}</body></html>`;
  return { titre, html };
}

export function telechargerWord(titre: string, html: string) {
  const nom = `note-${titre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-${new Date().toISOString().slice(0, 10)}.doc`;
  const url = URL.createObjectURL(new Blob(["﻿", html], { type: "application/msword" }));
  const a = document.createElement("a"); a.href = url; a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** PDF : la note s'ouvre dans un nouvel onglet avec la boîte d'impression (« Enregistrer en PDF »). */
export function imprimerPdf(html: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  // Une seule boîte d'impression, une fois la page dessinée.
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* fenêtre fermée */ } }, 600);
  return true;
}
