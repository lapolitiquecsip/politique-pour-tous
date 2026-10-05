import Link from "next/link";
import { Lock } from "lucide-react";

/** Bandeau d'invitation au Pro, commun aux sections réservées de l'onglet Dynamiques. */
export default function VerrouPro({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-4 rounded-3xl border border-fuchsia-300/50 bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg">
        <Lock size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-foreground">{titre}</p>
        <p className="text-[13px] text-muted-foreground">{texte}</p>
      </div>
      <Link href="/premium" className="shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-700 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition hover:brightness-110">
        Découvrir le Pro
      </Link>
    </div>
  );
}

/** Chiffre flouté pour qui n'a pas le Pro. */
export function Flou({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return ok ? <>{children}</> : <span className="select-none blur-[5px]" aria-hidden>{children}</span>;
}

/** Badge « Pro » des titres de section. */
export const BadgePro = () => (
  <span className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-700 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow">Pro</span>
);
