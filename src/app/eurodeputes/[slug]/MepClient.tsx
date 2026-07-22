"use client";

import Link from "next/link";
import { ArrowLeft, Building2, ExternalLink, Star } from "lucide-react";
import { BallotBox } from "@/components/dashboard/BallotVote";

// Couleurs par groupe politique européen.
const GROUP_CLR: Record<string, string> = {
  RE: "from-amber-400 to-yellow-500",
  PPE: "from-blue-500 to-indigo-600",
  SD: "from-rose-500 to-red-600",
  VERTS: "from-emerald-500 to-green-600",
  PfE: "from-slate-600 to-slate-800",
  ECR: "from-sky-600 to-blue-800",
  GUE: "from-red-600 to-rose-700",
  ESN: "from-indigo-700 to-slate-900",
  NI: "from-slate-400 to-slate-600",
};

// Position HowTheyVote → valeur d'urne (réutilise le composant du dashboard).
const POS: Record<string, string> = { FOR: "POUR", AGAINST: "CONTRE", ABSTENTION: "ABSTENTION" };
const posLabel: Record<string, string> = { FOR: "Pour", AGAINST: "Contre", ABSTENTION: "Abstention", DID_NOT_VOTE: "N'a pas voté" };

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function MepClient({ mep, initialVotes }: { mep: any; initialVotes: any[] }) {
  const grad = GROUP_CLR[mep.ep_group_code] || GROUP_CLR.NI;
  const initials = `${(mep.first_name?.[0] || "")}${(mep.last_name?.[0] || "")}`.toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/deputes?mode=meps" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-amber-600">
            <ArrowLeft size={14} /> Tous les eurodéputés
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Colonne identité */}
          <div className="md:col-span-1">
            <div className="rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className={`relative h-64 bg-gradient-to-b ${grad} flex items-end`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mep.photo_url}
                  alt={mep.full_name}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-800">
                  {mep.ep_group_code}
                </div>
                {!mep.photo_url && <div className="w-full text-center text-white text-5xl font-staatliches pb-8">{initials}</div>}
              </div>
              <div className="p-6">
                <p className="text-amber-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  <Star size={11} className="fill-current" /> Membre du Parlement européen
                </p>
                <h1 className="mt-1 text-2xl font-staatliches uppercase tracking-wide text-slate-900 dark:text-white leading-tight">
                  {mep.full_name}
                </h1>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Groupe au Parlement européen</p>
                    <p className="font-bold text-slate-900 dark:text-white">{mep.ep_group || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Parti national</p>
                    <p className="font-bold text-slate-900 dark:text-white">{mep.national_party || "—"}</p>
                  </div>
                </div>
                <a
                  href={`https://www.europarl.europa.eu/meps/fr/${mep.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-700"
                >
                  Fiche officielle <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* Colonne bio + votes */}
          <div className="md:col-span-2 space-y-8">
            <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-4">
                Portrait & <span className="text-amber-600">Engagement</span>
              </h2>
              {mep.biography ? (
                <div className="rounded-2xl bg-amber-50/50 dark:bg-slate-800/50 p-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {mep.biography}
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">Biographie en cours de rédaction.</p>
              )}
            </section>

            <section className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="text-amber-600" size={22} />
                <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white">
                  Votes au <span className="text-amber-600">Parlement européen</span>
                </h2>
              </div>
              {initialVotes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm italic text-slate-400">
                  Aucun vote synchronisé pour l'instant.
                </p>
              ) : (
                <div className="space-y-3">
                  {initialVotes.map((v) => (
                    <a
                      key={v.vote_id}
                      href={v.url}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 transition hover:border-amber-300"
                    >
                      <BallotBox vote={POS[v.position] || "ABSTENTION"} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {fmtDate(v.voted_at)}{v.reference ? ` · ${v.reference}` : ""}
                        </p>
                        <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">{v.title}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {posLabel[v.position] || v.position}
                      </span>
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-4 text-[10px] italic text-slate-400">
                Votes principaux (scrutins finaux). Source : Parlement européen via HowTheyVote.eu.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
