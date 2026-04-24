import { api } from "@/lib/api";
import Link from "next/link";
import SenatorClient from "./SenatorClient";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const senator = await api.getSenatorBySlug(slug);
  
  if (!senator) return { title: "Sénateur non trouvé | LA POLITIQUE C SIMPLE" };
  
  return {
    title: `${senator.first_name} ${senator.last_name} | LA POLITIQUE C SIMPLE`,
    description: `Découvrez le profil, le parcours et les positions législatives de ${senator.first_name} ${senator.last_name}, sénateur du département ${senator.department}.`,
  };
}

export default async function SenatorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const senator = await api.getSenatorBySlug(slug);

  if (!senator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Sénateur non trouvé</h1>
        <Link href="/deputes" className="text-blue-600 underline">Retour à la recherche</Link>
      </div>
    );
  }

  return <SenatorClient senator={senator} />;
}
