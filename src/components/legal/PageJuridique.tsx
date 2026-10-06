import Link from "next/link";
import type { ReactNode } from "react";
import { MAJ_TEXTES_JURIDIQUES } from "@/lib/constants";

/** Gabarit commun des textes juridiques : en-tête sobre, sommaire, articles numérotés. */
export default function PageJuridique({ surtitre, titre, intro, sections }: {
  surtitre: string; titre: string; intro?: ReactNode;
  sections: { id: string; titre: string; contenu: ReactNode }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-slate-950 px-4 py-16 text-center text-white md:py-20">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55">{surtitre}</p>
        <h1 className="mt-3 font-staatliches text-5xl uppercase leading-none md:text-7xl">{titre}</h1>
        <p className="mt-4 text-xs text-white/55">Dernière mise à jour : {MAJ_TEXTES_JURIDIQUES}</p>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        {intro && <div className="mb-8 text-[15px] leading-relaxed text-foreground/85">{intro}</div>}

        <nav aria-label="Sommaire" className="mb-10 rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sommaire</p>
          <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-foreground/80 hover:text-foreground hover:underline">{i + 1}. {s.titre}</a></li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="mb-3 border-l-4 border-red-600 pl-4 text-xl font-black uppercase tracking-tight text-foreground">
                {i + 1}. {s.titre}
              </h2>
              <div className="space-y-3 text-[15px] leading-relaxed text-foreground/85 [&_a]:font-semibold [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
                {s.contenu}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-border pt-6 text-xs text-muted-foreground">
          Voir aussi : <Link href="/mentions-legales" className="underline">mentions légales</Link> ·{" "}
          <Link href="/cgu" className="underline">conditions d&apos;utilisation</Link> ·{" "}
          <Link href="/cgv" className="underline">conditions de vente</Link> ·{" "}
          <Link href="/confidentialite" className="underline">confidentialité et cookies</Link>
        </p>
      </div>
    </div>
  );
}

/** Valeur d'identité, ou un repère visible tant qu'elle n'est pas renseignée. */
export const ou = (v: string) => v || "[à compléter]";
