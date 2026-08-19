// Hero « poster » sombre et coloré pour l'Assemblée (bleu) et le Sénat (rouge), dans le
// même esprit que le hero Europe et que la page Présidentielles.
const THEMES = {
  blue: {
    bg: "bg-[#0a1633]", blob1: "bg-[#1d4ed8]/45", blob2: "bg-sky-400/15",
    pill: "border-sky-400/30 text-sky-200", underline: "from-[#1d4ed8] via-[#3b82f6] to-[#60a5fa]",
    accent: "hover:border-sky-400 hover:text-sky-300", letter: "from-[#93c5fd] to-[#2563eb]",
    overlay: "from-[#0a1633]/82 via-[#0a1633]/62 to-[#0a1633]/94",
  },
  red: {
    bg: "bg-[#33070f]", blob1: "bg-[#e11d48]/45", blob2: "bg-rose-400/15",
    pill: "border-rose-400/30 text-rose-200", underline: "from-[#e11d48] via-[#f43f5e] to-[#fb7185]",
    accent: "hover:border-rose-400 hover:text-rose-300", letter: "from-[#fda4af] to-[#e11d48]",
    overlay: "from-[#33070f]/82 via-[#33070f]/62 to-[#33070f]/94",
  },
  green: {
    bg: "bg-[#04271a]", blob1: "bg-emerald-500/45", blob2: "bg-teal-400/18",
    pill: "border-emerald-400/30 text-emerald-200", underline: "from-emerald-600 via-emerald-500 to-teal-400",
    accent: "hover:border-emerald-400 hover:text-emerald-300", letter: "from-emerald-300 to-emerald-600",
    overlay: "from-[#04271a]/82 via-[#04271a]/60 to-[#04271a]/94",
  },
} as const;

export default function ChamberHero({
  title, accentLetter, eyebrow, description, links, color, image,
}: {
  title: string;           // ex. « ASSEMBLÉE » (mis en gros)
  accentLetter?: string;   // une lettre finale mise en dégradé (facultatif)
  eyebrow: string;
  description: string;
  links: { label: string; href: string }[];
  color: "blue" | "red" | "green";
  image?: string;          // photo de fond optionnelle (ex. « /images/…jpg »)
}) {
  const t = THEMES[color];
  const imgSrc = image ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${image}` : null;
  return (
    <div className={`relative overflow-hidden ${t.bg} px-4 pt-28 pb-16 text-center`}>
      {imgSrc ? (
        <>
          {/* Photo de l'édifice + voile teinté pour la lisibilité du texte. */}
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imgSrc})` }} />
          <div className={`absolute inset-0 bg-gradient-to-b ${t.overlay}`} />
        </>
      ) : (
        <>
          <div className={`absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full ${t.blob1} blur-[120px]`} />
          <div className={`absolute right-1/4 top-10 h-96 w-96 translate-x-1/2 rounded-full ${t.blob2} blur-[130px]`} />
        </>
      )}
      <div className="relative z-10 mx-auto max-w-5xl">
        <span className={`inline-flex items-center gap-2 rounded-full border ${t.pill} bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em]`}>
          {eyebrow}
        </span>
        <h1 className="mt-6 font-staatliches text-7xl uppercase leading-none tracking-tight text-white md:text-9xl">
          {accentLetter ? (
            <>{title}<span className={`bg-gradient-to-b ${t.letter} bg-clip-text text-transparent`}>{accentLetter}</span></>
          ) : title}
        </h1>
        <div className={`mx-auto mt-6 h-1.5 w-44 rounded-full bg-gradient-to-r ${t.underline}`} />
        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-white/70 md:text-base">{description}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className={`rounded-full border border-white/15 bg-white/5 px-5 py-2 text-[11px] font-black uppercase tracking-widest text-white/80 transition ${t.accent}`}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
