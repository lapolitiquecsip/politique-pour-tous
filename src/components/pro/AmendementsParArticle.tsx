"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, Download, ExternalLink, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { telechargerCsv } from "@/lib/csv";

/**
 * Les amendements d'un texte, article par article (Pro) — comme on travaille une liasse.
 *
 * Pour chaque article : nombre d'amendements, sorts (adoptés, rejetés, en attente), groupes
 * qui ont déposé. À l'ouverture, le contenu de l'article est lu et les amendements IDENTIQUES
 * (même dispositif, souvent déposés par plusieurs groupes) sont regroupés : on voit d'un coup
 * qui porte la même rédaction. Export du texte entier ou d'un article en Excel ou en Word.
 *
 * Ordre des articles : celui de la liasse à l'Assemblée (colonne `ordre`) ; au Sénat, le
 * numéro d'article (« Article 5 bis » après « Article 5 », « Après l'article 5 » ensuite).
 */

type Ligne = { uid: string; numero: string; division: string | null; ordre: string | null; sort: string | null; auteur: string | null; groupe: string | null; nb_cosignataires: number | null; sous_amendement: boolean; url: string | null };
type Contenu = { uid: string; dispositif: string | null; expose: string | null };
type Chambre = "an" | "senat";

const LEGERES = "uid, numero, division, ordre, sort, auteur, groupe, nb_cosignataires, sous_amendement, url";
const propre = (t: string | null) => (t || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "’").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
/** Empreinte d'un dispositif : sans balises, ponctuation ni casse (deux dépôts identiques peuvent différer d'une espace). */
const empreinte = (t: string | null) => propre(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const SUFFIXES = ["", "bis", "ter", "quater", "quinquies", "sexies", "septies", "octies", "nonies", "decies", "undecies", "duodecies", "terdecies", "quaterdecies"];
/** Clé de tri d'une division : « Article 5 bis » après « Article 5 » ; « Après l'article 5 » après les deux. */
function cleDivision(d: string | null): number {
  const t = (d || "").toLowerCase();
  const m = t.match(/article\s+(premier|1er|liminaire|\d+)\s*([a-z]+)?\s*([a-z])?\b/);
  if (!m) return /titre|intitul/.test(t) ? 1e9 : 9e8;
  const n = m[1] === "liminaire" ? 0 : m[1] === "premier" || m[1] === "1er" ? 1 : Number(m[1]);
  const suf = Math.max(0, SUFFIXES.indexOf(m[2] || ""));
  const avantApres = /^avant/.test(t) ? -0.5 : /^apr[eè]s/.test(t) ? 0.9 : 0;
  return n * 1000 + suf * 10 + (m[3] ? m[3].charCodeAt(0) - 96 : 0) / 100 + avantApres * 100;
}

const compteSorts = (l: Ligne[]) => ({
  adoptes: l.filter(a => a.sort === "Adopté").length,
  rejetes: l.filter(a => a.sort === "Rejeté").length,
  attente: l.filter(a => !a.sort).length,
  autres: l.filter(a => a.sort && a.sort !== "Adopté" && a.sort !== "Rejeté").length,
});

async function toutLire<T>(chambre: Chambre, texte: string, colonnes: string): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; de < 20000; de += 1000) {
    const { data, error } = await supabase.from(chambre === "senat" ? "amendements_senat" : "amendements_an").select(colonnes).eq("texte_uid", texte).order("uid").range(de, de + 999);
    if (error) throw error;
    out.push(...((data as T[]) || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/* ───────────────────────────── Exports ───────────────────────────── */

const telecharger = (blob: Blob, nom: string) => {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  // Dans la page, sinon Firefox ignore le clic sur un lien détaché.
  a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
};

function exporterCsv(titre: string, chambre: Chambre, lignes: (Ligne & Partial<Contenu>)[], identiques: Map<string, string>) {
  const nom = nomFichier(`${chambre}-${titre}`, "csv").replace(/-\d{4}-\d{2}-\d{2}\.csv$/, "");
  telechargerCsv(nom, ["Article", "N°", "Sort", "Auteur", "Groupe", "Cosignataires", "Identique à", "Dispositif", "Exposé sommaire", "Lien officiel"],
    lignes.map(a => [a.division, a.numero, a.sort || "Pas encore examiné", a.auteur, a.groupe, a.nb_cosignataires || 0, identiques.get(a.uid) || "", propre(a.dispositif ?? null), propre(a.expose ?? null), a.url]));
}
const nomFichier = (titre: string, ext: string) => `amendements-${titre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-${new Date().toISOString().slice(0, 10)}.${ext}`;

async function exporterExcel(titre: string, chambre: Chambre, lignes: (Ligne & Partial<Contenu>)[], identiques: Map<string, string>) {
  const ExcelJS = (await import("exceljs")).default;
  const classeur = new ExcelJS.Workbook();
  classeur.creator = "La politique, c'est simple";
  const f = classeur.addWorksheet("Amendements", { views: [{ state: "frozen", ySplit: 1 }] });
  f.columns = [
    { header: "Article", key: "division", width: 22 }, { header: "N°", key: "numero", width: 10 }, { header: "Sort", key: "sort", width: 14 },
    { header: "Auteur", key: "auteur", width: 26 }, { header: "Groupe", key: "groupe", width: 12 }, { header: "Cosignataires", key: "cosig", width: 12 },
    { header: "Identique à", key: "identique", width: 22 }, { header: "Dispositif", key: "dispositif", width: 70 }, { header: "Exposé sommaire", key: "expose", width: 70 },
    { header: "Lien officiel", key: "url", width: 40 },
  ];
  for (const a of lignes) f.addRow({ division: a.division, numero: a.numero, sort: a.sort || "Pas encore examiné", auteur: a.auteur, groupe: a.groupe, cosig: a.nb_cosignataires || 0,
    identique: identiques.get(a.uid) || "", dispositif: propre(a.dispositif ?? null), expose: propre(a.expose ?? null), url: a.url ? { text: "Ouvrir", hyperlink: a.url } : "" });
  f.getRow(1).font = { bold: true }; f.autoFilter = { from: "A1", to: "J1" };
  f.getColumn("dispositif").alignment = { wrapText: true, vertical: "top" }; f.getColumn("expose").alignment = { wrapText: true, vertical: "top" };
  telecharger(new Blob([await classeur.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nomFichier(`${chambre}-${titre}`, "xlsx"));
}

function exporterWord(titre: string, chambre: Chambre, lignes: (Ligne & Partial<Contenu>)[], identiques: Map<string, string>) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parArticle = new Map<string, (Ligne & Partial<Contenu>)[]>();
  for (const a of lignes) parArticle.set(a.division || "Sans article", [...(parArticle.get(a.division || "Sans article") || []), a]);
  const corps = [...parArticle].sort((a, b) => cleDivision(a[0]) - cleDivision(b[0])).map(([art, l]) => {
    const s = compteSorts(l);
    return `<h2>${esc(art)}</h2><p class="meta">${l.length} amendement${l.length > 1 ? "s" : ""} · ${s.adoptes} adopté(s) · ${s.rejetes} rejeté(s) · ${s.attente} en attente</p>` +
      l.map(a => `<h3>N° ${esc(a.numero)} — ${esc(a.auteur || "")}${a.groupe ? ` (${esc(a.groupe)})` : ""} — ${esc(a.sort || "Pas encore examiné")}</h3>` +
        (identiques.get(a.uid) ? `<p class="meta">Identique à : ${esc(identiques.get(a.uid)!)}</p>` : "") +
        `<p><b>Dispositif.</b> ${esc(propre(a.dispositif ?? null))}</p>` + (a.expose ? `<p><b>Exposé sommaire.</b> ${esc(propre(a.expose))}</p>` : "") +
        (a.url ? `<p class="meta"><a href="${esc(a.url)}">${esc(a.url)}</a></p>` : "")).join("");
  }).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titre)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}h1{font-size:18pt}h2{font-size:14pt;margin-top:18pt;border-bottom:1px solid #999}h3{font-size:11pt;margin:10pt 0 2pt}.meta{color:#555;font-size:9pt}</style></head>
<body><h1>Amendements — ${esc(titre)}</h1><p class="meta">${chambre === "senat" ? "Sénat" : "Assemblée nationale"} · ${lignes.length} amendements · export du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · lapolitiquecestsimple.fr. Seul le texte officiel fait foi.</p>${corps}</body></html>`;
  telecharger(new Blob(["﻿", html], { type: "application/msword" }), nomFichier(`${chambre}-${titre}`, "doc"));
}

/** Regroupe les amendements au dispositif identique : uid → « n° 12, 45 (LFI, EcoS) » (les autres). */
function calculerIdentiques(l: (Ligne & Partial<Contenu>)[]) {
  const groupes = new Map<string, (Ligne & Partial<Contenu>)[]>();
  for (const a of l) { const e = empreinte(a.dispositif ?? null); if (e.length >= 20) groupes.set(e, [...(groupes.get(e) || []), a]); }
  const map = new Map<string, string>();
  for (const g of groupes.values()) if (g.length > 1) for (const a of g) map.set(a.uid, g.filter(x => x !== a).map(x => `n° ${x.numero}${x.groupe ? ` (${x.groupe})` : ""}`).join(", "));
  return { map, groupes: [...groupes.values()].filter(g => g.length > 1) };
}

/* ───────────────────────────── Composant ───────────────────────────── */

export default function AmendementsParArticle({ chambre, texte, titre }: { chambre: Chambre; texte: string; titre: string }) {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [contenus, setContenus] = useState<Map<string, Contenu>>(new Map());
  const [lecture, setLecture] = useState<string | null>(null);
  const [export_, setExport] = useState<"" | "excel" | "word" | "csv">("");

  useEffect(() => {
    let actif = true;
    toutLire<Ligne>(chambre, texte, LEGERES).then(l => { if (actif) { setLignes(l); setErreur(false); } }).catch(() => { if (actif) setErreur(true); });
    return () => { actif = false; };
  }, [chambre, texte]);

  const articles = useMemo(() => {
    if (!lignes) return [];
    const m = new Map<string, Ligne[]>();
    for (const a of lignes) m.set(a.division || "Sans article", [...(m.get(a.division || "Sans article") || []), a]);
    // À l'Assemblée, l'ordre de la liasse ; sinon (ou à défaut) le numéro d'article.
    const minOrdre = (l: Ligne[]) => l.map(a => a.ordre || "").filter(o => /^[a-z]+$/.test(o)).sort()[0] || null;
    return [...m].map(([nom, l]) => ({ nom, l: l.sort((a, b) => (a.ordre || "").localeCompare(b.ordre || "") || Number(a.numero.replace(/\D/g, "")) - Number(b.numero.replace(/\D/g, ""))), ordre: minOrdre(l) }))
      .sort((a, b) => (a.ordre && b.ordre ? a.ordre.localeCompare(b.ordre) : cleDivision(a.nom) - cleDivision(b.nom)));
  }, [lignes]);

  const lireContenu = async (uids: string[]) => {
    const manque = uids.filter(u => !contenus.has(u));
    const nouveaux = new Map(contenus);
    for (let i = 0; i < manque.length; i += 150) {
      const { data } = await supabase.from(chambre === "senat" ? "amendements_senat" : "amendements_an").select("uid, dispositif, expose").in("uid", manque.slice(i, i + 150));
      for (const c of (data as Contenu[]) || []) nouveaux.set(c.uid, c);
    }
    setContenus(nouveaux);
    return nouveaux;
  };
  const ouvrir = async (nom: string, l: Ligne[]) => {
    if (ouvert === nom) { setOuvert(null); return; }
    setOuvert(nom); setLecture(nom);
    await lireContenu(l.map(a => a.uid)).catch(() => {});
    setLecture(null);
  };
  const exporter = async (format: "excel" | "word" | "csv", l: Ligne[], nom: string) => {
    setExport(format);
    try {
      const c = await lireContenu(l.map(a => a.uid));
      const complets = l.map(a => ({ ...a, ...(c.get(a.uid) || {}) }));
      const { map } = calculerIdentiques(complets);
      if (format === "excel") await exporterExcel(nom, chambre, complets, map);
      else if (format === "csv") exporterCsv(nom, chambre, complets, map);
      else exporterWord(nom, chambre, complets, map);
    } finally { setExport(""); }
  };

  if (erreur) return <p className="mt-4 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200">Les amendements de ce texte n&apos;ont pas pu être chargés. Réessayez dans un instant.</p>;
  if (!lignes) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-sky-300" /></div>;
  const total = compteSorts(lignes);
  const bouton = "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[12px] font-bold text-white transition hover:bg-white/10 disabled:opacity-50";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
        <p className="text-[13px] text-white/70">
          <strong className="text-white">{lignes.length.toLocaleString("fr-FR")} amendements</strong> sur {articles.length} article{articles.length > 1 ? "s" : ""} ·{" "}
          <span className="text-emerald-300">{total.adoptes} adoptés</span> · <span className="text-rose-300">{total.rejetes} rejetés</span> · <span className="text-amber-200">{total.attente} en attente</span>
        </p>{" "}
        <div className="flex gap-2">
          <button type="button" disabled={!!export_} onClick={() => exporter("excel", lignes, titre)} className={bouton}>
            {export_ === "excel" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel (tout le texte)
          </button>{" "}
          <button type="button" disabled={!!export_} onClick={() => exporter("word", lignes, titre)} className={bouton}>
            {export_ === "word" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Word
          </button>{" "}
          <button type="button" disabled={!!export_} onClick={() => exporter("csv", lignes, titre)} className={bouton}>
            {export_ === "csv" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} CSV
          </button>
        </div>
      </div>{" "}
      {lignes.length > 2000 && <p className="mt-2 text-[12px] text-white/50">Gros texte : l&apos;export complet lit tous les dispositifs et peut prendre une minute. Exporter un article est immédiat.</p>}

      <ul className="mt-3 space-y-2">
        {articles.map(({ nom, l }) => {
          const s = compteSorts(l);
          const groupes = [...l.reduce((m, a) => m.set(a.groupe || "—", (m.get(a.groupe || "—") || 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
          const estOuvert = ouvert === nom;
          const complets = estOuvert ? l.map(a => ({ ...a, ...(contenus.get(a.uid) || {}) })) : [];
          const { map: ident, groupes: lots } = estOuvert ? calculerIdentiques(complets) : { map: new Map<string, string>(), groupes: [] as (Ligne & Partial<Contenu>)[][] };
          return (
            <li key={nom} className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
              <button type="button" onClick={() => ouvrir(nom, l)} aria-expanded={estOuvert} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 p-4 text-left">
                <span className="min-w-0 flex-1 basis-48 font-bold text-white">{nom}</span>{" "}
                <span className="text-[12px] text-white/60"><strong className="text-white">{l.length}</strong> · <span className="text-emerald-300">{s.adoptes} adopt.</span> · <span className="text-rose-300">{s.rejetes} rej.</span>{s.attente ? <> · <span className="text-amber-200">{s.attente} en attente</span></> : null}</span>{" "}
                <span className="hidden flex-wrap gap-1 md:flex">{groupes.slice(0, 5).map(([g, n]) => <span key={g} className="rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-bold text-white/75">{g} {n}</span>)}</span>{" "}
                <ChevronDown size={16} className={`text-white/50 transition ${estOuvert ? "rotate-180" : ""}`} />
              </button>{" "}
              {estOuvert && (
                <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
                  {lecture === nom ? <div className="flex justify-center py-4"><Loader2 className="animate-spin text-sky-300" /></div> : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {lots.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-200"><Copy size={12} /> {lots.length} rédaction{lots.length > 1 ? "s" : ""} déposée{lots.length > 1 ? "s" : ""} à l&apos;identique</span>}{" "}
                        <button type="button" disabled={!!export_} onClick={() => exporter("excel", l, `${titre} — ${nom}`)} className={bouton}><FileSpreadsheet size={13} /> Excel</button>{" "}
                        <button type="button" disabled={!!export_} onClick={() => exporter("word", l, `${titre} — ${nom}`)} className={bouton}><FileText size={13} /> Word</button>
                      </div>{" "}
                      {/* Les rédactions identiques d'abord : qui porte la même chose. */}
                      {lots.map((g, i) => (
                        <div key={i} className="rounded-xl bg-sky-500/[0.07] p-3 ring-1 ring-sky-400/20">
                          <p className="text-[12px] font-bold text-sky-100">{g.length} amendements identiques : {g.map(a => `n° ${a.numero}${a.groupe ? ` (${a.groupe})` : ""}`).join(", ")} — {g[0].sort || "pas encore examinés"}</p>{" "}
                          <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-white/75">{propre(g[0].dispositif ?? null)}</p>
                        </div>
                      ))}{" "}
                      <ul className="divide-y divide-white/10">
                        {complets.filter(a => !ident.has(a.uid)).map(a => (
                          <li key={a.uid} className="py-2.5 text-[13px]">
                            <p className="text-white"><strong>N° {a.numero}</strong> · {a.auteur}{a.groupe ? ` (${a.groupe})` : ""} · <span className={a.sort === "Adopté" ? "text-emerald-300" : a.sort === "Rejeté" ? "text-rose-300" : "text-white/60"}>{a.sort || "pas encore examiné"}</span>{" "}
                              {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center text-white/50 hover:text-white" aria-label="Texte officiel"><ExternalLink size={12} /></a>}</p>{" "}
                            <p className="mt-1 line-clamp-2 leading-relaxed text-white/65">{propre(a.dispositif ?? null)}</p>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
