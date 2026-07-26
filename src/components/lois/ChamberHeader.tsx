// En-tête d'une page dédiée à un organe (Assemblée / Sénat / Europe) : grand titre + liens
// d'ancrage pour sauter directement à la composition, aux membres ou aux textes législatifs.
export default function ChamberHeader({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 pb-4 text-center">
      <h1 className="text-5xl md:text-8xl font-staatliches uppercase tracking-tighter leading-none text-slate-900 dark:text-white">{title}</h1>
      <div className="mx-auto mt-6 h-1.5 w-32 rounded-full bg-gradient-to-r from-blue-600 to-red-600" />
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {links.map(l => (
          <a key={l.href} href={l.href} className="rounded-full border border-slate-200 bg-white px-5 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
