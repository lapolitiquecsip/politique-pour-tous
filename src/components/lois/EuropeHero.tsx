// Hero « poster » de la page Europe, inspiré du hero Présidentielles 2027, adapté aux
// couleurs du drapeau de l'UE (bleu #003399 + or #FFCC00) avec la couronne de 12 étoiles.

function StarCrown() {
  // 12 étoiles d'or disposées en arc au-dessus du titre.
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (-170 + (i * 340) / 11) * (Math.PI / 180); // arc large en haut
    return [200 + 190 * Math.cos(a), 120 + 90 * Math.sin(a)] as const;
  });
  const star = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, k) => {
      const rad = k % 2 === 0 ? r : r * 0.42;
      const ang = (-90 + k * 36) * (Math.PI / 180);
      return `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
    }).join(" ");
    return <polygon key={`${cx}-${cy}`} points={pts} fill="#FFCC00" />;
  };
  return (
    <svg viewBox="0 0 400 150" className="pointer-events-none absolute left-1/2 top-0 w-[340px] max-w-[90vw] -translate-x-1/2 opacity-90 md:w-[440px]">
      {stars.map(([x, y]) => star(x, y, 7))}
    </svg>
  );
}

export default function EuropeHero({ description, links }: { description: string; links: { label: string; href: string }[] }) {
  return (
    <div className="relative overflow-hidden bg-[#00133a] px-4 pt-28 pb-16 text-center">
      {/* Halos lumineux (bleu + or). */}
      <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#003399]/50 blur-[120px]" />
      <div className="absolute right-1/4 top-10 h-96 w-96 translate-x-1/2 rounded-full bg-[#FFCC00]/15 blur-[130px]" />
      <StarCrown />
      <div className="relative mx-auto max-w-5xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFCC00]/30 bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-[#FFD54A]">
          🇪🇺 Parlement européen · 27 pays
        </span>
        <h1 className="mt-6 font-staatliches text-7xl uppercase leading-none tracking-tight text-white md:text-9xl">
          EUR<span className="bg-gradient-to-b from-[#FFE07A] to-[#FFCC00] bg-clip-text text-transparent">O</span>PE
        </h1>
        <div className="mx-auto mt-6 h-1.5 w-44 rounded-full bg-gradient-to-r from-[#003399] via-[#3b6fd4] to-[#FFCC00]" />
        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-white/70 md:text-base">{description}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-[11px] font-black uppercase tracking-widest text-white/80 transition hover:border-[#FFCC00] hover:text-[#FFCC00]">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
