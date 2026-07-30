"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Vote, Landmark, Flag, Building2, Star, Users, MapPin, Layers, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import DeputyClient from "@/app/deputes/[slug]/DeputyClient";
import SenatorClient from "@/app/senateurs/[slug]/SenatorClient";
import MepClient from "@/app/eurodeputes/[slug]/MepClient";
import MinisterFicheClient from "@/app/executif/ministre/[slug]/MinisterFicheClient";

// FICHE UNIFIÉE : une seule page par personne. En-tête + barre d'onglets « fonctions » ; chaque
// onglet embarque le contenu COMPLET de la fonction correspondante (aucune info retirée), et on
// bascule sans quitter la page. Réutilise les URLs existantes comme points d'entrée.
type Role = { label: string; kind: string; href: string; type: string };
const ICON: Record<string, any> = { deputy: Vote, senator: Landmark, mep: Flag, minister: Building2, candidate: Star, party: Users, department: MapPin, mayor: MapPin };
const EMBEDDABLE = new Set(["deputy", "senator", "mep", "minister"]);
const BACK: Record<string, [string, string]> = {
  deputy: ["/deputes", "Les députés"], senator: ["/deputes", "Le Sénat"], mep: ["/deputes?mode=meps", "Les eurodéputés"],
  minister: ["/executif", "Le gouvernement"], candidate: ["/presidentielles-2027", "La présidentielle"], party: ["/partis", "Les partis"],
};

function roleSlug(r: { href: string; type: string }): string {
  if (r.type === "candidate") { const m = r.href.match(/candidat=([^&]+)/); return m ? m[1] : ""; }
  return r.href.split("?")[0].replace(/\/+$/, "").split("/").pop() || "";
}

// Rend le contenu embarqué d'une fonction (fiche complète, sans sa propre barre du haut).
function EmbeddedFunction({ role }: { role: Role }) {
  const slug = roleSlug(role);
  const params = useMemo(() => Promise.resolve({ slug }), [slug]);
  const [senator, setSenator] = useState<any | null | undefined>(role.type === "senator" ? undefined : null);
  const [mep, setMep] = useState<{ mep: any; votes: any[] } | null | undefined>(role.type === "mep" ? undefined : null);

  useEffect(() => {
    let active = true;
    if (role.type === "senator") api.getSenatorBySlug(slug).then(s => { if (active) setSenator(s); }).catch(() => active && setSenator(null));
    if (role.type === "mep") api.getMepBySlug(slug).then(async (m: any) => {
      const votes = m ? await api.getMepVotes(String(m.id), { limit: 20, onlyMain: true }) : [];
      if (active) setMep(m ? { mep: m, votes: votes as any[] } : null);
    }).catch(() => active && setMep(null));
    return () => { active = false; };
  }, [role.type, slug]);

  const loader = <div className="flex justify-center py-24"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

  if (role.type === "deputy") return <DeputyClient params={params} embedded />;
  if (role.type === "minister") return <MinisterFicheClient params={params} embedded />;
  if (role.type === "senator") return senator === undefined ? loader : senator ? <SenatorClient senator={senator} embedded /> : loader;
  if (role.type === "mep") return mep === undefined ? loader : mep ? <MepClient mep={mep.mep} initialVotes={mep.votes} embedded /> : loader;

  // Fonctions non embarquables (candidat, parti, département, maire) : accès direct.
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-slate-500 dark:text-slate-400">Cette fonction dispose de sa propre page dédiée.</p>
      <Link href={role.href} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 font-black uppercase tracking-widest text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900">
        Ouvrir : {role.label} <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}

const ENTRY_HREF: Record<string, (s: string) => string> = {
  deputy: s => `/deputes/${s}`, senator: s => `/senateurs/${s}`, mep: s => `/eurodeputes/${s}`,
  minister: s => `/executif/ministre/${s}`,
};

export default function UnifiedPersonClient({ entryType, slug }: { entryType: string; slug: string }) {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [active, setActive] = useState<Role>({ type: entryType, label: "", kind: "", href: (ENTRY_HREF[entryType]?.(slug)) || slug });

  useEffect(() => {
    let alive = true;
    (async () => {
      const name = await api.getPersonNameBySlug(entryType, slug);
      if (!alive || !name) return;
      const r = (await api.getPersonRoles(name)) as Role[];
      if (!alive) return;
      setRoles(r);
      const entry = r.find(x => x.type === entryType && roleSlug(x) === slug);
      if (entry) setActive(entry);
    })();
    return () => { alive = false; };
  }, [entryType, slug]);

  const [backHref, backLabel] = BACK[active.type] || BACK[entryType] || ["/deputes", "Retour"];
  const multi = roles && roles.length > 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* En-tête unifié : retour + onglets des fonctions de la personne */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={backHref} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft size={14} /> {backLabel}
          </Link>
          {multi && <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />}
          {multi && (
            <div className="flex items-center gap-2">
              <span className="hidden shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:flex"><Layers size={13} /> Ses fonctions</span>
              {roles!.map((r, i) => {
                const Icon = ICON[r.type] || Layers;
                const on = active.type === r.type && roleSlug(active) === roleSlug(r);
                return (
                  <button key={i} onClick={() => setActive(r)} title={r.label}
                    className={`group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                      on ? "bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900"
                         : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"}`}>
                    <Icon size={14} className={on ? "" : "text-slate-400"} /> {r.kind}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contenu embarqué de la fonction active */}
      <EmbeddedFunction key={`${active.type}:${roleSlug(active)}`} role={active} />
    </div>
  );
}
