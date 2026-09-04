import type { Metadata } from "next";
import VoteQuizClient from "@/components/quiz/VoteQuizClient";

export const metadata: Metadata = {
  title: "Vous votez comme qui ? — La Politique c'est simple",
  description: "Répondez à de vrais votes de l'Assemblée nationale et découvrez de quel groupe politique vous êtes le plus proche.",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-14 text-center text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-400">Le test</p>
        <h1 className="mx-auto mt-3 max-w-3xl font-staatliches text-5xl uppercase leading-none md:text-7xl">
          Vous votez comme qui&nbsp;?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-slate-300">
          Prononcez-vous sur de <b className="text-white">vrais votes</b> de l&apos;Assemblée nationale.
          On vous dit de quel <b className="text-white">groupe politique</b> vous êtes le plus proche.
        </p>
      </section>
      <div className="mt-10">
        <VoteQuizClient />
      </div>
    </main>
  );
}
