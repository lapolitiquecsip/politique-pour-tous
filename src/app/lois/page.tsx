import { api } from "@/lib/api";
import LawCard from "@/components/laws/LawCard";
import { BookOpen, FolderOpen } from "lucide-react";

export default async function LawsPage() {
  const laws = await api.getLaws() || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 py-16 px-4 mb-12 border-b border-border">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-4">
            On va plus loin
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Les grands dossiers législatifs décryptés, de A à Z. Ne vous laissez plus perdre par le jargon technique.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <FolderOpen className="text-primary w-8 h-8" />
          <h2 className="text-3xl font-heading font-bold text-foreground">Dossiers en cours ou récents</h2>
        </div>

        {laws.length === 0 ? (
          <div className="text-center p-12 bg-card border shadow-sm rounded-3xl flex flex-col items-center">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-2xl font-bold font-heading mb-2">Aucun dossier disponible</h3>
            <p className="text-muted-foreground">La liste des lois est actuellement en cours de préparation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {laws.map((law: any) => (
              <LawCard key={law.id} law={law} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
