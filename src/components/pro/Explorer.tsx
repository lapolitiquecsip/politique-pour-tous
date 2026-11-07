"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Copy, ExternalLink, KeyRound, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Explorer IA (Pro) : une question en français, une réponse rédigée uniquement à partir de nos
 * données — débats en séance, questions au Gouvernement, amendements, qui pèse, lobbying, lois —
 * où chaque phrase renvoie à sa source. 20 questions par jour. Et le connecteur MCP : les mêmes
 * données dans l'assistant de l'abonné (Claude, ChatGPT…), par une adresse personnelle révocable.
 */

type Source = { type: string; titre: string; date: string | null; texte: string; url: string | null };
type Reponse = { reponse: string; sources: Source[]; requete?: string; reste?: number };
type Historique = { id: number; question: string; reponse: string | null; sources: Source[] | null; cree_le: string };
type Cle = { id: number; libelle: string | null; cree_le: string; utilisee_le: string | null; revoquee_le: string | null };
const EXEMPLES = [
  "Qui a défendu l'agrivoltaïsme au Parlement cette année, et qu'ont-ils proposé ?",
  "Quels amendements sur le titre-restaurant ont été adoptés, et par qui ?",
  "Quelles organisations font du lobbying sur l'éolien en mer, et auprès de qui ?",
];

/** « … décidé [2][5]. » → texte, les renvois devenant des liens vers la source. */
function AvecRenvois({ texte, sources }: { texte: string; sources: Source[] }) {
  return <>{texte.split(/(\[\d+\])/g).map((m, i) => {
    const n = m.match(/^\[(\d+)\]$/)?.[1];
    if (!n) return <span key={i}>{m}</span>;
    const s = sources[Number(n) - 1];
    return s?.url ? <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.titre} className="mx-0.5 rounded bg-indigo-500/15 px-1 text-[11px] font-black text-indigo-700 no-underline hover:bg-indigo-500/25 dark:text-indigo-300">{n}</a>
      : <sup key={i} className="mx-0.5 text-[11px] font-black text-indigo-700 dark:text-indigo-300">{n}</sup>;
  })}</>;
}

export default function Explorer() {
  const [question, setQuestion] = useState("");
  const [res, setRes] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [historique, setHistorique] = useState<Historique[]>([]);
  const [cles, setCles] = useState<Cle[]>([]);
  const [nouvelleUrl, setNouvelleUrl] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  const charger = () => {
    supabase.from("explorer_questions").select("id, question, reponse, sources, cree_le").order("cree_le", { ascending: false }).limit(10).then(({ data }) => setHistorique((data as Historique[]) || []));
    supabase.from("mcp_cles").select("id, libelle, cree_le, utilisee_le, revoquee_le").is("revoquee_le", null).order("cree_le", { ascending: false }).then(({ data }) => setCles((data as Cle[]) || []));
  };
  useEffect(() => { charger(); }, []);

  const appeler = async <T,>(body: object) => {
    const { data, error } = await supabase.functions.invoke<T & { error?: string }>("explorer", { body });
    // Les refus (quota, saturation) arrivent avec leur message dans le corps.
    const msg = (data as { error?: string } | null)?.error || (error ? await (error as { context?: Response }).context?.json?.().then((j: { error?: string }) => j?.error).catch(() => null) : null);
    if (msg || error || !data) { setErreur(msg || "L'Explorer ne répond pas, réessayez dans un instant."); return null; }
    return data as T;
  };
  const poser = async (q?: string) => {
    const texte = (q ?? question).trim();
    if (texte.length < 8 || enCours) return;
    setQuestion(texte); setEnCours(true); setErreur(""); setRes(null);
    const r = await appeler<Reponse>({ action: "question", question: texte });
    if (r) { setRes(r); charger(); }
    setEnCours(false);
  };
  const creerCle = async () => {
    const r = await appeler<{ url: string }>({ action: "cle_mcp", libelle: "Mon assistant" });
    if (r) { setNouvelleUrl(r.url); setCopie(false); charger(); }
  };
  const revoquer = async (id: number) => {
    if (!window.confirm("Révoquer cette clé ? L'assistant qui l'utilise n'aura plus accès à vos données.")) return;
    await appeler({ action: "revoquer_mcp", id }); charger();
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-border bg-card p-5 md:p-7">
        <h2 className="flex items-center gap-2 font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground"><Sparkles size={22} className="text-indigo-600" /> Explorer IA</h2>{" "}
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Posez une question comme à un analyste. La réponse est rédigée uniquement à partir des débats en séance, des questions au Gouvernement, des amendements,
          du répertoire des lobbyistes et des textes de loi : chaque phrase renvoie à sa source, cliquable.
        </p>{" "}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <textarea value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); poser(); } }} rows={2} maxLength={500}
            placeholder="Ex. : Qui porte la réforme du titre-restaurant au Parlement, et où en est-elle ?"
            className="min-h-[52px] w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none" />{" "}
          <button type="button" onClick={() => poser()} disabled={enCours || question.trim().length < 8}
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-black text-white transition hover:bg-indigo-800 disabled:opacity-50">
            {enCours ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Demander
          </button>
        </div>{" "}
        {!res && !enCours && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXEMPLES.map(x => <button key={x} type="button" onClick={() => poser(x)} className="rounded-full bg-muted px-3 py-1.5 text-left text-[12px] font-bold text-muted-foreground hover:text-foreground">{x}</button>)}
          </div>
        )}{" "}
        {enCours && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> Recherche dans les débats, les amendements, les questions et le répertoire de la HATVP…</p>}{" "}
        {erreur && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm font-bold text-rose-700 dark:text-rose-200">{erreur}</p>}

        {res && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-indigo-500/[0.06] p-4 text-[15px] leading-relaxed text-foreground ring-1 ring-indigo-500/20"><AvecRenvois texte={res.reponse} sources={res.sources} /></div>{" "}
            {res.sources.length > 0 && (
              <ol className="space-y-1.5">
                {res.sources.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-snug">
                    <span className="w-6 shrink-0 text-right font-black text-indigo-700 dark:text-indigo-300">{i + 1}</span>{" "}
                    <span className="min-w-0">
                      <span className="font-bold text-foreground">{s.type}</span> — {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground hover:underline">{s.titre} <ExternalLink size={10} className="inline" /></a> : <span className="text-muted-foreground">{s.titre}</span>}
                      {s.date && <span className="text-muted-foreground"> · {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}{" "}
            <p className="text-[11.5px] text-muted-foreground">Réponse rédigée par IA à partir des seules sources listées ; vérifiez la source avant de citer.{res.reste != null && ` ${res.reste} question${res.reste > 1 ? "s" : ""} restante${res.reste > 1 ? "s" : ""} aujourd'hui.`}</p>
          </div>
        )}

        {historique.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-[12px] font-black uppercase tracking-widest text-muted-foreground">Mes dernières questions</summary>
            <ul className="mt-2 space-y-1.5">
              {historique.map(h => (
                <li key={h.id}><button type="button" onClick={() => { setQuestion(h.question); if (h.reponse) setRes({ reponse: h.reponse, sources: h.sources || [] }); }}
                  className="w-full rounded-xl px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted">{h.question} <span className="text-muted-foreground">· {new Date(h.cree_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></button></li>
              ))}
            </ul>
          </details>
        )}
      </div>{" "}

      {/* Le connecteur : nos données dans l'assistant de l'abonné. */}
      <div className="rounded-[2rem] border border-border bg-card p-5 md:p-7">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground"><Bot size={18} className="text-indigo-600" /> Nos données dans votre Claude ou ChatGPT</h3>{" "}
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Ajoutez ce connecteur à votre assistant : il pourra chercher lui-même dans les débats, les questions, les amendements, le répertoire des lobbyistes et les textes de loi,
          et citer ses sources. Dans Claude : Paramètres → Connecteurs → Ajouter un connecteur personnalisé, puis collez l&apos;adresse. Dans ChatGPT : Paramètres → Connecteurs (mode développeur).
          L&apos;adresse est personnelle : ne la partagez pas, et révoquez-la si besoin.
        </p>{" "}
        {nouvelleUrl && (
          <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.06] p-4">
            <p className="text-[12px] font-bold text-foreground">Votre adresse de connexion (affichée une seule fois) :</p>{" "}
            <div className="mt-2 flex gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2 text-[12px] text-foreground">{nouvelleUrl}</code>{" "}
              <button type="button" onClick={() => { navigator.clipboard.writeText(nouvelleUrl).then(() => setCopie(true)).catch(() => {}); }} className="inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-3 text-[12px] font-bold text-white">
                {copie ? <Check size={13} /> : <Copy size={13} />} {copie ? "Copiée" : "Copier"}
              </button>
            </div>
          </div>
        )}{" "}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={creerCle} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-black text-white hover:bg-indigo-800"><KeyRound size={15} /> Créer une adresse de connexion</button>{" "}
          {cles.length > 0 && <span className="text-[12px] text-muted-foreground">{cles.length} adresse{cles.length > 1 ? "s" : ""} active{cles.length > 1 ? "s" : ""}</span>}
        </div>{" "}
        {cles.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
            {cles.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <span className="text-foreground">{c.libelle || "Adresse"} · créée le {new Date(c.cree_le).toLocaleDateString("fr-FR")}{" "}
                  <span className="text-muted-foreground">{c.utilisee_le ? `· utilisée le ${new Date(c.utilisee_le).toLocaleDateString("fr-FR")}` : "· jamais utilisée"}</span></span>{" "}
                <button type="button" onClick={() => revoquer(c.id)} aria-label="Révoquer" className="rounded-lg p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
