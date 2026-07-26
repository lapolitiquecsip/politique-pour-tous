// En-tête d'une page dédiée à un organe (Assemblée / Sénat / Europe) : grand titre, court
// texte explicatif (ce qu'on peut faire + rôle de l'organe), et liens d'ancrage.
export default function ChamberHeader({
  title, description, links, theme = "default",
}: {
  title: string;
  description: string;
  links: { label: string; href: string }[];
  theme?: "default" | "europe";
}) {
  const eu = theme === "europe";
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 pb-4 text-center">
      <h1 className={`text-5xl md:text-8xl font-staatliches uppercase tracking-tighter leading-none ${eu ? "text-[#003399] dark:text-[#6C8FE0]" : "text-slate-900 dark:text-white"}`}>{title}</h1>
      <div className={`mx-auto mt-6 h-1.5 w-32 rounded-full ${eu ? "bg-gradient-to-r from-[#003399] to-[#FFCC00]" : "bg-gradient-to-r from-blue-600 to-red-600"}`} />
      <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {links.map(l => (
          <a key={l.href} href={l.href}
            className={`rounded-full border px-5 py-2 text-[11px] font-black uppercase tracking-widest transition ${
              eu
                ? "border-[#003399]/20 bg-white text-[#003399] hover:border-[#FFCC00] hover:text-[#a8850a] dark:bg-slate-900 dark:text-[#8CA6E8]"
                : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}>
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
