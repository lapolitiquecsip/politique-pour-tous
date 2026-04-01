import { api } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, FileText, AlertCircle } from "lucide-react";
import LawTimeline from "@/components/laws/LawTimeline";
import HemicycleChart from "@/components/laws/HemicycleChart";
import LawAccordions from "@/components/laws/LawAccordions";
import { notFound } from "next/navigation";

export default async function LawDetailPage({ params }: { params: { id: string } }) {
  let law;
  try {
    law = await api.getLaw(params.id);
  } catch (err) {
    //
  }

  if (!law) {
    notFound();
  }

  const dateStr = law.created_at 
    ? new Date(law.created_at).toLocaleDateString("fr-FR", { year: 'numeric', month: 'long', day: 'numeric' })
    : "";

  let pros: string[] = [];
  let cons: string[] = [];
  try {
    const impact = JSON.parse(law.impact);
    pros = impact.pros || [];
    cons = impact.cons || [];
  } catch (e) {
    // Failed to parse impact as JSON
  }

  let timelineEvents = [];
  try {
    timelineEvents = typeof law.timeline === "string" ? JSON.parse(law.timeline) : law.timeline;
  } catch (e) {
    //
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border pt-12 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/lois" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux dossiers
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-md">
                {law.category}
              </span>
              <span className="text-muted-foreground text-sm font-medium">Déposé le {dateStr}</span>
            </div>
            {law.vote_result && (
              <span className="px-4 py-2 bg-card border border-border shadow-sm rounded-full text-sm font-bold flex items-center gap-2">
                {law.vote_result.toLowerCase() === "adoptée" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {law.vote_result.toLowerCase() === "rejetée" && <XCircle className="w-4 h-4 text-red-500" />}
                {law.vote_result.toLowerCase() === "en cours" && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                {law.vote_result}
              </span>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
            {law.title}
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 mt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Colonne de gauche (Main content) */}
        <div className="md:col-span-2 space-y-10">
          
          {/* Le texte en bref */}
          <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
            <h2 className="text-2xl font-bold flex gap-2 items-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              Le texte en bref
            </h2>
            <div className="prose prose-lg prose-slate text-foreground/80 leading-relaxed max-w-none">
              <p className="font-semibold text-lg text-foreground">{law.summary}</p>
              <p className="mt-4">{law.context}</p>
            </div>
          </section>

          {/* Jauge de vote (existante — on la garde) + Hémicycle */}
          <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Résultat du vote à l&apos;Assemblée</h2>
            <HemicycleChart />
          </section>

          {/* Arguments Pour / Contre + Positions — EN ACCORDÉON */}
          <LawAccordions pros={pros} cons={cons} />

        </div>

        {/* Colonne de droite (Timeline) */}
        <div>
          <div className="sticky top-8">
            <h2 className="text-2xl font-bold mb-6">La chronologie</h2>
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
              <LawTimeline events={timelineEvents} />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
