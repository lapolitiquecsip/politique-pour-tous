"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, Mic, Plane, ExternalLink, ArrowRight, X, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import MinisterImage from "./MinisterImage";

type Pub = { id: string; title: string; url: string; published_at: string | null; summary: string | null };

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Les intitulés reconstruits depuis l'URL arrivent en minuscules : on les rend lisibles.
const clean = (t: string) => (t || "").replace(/\.$/, "").trim();

// Rend les puces du résumé IA (format "- texte" avec du **gras**).
function SummaryBody({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return (
    <ul className="space-y-2.5">
      {lines.map((l, i) => {
        const body = l.replace(/^[-•]\s*/, "");
        const parts = body.split(/\*\*(.+?)\*\*/g);
        return (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>{parts.map((p, k) => (k % 2 ? <strong key={k} className="text-slate-900">{p}</strong> : <span key={k}>{p}</span>))}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PubList({ items, accent, empty, onSelect }: { items: Pub[]; accent: string; empty: string; onSelect?: (p: Pub) => void }) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-400 italic py-3">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map(p => {
        const inner = (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{fmtDate(p.published_at)}</p>
              <p className="mt-0.5 text-sm font-bold leading-snug text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                {clean(p.title)}
              </p>
            </div>
            {onSelect
              ? <Sparkles size={14} className="mt-1 shrink-0 text-amber-400" />
              : <ExternalLink size={14} className="mt-1 shrink-0 text-slate-300" />}
          </>
        );
        const cls = "group flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/40";
        // Conseils des ministres : on ouvre le résumé SUR le site plutôt que d'envoyer
        // l'utilisateur déchiffrer le compte rendu officiel sur elysee.fr.
        return onSelect
          ? <button key={p.id} onClick={() => onSelect(p)} className={cls}>{inner}</button>
          : <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
      })}
    </div>
  );
}

/**
 * Section « Président de la République » de la page Exécutif.
 * Tout le contenu provient du site officiel elysee.fr (flux RSS + rubrique Conseil
 * des ministres) : titres, dates et liens sont repris tels quels, rien n'est reformulé.
 */
export default function PresidentSection({ photoUrl }: { photoUrl?: string }) {
  const [conseils, setConseils] = useState<Pub[]>([]);
  const [discours, setDiscours] = useState<Pub[]>([]);
  const [deplacements, setDeplacements] = useState<Pub[]>([]);
  const [openCdm, setOpenCdm] = useState<Pub | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getElyseePublications("conseil_ministres", 5),
      api.getElyseePublications("discours", 5),
      api.getElyseePublications("deplacement", 5),
    ])
      .then(([c, d, p]) => {
        if (!active) return;
        setConseils(c as Pub[]); setDiscours(d as Pub[]); setDeplacements(p as Pub[]);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const fallback = `https://ui-avatars.com/api/?name=Emmanuel+Macron&background=f59e0b&color=fff&size=512&bold=true`;

  const blocks: Array<{ key: string; icon: any; title: string; accent: string; iconBg: string; items: Pub[]; empty: string }> = [
    { key: "cdm", icon: ScrollText, title: "Conseils des ministres", accent: "text-amber-600", iconBg: "bg-amber-50 text-amber-600", items: conseils, empty: "Aucun compte rendu disponible." },
    { key: "dis", icon: Mic, title: "Discours & déclarations", accent: "text-orange-600", iconBg: "bg-orange-50 text-orange-600", items: discours, empty: "Aucun discours récent." },
    { key: "dep", icon: Plane, title: "Déplacements officiels", accent: "text-yellow-600", iconBg: "bg-yellow-50 text-yellow-600", items: deplacements, empty: "Aucun déplacement récent." },
  ];

  return (
    <section className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 space-y-8">
      {/* En-tête président */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden border-4 border-amber-50 shadow-md bg-slate-100">
          <MinisterImage
            src={photoUrl || fallback}
            fallbackSrc={fallback}
            alt="Emmanuel Macron"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-amber-600 font-black text-xs uppercase tracking-widest mb-1">Chef de l'État · depuis 2017</p>
          <h2 className="text-3xl md:text-4xl font-staatliches uppercase tracking-tight text-slate-900">
            Emmanuel <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500">Macron</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Président de la République. Il préside le Conseil des ministres et nomme le Premier ministre.
          </p>
        </div>
        <a
          href="https://www.elysee.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
        >
          elysee.fr <ArrowRight size={14} />
        </a>
      </div>

      {/* Trois colonnes : conseils, discours, déplacements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {blocks.map(b => (
          <motion.div key={b.key} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${b.iconBg}`}>
                <b.icon size={16} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{b.title}</h3>
            </div>
            <PubList items={b.items} accent={b.accent} empty={b.empty} onSelect={b.key === "cdm" ? setOpenCdm : undefined} />
          </motion.div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400/80 italic border-t border-slate-100 pt-4">
        Source : présidence de la République (elysee.fr) — flux officiel, mis à jour quotidiennement.
        Titres, dates et liens repris tels que publiés.
      </p>

      {/* Résumé du Conseil des ministres, lisible sans quitter le site. */}
      {openCdm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setOpenCdm(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Conseil des ministres</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">{fmtDate(openCdm.published_at)}</p>
              </div>
              <button onClick={() => setOpenCdm(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">{clean(openCdm.title)}</h3>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-600">
                <Sparkles size={11} /> Ce qui a été décidé — résumé du compte rendu officiel
              </p>
              {openCdm.summary
                ? <SummaryBody text={openCdm.summary} />
                : <p className="text-sm italic text-slate-400">Résumé en cours de génération.</p>}
            </div>

            <a href={openCdm.url} target="_blank" rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-slate-700">
              Lire le compte rendu officiel <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
