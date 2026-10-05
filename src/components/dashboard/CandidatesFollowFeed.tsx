"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, ArrowRight, Mic, Play } from "lucide-react";
import { api } from "@/lib/api";
import DragScroller from "@/components/ui/DragScroller";
import { getFollowedCandidates, toggleFollowCandidate, CANDIDATE_FOLLOWS_EVENT, type FollowedCandidate } from "@/lib/candidateFollows";

// Fil des candidats à la présidentielle SUIVIS par le membre premium (cloche dorée sur la
// fiche candidat). Le choix est mémorisé dans le navigateur ; ici on affiche, pour chaque
// candidat suivi, ses dernières actualités (fil mis à jour chaque jour côté backend).
const fmt = (d: string | null) => (!d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));

const GENRE: Record<string, string> = { debat: "Débat", emission: "Face-à-face", primaire: "Débat de la primaire" };

/**
 * Un débat ou un face-à-face du candidat, avec l'image de la retransmission.
 * Les débats de primaire renvoient à la rubrique du site tant qu'ils n'ont pas eu
 * lieu, puis à leur vidéo.
 */
type Debat = {
  source_key: string; kind: string; title: string; broadcaster: string | null; date: string | null;
  url: string | null; video_id: string | null; thumbnail_url: string | null; a_venir: boolean;
};

function CarteDebat({ d }: { d: Debat }) {
  const interne = typeof d.url === "string" && d.url.startsWith("/");
  const classes = "group flex w-[250px] shrink-0 select-none flex-col overflow-hidden rounded-xl border border-amber-400/30 bg-amber-400/[0.04] text-left transition hover:border-amber-400/70 hover:shadow-sm";
  const contenu = (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        {d.thumbnail_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={d.thumbnail_url} alt="" draggable={false} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
          : <span className="flex h-full w-full items-center justify-center text-amber-300/60"><Mic size={28} /></span>}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-950 shadow">
          <Mic size={10} /> {GENRE[d.kind] ?? "Débat"}
        </span>
        {d.a_venir && (
          <span className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">À venir</span>
        )}
        {d.video_id && !d.a_venir && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg"><Play size={15} className="ml-0.5 fill-current" /></span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {fmt(d.date)}{d.broadcaster ? ` · ${d.broadcaster.trim()}` : ""}
        </span>
        <p className="mt-1 line-clamp-2 text-[13px] font-bold text-foreground">{d.title}</p>
      </div>
    </>
  );
  return interne
    ? <Link href={d.url!} draggable={false} className={classes}>{contenu}</Link>
    : <a href={d.url || "#"} target="_blank" rel="noopener noreferrer" draggable={false} className={classes}>{contenu}</a>;
}

export default function CandidatesFollowFeed() {
  const [cands, setCands] = useState<FollowedCandidate[]>([]);
  const [ready, setReady] = useState(false);
  const [news, setNews] = useState<Record<string, any[]>>({});
  const [debats, setDebats] = useState<Record<string, Debat[]>>({});

  // Charge la liste + se resynchronise quand on suit/désuit ailleurs.
  useEffect(() => {
    const load = () => setCands(getFollowedCandidates());
    load(); setReady(true);
    window.addEventListener(CANDIDATE_FOLLOWS_EVENT, load);
    return () => window.removeEventListener(CANDIDATE_FOLLOWS_EVENT, load);
  }, []);

  const ids = cands.map(c => c.id).join(",");
  useEffect(() => {
    let active = true;
    (async () => {
      const map: Record<string, any[]> = {};
      const deb: Record<string, Debat[]> = {};
      await Promise.all(cands.map(async c => {
        const [n, d] = await Promise.all([
          api.getCandidateNews(c.id).catch(() => []),
          api.getCandidateDebates(c.id).catch(() => []),
        ]);
        map[c.id] = n; deb[c.id] = d as Debat[];
      }));
      if (active) { setNews(map); setDebats(deb); }
    })();
    return () => { active = false; };
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  if (cands.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-[2rem] border border-border bg-card p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500"><Bell size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-foreground">Suivez vos candidats à la présidentielle</p>
          <p className="text-xs text-muted-foreground">Cliquez sur la <strong>cloche dorée</strong> d'un candidat pour recevoir son fil (actus + vidéos) directement ici.</p>
        </div>
        <Link href="/presidentielles-2027" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800">
          Découvrir <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500"><Bell size={20} className="fill-amber-400" /></span>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Mes candidats suivis</h3>
          <p className="text-[11px] text-muted-foreground">{cands.length} candidat{cands.length > 1 ? "s" : ""} · fil mis à jour chaque jour</p>
        </div>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {cands.map(c => (
          <div key={c.id} className="p-4">
            <div className="flex items-center gap-3">
              {c.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.photo_url} alt={c.name} className="h-9 w-9 shrink-0 rounded-full object-cover object-top" />
                : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-muted-foreground">{c.name.slice(0, 2).toUpperCase()}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-foreground">{c.name}</p>
                {c.party && <p className="truncate text-[11px] text-slate-400">{c.party}</p>}
              </div>
              <button onClick={() => toggleFollowCandidate(c)} title="Ne plus suivre"
                className="shrink-0 rounded-full border border-border p-1.5 text-slate-400 transition hover:border-rose-300 hover:text-rose-500"><X size={13} /></button>
            </div>
            {(news[c.id] || []).length + (debats[c.id] || []).length > 0 ? (
              // Le rail commun du site, sans barre de défilement : défilement natif
              // au doigt, glisser avec inertie à la souris, flèches sur grand écran.
              // L'ancienne barre grise obligeait à viser un trait de quelques pixels.
              <div className="mt-3">
                <DragScroller ariaLabel={`Actualité de ${c.name}`} className="gap-2.5 pb-1 pt-0 md:gap-2.5">
                {/* Les débats d'abord : c'est là qu'on voit un candidat défendre ses
                    idées face à d'autres. Ceux à venir (primaires) ouvrent la marche. */}
                {[...(debats[c.id] || [])]
                  .sort((a, b) => Number(b.a_venir) - Number(a.a_venir) || String(b.date).localeCompare(String(a.date)))
                  .slice(0, 8)
                  .map(d => <CarteDebat key={d.source_key} d={d} />)}
                {(news[c.id] || []).slice(0, 8).map((n: any) => (
                  <a key={n.id} href={n.source_url || "#"} target="_blank" rel="noopener noreferrer" draggable={false}
                    className="flex w-[220px] shrink-0 select-none flex-col rounded-xl border border-border p-3 text-left transition hover:border-slate-300 hover:shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{fmt(n.date)}</span>
                    <p className="mt-1 line-clamp-2 text-[13px] font-bold text-foreground">{n.title}</p>
                    {n.source_name && <span className="mt-auto pt-1.5 text-[10px] font-bold text-slate-400">{n.source_name}</span>}
                  </a>
                ))}
                </DragScroller>
              </div>
            ) : (
              <p className="mt-2 text-xs italic text-slate-400">Pas encore d'actualité — le fil se met à jour chaque jour.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
