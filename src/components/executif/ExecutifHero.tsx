"use client";

// En-tête « poster » de la page Exécutif, dans l'esprit des héros Assemblée / Sénat
// (ChamberHero) : photo de l'édifice sous un voile sombre aux nuances orange, portrait
// détouré du chef de l'exécutif à gauche, badge, grand titre, trait en dégradé et
// boutons vers chaque rubrique de la page.
//
// Images (public/images/executif/) :
//   matignon-hero.webp / -mobile.webp  cour d'honneur de l'hôtel de Matignon, bichromie
//     noir-orange — photo ScareCriterion12, CC BY-SA 4.0 (image modifiée, même licence)
//   macron-portrait.webp  portrait détouré en noir et blanc — Nebojša Tejić, domaine public

/** Ouvre une rubrique repliable de la page et la fait défiler à l'écran. */
export function allerALaRubrique(id: string) {
  window.dispatchEvent(new CustomEvent("executif:ouvrir", { detail: id }));
  history.replaceState(null, "", `#${id}`);
  // Laisser la rubrique s'ouvrir avant de défiler : sinon la page bouge sous le doigt.
  requestAnimationFrame(() => setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60));
}

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ExecutifHero({ description, links }: {
  description: string;
  links: { label: string; id: string }[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#120601] text-white">
      {/* Fond : Matignon. Version légère sur téléphone (40 Ko au lieu de 130). */}
      <picture>
        <source media="(max-width: 767px)" srcSet={`${base}/images/executif/matignon-hero-mobile.webp`} />
        <img
          src={`${base}/images/executif/matignon-hero.webp`}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_30%]"
        />
      </picture>{" "}
      {/* Voile : ciel et bas assombris, bords en vignette, lueur orange au centre. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0401]/85 via-[#1f0b02]/45 to-[#0b0401]/95" />{" "}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(8,3,0,0.75)_100%)]" />{" "}
      <div className="absolute left-1/2 top-1/3 -z-10 h-72 w-[42rem] max-w-full -translate-x-1/2 rounded-full bg-orange-600/25 blur-[110px]" />{" "}

      {/* Portrait détouré, à gauche, fondu dans le bas et sur le bord coupé de l'épaule.
          Masqué sur téléphone : il recouvrirait le titre et les boutons. */}
      <img
        src={`${base}/images/executif/macron-portrait.webp`}
        alt="Emmanuel Macron, président de la République"
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute bottom-0 left-[-4%] -z-10 hidden h-[64%] w-auto max-w-none select-none md:block lg:left-[1%] lg:h-[94%] [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%),linear-gradient(to_right,black_82%,transparent_100%)] [mask-composite:intersect] [-webkit-mask-composite:source-in] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%),linear-gradient(to_right,black_82%,transparent_100%)]"
      />{" "}

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-24 sm:pb-14 sm:pt-28 md:pb-16 md:pt-32 lg:pb-20">
        <div className="mx-auto max-w-3xl text-center md:ml-[36%] md:mr-0 md:max-w-none lg:ml-[27%]">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/60 bg-black/30 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-orange-200 backdrop-blur-sm sm:px-5 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.9)]" />{" "}
            Pouvoir exécutif
          </span>{" "}
          {/* Taille calculée sur la largeur restante : tout l'écran sur téléphone, ce qui
              reste à droite du portrait au-delà. « GOUVERNEMENT » tient toujours sur une ligne. */}
          <h1 className="mt-5 font-staatliches text-[clamp(3.25rem,13.5vw,9rem)] uppercase leading-[0.9] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] md:text-[8vw] xl:text-[8.75rem]">
            Le Gouvernement
          </h1>{" "}
          <div className="mx-auto mt-5 h-1.5 w-32 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 shadow-[0_0_18px_rgba(249,115,22,0.6)] sm:w-44" />{" "}
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-base md:text-lg">
            {description}
          </p>
        </div>{" "}

        {/* Rubriques : rangée qui défile au doigt sur téléphone (pas de pavé de boutons
            sur trois lignes), boutons centrés sur plusieurs lignes ailleurs. */}
        <nav aria-label="Rubriques de la page" className="relative mt-8 md:ml-[36%] lg:ml-[27%]">
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {links.map(l => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={e => { e.preventDefault(); allerALaRubrique(l.id); }}
                className="shrink-0 snap-start whitespace-nowrap rounded-full border border-white/25 bg-black/25 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm transition hover:border-orange-400 hover:bg-orange-500/15 hover:text-orange-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 active:scale-[0.97]"
              >
                {l.label}
              </a>
            ))}
          </div>{" "}
          {/* Indique qu'il reste des rubriques à droite, sur téléphone seulement. */}
          <div className="pointer-events-none absolute inset-y-0 -right-4 w-10 bg-gradient-to-l from-[#0b0401] to-transparent sm:hidden" />
        </nav>
      </div>{" "}

      <p className="absolute bottom-1.5 right-3 text-[9px] text-white/40">
        Photo : <a href="https://commons.wikimedia.org/wiki/File:Grande_cour_de_l%27H%C3%B4tel_Matignon_Sep_2017.jpg" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">ScareCriterion12</a>, CC BY-SA 4.0, modifiée ·
        Portrait : <a href="https://commons.wikimedia.org/wiki/File:Emmanuel_Macron_2025_(cropped).jpg" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">N. Tejić</a>, domaine public
      </p>
    </section>
  );
}
