import type { Metadata } from "next";
import ParliamentComparator from "@/components/compare/ParliamentComparator";

export const metadata: Metadata = {
  title: "Comparateur de parlementaires — La Politique c'est simple",
  description: "Comparez deux député·e·s ou sénateur·rice·s côte à côte : participation, amendements, loyauté au groupe.",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-14 text-center text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Outil</p>
        <h1 className="mx-auto mt-3 max-w-3xl font-staatliches text-5xl uppercase leading-none md:text-7xl">
          Comparer deux parlementaires
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-slate-300">
          Choisissez deux <b className="text-white">député·e·s</b> ou <b className="text-white">sénateur·rice·s</b> et comparez leur activité côte à côte.
        </p>
      </section>
      <div className="mt-10">
        <ParliamentComparator />
      </div>
    </main>
  );
}
