import type { Metadata } from "next";
import FaqSection from "@/components/home/FaqSection";
import DonneesStructurees from "@/components/seo/DonneesStructurees";
import { FAQ_COMPLETE, FAQ_PLATE } from "@/lib/faq-donnees";
import { SITE, ID_ORGANISATION, ID_SITE, filAriane } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Questions fréquentes : données, neutralité, abonnements",
  description: "D'où viennent les données du site, comment les lois sont résumées, comment savoir ce qu'a voté son député, ce qui est gratuit et ce que contiennent les abonnements Premium et Pro.",
  alternates: { canonical: "/faq/" },
};

export default function FaqPage() {
  return (
    <main className="min-h-screen">
      <DonneesStructurees donnees={[
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${SITE}/faq/#faq`,
          url: `${SITE}/faq/`,
          inLanguage: "fr-FR",
          isPartOf: { "@id": ID_SITE },
          publisher: { "@id": ID_ORGANISATION },
          mainEntity: FAQ_PLATE.map(q => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.reponse } })),
        },
        filAriane([["Accueil", "/"], ["Questions fréquentes", "/faq/"]]),
      ]} />
      <FaqSection />

      {/* Toutes les réponses, en texte : lisibles sans JavaScript (moteurs de recherche et génératifs). */}
      <section aria-labelledby="faq-complete" className="border-t border-border bg-background px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 id="faq-complete" className="font-staatliches text-4xl uppercase leading-none tracking-tight text-foreground sm:text-5xl">Toutes les réponses</h1>
          {FAQ_COMPLETE.map(t => (
            <div key={t.theme} className="mt-10">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t.theme}</h2>
              <div className="mt-3 divide-y divide-border rounded-3xl border border-border bg-card dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {t.questions.map(q => (
                  <details key={q.question} className="group p-5">
                    <summary className="flex cursor-pointer list-none items-start gap-2 text-[16px] font-bold leading-snug text-foreground dark:text-white [&::-webkit-details-marker]:hidden">
                      <span className="mt-0.5 text-amber-500 transition-transform group-open:rotate-90">›</span>
                      <span>{q.question}</span>
                    </summary>
                    <p className="mt-3 pl-5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{q.reponse}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
