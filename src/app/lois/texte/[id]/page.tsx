import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { ArrowRight, ChevronRight, ExternalLink, ScrollText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { categoryLabel } from "@/lib/legislative";
import { lawTypeMeta } from "@/components/lois/LawCard";
import MentionIA from "@/components/shared/MentionIA";
import { extrait } from "@/lib/seo-donnees";

/**
 * Une page par texte de loi, construite avec le site : titre, résumé, ce qui change,
 * parcours au Parlement et sources sont DANS le HTML. C'est ce que lisent les moteurs de
 * recherche (la fiche interactive /lois/?dossier=… ne s'affiche qu'avec JavaScript), et
 * ce que voit le visiteur même si la base ne répond pas.
 *
 * Seuls les textes sortis de commission sont construits (votés, en séance, promulgués… :
 * environ 700) ; en construire 6 800 dépasserait la taille permise par l'hébergement.
 * Les autres restent consultables dans la fiche interactive.
 */

const ETAPES_INITIALES = "(committee,filed)";

export async function generateStaticParams() {
  try {
    const ids: { id: string }[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabase.from("legislative_dossiers").select("id")
        .not("status_code", "in", ETAPES_INITIALES).order("id").range(de, de + 999);
      if (error) throw error;
      ids.push(...(data || []).map((d: { id: string }) => ({ id: d.id })));
      if (!data || data.length < 1000) break;
    }
    return ids.length ? ids : [{ id: "indisponible" }];
  } catch (e) {
    console.error("Pages de lois : liste indisponible", e);
    return [{ id: "indisponible" }];
  }
}

type Etape = { step_label?: string | null; chamber?: string | null; occurred_at?: string | null; sequence?: number | null; source_url?: string | null };

const lireTexte = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  try {
    const detail: any = await api.getLegislativeDossier(id);
    if (!detail?.dossier) return null;
    const [titre, impact] = await Promise.all([
      supabase.from("dossier_display_title").select("display_title").eq("dossier_id", id).maybeSingle(),
      supabase.from("law_citizen_impact").select("impact").eq("dossier_id", id).maybeSingle(),
    ]);
    return {
      dossier: detail.dossier,
      promulgation: detail.promulgation ?? null,
      resume: (detail.summary?.summary as string | undefined) ?? null,
      etapes: (detail.steps ?? []) as Etape[],
      amendements: Number(detail.amendments_total ?? 0),
      scrutins: Number(detail.scrutins_total ?? 0),
      titreCourt: (titre.data?.display_title as string | undefined) ?? null,
      impact: (impact.data?.impact as string | undefined) ?? null,
    };
  } catch (e) {
    console.error(`Page de loi ${id} : lecture impossible`, e);
    return null;
  }
});

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function dateFr(d?: string | null) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3] === 1 ? "1er" : +m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
}
const CHAMBRE: Record<string, string> = { AN: "Assemblée nationale", an: "Assemblée nationale", ASSEMBLEE: "Assemblée nationale", SN: "Sénat", SENAT: "Sénat", senat: "Sénat", CMP: "Commission mixte paritaire", CC: "Conseil constitutionnel", JORF: "Journal officiel" };
const domaine = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const titreDe = (t: NonNullable<Awaited<ReturnType<typeof lireTexte>>>) =>
  t.titreCourt || t.dossier.short_title || t.dossier.title || "Texte de loi";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await lireTexte(id);
  if (!t) return { title: "Texte de loi", robots: { index: false } };
  const titre = titreDe(t);
  const description = extrait(t.impact || t.resume || t.dossier.title);
  return {
    title: titre,
    description,
    alternates: { canonical: `/lois/texte/${id}/` },
    openGraph: { title: titre, description, type: "article" },
  };
}

export default async function PageTexte({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await lireTexte(id);

  if (!t) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="font-staatliches text-4xl uppercase text-foreground">Texte introuvable</h1>{" "}
        <p className="mt-3 text-muted-foreground">Ce texte n&apos;est pas encore disponible ici.</p>{" "}
        <Link href="/lois/" className="mt-6 rounded-full bg-foreground px-6 py-3 text-xs font-black uppercase tracking-widest text-background">
          Toutes les lois
        </Link>
      </main>
    );
  }

  const { dossier: d } = t;
  // Garde-fou : une promulgation datée d'avant le dépôt est un mauvais rattachement (voir
  // promoteFromJorf côté collecte) — on ne l'affiche pas.
  const p = t.promulgation && !(d.deposited_at && String(t.promulgation.promulgated_at || "") < String(d.deposited_at)) ? t.promulgation : null;
  const titre = titreDe(t);
  const type = lawTypeMeta(d.text_type);
  // Le parcours brut compte souvent 80 à 100 actes (réunions, nominations…) : on garde les
  // étapes datées et distinctes, 25 au plus (les plus récentes), le détail restant dans le
  // dossier complet. Sans ce tri, chaque page pesait plus de 300 Ko.
  const vues = new Set<string>();
  const datees = [...t.etapes].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .filter(e => e.occurred_at && e.step_label)
    .filter(e => { const k = `${e.step_label}|${String(e.occurred_at).slice(0, 10)}|${e.chamber}`; if (vues.has(k)) return false; vues.add(k); return true; });
  const etapes = datees.slice(-25);
  const etapesMasquees = datees.length - etapes.length;
  const sources: string[] = (d.source_urls ?? []).filter((u: string) => /^https?:\/\//.test(u)).slice(0, 4);
  const promulguee = !!p?.promulgated_at;

  // Données structurées schema.org (type Legislation) : lues par les moteurs de recherche.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: d.title,
    alternateName: titre !== d.title ? titre : undefined,
    legislationJurisdiction: "FR",
    legislationType: type?.label ?? "Texte législatif",
    legislationIdentifier: p?.nor || d.official_id || undefined,
    legislationDate: p?.promulgated_at || undefined,
    datePublished: d.deposited_at || undefined,
    abstract: t.resume || undefined,
    url: `https://lapolitiquecestsimple.fr/lois/texte/${id}/`,
    sameAs: p?.eli_url || undefined,
  };

  return (
    <main className="min-h-screen bg-muted pb-20 dark:bg-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />{" "}
      <div className="mx-auto max-w-3xl px-4 pt-6 md:pt-10">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Accueil</Link>{" "}
          <ChevronRight size={12} />{" "}
          <Link href="/lois/" className="hover:text-foreground">Lois</Link>
        </nav>{" "}

        <article className="mt-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-10">
          <div className="flex flex-wrap items-center gap-2">
            {d.status_label && (
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${promulguee ? "bg-emerald-700 text-white" : "bg-blue-600 text-white"}`}>
                {d.status_label}
              </span>
            )}{" "}
            {type && (
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${type.badge}`}>
                <type.Icon size={12} strokeWidth={2.5} />{" "}{type.label}
              </span>
            )}{" "}
            {d.category && (
              <span className="rounded-full bg-gradient-to-r from-red-600 to-fuchsia-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                {categoryLabel(d.category)}
              </span>
            )}
          </div>{" "}

          <h1 className="mt-4 text-2xl font-bold leading-tight text-foreground dark:text-white md:text-4xl">{titre}</h1>{" "}
          {titre !== d.title && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.title}</p>}{" "}

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {d.deposited_at && (
              <div className="rounded-2xl bg-muted px-4 py-3 dark:bg-slate-800/60">
                <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Déposé le</dt>{" "}
                <dd className="mt-0.5 font-bold text-foreground dark:text-white">{dateFr(d.deposited_at)}</dd>
              </div>
            )}{" "}
            {p?.promulgated_at ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                <dt className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300">Promulguée le</dt>{" "}
                <dd className="mt-0.5 font-bold text-foreground dark:text-white">{dateFr(p.promulgated_at)}{p.nor ? ` · NOR ${p.nor}` : ""}</dd>
              </div>
            ) : d.latest_step_at ? (
              <div className="rounded-2xl bg-muted px-4 py-3 dark:bg-slate-800/60">
                <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dernière étape</dt>{" "}
                <dd className="mt-0.5 font-bold text-foreground dark:text-white">{dateFr(d.latest_step_at)}</dd>
              </div>
            ) : null}{" "}
            {d.author_name && (
              <div className="rounded-2xl bg-muted px-4 py-3 dark:bg-slate-800/60 sm:col-span-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">À l&apos;origine du texte</dt>{" "}
                <dd className="mt-0.5 font-bold text-foreground dark:text-white">{d.author_name}</dd>
              </div>
            )}
          </dl>{" "}

          {t.impact && promulguee && (
            <section className="mt-8">
              <h2 className="font-staatliches text-2xl uppercase tracking-wide text-foreground dark:text-white">Ce qui change pour vous</h2>{" "}
              <p className="mt-2 text-[15px] leading-relaxed text-foreground/90 dark:text-slate-200">{t.impact}</p>
            </section>
          )}{" "}

          {t.resume && (
            <section className="mt-8">
              <h2 className="font-staatliches text-2xl uppercase tracking-wide text-foreground dark:text-white">En bref</h2>{" "}
              {t.resume.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="mt-2 text-[15px] leading-relaxed text-foreground/90 dark:text-slate-200">{para}{" "}</p>
              ))}{" "}
              <MentionIA source={{ libelle: "documents officiels du Parlement", url: sources[0] ?? null }} className="mt-3" />
            </section>
          )}{" "}

          <Link href={`/lois/?dossier=${id}`}
            className="mt-8 flex items-center justify-between gap-3 rounded-2xl bg-foreground px-5 py-4 text-background transition hover:opacity-90">
            <span className="text-sm font-black uppercase tracking-widest">
              Ouvrir le dossier complet{" "}
              <span className="mt-0.5 block text-[11px] font-semibold normal-case tracking-normal opacity-75">
                {[t.scrutins ? `${t.scrutins} scrutin${t.scrutins > 1 ? "s" : ""}` : "", t.amendements ? `${t.amendements.toLocaleString("fr-FR")} amendement${t.amendements > 1 ? "s" : ""}` : "", "qui a voté quoi"].filter(Boolean).join(" · ")}
              </span>
            </span>{" "}
            <ArrowRight size={18} />
          </Link>{" "}

          {etapes.length > 0 && (
            <section className="mt-10">
              <h2 className="font-staatliches text-2xl uppercase tracking-wide text-foreground dark:text-white">Son parcours au Parlement</h2>{" "}
              {etapesMasquees > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Les {etapes.length} dernières étapes ; {etapesMasquees} plus anciennes dans le dossier complet.</p>
              )}{" "}
              <ol className="mt-4 space-y-3 border-l-2 border-border pl-5 dark:border-slate-700">
                {etapes.map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-red-500 dark:border-slate-900" />{" "}
                    <p className="text-sm font-bold text-foreground dark:text-white">{e.step_label || "Étape"}</p>{" "}
                    <p className="text-xs text-muted-foreground">
                      {[dateFr(e.occurred_at), e.chamber ? (CHAMBRE[e.chamber] ?? e.chamber) : ""].filter(Boolean).join(" · ")}
                    </p>{" "}
                  </li>
                ))}
              </ol>
            </section>
          )}{" "}

          {(sources.length > 0 || p?.eli_url) && (
            <section className="mt-10">
              <h2 className="font-staatliches text-2xl uppercase tracking-wide text-foreground dark:text-white">Sources officielles</h2>{" "}
              <ul className="mt-3 space-y-2 text-sm">
                {p?.eli_url && (
                  <li>
                    <a href={p.eli_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-blue-700 hover:underline dark:text-blue-400">
                      <ScrollText size={14} />{" "}Texte publié au Journal officiel (Légifrance){" "}<ExternalLink size={12} />
                    </a>
                  </li>
                )}{" "}
                {sources.map(u => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 break-all font-bold text-blue-700 hover:underline dark:text-blue-400">
                      <ExternalLink size={12} className="shrink-0" />{" "}{domaine(u)}
                    </a>{" "}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
