"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, ExternalLink, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";

/**
 * La loupe du Journal officiel, réservée aux abonnés Pro.
 *
 * Le sommaire du jour répond à « qu'a-t-on publié ce matin ». Il ne répond pas à
 * « où est passé cet arrêté dont on m'a parlé la semaine dernière », qui est la
 * question d'un professionnel. Cette recherche porte sur tout le Journal officiel
 * conservé, intitulés ET explications, et non sur la seule journée affichée.
 *
 * La recherche se fait en base, sur un index plein texte français (jorf_texts) :
 * filtrer côté navigateur obligerait à charger un mois de sommaires, soit près
 * d'un méga-octet, pour répondre à une frappe.
 */

type Resultat = {
  id: string;
  edition_date: string;
  rubrique: string | null;
  groupe: string | null;
  titre: string;
  nature: string | null;
  explication: string | null;
  source_explication: "notice" | "ia" | "renvoi" | null;
};

const NATURES: Record<string, { un: string; classe: string }> = {
  loi: { un: "Loi", classe: "bg-red-500/20 text-red-200" },
  ordonnance: { un: "Ordonnance", classe: "bg-orange-500/20 text-orange-200" },
  decret: { un: "Décret", classe: "bg-violet-500/20 text-violet-200" },
  arrete: { un: "Arrêté", classe: "bg-blue-500/20 text-blue-200" },
  decision: { un: "Décision", classe: "bg-teal-500/20 text-teal-200" },
  deliberation: { un: "Délibération", classe: "bg-teal-500/20 text-teal-200" },
  circulaire: { un: "Circulaire", classe: "bg-white/15 text-white/80" },
  avis: { un: "Avis", classe: "bg-amber-500/20 text-amber-200" },
  communication: { un: "Communiqué", classe: "bg-white/15 text-white/80" },
  rapport: { un: "Rapport", classe: "bg-white/15 text-white/80" },
  autre: { un: "Autre", classe: "bg-white/15 text-white/70" },
};
const nat = (n: string | null) => NATURES[n ?? "autre"] ?? NATURES.autre;

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function jourLong(iso: string) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : iso;
}

/**
 * Met en évidence les mots cherchés dans un texte.
 *
 * On surligne les mots tapés, accents ignorés, et non la chaîne entière : la
 * recherche étant racinisée côté base, « nomination » ramène « nominations », et
 * ne surligner que la frappe exacte laisserait le lecteur sans repère.
 */
function Surligne({ texte, mots }: { texte: string; mots: string[] }) {
  const morceaux = useMemo(() => {
    const utiles = mots.filter(m => m.length > 2);
    if (!utiles.length) return [{ t: texte, fort: false }];
    const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const cible = sansAccent(texte);
    // On marque les positions plutôt que de découper avec une expression
    // régulière : les accents décalent les index entre texte et forme réduite si
    // l'on n'y prend pas garde, et ici les deux chaînes ont la même longueur.
    const marques = new Array<boolean>(texte.length).fill(false);
    for (const mot of utiles) {
      const m = sansAccent(mot);
      let i = cible.indexOf(m);
      while (i !== -1) {
        for (let k = i; k < i + m.length; k++) marques[k] = true;
        i = cible.indexOf(m, i + m.length);
      }
    }
    const out: { t: string; fort: boolean }[] = [];
    let debut = 0;
    for (let i = 1; i <= texte.length; i++) {
      if (i === texte.length || marques[i] !== marques[debut]) {
        out.push({ t: texte.slice(debut, i), fort: marques[debut] });
        debut = i;
      }
    }
    return out;
  }, [texte, mots]);

  return (
    <>
      {morceaux.map((m, i) =>
        m.fort
          ? <mark key={i} className="rounded bg-fuchsia-400/30 px-0.5 text-white">{m.t}</mark>
          : <span key={i}>{m.t}</span>,
      )}
    </>
  );
}

export default function JorfSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [nature, setNature] = useState<string | null>(null);
  const [resultats, setResultats] = useState<Resultat[] | null>(null);
  const [cherche, setCherche] = useState(false);
  const [natures, setNatures] = useState<{ nature: string; count: number }[]>([]);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => { champ.current?.focus(); }, []);
  useEffect(() => {
    api.getJorfNatures().then(setNatures).catch(() => {});
  }, []);

  // Échap ferme, comme partout ailleurs.
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [onClose]);

  const lancer = useCallback((terme: string, filtre: string | null) => {
    if (terme.trim().length < 2) { setResultats(null); return; }
    setCherche(true);
    api.searchJorf(terme, { nature: filtre, limit: 60 })
      .then(r => setResultats(r as Resultat[]))
      .catch(() => setResultats([]))
      .finally(() => setCherche(false));
  }, []);

  // Attente avant de partir : on ne veut pas une requête par lettre tapée.
  useEffect(() => {
    const minuteur = setTimeout(() => lancer(q, nature), 280);
    return () => clearTimeout(minuteur);
  }, [q, nature, lancer]);

  const mots = useMemo(
    () => q.trim().split(/\s+/).filter(Boolean).map(m => m.replace(/^["'-]+|["']+$/g, "")),
    [q],
  );

  // Regroupé par jour : un professionnel raisonne par édition.
  const parJour = useMemo(() => {
    const m = new Map<string, Resultat[]>();
    for (const r of resultats ?? []) {
      if (!m.has(r.edition_date)) m.set(r.edition_date, []);
      m.get(r.edition_date)!.push(r);
    }
    return [...m.entries()];
  }, [resultats]);

  return (
    <div className="border-b border-white/10 bg-slate-950/60 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-white/[0.07] px-4 ring-1 ring-white/15 focus-within:ring-fuchsia-400/60">
          <Search size={17} className="shrink-0 text-fuchsia-300" />
          <input
            ref={champ}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Chercher un décret, un arrêté, un mot-clé…"
            aria-label="Rechercher dans le Journal officiel"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-white outline-none placeholder:text-white/35"
          />
          {cherche && <Loader2 size={15} className="shrink-0 animate-spin text-white/50" />}
          {!!q && !cherche && (
            <button onClick={() => setQ("")} aria-label="Effacer" className="shrink-0 text-white/40 hover:text-white">
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer la recherche"
          className="shrink-0 rounded-2xl bg-white/[0.07] p-3.5 text-white/70 ring-1 ring-white/15 transition hover:bg-white/15 hover:text-white"
        >
          <X size={17} />
        </button>
      </div>

      {natures.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <SlidersHorizontal size={12} className="mr-0.5 text-white/35" />
          <button
            onClick={() => setNature(null)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
              nature === null ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            Tout
          </button>
          {natures.slice(0, 8).map(n => (
            <button
              key={n.nature}
              onClick={() => setNature(nature === n.nature ? null : n.nature)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                nature === n.nature ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {nat(n.nature).un}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {q.trim().length < 2 ? (
          <motion.p
            key="invite"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-4 text-[13px] leading-relaxed text-white/45"
          >
            La recherche porte sur tout le Journal officiel conservé — intitulés et
            explications. Les guillemets cherchent une expression exacte
            (<span className="text-white/70">&laquo;&nbsp;taxe de séjour&nbsp;&raquo;</span>),
            un tiret devant un mot l&apos;exclut.
          </motion.p>
        ) : resultats === null ? null : !resultats.length ? (
          <motion.p
            key="vide"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-4 text-[13px] text-white/50"
          >
            Aucun texte ne correspond à <strong className="text-white/80">{q.trim()}</strong>
            {nature ? <> parmi les {nat(nature).un.toLowerCase()}s</> : null}.
          </motion.p>
        ) : (
          <motion.div
            key="resultats"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-4"
          >
            <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-white/40">
              {resultats.length}{resultats.length === 60 ? "+" : ""} résultat{resultats.length > 1 ? "s" : ""}
              {" "}sur {parJour.length} édition{parJour.length > 1 ? "s" : ""}
            </p>
            <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">
              {parJour.map(([date, textes]) => (
                <div key={date}>
                  <p className="sticky top-0 z-10 -mx-1 bg-slate-950/90 px-1 py-1 text-[11px] font-black uppercase tracking-widest text-fuchsia-300 backdrop-blur">
                    {jourLong(date)}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {textes.map(t => (
                      <li key={t.id}>
                        <a
                          href={`https://www.legifrance.gouv.fr/jorf/id/${t.id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="group block rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10 transition hover:bg-white/[0.09]"
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${nat(t.nature).classe}`}>
                              {nat(t.nature).un}
                            </span>
                            {t.groupe && (
                              <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-white/35">
                                {t.groupe}
                              </span>
                            )}
                            <ExternalLink size={11} className="ml-auto shrink-0 text-white/25 transition group-hover:text-fuchsia-300" />
                          </span>
                          <span className="mt-1.5 block text-[13px] font-bold leading-snug text-white/90">
                            <Surligne texte={t.titre} mots={mots} />
                          </span>
                          {t.explication && (
                            <span className="mt-1 block text-[12px] leading-snug text-white/55">
                              <Surligne texte={t.explication} mots={mots} />
                            </span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
